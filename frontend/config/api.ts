/**
 * API Configuration
 * Centralized configuration for backend API calls
 */

// Backend URL
export const BACKEND_URL = 'http://187.127.149.141';

// API Endpoints
export const API_ENDPOINTS = {
  // Health & Info
  health: `${BACKEND_URL}/api/health`,
  root: `${BACKEND_URL}/`,
  
  // YOLO Detection
  analyzeYOLO: `${BACKEND_URL}/api/analyze/yolo`,
  
  // Scans
  scans: `${BACKEND_URL}/api/scans`,
  scanById: (id: string) => `${BACKEND_URL}/api/scans/${id}`,
  scanStats: `${BACKEND_URL}/api/scans/stats/summary`,
  
  // Utilities
  extractPixels: `${BACKEND_URL}/api/extract-pixels`,
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second base delay
} as const;

// Helper function to check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.health, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
};

// Log current backend URL (for debugging)
if (__DEV__) {
  console.log('🔗 Backend URL:', BACKEND_URL);
  console.log('📡 API Endpoints:', API_ENDPOINTS);
}
