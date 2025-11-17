/**
 * Retry logic with exponential backoff
 * Handles transient failures in API calls and network requests
 */

import { logger } from "./logger.js";

const log = logger.scope("Retry");

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry error
 */
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: any
  ) {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

/**
 * Check if error is retryable (network errors, rate limits, server errors)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === "NetworkError" || error.name === "TypeError") {
    return true;
  }

  // HTTP errors - retry on 429 (rate limit) and 5xx (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  if (error.status === 429) {
    return true;
  }

  // Timeout errors
  if (error.name === "TimeoutError" || error.message?.includes("timeout")) {
    return true;
  }

  return false;
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    retryableErrors,
  } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log.debug(`Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const shouldRetry = retryableErrors
        ? retryableErrors(error)
        : isRetryableError(error);

      if (!shouldRetry || attempt === maxAttempts) {
        log.error(`Retry exhausted after ${attempt} attempts`, error);
        throw new RetryExhaustedError(
          `Failed after ${attempt} attempts: ${error.message}`,
          attempt,
          error
        );
      }

      log.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: error.message,
      });

      // Wait before retrying
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with jitter (randomized delay to prevent thundering herd)
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    retryableErrors,
  } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log.debug(`Attempt ${attempt}/${maxAttempts} (with jitter)`);
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = retryableErrors
        ? retryableErrors(error)
        : isRetryableError(error);

      if (!shouldRetry || attempt === maxAttempts) {
        throw new RetryExhaustedError(
          `Failed after ${attempt} attempts: ${error.message}`,
          attempt,
          error
        );
      }

      // Add jitter (random 0-50% of delay)
      const jitter = Math.random() * delay * 0.5;
      const totalDelay = delay + jitter;

      log.warn(`Attempt ${attempt} failed, retrying in ${Math.round(totalDelay)}ms`, {
        error: error.message,
      });

      await sleep(totalDelay);

      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: Partial<RetryConfig>
): T {
  return ((...args: any[]) => retry(() => fn(...args), config)) as T;
}
