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
export { debugCollector, DebugCollector } from "./utils/debugCollector.js";
export type { DebugEvent } from "./utils/debugCollector.js";

// Media Processing
export {
  extractVideoId,
  fetchTranscript,
  fetchMetadata,
  extractChapters,
  transcriptToText,
  formatTimestamp,
  extractYouTubeData,
  generateSummaryPrompt,
} from "./media/youtubeExtractor.js";
export type {
  YouTubeTranscript,
  YouTubeChapter,
  YouTubeMetadata,
  YouTubeExtraction,
} from "./media/youtubeExtractor.js";

export {
  extractFromFile as extractPdfFromFile,
  extractFromUrl as extractPdfFromUrl,
  searchInPdf,
  generatePdfChatPrompt,
  generatePdfSummaryPrompt,
  extractPageRange,
  detectTables,
  generateCitation,
} from "./media/pdfExtractor.js";
export type {
  PDFPage,
  PDFMetadata,
  PDFExtraction,
  PDFTable,
} from "./media/pdfExtractor.js";

export {
  extractFromImage,
  extractFromImageUrl,
  extractFromDataUrl,
  detectTablesInOCR,
  extractCodeFromOCR,
  getConfidenceLevel,
  downloadLanguage,
  SUPPORTED_LANGUAGES,
} from "./media/ocrEngine.js";
export type {
  OCRResult,
  OCRWord,
  OCRLine,
  BoundingBox,
  OCROptions,
} from "./media/ocrEngine.js";

export {
  imageToDataUrl,
  compressImage,
  detectAnalysisType,
  generateAnalysisPrompt,
  generateUIAnalysisPrompt,
  generateCodeAnalysisPrompt,
  generateDiagramAnalysisPrompt,
  parseAnalysisResponse,
  captureScreenshot,
  annotateImage,
  compareImages,
} from "./media/imageAnalyzer.js";
export type {
  ImageAnalysis,
  ImageElement,
  AnalysisType,
  AnalysisOptions,
} from "./media/imageAnalyzer.js";

// Advanced Search (v3.0)
export {
  BM25,
  bm25Search,
} from "./search/bm25.js";
export type {
  BM25Document,
  BM25Result,
  BM25Params,
} from "./search/bm25.js";

export {
  HybridSearch,
  hybridSearch,
  ragSourceToHybridDoc,
} from "./search/hybridSearch.js";
export type {
  HybridSearchDocument,
  HybridSearchResult,
  HybridSearchOptions,
} from "./search/hybridSearch.js";

export {
  SemanticChunker,
  chunkText,
  chunkDocuments,
} from "./rag/semanticChunker.js";
export type {
  Chunk,
  ChunkMetadata,
  ChunkingOptions,
} from "./rag/semanticChunker.js";

export {
  KnowledgeGraph,
  extractEntities,
} from "./graph/knowledgeGraph.js";
export type {
  Entity,
  Mention,
  Relationship,
  EntityType,
  RelationType,
  GraphQuery,
} from "./graph/knowledgeGraph.js";

// Productivity & Integrations (v4.0)
export {
  TaskManager,
  extractTasksFromText,
} from "./productivity/taskManager.js";
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskFilter,
} from "./productivity/taskManager.js";

export {
  htmlToMarkdown,
  markdownToPlainText,
  htmlToPlainText,
  extractHeadings,
  generateTableOfContents,
  countWords,
  estimateReadingTime,
  extractLinks,
  extractImages,
  formatCodeBlock,
  createTable,
} from "./converter/markdown.js";
export type {
  ConversionOptions,
} from "./converter/markdown.js";
export { ConversationExporter } from "./converter/conversationExporter.js";

// Advanced AI & Multi-Model (v5.0)
export {
  ModelRouter,
  routeToModel,
} from "./models/modelRouter.js";
export type {
  ModelCapabilities,
  TaskType,
  RoutingOptions,
  RoutingResult,
} from "./models/modelRouter.js";
export {
  ModelRegistry,
  modelRegistry,
} from "./models/modelRegistry.js";
export type { ModelRegistryConfig } from "./models/modelRegistry.js";

