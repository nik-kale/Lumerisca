/**
 * Rate limiting utility to prevent API abuse and quota exhaustion
 * Implements token bucket algorithm with per-provider limits
 */

import { logger } from "./logger.js";

const log = logger.scope("RateLimiter");

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string; // Prefix for storage keys
}

/**
 * Default rate limits per provider
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  openai: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
  anthropic: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
  openrouter: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute (more lenient)
  },
  embeddings: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 embedding requests per minute
  },
};

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  /**
   * Check if a request is allowed and consume a token
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMITS.openai
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now();
    const bucketKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;

    // Get or create bucket
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        tokens: config.maxRequests,
        lastRefill: now,
      };
      this.buckets.set(bucketKey, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceRefill = now - bucket.lastRefill;
    const refillRate = config.maxRequests / config.windowMs;
    const tokensToAdd = Math.floor(timeSinceRefill * refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      log.debug(`Rate limit check passed for ${key}`, {
        remaining: bucket.tokens,
      });
      return { allowed: true };
    }

    // Calculate retry after time
    const tokensNeeded = 1;
    const timeForTokens = (tokensNeeded / refillRate);
    const retryAfter = Math.ceil(timeForTokens / 1000); // Convert to seconds

    log.warn(`Rate limit exceeded for ${key}`, {
      retryAfter,
    });

    return {
      allowed: false,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.buckets.delete(key);
    log.info(`Rate limit reset for ${key}`);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.buckets.clear();
    log.info("All rate limits cleared");
  }

  /**
   * Get current token count for a key
   */
  getTokens(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket?.tokens ?? 0;
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimiter();

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Decorator/wrapper to add rate limiting to async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  config?: RateLimitConfig
): T {
  return (async (...args: any[]) => {
    const result = await rateLimiter.checkLimit(key, config);

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        result.retryAfter!
      );
    }

    return fn(...args);
  }) as T;
}
