/**
 * Startup optimization utilities
 * Hide splash screen immediately and load data in background
 */
import * as SplashScreen from 'expo-splash-screen';

let splashHidden = false;

/**
 * Hide splash screen immediately without waiting for data
 */
export async function hideSplashScreenFast() {
  console.log('[Splash] Hiding splash screen');
  if (!splashHidden) {
    try {
      await SplashScreen.hideAsync();
      splashHidden = true;
      console.log('[Splash] ✅ Hidden');
    } catch (error) {
      console.warn('[Splash] ❌ Error:', error);
    }
  }
}

/**
 * Load critical data in background (non-blocking)
 */
export function loadDataInBackground(loadFn: () => Promise<void>) {
  // Don't await - let it load in background
  loadFn().catch((error) => {
    console.warn('Background data load failed:', error);
  });
}

/**
 * Preload with timeout - useful for network calls
 */
export async function preloadWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 2000
): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch (error) {
    console.warn('Preload failed:', error);
    return null;
  }
}
