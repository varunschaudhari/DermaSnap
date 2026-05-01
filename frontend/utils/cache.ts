/**
 * Local caching utility for storing API responses
 * Reduces network calls and improves app responsiveness
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@dermasnap_cache:';
const CACHE_EXPIRY_PREFIX = '@dermasnap_expiry:';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache data with optional TTL (time-to-live)
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlMinutes: number = 60
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };

    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    const expiryTime = Date.now() + ttlMinutes * 60 * 1000;

    await AsyncStorage.multiSet([
      [cacheKey, JSON.stringify(entry)],
      [expiryKey, expiryTime.toString()],
    ]);
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
}

/**
 * Get cached data if not expired
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;

    const [cachedData, expiryTime] = await AsyncStorage.multiGet([cacheKey, expiryKey]);

    if (!cachedData[1]) {
      return null; // No cache entry
    }

    const expiry = parseInt(expiryTime[1] || '0');
    if (Date.now() > expiry) {
      // Cache expired, remove it
      await AsyncStorage.multiRemove([cacheKey, expiryKey]);
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cachedData[1]);
    return entry.data;
  } catch (error) {
    console.warn('Cache get failed:', error);
    return null;
  }
}

/**
 * Clear specific cache entry
 */
export async function clearCache(key: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
  } catch (error) {
    console.warn('Cache clear failed:', error);
  }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (key) => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.warn('Clear all cache failed:', error);
  }
}

/**
 * Fetch with automatic caching
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMinutes: number = 60
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  await setCache(key, data, ttlMinutes);

  return data;
}
