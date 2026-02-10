import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeAcne, analyzePigmentation, analyzeWrinkles, detectSkinTone, getSeverityLevel } from '../utils/imageAnalysis';
import { extractPixelsFromBase64, extractPixelsViaBackend } from '../utils/imagePixelExtraction';
import { analyzeLesions, calibrateImage, type LesionAnalysisResult } from '../utils/lesionAnalysis';
import { cleanupOldScans } from '../utils/storageCleanup';
import { BACKEND_URL } from '../config/api';

interface SaveScanResponse {
  id: string;
  message: string;
}

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

      // Extract actual pixel data from image
      let pixelData: Uint8ClampedArray;
      try {
        // Try backend extraction first (more accurate)
        pixelData = await extractPixelsViaBackend(
          manipResult.base64 || base64,
          800,
          600
        );
      } catch (error) {
        console.warn('Backend pixel extraction failed, using local extraction:', error);
        // Fallback to local extraction
        pixelData = await extractPixelsFromBase64(
          manipResult.base64 || base64,
          800,
          600
        );
      }
      
      const skinTone = detectSkinTone(pixelData, 800, 600);

      // Initialize results
      let results: any = {
        imageUri: manipResult.uri,
        imageBase64: manipResult.base64 || base64,
        skinTone,
        timestamp,
        analysisType,
      };

      // Step 3: Run lesion-based and rule-based analyses
      setCurrentStep(2);
      animateProgress(42);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (analysisType === 'acne') {
        // Use lesion-based analysis with YOLO if available
        const calibration = calibrateImage(pixelData, 800, 600, 'none');
        const lesionAnalysis = await analyzeLesions(
          pixelData, 
          800, 
          600, 
          skinTone, 
          calibration,
          manipResult.base64 || base64,
          true // Use YOLO if available
        );
        
        // Also get legacy results for compatibility
        const acneResults = analyzeAcne(pixelData, 800, 600, skinTone);
        
        results.acne = {
          ...acneResults,
          // Add comprehensive lesion-based analysis
          lesionAnalysis: {
            lesions: lesionAnalysis.lesions,
            rois: lesionAnalysis.rois,
            metrics: lesionAnalysis.metrics,
            visualMap: lesionAnalysis.visualMap,
          },
          severity: lesionAnalysis.metrics.severity,
          method: 'lesion-based',
        };
      }

      if (analysisType === 'pigmentation') {
        setCurrentStep(3);
        animateProgress(57);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const pigmentationResults = analyzePigmentation(pixelData, 800, 600, skinTone);
        results.pigmentation = {
          ...pigmentationResults,
          severity: getSeverityLevel(pigmentationResults.metrics, 'pigmentation'),
          method: 'rule-based',
        };
      }

      if (analysisType === 'wrinkles') {
        setCurrentStep(4);
        animateProgress(71);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const wrinklesResults = analyzeWrinkles(pixelData, 800, 600);
        results.wrinkles = {
          ...wrinklesResults,
          severity: getSeverityLevel(wrinklesResults.metrics, 'wrinkles'),
          method: 'rule-based',
        };
      }

      // Step 6: Calculating metrics
      setCurrentStep(5);
      animateProgress(85);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 7: Saving results
      setCurrentStep(6);
      animateProgress(95);
      
      // Cleanup old scans before saving (to prevent storage full errors)
      try {
        await cleanupOldScans(5); // Keep only 5 most recent scans per profile
      } catch (cleanupError) {
        console.warn('Cleanup failed, continuing anyway:', cleanupError);
      }
      
      await saveResults(results);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete
      animateProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Clean up temp data (always try, but don't fail if it errors)
      try {
        await AsyncStorage.removeItem('temp_scan_image');
      } catch (error) {
        console.warn('Failed to cleanup temp data:', error);
      }

      // Navigate to results
      router.replace('/results');

    } catch (error) {
      console.error('Error processing image:', error);
      // Try to go back on error
      router.back();
    }
  };

  const saveResults = async (results: any) => {
    try {
      // Get active profile
      const profileData = await AsyncStorage.getItem('active_profile');
      const profile = profileData ? JSON.parse(profileData) : null;
      
      // PRIMARY: Save full data to backend database (with imageBase64)
      // Images are now stored in database, not local storage
      try {
        const response = await fetch(`${BACKEND_URL}/api/scans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUri: results.imageUri,
            imageBase64: results.imageBase64, // Store image in database
            skinTone: results.skinTone,
            timestamp: results.timestamp,
            analysisType: results.analysisType,
            acne: results.acne,
            pigmentation: results.pigmentation,
            wrinkles: results.wrinkles,
            profileId: profile?.id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Backend save failed: ${response.status} - ${errorText}`);
        }
        
        const savedData = await response.json() as SaveScanResponse;
        const scanId = savedData.id;
        console.log('✅ Results saved to database successfully, ID:', scanId);
        
        // Store scan ID for reference (lightweight, no image data)
        if (profile && scanId) {
          try {
            const storageKey = `skin_scans_${profile.id}`;
            const existingScans = await AsyncStorage.getItem(storageKey);
            const scans = existingScans ? JSON.parse(existingScans) : [];
            
            // Store only metadata (no image data) - images are in database
            const scanMetadata = {
              id: scanId, // Database ID
              timestamp: results.timestamp,
              analysisType: results.analysisType,
              acne: results.acne ? { severity: results.acne.severity } : null,
              pigmentation: results.pigmentation ? { severity: results.pigmentation.severity } : null,
              wrinkles: results.wrinkles ? { severity: results.wrinkles.severity } : null,
            };
            
            scans.unshift(scanMetadata);
            
            // Keep only last 50 scan IDs (just metadata, very small)
            if (scans.length > 50) scans.length = 50;
            
            await AsyncStorage.setItem(storageKey, JSON.stringify(scans));
          } catch (storageError: any) {
            // Storage error for metadata is not critical
            console.warn('Failed to save scan metadata locally:', storageError);
          }
        }
        
        // Save latest scan result for immediate display (without image - image is in database)
        if (scanId) {
          try {
            const lightweightResults = {
              ...results,
              imageBase64: undefined, // NEVER store base64 locally - it's in database
              imageUri: results.imageUri, // Keep URI for reference only
              databaseId: scanId, // Store database ID for reference
            };
            await AsyncStorage.setItem('latest_scan_result', JSON.stringify(lightweightResults));
          } catch (storageError: any) {
            // Not critical - we can fetch from database using scanId if needed
            console.warn('Failed to save latest scan locally (non-critical):', storageError);
          }
        }
        
      } catch (backendError: any) {
        console.error('❌ Backend save failed:', backendError.message || backendError);
        // Retry once after a short delay
        console.log('Retrying backend save...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const retryResponse = await fetch(`${BACKEND_URL}/api/scans`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUri: results.imageUri,
              imageBase64: results.imageBase64,
              skinTone: results.skinTone,
              timestamp: results.timestamp,
              analysisType: results.analysisType,
              acne: results.acne,
              pigmentation: results.pigmentation,
              wrinkles: results.wrinkles,
              profileId: profile?.id,
            }),
          });

          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            throw new Error(`Backend save failed after retry: ${retryResponse.status} - ${errorText}`);
          }
          
          const retrySavedData = await retryResponse.json() as SaveScanResponse;
          console.log('✅ Results saved to database on retry, ID:', retrySavedData.id);
          
          // Update metadata with retry ID
          if (profile && retrySavedData.id) {
            try {
              const storageKey = `skin_scans_${profile.id}`;
              const existingScans = await AsyncStorage.getItem(storageKey);
              const scans = existingScans ? JSON.parse(existingScans) : [];
              
              const scanMetadata = {
                id: retrySavedData.id,
                timestamp: results.timestamp,
                analysisType: results.analysisType,
                acne: results.acne ? { severity: results.acne.severity } : null,
                pigmentation: results.pigmentation ? { severity: results.pigmentation.severity } : null,
                wrinkles: results.wrinkles ? { severity: results.wrinkles.severity } : null,
              };
              
              scans.unshift(scanMetadata);
              if (scans.length > 50) scans.length = 50;
              await AsyncStorage.setItem(storageKey, JSON.stringify(scans));
            } catch (storageError) {
              console.warn('Failed to save scan metadata locally:', storageError);
            }
          }
        } catch (retryError: any) {
          console.error('❌ Backend save failed after retry:', retryError.message || retryError);
          throw new Error(`Failed to save to database after retry: ${retryError.message}`);
        }
      }
      
      console.log('✅ Results saved successfully to database');

    } catch (error: any) {
      console.error('❌ Error saving results:', error);
      // Show user-friendly error but don't crash
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save scan. Results are still available but may not be saved.',
        [{ text: 'OK' }]
      );
      // Don't throw - allow navigation to results even if save fails
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