/**
 * Input validation and sanitization utilities
 * Protects against XSS, injection, and malformed input
 */

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Maximum lengths for various inputs
 */
export const MAX_LENGTHS = {
  PROMPT: 4000,
  URL: 2048,
  TITLE: 500,
  API_KEY: 200,
  DOC_CONTENT: 50000,
} as const;

/**
 * API key format patterns
 */
const API_KEY_PATTERNS = {
  openai: /^sk-[A-Za-z0-9]{48,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9-_]{90,}$/,
  openrouter: /^sk-or-v1-[A-Za-z0-9]{64,}$/,
} as const;

/**
 * Validate and sanitize user prompt
 */
export function validatePrompt(prompt: string): string {
  if (typeof prompt !== "string") {
    throw new ValidationError("Prompt must be a string", "prompt");
  }

  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Prompt cannot be empty", "prompt");
  }

  if (trimmed.length > MAX_LENGTHS.PROMPT) {
    throw new ValidationError(
      `Prompt exceeds maximum length of ${MAX_LENGTHS.PROMPT} characters`,
      "prompt"
    );
  }

  // Remove potentially dangerous characters
  const sanitized = sanitizeText(trimmed);

  return sanitized;
}

/**
 * Validate URL
 */
export function validateUrl(url: string, httpsOnly = true): string {
  if (typeof url !== "string") {
    throw new ValidationError("URL must be a string", "url");
  }

  if (url.length > MAX_LENGTHS.URL) {
    throw new ValidationError(
      `URL exceeds maximum length of ${MAX_LENGTHS.URL} characters`,
      "url"
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ValidationError("Invalid URL format", "url");
  }

  if (httpsOnly && parsedUrl.protocol !== "https:") {
    throw new ValidationError("Only HTTPS URLs are allowed", "url");
  }

  // Block localhost and private IPs in production
  if (isPrivateNetwork(parsedUrl.hostname)) {
    throw new ValidationError(
      "URLs to private networks are not allowed",
      "url"
    );
  }

  return parsedUrl.toString();
}

/**
 * Validate API key format
 */
export function validateApiKey(
  apiKey: string,
  provider: "openai" | "anthropic" | "openrouter"
): string {
  if (typeof apiKey !== "string") {
    throw new ValidationError("API key must be a string", "apiKey");
  }

  const trimmed = apiKey.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("API key cannot be empty", "apiKey");
  }

  if (trimmed.length > MAX_LENGTHS.API_KEY) {
    throw new ValidationError("API key format is invalid", "apiKey");
  }

  // Validate format based on provider
  const pattern = API_KEY_PATTERNS[provider];
  if (pattern && !pattern.test(trimmed)) {
    throw new ValidationError(
      `API key format is invalid for ${provider}`,
      "apiKey"
    );
  }

  return trimmed;
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove inline event handlers
    .trim();
}

/**
 * Sanitize HTML for safe display
 * Basic sanitization - for production, use DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") {
    return "";
  }

  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*"javascript:[^"]*"/gi, 'src=""');

  return sanitized;
}

/**
 * Check if hostname is a private network address
 */
function isPrivateNetwork(hostname: string): boolean {
  // Localhost
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }

  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // Link-local
  ];

  return privateRanges.some((range) => range.test(hostname));
}

/**
 * Validate page title
 */
export function validatePageTitle(title: string): string {
  if (typeof title !== "string") {
    return "Untitled Page";
  }

  const sanitized = sanitizeText(title);

  if (sanitized.length > MAX_LENGTHS.TITLE) {
    return sanitized.substring(0, MAX_LENGTHS.TITLE) + "...";
  }

  return sanitized || "Untitled Page";
}

/**
 * Validate model name
 */
export function validateModel(model: string): string {
  if (typeof model !== "string") {
    throw new ValidationError("Model must be a string", "model");
  }

  const trimmed = model.trim();

  // Basic alphanumeric + dash/dot/slash validation
  if (!/^[a-zA-Z0-9.\-_/]+$/.test(trimmed)) {
    throw new ValidationError("Invalid model name format", "model");
  }

  return trimmed;
}

/**
 * Validate document content
 */
export function validateDocContent(content: string): string {
  if (typeof content !== "string") {
    throw new ValidationError("Document content must be a string", "content");
  }

  if (content.length > MAX_LENGTHS.DOC_CONTENT) {
    throw new ValidationError(
      `Document content exceeds maximum length of ${MAX_LENGTHS.DOC_CONTENT} characters`,
      "content"
    );
  }

  return content;
}

/**
 * Safely parse JSON with size limit
 */
export function safeJsonParse<T = any>(
  json: string,
  maxSize = 1024 * 1024
): T {
  if (typeof json !== "string") {
    throw new ValidationError("JSON must be a string");
  }

  if (json.length > maxSize) {
    throw new ValidationError(`JSON exceeds maximum size of ${maxSize} bytes`);
  }

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new ValidationError("Invalid JSON format");
  }
}
