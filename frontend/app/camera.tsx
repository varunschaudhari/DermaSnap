import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Ellipse, Line, Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-off" size={64} color="#95A5A6" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          SkinQuant AI needs access to your camera to capture and analyze your skin.
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

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });

      // Navigate to processing screen
      router.push({
        pathname: '/processing',
        params: {
          imageUri: photo.uri,
          imageBase64: photo.base64,
          analysisType: type,
        },
      });
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getAnalysisTitle()}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Face Overlay Guide */}
        <View style={styles.overlayContainer}>
          <Svg height={height * 0.7} width={width}>
            {/* Face oval guide */}
            <Ellipse
              cx={width / 2}
              cy={height * 0.35}
              rx={width * 0.35}
              ry={height * 0.28}
              stroke="#4A90E2"
              strokeWidth="3"
              fill="none"
              opacity={0.7}
            />
            
            {/* Center guide line */}
            <Line
              x1={width / 2}
              y1={height * 0.15}
              x2={width / 2}
              y2={height * 0.55}
              stroke="#4A90E2"
              strokeWidth="2"
              strokeDasharray="10,10"
              opacity={0.5}
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
              strokeWidth="3"
              paintOrder="stroke"
            >
              Align your face within the oval
            </SvgText>
          </Svg>
        </View>
      </CameraView>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color="#4A90E2" />
          <Text style={styles.instructionText}>Position Tips:</Text>
        </View>
        <Text style={styles.instructionDetail}>• Keep face centered in the oval</Text>
        <Text style={styles.instructionDetail}>• Ensure good lighting (avoid shadows)</Text>
        <Text style={styles.instructionDetail}>• Maintain neutral expression</Text>
        <Text style={styles.instructionDetail}>• Keep phone at arm's length</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>
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
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionDetail: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#4A90E2',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E2',
  },
});