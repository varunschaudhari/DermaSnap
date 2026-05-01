/**
 * API retry logic with exponential backoff
 * Improves reliability on unstable networks
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number; // ms
  maxDelay?: number; // ms
  backoffMultiplier?: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Calculate delay with exponential backoff
 */
function getDelay(attempt: number, config: RetryConfig): number {
  const { baseDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = config;
  const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}

/**
 * Retry fetch with exponential backoff
 * Retries on network errors or 5xx status codes
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<Response> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxRetries = 3 } = finalConfig;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on 5xx errors
      if (response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = getDelay(attempt, finalConfig);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Retry on network errors
      if (attempt < maxRetries) {
        const delay = getDelay(attempt, finalConfig);
        console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Retry async function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxRetries = 3 } = finalConfig;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = getDelay(attempt, finalConfig);
        console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
