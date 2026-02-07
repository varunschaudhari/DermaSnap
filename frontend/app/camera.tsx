import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    // Request media library permission on mount
    if (mediaPermission && !mediaPermission.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIconContainer}>
          <Ionicons name="camera-outline" size={64} color="#00B894" />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          SkinQuant AI needs camera access to capture and analyze your skin condition.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const processImage = async (uri: string, base64: string | null) => {
    try {
      setIsCapturing(true);
      
      // If base64 is not provided, read it from file
      let imageBase64 = base64;
      if (!imageBase64) {
        imageBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Store image data temporarily in AsyncStorage to avoid URL param size limits
      await AsyncStorage.setItem('temp_scan_image', JSON.stringify({
        uri: uri,
        base64: imageBase64,
        analysisType: type,
        timestamp: new Date().toISOString(),
      }));

      console.log('Navigating to processing...');
      
      // Navigate to processing screen
      router.push('/processing');
      
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      setIsCapturing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady) {
      console.log('Camera not ready or already capturing');
      return;
    }

    try {
      console.log('Taking picture...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      console.log('Picture taken, URI:', photo.uri);
      await processImage(photo.uri, photo.base64 || null);
      
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      setIsCapturing(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      if (!mediaPermission?.granted) {
        const result = await requestMediaPermission();
        if (!result.granted) {
          Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
          return;
        }
      }

      console.log('Picking image from gallery...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect ratio
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Image selected from gallery, URI:', asset.uri);
        await processImage(asset.uri, asset.base64 || null);
      } else {
        console.log('Image picker cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const getAnalysisTitle = () => {
    switch (type) {
      case 'acne':
        return 'Acne Analysis';
      case 'pigmentation':
        return 'Pigmentation Analysis';
      case 'wrinkles':
        return 'Wrinkles Analysis';
      case 'full':
        return 'Full Skin Scan';
      default:
        return 'Skin Analysis';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <View style={styles.headerButtonCircle}>
            <Ionicons name="arrow-back" size={24} color="#00B894" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getAnalysisTitle()}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleCameraFacing}>
          <View style={styles.headerButtonCircle}>
            <Ionicons name="camera-reverse" size={24} color="#00B894" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => {
          console.log('Camera ready!');
          setIsCameraReady(true);
        }}
      />
      
      {/* Face Overlay Guide - Outside CameraView */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <Svg height={height * 0.7} width={width}>
          {/* Face oval guide */}
          <Ellipse
            cx={width / 2}
            cy={height * 0.35}
            rx={width * 0.35}
            ry={height * 0.28}
            stroke="#00CEC9"
            strokeWidth="3"
            fill="none"
            opacity={0.8}
          />
          
          {/* Center guide line */}
          <Line
            x1={width / 2}
            y1={height * 0.15}
            x2={width / 2}
            y2={height * 0.55}
            stroke="#00CEC9"
            strokeWidth="2"
            strokeDasharray="10,10"
            opacity={0.6}
          />

          {/* Instruction text */}
          <SvgText
            x={width / 2}
            y={height * 0.12}
            fontSize="16"
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
            stroke="#000000"
            strokeWidth="4"
          >
            Align your face within the oval
          </SvgText>
        </Svg>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionHeader}>
          <Ionicons name="bulb" size={20} color="#00B894" />
          <Text style={styles.instructionTitle}>Capture Tips</Text>
        </View>
        <View style={styles.instructionsList}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionDot} />
            <Text style={styles.instructionText}>Center your face in the oval</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionDot} />
            <Text style={styles.instructionText}>Ensure good lighting</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionDot} />
            <Text style={styles.instructionText}>Keep neutral expression</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickImageFromGallery}
          disabled={isCapturing}
          activeOpacity={0.8}
        >
          <Ionicons name="images" size={24} color="#00B894" />
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
          disabled={isCapturing}
          activeOpacity={0.8}
        >
          {isCapturing ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <View style={styles.captureButtonInner}>
              <Ionicons name="camera" size={32} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={styles.galleryButton} />
        
        {isCapturing && (
          <Text style={styles.capturingText}>Processing...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F7FFFE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '400',
  },
  permissionButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#00B894',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
  },
  instructionText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00B894',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#00B894',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});