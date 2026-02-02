/**
 * API Service
 * Centralized service for all backend API calls
 */

import { API_ENDPOINTS, API_CONFIG } from '../config/api';

export interface MLAnalysisRequest {
  imageBase64: string;
  analysisType: 'acne' | 'pigmentation' | 'wrinkles' | 'full';
  timestamp?: string;
}

export interface MLAnalysisResponse {
  id: string;
  ml_analysis: {
    acne?: {
      totalCount?: number;
      severity: string;
    };
    pigmentation?: {
      pigmentedPercent?: number;
      severity: string;
    };
    wrinkles?: {
      count?: number;
      severity: string;
    };
  };
  analysis: string;
  model: string;
  confidence: string;
  method: string;
  timestamp: string;
  analysisType: string;
}

export interface ScanData {
  imageUri?: string;
  imageBase64?: string;
  skinTone: { r: number; g: number; b: number };
  timestamp: string;
  analysisType: string;
  acne?: any;
  pigmentation?: any;
  wrinkles?: any;
  profileId?: string;
}

export interface ScanResponse {
  id: string;
  message: string;
}

/**
 * Create timeout signal for fetch requests
 */
const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

/**
 * Analyze image using MedGemma ML model
 */
export const analyzeWithML = async (
  request: MLAnalysisRequest,
  retries: number = API_CONFIG.retries
): Promise<MLAnalysisResponse> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_ENDPOINTS.analyzeML, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: request.imageBase64,
          analysisType: request.analysisType,
          timestamp: request.timestamp || new Date().toISOString(),
        }),
        signal: createTimeoutSignal(API_CONFIG.timeout) as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML analysis failed (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      
      console.warn(`ML analysis attempt ${attempt}/${retries} failed:`, error.message || error);
      
      if (isLastAttempt) {
        throw new Error(
          `ML analysis failed after ${retries} attempts. ${isTimeout ? 'Request timed out.' : 'Server error.'}`
        );
      }
      
      // Exponential backoff
      const delay = Math.min(API_CONFIG.retryDelay * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('ML analysis failed after all retries');
};

/**
 * Save scan to backend
 */
export const saveScan = async (scanData: ScanData): Promise<ScanResponse> => {
  try {
    const response = await fetch(API_ENDPOINTS.scans, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scanData),
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save scan (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error saving scan:', error);
    throw error;
  }
};

/**
 * Get all scans
 */
export const getScans = async (limit: number = 100, skip: number = 0): Promise<ScanData[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.scans}?limit=${limit}&skip=${skip}`, {
      method: 'GET',
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scans (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching scans:', error);
    throw error;
  }
};

/**
 * Get scan by ID
 */
export const getScanById = async (scanId: string): Promise<ScanData> => {
  try {
    const response = await fetch(API_ENDPOINTS.scanById(scanId), {
      method: 'GET',
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Scan not found');
      }
      throw new Error(`Failed to fetch scan (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching scan:', error);
    throw error;
  }
};

/**
 * Delete scan by ID
 */
export const deleteScan = async (scanId: string): Promise<void> => {
  try {
    const response = await fetch(API_ENDPOINTS.scanById(scanId), {
      method: 'DELETE',
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete scan (${response.status})`);
    }
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    throw error;
  }
};

/**
 * Get scan statistics
 */
export const getScanStats = async (): Promise<any> => {
  try {
    const response = await fetch(API_ENDPOINTS.scanStats, {
      method: 'GET',
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

/**
 * Extract pixels from image (backend utility)
 */
export const extractPixels = async (
  imageBase64: string,
  width: number = 800,
  height: number = 600
): Promise<Uint8ClampedArray> => {
  try {
    const response = await fetch(API_ENDPOINTS.extractPixels, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        width,
        height,
      }),
      signal: createTimeoutSignal(API_CONFIG.timeout) as any,
    });

    if (!response.ok) {
      throw new Error(`Pixel extraction failed (${response.status})`);
    }

    const result = await response.json();
    return new Uint8ClampedArray(result.pixels);
  } catch (error: any) {
    console.warn('Backend pixel extraction failed:', error);
    throw error;
  }
};

/**
 * Check backend health
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.health, {
      method: 'GET',
      signal: createTimeoutSignal(5000) as any,
    });
    return response.ok;
  } catch (error) {
    console.warn('Health check failed:', error);
    return false;
  }
};
