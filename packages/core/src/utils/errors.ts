/**
 * Custom error classes and error handling utilities
 */

/**
 * Base error class for Lumerisca
 */
export class LumeriscaError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public cause?: any
  ) {
    super(message);
    this.name = "LumeriscaError";
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    // In production, don't expose implementation details
    if (process.env.NODE_ENV === "production") {
      return this.message;
    }
    return `${this.message}${this.cause ? ` (${this.cause.message})` : ""}`;
  }
}

/**
 * API-related errors
 */
export class ApiError extends LumeriscaError {
  constructor(
    message: string,
    statusCode: number,
    public provider?: string,
    cause?: any
  ) {
    super(message, "API_ERROR", statusCode, cause);
    this.name = "ApiError";
  }

  static fromResponse(response: Response, provider?: string): ApiError {
    return new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      provider
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends LumeriscaError {
  constructor(message: string, public field?: string, cause?: any) {
    super(message, "CONFIG_ERROR", undefined, cause);
    this.name = "ConfigError";
  }
}

/**
 * Context collection errors
 */
export class ContextError extends LumeriscaError {
  constructor(message: string, cause?: any) {
    super(message, "CONTEXT_ERROR", undefined, cause);
    this.name = "ContextError";
  }
}

/**
 * RAG-related errors
 */
export class RagError extends LumeriscaError {
  constructor(message: string, cause?: any) {
    super(message, "RAG_ERROR", undefined, cause);
    this.name = "RagError";
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends LumeriscaError {
  constructor(message: string, public timeoutMs: number) {
    super(message, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}

/**
 * Create timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(errorMessage, timeoutMs)), timeoutMs)
    ),
  ]);
}

/**
 * Safely execute a function and catch errors
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => T | Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      return await errorHandler(error);
    }
    throw error;
  }
}

/**
 * Check if error is a specific type
 */
export function isErrorType<T extends Error>(
  error: any,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Format error for user display
 */
export function formatError(error: any): string {
  if (error instanceof LumeriscaError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}

/**
 * Extract error details for logging
 */
export function extractErrorDetails(error: any): {
  message: string;
  name: string;
  stack?: string;
  code?: string;
  statusCode?: number;
} {
  return {
    message: error.message || String(error),
    name: error.name || "Error",
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode || error.status,
  };
}
