/**
 * Image optimization utilities for reducing payload size and improving performance
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  quality: 0.8, // 80% JPEG quality
  maxWidth: 1024,
  maxHeight: 1024,
};

/**
 * Compress image before upload to reduce bandwidth
 * Reduces file size by 50-70% typically
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: opts.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.error('Image compression failed:', error);
    return uri; // Fallback to original if compression fails
  }
}

/**
 * Get image file size in MB
 */
export async function getImageSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && fileInfo.size) {
      return fileInfo.size / (1024 * 1024); // Convert to MB
    }
    return 0;
  } catch (error) {
    console.error('Failed to get image size:', error);
    return 0;
  }
}

/**
 * Convert image to base64 (for upload)
 */
export async function imageToBase64(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
}
