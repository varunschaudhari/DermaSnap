/**
 * Debounce utilities to reduce unnecessary function calls
 * Useful for quality checks and event handlers
 */

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Debounce function - delays execution until after wait ms of inactivity
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 500,
  immediate: boolean = false
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let result: any;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        result = func.apply(this, args);
      }
    };

    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(later, wait);

    if (callNow) {
      result = func.apply(this, args);
    }

    return result;
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      result = func.apply(this, []);
      timeout = null;
    }
  };

  return debounced as DebouncedFunction<T>;
}

/**
 * Throttle function - limits function execution to at most once per wait ms
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 500
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let result: any;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (!previous) previous = now;

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        result = func.apply(this, args);
      }, remaining);
    }

    return result;
  };

  throttled.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    previous = 0;
  };

  throttled.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      previous = Date.now();
      timeout = null;
      result = func.apply(this, []);
    }
  };

  return throttled as DebouncedFunction<T>;
}
