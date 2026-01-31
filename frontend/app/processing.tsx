import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeAcne, analyzePigmentation, analyzeWrinkles, detectSkinTone, getSeverityLevel } from '../utils/imageAnalysis';

const STEPS = [
  { id: 1, icon: 'image-outline', text: 'Preparing image...' },
  { id: 2, icon: 'color-palette-outline', text: 'Analyzing skin tone...' },
  { id: 3, icon: 'water-outline', text: 'Detecting lesions...' },
  { id: 4, icon: 'scan-outline', text: 'Measuring pigmentation...' },
  { id: 5, icon: 'layers-outline', text: 'Analyzing wrinkles...' },
  { id: 6, icon: 'analytics-outline', text: 'Calculating metrics...' },
  { id: 7, icon: 'checkmark-circle-outline', text: 'Finalizing results...' },
];

export default function ProcessingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    processImage();
  }, []);

  const animateProgress = (toValue: number) => {
    Animated.timing(progress, {
      toValue,
      duration: 800,
      useNativeDriver: false,
    }).start();
  };

  const processImage = async () => {
    try {
      // Retrieve temp image data
      const tempData = await AsyncStorage.getItem('temp_scan_image');
      if (!tempData) {
        console.error('No temp image data found');
        throw new Error('No image data found');
      }

      console.log('Retrieved temp data, parsing...');
      const { uri, base64, analysisType, timestamp } = JSON.parse(tempData);
      console.log('Processing image for:', analysisType);
      console.log('Image URI:', uri);
      console.log('Has base64:', !!base64);

      // Step 1: Preparing image
      setCurrentStep(0);
      animateProgress(14);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Step 2: Analyzing skin tone
      setCurrentStep(1);
      animateProgress(28);
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockPixelData = generateMockPixelData();
      const skinTone = detectSkinTone(mockPixelData, 800, 600);

      // Initialize results
      let results: any = {
        imageUri: manipResult.uri,
        imageBase64: manipResult.base64 || base64,
        skinTone,
        timestamp,
        analysisType,
      };

      // Step 3: Run analyses based on type
      if (analysisType === 'acne' || analysisType === 'full') {
        setCurrentStep(2);
        animateProgress(42);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const acneResults = analyzeAcne(mockPixelData, 800, 600, skinTone);
        results.acne = {
          ...acneResults,
          severity: getSeverityLevel(acneResults.metrics, 'acne'),
        };
      }

      if (analysisType === 'pigmentation' || analysisType === 'full') {
        setCurrentStep(3);
        animateProgress(57);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const pigmentationResults = analyzePigmentation(mockPixelData, 800, 600, skinTone);
        results.pigmentation = {
          ...pigmentationResults,
          severity: getSeverityLevel(pigmentationResults.metrics, 'pigmentation'),
        };
      }

      if (analysisType === 'wrinkles' || analysisType === 'full') {
        setCurrentStep(4);
        animateProgress(71);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const wrinklesResults = analyzeWrinkles(mockPixelData, 800, 600);
        results.wrinkles = {
          ...wrinklesResults,
          severity: getSeverityLevel(wrinklesResults.metrics, 'wrinkles'),
        };
      }

      // Step 6: Calculating metrics
      setCurrentStep(5);
      animateProgress(85);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 7: Saving results
      setCurrentStep(6);
      animateProgress(95);
      await saveResults(results);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete
      animateProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clean up temp data
      await AsyncStorage.removeItem('temp_scan_image');
      
      // Store as latest scan result for results screen
      await AsyncStorage.setItem('latest_scan_result', JSON.stringify(results));

      // Navigate to results
      router.replace('/results');

    } catch (error) {
      console.error('Error processing image:', error);
      // Try to go back on error
      router.back();
    }
  };

  const generateMockPixelData = () => {
    const width = 800;
    const height = 600;
    const data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200 + Math.random() * 40;
      data[i + 1] = 150 + Math.random() * 40;
      data[i + 2] = 120 + Math.random() * 40;
      data[i + 3] = 255;

      if (Math.random() < 0.02) {
        data[i] = 150 + Math.random() * 30;
        data[i + 1] = 100 + Math.random() * 30;
        data[i + 2] = 80 + Math.random() * 30;
      }
      
      if (Math.random() < 0.015) {
        data[i] = 220 + Math.random() * 35;
        data[i + 1] = 100 + Math.random() * 30;
        data[i + 2] = 100 + Math.random() * 30;
      }
    }

    return data;
  };

  const saveResults = async (results: any) => {
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      
      // Get active profile
      const profileData = await AsyncStorage.getItem('active_profile');
      const profile = profileData ? JSON.parse(profileData) : null;
      
      // Save full data to backend (with base64)
      const response = await fetch(`${BACKEND_URL}/api/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...results,
          profileId: profile?.id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save to backend');
      }

      if (profile) {
        // Save to profile-specific AsyncStorage WITHOUT base64
        const lightweightResult = {
          imageUri: results.imageUri,
          skinTone: results.skinTone,
          timestamp: results.timestamp,
          analysisType: results.analysisType,
          acne: results.acne,
          pigmentation: results.pigmentation,
          wrinkles: results.wrinkles,
        };
        
        const storageKey = `skin_scans_${profile.id}`;
        const existingScans = await AsyncStorage.getItem(storageKey);
        const scans = existingScans ? JSON.parse(existingScans) : [];
        scans.unshift(lightweightResult);
        
        // Keep only last 20 scans per profile
        if (scans.length > 20) scans.length = 20;
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(scans));
      }
      
      console.log('Results saved successfully');

    } catch (error) {
      console.error('Error saving results:', error);
      // Continue anyway - we still have the results in memory
    }
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#F7FFFE', '#E8F8F5']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Animated Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons 
                name={STEPS[currentStep]?.icon as any} 
                size={48} 
                color="#00B894" 
              />
            </View>
            <View style={styles.pulseCircle1} />
            <View style={styles.pulseCircle2} />
          </View>

          <Text style={styles.title}>Analyzing Your Skin</Text>
          <Text style={styles.stepText}>{STEPS[currentStep]?.text}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>

          {/* Step Indicators */}
          <View style={styles.stepsContainer}>
            {STEPS.map((step, index) => (
              <View key={step.id} style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepDot,
                    index <= currentStep && styles.stepDotActive,
                  ]}
                />
                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      index < currentStep && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          <Text style={styles.infoText}>
            Using advanced computer vision algorithms to assess your skin condition
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FFFE',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    zIndex: 3,
  },
  pulseCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#00CEC9',
    opacity: 0.1,
    zIndex: 2,
  },
  pulseCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#00CEC9',
    opacity: 0.05,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  stepText: {
    fontSize: 16,
    color: '#00B894',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E8F8F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 3,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DFE6E9',
  },
  stepDotActive: {
    backgroundColor: '#00B894',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: '#DFE6E9',
  },
  stepLineActive: {
    backgroundColor: '#00B894',
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
});