/**
 * Image quality validation utilities
 */
import { BACKEND_URL } from '../config/api';
import { authService } from '../services/auth';

export interface ImageQualityResult {
  overall_score: number;
  overall_status: 'excellent' | 'good' | 'fair' | 'poor' | 'error';
  is_acceptable: boolean;
  metrics: {
    focus: { score: number; status: string };
    lighting: { score: number; status: string };
    distance: { score: number; status: string };
    resolution: { score: number; status: string };
  };
  recommendations: string[];
  error?: string;
}

export const validateImageQuality = async (
  imageBase64: string
): Promise<ImageQualityResult> => {
  try {
    const token = await authService.getAccessToken();
    const response = await fetch(`${BACKEND_URL}/api/image/validate-quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64 }),
    });

    if (!response.ok) {
      throw new Error('Quality validation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Image quality validation error:', error);
    return {
      overall_score: 0,
      overall_status: 'error',
      is_acceptable: false,
      metrics: {
        focus: { score: 0, status: 'error' },
        lighting: { score: 0, status: 'error' },
        distance: { score: 0, status: 'error' },
        resolution: { score: 0, status: 'error' },
      },
      recommendations: ['Failed to validate image quality'],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getQualityStatusColor = (status: string): string => {
  switch (status) {
    case 'excellent':
      return '#4CAF50';
    case 'good':
      return '#8BC34A';
    case 'fair':
      return '#FFC107';
    case 'poor':
      return '#FF6B6B';
    default:
      return '#636E72';
  }
};

export const getQualityStatusIcon = (status: string): string => {
  switch (status) {
    case 'excellent':
      return 'checkmark-circle';
    case 'good':
      return 'checkmark-circle-outline';
    case 'fair':
      return 'warning-outline';
    case 'poor':
      return 'close-circle';
    default:
      return 'help-circle-outline';
  }
};
