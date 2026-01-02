/**
 * Retry utility with exponential backoff
 * Useful for handling transient API failures
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.response?.status >= 500) return true;
    if (error.message?.includes('timeout')) return true;
    return false;
  },
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry (should return a Promise)
 * @param options - Retry options
 * @returns Promise that resolves with the function result
 * @throws The last error if all retries fail
 * 
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error; // Don't retry non-retryable errors
      }

      // Don't sleep after the last attempt
      if (attempt < opts.maxAttempts) {
        const { logger } = await import('./logger');
        logger.warn(
          `Retry attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`,
          { error: error instanceof Error ? error.message : String(error) }
        );

        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }
  }

  // All retries failed
  const { logger } = await import('./logger');
  logger.error(
    `All ${opts.maxAttempts} retry attempts failed`,
    { error: lastError instanceof Error ? lastError.message : String(lastError) }
  );
  throw lastError;
}

/**
 * Retry a function with exponential backoff, but return null instead of throwing
 * Useful for non-critical operations that can fail silently
 */
export async function retryOrNull<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  try {
    return await retry(fn, options);
  } catch (error) {
    return null;
  }
}

