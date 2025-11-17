/**
 * @lumerisca/core
 * Core engine for Lumerisca browser AI assistant
 */

// Types
export type {
  PageContext,
  InitialContext,
  PageMap,
  PageMapEntry,
  RagSource,
  RagResult,
  LLMProvider,
  ChatMessage,
  LLMConfig,
  ExtensionSettings,
} from "./types.js";

// Context collectors
export { buildInitialContext } from "./context/urlContext.js";
export { collectDomContext, collectFullPageContext } from "./context/domCollector.js";
export { NetworkContextCollector } from "./context/networkContext.js";

// Page mapping
export { resolvePageSources, DEFAULT_PAGE_MAP } from "./mapping/pageMapper.js";

// RAG
export { DocumentStore, DEFAULT_DOCUMENTS } from "./rag/documentStore.js";
export {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
} from "./rag/embeddings.js";
export { RagEngine, simpleKeywordRetrieval } from "./rag/ragEngine.js";

// LLM
export { PROVIDERS, getProviderConfig, getDefaultModel } from "./llm/providers.js";
export { LLMClient, callLLM, buildPromptWithContext } from "./llm/llmClient.js";
export { EnhancedLLMClient, callLLMEnhanced } from "./llm/llmClientEnhanced.js";

// Utilities
export { logger, LogLevel } from "./utils/logger.js";
export type { LogEntry } from "./utils/logger.js";
export {
  validatePrompt,
  validateUrl,
  validateApiKey,
  validatePageTitle,
  validateModel,
  sanitizeText,
  sanitizeHtml,
  ValidationError,
  MAX_LENGTHS,
} from "./utils/validation.js";
export {
  rateLimiter,
  RateLimiter,
  RateLimitError,
  DEFAULT_RATE_LIMITS,
} from "./utils/rateLimiter.js";
export type { RateLimitConfig } from "./utils/rateLimiter.js";
export {
  retry,
  retryWithJitter,
  makeRetryable,
  isRetryableError,
  RetryExhaustedError,
  DEFAULT_RETRY_CONFIG,
} from "./utils/retry.js";
export type { RetryConfig } from "./utils/retry.js";
export {
  LumeriscaError,
  ApiError,
  ConfigError,
  ContextError,
  RagError,
  TimeoutError,
  withTimeout,
  tryCatch,
  formatError,
  extractErrorDetails,
} from "./utils/errors.js";
export {
  performanceMonitor,
  measured,
  measureAsync,
  measure,
  logPerformanceSummary,
} from "./utils/performance.js";
export type { PerformanceMetric } from "./utils/performance.js";
