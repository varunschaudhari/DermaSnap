/**
 * Storage cleanup utilities for managing AsyncStorage space
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clean up old scan data to free up storage space
 */
export const cleanupOldScans = async (maxScansPerProfile: number = 5): Promise<void> => {
  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Find all scan storage keys
    const scanKeys = allKeys.filter(key => key.startsWith('skin_scans_'));
    
    for (const key of scanKeys) {
      try {
        const scansData = await AsyncStorage.getItem(key);
        if (scansData) {
          const scans = JSON.parse(scansData);
          if (scans.length > maxScansPerProfile) {
            // Keep only the most recent scans
            const trimmedScans = scans.slice(0, maxScansPerProfile);
            await AsyncStorage.setItem(key, JSON.stringify(trimmedScans));
            console.log(`Cleaned up ${key}: kept ${trimmedScans.length} of ${scans.length} scans`);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${key}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
};

/**
 * Get storage usage estimate
 */
export const getStorageInfo = async (): Promise<{ keys: number; estimatedSize: string }> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    let totalSize = 0;
    
    for (const key of allKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      } catch (error) {
        // Skip if can't read
      }
    }
    
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      keys: allKeys.length,
      estimatedSize: `${sizeInMB} MB`
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { keys: 0, estimatedSize: 'Unknown' };
  }
};

/**
 * Clear all scan data (use with caution!)
 */
export const clearAllScans = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const scanKeys = allKeys.filter(key => 
      key.startsWith('skin_scans_') || 
      key === 'latest_scan_result' ||
      key === 'temp_scan_image'
    );
    
    await AsyncStorage.multiRemove(scanKeys);
    console.log(`Cleared ${scanKeys.length} scan-related keys`);
  } catch (error) {
    console.error('Error clearing scans:', error);
    throw error;
  }
};
