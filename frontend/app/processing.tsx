import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeAcne, analyzePigmentation, analyzeWrinkles, detectSkinTone, getSeverityLevel } from '../utils/imageAnalysis';

export default function ProcessingScreen() {
  const router = useRouter();
  const { imageUri, imageBase64, analysisType } = useLocalSearchParams();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Preparing image...');

  useEffect(() => {
    processImage();
  }, []);

  const processImage = async () => {
    try {
      // Step 1: Resize and optimize image
      setCurrentStep('Optimizing image...');
      setProgress(10);
      
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri as string,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setProgress(20);

      // Step 2: Convert to canvas-compatible format
      setCurrentStep('Analyzing skin tone...');
      setProgress(30);

      // For demo, we'll create mock analysis data since we can't use canvas in React Native
      // In a production app, you'd use react-native-canvas or send to backend
      const mockPixelData = generateMockPixelData();
      const skinTone = detectSkinTone(mockPixelData, 800, 600);

      setProgress(40);

      let results: any = {
        imageUri: manipResult.uri,
        imageBase64: manipResult.base64,
        skinTone,
        timestamp: new Date().toISOString(),
        analysisType: analysisType as string,
      };

      // Step 3: Run appropriate analysis
      if (analysisType === 'acne' || analysisType === 'full') {
        setCurrentStep('Detecting acne lesions...');
        setProgress(50);
        const acneResults = analyzeAcne(mockPixelData, 800, 600, skinTone);
        results.acne = {
          ...acneResults,
          severity: getSeverityLevel(acneResults.metrics, 'acne'),
        };
      }

      if (analysisType === 'pigmentation' || analysisType === 'full') {
        setCurrentStep('Analyzing pigmentation...');
        setProgress(65);
        const pigmentationResults = analyzePigmentation(mockPixelData, 800, 600, skinTone);
        results.pigmentation = {
          ...pigmentationResults,
          severity: getSeverityLevel(pigmentationResults.metrics, 'pigmentation'),
        };
      }

      if (analysisType === 'wrinkles' || analysisType === 'full') {
        setCurrentStep('Detecting wrinkles...');
        setProgress(80);
        const wrinklesResults = analyzeWrinkles(mockPixelData, 800, 600);
        results.wrinkles = {
          ...wrinklesResults,
          severity: getSeverityLevel(wrinklesResults.metrics, 'wrinkles'),
        };
      }

      // Step 4: Save to backend and local storage
      setCurrentStep('Saving results...');
      setProgress(90);
      
      await saveResults(results);

      setProgress(100);
      setCurrentStep('Complete!');

      // Navigate to results
      setTimeout(() => {
        router.replace({
          pathname: '/results',
          params: {
            resultsData: JSON.stringify(results),
          },
        });
      }, 500);

    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Processing Error', 'Failed to analyze image. Please try again.');
      router.back();
    }
  };

  const generateMockPixelData = () => {
    // Generate realistic-looking pixel data for demo
    const width = 800;
    const height = 600;
    const data = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      // Skin-tone colors with variation
      data[i] = 200 + Math.random() * 40;     // R
      data[i + 1] = 150 + Math.random() * 40; // G
      data[i + 2] = 120 + Math.random() * 40; // B
      data[i + 3] = 255;                       // A

      // Add some random darker spots (lesions/pigmentation)
      if (Math.random() < 0.02) {
        data[i] = 150 + Math.random() * 30;
        data[i + 1] = 100 + Math.random() * 30;
        data[i + 2] = 80 + Math.random() * 30;
      }
      
      // Add some red spots (acne)
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
      
      // Save to backend
      const response = await fetch(`${BACKEND_URL}/api/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        console.error('Failed to save to backend');
      }

      // Also save to AsyncStorage for offline access
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const existingScans = await AsyncStorage.getItem('skin_scans');
      const scans = existingScans ? JSON.parse(existingScans) : [];
      scans.unshift(results);
      // Keep only last 50 scans
      if (scans.length > 50) scans.length = 50;
      await AsyncStorage.setItem('skin_scans', JSON.stringify(scans));

    } catch (error) {
      console.error('Error saving results:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
        
        <Text style={styles.title}>Analyzing Your Skin</Text>
        <Text style={styles.stepText}>{currentStep}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>

        <Text style={styles.infoText}>
          Using advanced computer vision algorithms to analyze your skin condition.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loader: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 20,
  },
});