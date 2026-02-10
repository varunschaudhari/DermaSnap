// YOLO-based lesion detection interface
// Supports both mobile TFLite (future) and backend processing
import { BACKEND_URL } from '../config/api';

export interface YOLOBox {
  x: number; // Center x
  y: number; // Center y
  width: number; // Box width
  height: number; // Box height
  confidence: number; // Detection confidence (0-1)
  class: 'inflammatory' | 'non-inflammatory' | 'pustule' | 'papule' | 'nodule' | 'comedone';
  classId: number;
}

export interface YOLODetectionResult {
  boxes: YOLOBox[];
  model: string; // 'yolov8-nano' | 'yolov11-nano' | 'custom'
  inferenceTime: number; // milliseconds
  method: 'mobile' | 'backend';
}

/**
 * Detect lesions using YOLO model
 * Can use mobile TFLite (future) or backend processing
 */
export const detectWithYOLO = async (
  imageBase64: string,
  width: number,
  height: number,
  useBackend: boolean = true
): Promise<YOLODetectionResult> => {
  // For now, use backend YOLO processing
  // Future: can add mobile TFLite support here
  if (useBackend) {
    return await detectWithYOLOBackend(imageBase64, width, height);
  }
  
  // Future: Mobile TFLite implementation
  // return await detectWithYOLOMobile(imageBase64, width, height);
  
  throw new Error('YOLO detection not available');
};

/**
 * Detect lesions using backend YOLO model
 */
const detectWithYOLOBackend = async (
  imageBase64: string,
  width: number,
  height: number
): Promise<YOLODetectionResult> => {
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BACKEND_URL}/api/analyze/yolo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        width,
        height,
      }),
    });

    if (!response.ok) {
      throw new Error(`YOLO detection failed: ${response.statusText}`);
    }

    const result: unknown  = await response.json();
    if (
      typeof result !== 'object' ||
      result === null ||
      !('boxes' in result) ||
      !Array.isArray((result as { boxes: unknown }).boxes)
    ) {
      throw new Error('Invalid YOLO detection response');
    }
    const inferenceTime = Date.now() - startTime;

    // Convert backend boxes to YOLOBox format
    const boxes: YOLOBox[] = ((result as { boxes: unknown[] }).boxes || []).map((box: any) => ({
      x: box.x || box.centerX || 0,
      y: box.y || box.centerY || 0,
      width: box.width || 0,
      height: box.height || 0,
      confidence: box.confidence || box.score || 0,
      class: mapClassIdToType(box.classId || box.class || 0),
      classId: box.classId || box.class || 0,
    }));

    return {
      boxes,
      model: (result as { model?: string }).model || 'yolov8-nano',
      inferenceTime,
      method: 'backend',
    };
  } catch (error: any) {
    console.warn('YOLO backend detection failed:', error.message);
    throw error;
  }
};

/**
 * Map class ID to lesion type
 */
const mapClassIdToType = (classId: number): YOLOBox['class'] => {
  // Standard YOLO class mapping (adjust based on your trained model)
  const classMap: Record<number, YOLOBox['class']> = {
    0: 'comedone',
    1: 'papule',
    2: 'pustule',
    3: 'nodule',
    4: 'inflammatory',
    5: 'non-inflammatory',
  };
  
  return classMap[classId] || 'inflammatory';
};

/**
 * Future: Mobile TFLite YOLO detection
 * This would use @tensorflow/tfjs-react-native or react-native-fast-tflite
 */
// const detectWithYOLOMobile = async (
//   imageBase64: string,
//   width: number,
//   height: number
// ): Promise<YOLODetectionResult> => {
//   // Implementation for mobile TFLite
//   // Would load YOLOv8-nano.tflite model
//   // Process image tensor
//   // Return boxes
//   throw new Error('Mobile YOLO not yet implemented');
// };
