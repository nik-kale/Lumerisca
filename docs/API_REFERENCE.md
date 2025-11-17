# Lumerisca API Reference

Complete reference for all modules, functions, and types in the Lumerisca core library.

## Table of Contents

- [Core Types](#core-types)
- [Context Collection](#context-collection)
- [Page Mapping](#page-mapping)
- [RAG Engine](#rag-engine)
- [LLM Client](#llm-client)
- [Utilities](#utilities)
  - [Logger](#logger)
  - [Validation](#validation)
  - [Rate Limiter](#rate-limiter)
  - [Retry Logic](#retry-logic)
  - [Error Handling](#error-handling)

---

## Core Types

Located in `packages/core/src/types.ts`

###  `PageContext`

Represents the current page's context.

```typescript
interface PageContext {
  url: string;         // Full URL of the page
  pathname: string;    // Path portion (e.g., "/dashboard")
  hostname: string;    // Domain name
  title: string;       // Page title
  domSummary: string;  // Extracted text from important DOM elements
}
```

### `PageMap`

Configuration for mapping URL patterns to documentation sources.

```typescript
interface PageMapEntry {
  pattern: string;   // Glob pattern (e.g., "/dashboard*")
  sources: string[]; // Array of document IDs
}

interface PageMap {
  entries: PageMapEntry[];
}
```

### `RagSource`

A document source for RAG retrieval.

```typescript
interface RagSource {
  id: string;            // Unique identifier
  title: string;         // Human-readable title
  content: string;       // Full document content
  embedding?: number[];  // Optional embedding vector
}
```

### `LLMProvider`

Supported LLM providers.

```typescript
type LLMProvider = "openai" | "anthropic" | "openrouter";
```

### `ChatMessage`

A message in a conversation.

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

---

## Context Collection

### `buildInitialContext(url, title)`

Build initial context from URL and title.

**Location:** `packages/core/src/context/urlContext.ts`

```typescript
function buildInitialContext(
  url: string,
  title: string
): InitialContext
```

**Parameters:**
- `url` - Full URL of the page
- `title` - Page title

**Returns:** `InitialContext` object

**Example:**
```typescript
import { buildInitialContext } from "@lumerisca/core";

const context = buildInitialContext(
  "https://example.com/dashboard",
  "Dashboard - My App"
);

console.log(context);
// {
//   url: "https://example.com/dashboard",
//   title: "Dashboard - My App",
//   hostname: "example.com",
//   pathname: "/dashboard"
// }
```

### `collectDomContext(doc)`

Extract important text from DOM elements.

**Location:** `packages/core/src/context/domCollector.ts`

```typescript
function collectDomContext(doc: Document): string
```

**Parameters:**
- `doc` - Document object to analyze

**Returns:** String containing extracted text

**Extracted elements:**
- `h1`, `h2`, `h3` - Headings
- `.error`, `[role="alert"]` - Error messages
- `.notification`, `.alert` - Alerts and notifications
- `.warning`, `.message` - Warnings and messages

**Example:**
```typescript
import { collectDomContext } from "@lumerisca/core";

const summary = collectDomContext(document);
console.log(summary);
// "Dashboard\nMetrics\nError: Failed to load data\n..."
```

### `collectFullPageContext(doc, url, title)`

Collect complete page context including URL and DOM.

**Location:** `packages/core/src/context/domCollector.ts`

```typescript
function collectFullPageContext(
  doc: Document,
  url: string,
  title: string
): PageContext
```

**Example:**
```typescript
import { collectFullPageContext } from "@lumerisca/core";

const context = collectFullPageContext(
  document,
  window.location.href,
  document.title
);
```

---

## Page Mapping

### `resolvePageSources(ctx, pageMap)`

Determine which document sources to use for a given page.

**Location:** `packages/core/src/mapping/pageMapper.ts`

```typescript
function resolvePageSources(
  ctx: PageContext,
  pageMap: PageMap
): string[]
```

**Parameters:**
- `ctx` - Current page context
- `pageMap` - Page mapping configuration

**Returns:** Array of document source IDs

**Example:**
```typescript
import { resolvePageSources, DEFAULT_PAGE_MAP } from "@lumerisca/core";

const sources = resolvePageSources(pageContext, DEFAULT_PAGE_MAP);
console.log(sources);
// ["dashboard_intro", "metrics_guide"]
```

### `DEFAULT_PAGE_MAP`

Default page mapping configuration.

**Location:** `packages/core/src/mapping/pageMapper.ts`

```typescript
const DEFAULT_PAGE_MAP: PageMap = {
  entries: [
    { pattern: "/dashboard*", sources: ["dashboard_intro", "metrics_guide"] },
    { pattern: "/settings*", sources: ["settings_overview", "account_management"] },
    { pattern: "/help*", sources: ["help_center", "faq"] },
    { pattern: "*", sources: ["general_help"] }
  ]
};
```

---

## RAG Engine

### `DocumentStore`

In-memory document storage.

**Location:** `packages/core/src/rag/documentStore.ts`

```typescript
class DocumentStore {
  addDocument(doc: RagSource): void
  addDocuments(docs: RagSource[]): void
  getDocument(id: string): RagSource | undefined
  getDocuments(ids: string[]): RagSource[]
  getAllDocuments(): RagSource[]
  hasDocument(id: string): boolean
  removeDocument(id: string): boolean
  clear(): void
  size(): number
}
```

**Example:**
```typescript
import { DocumentStore, DEFAULT_DOCUMENTS } from "@lumerisca/core";

const store = new DocumentStore();
store.addDocuments(DEFAULT_DOCUMENTS);

const doc = store.getDocument("dashboard_intro");
console.log(doc?.title); // "Dashboard Introduction"
```

### `RagEngine`

RAG retrieval engine with semantic search.

**Location:** `packages/core/src/rag/ragEngine.ts`

```typescript
class RagEngine {
  constructor(documentStore: DocumentStore, apiKey: string)

  async retrieve(
    ctx: PageContext,
    pageMap: PageMap,
    query: string,
    topK?: number
  ): Promise<RagResult[]>

  buildContextString(results: RagResult[]): string
}
```

**Example:**
```typescript
import { RagEngine, DocumentStore, DEFAULT_DOCUMENTS } from "@lumerisca/core";

const store = new DocumentStore();
store.addDocuments(DEFAULT_DOCUMENTS);

const ragEngine = new RagEngine(store, apiKey);

const results = await ragEngine.retrieve(
  pageContext,
  pageMap,
  "How do I view metrics?",
  3  // Top 3 results
);

const contextString = ragEngine.buildContextString(results);
```

### `simpleKeywordRetrieval()`

Fallback retrieval using keyword matching.

**Location:** `packages/core/src/rag/ragEngine.ts`

```typescript
function simpleKeywordRetrieval(
  ctx: PageContext,
  pageMap: PageMap,
  query: string,
  documentStore: DocumentStore,
  topK?: number
): RagResult[]
```

Use this when embeddings API is unavailable or for testing.

---

## LLM Client

### `LLMClient` (Basic)

Basic LLM client without enhanced features.

**Location:** `packages/core/src/llm/llmClient.ts`

```typescript
class LLMClient {
  constructor(config: LLMConfig)
  async chat(messages: ChatMessage[]): Promise<string>
}
```

### `EnhancedLLMClient` (Recommended)

Enhanced client with validation, rate limiting, retry, and timeout.

**Location:** `packages/core/src/llm/llmClientEnhanced.ts`

```typescript
class EnhancedLLMClient {
  constructor(config: LLMConfig, timeoutMs?: number)
  async chat(messages: ChatMessage[]): Promise<string>
  setTimeout(timeoutMs: number): void
}
```

**Features:**
- ✅ Input validation
- ✅ API key format validation
- ✅ Rate limiting
- ✅ Automatic retry with exponential backoff
- ✅ Request timeout (default 30s)
- ✅ Comprehensive error handling
- ✅ Detailed logging

**Example:**
```typescript
import { EnhancedLLMClient } from "@lumerisca/core";

const client = new EnhancedLLMClient({
  provider: "openai",
  apiKey: "sk-...",
  model: "gpt-4o-mini"
}, 30000); // 30 second timeout

const response = await client.chat([
  { role: "system", content: "You are a helpful assistant" },
  { role: "user", content: "Hello!" }
]);

console.log(response);
```

### `callLLMEnhanced()`

Convenience function for one-off LLM calls.

```typescript
async function callLLMEnhanced(
  provider: LLMProvider,
  apiKey: string,
  messages: ChatMessage[],
  model?: string,
  baseUrl?: string,
  timeoutMs?: number
): Promise<string>
```

**Example:**
```typescript
import { callLLMEnhanced } from "@lumerisca/core";

const response = await callLLMEnhanced(
  "openai",
  "sk-...",
  [{ role: "user", content: "Hello!" }],
  "gpt-4o-mini"
);
```

### `buildPromptWithContext()`

Build a prompt with page context and RAG results.

```typescript
function buildPromptWithContext(
  systemPrompt: string,
  pageTitle: string,
  pageUrl: string,
  pageSummary: string,
  ragContext: string,
  userQuestion: string
): ChatMessage[]
```

---

## Utilities

### Logger

Centralized logging with levels and history.

**Location:** `packages/core/src/utils/logger.ts`

#### `logger` (singleton)

```typescript
import { logger, LogLevel } from "@lumerisca/core";

// Set log level
logger.setLevel(LogLevel.DEBUG);  // DEBUG, INFO, WARN, ERROR, NONE
logger.enableDebug();  // Shortcut for DEBUG level

// Log messages
logger.debug("Component", "Debug message", { data: "value" });
logger.info("Component", "Info message");
logger.warn("Component", "Warning message");
logger.error("Component", "Error occurred", error);

// Get history
const history = logger.getHistory();  // LogEntry[]
const json = logger.exportLogs();     // JSON string

// Create scoped logger
const log = logger.scope("MyComponent");
log.info("Started");  // [Lumerisca:MyComponent] Started
```

**Log Levels:**
- `DEBUG (0)` - Detailed debug information
- `INFO (1)` - General information (default)
- `WARN (2)` - Warning messages
- `ERROR (3)` - Error messages
- `NONE (4)` - No logging

### Validation

Input validation and sanitization.

**Location:** `packages/core/src/utils/validation.ts`

#### `validatePrompt()`

```typescript
import { validatePrompt, ValidationError } from "@lumerisca/core";

try {
  const sanitized = validatePrompt(userInput);
  // Use sanitized prompt
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid prompt:", error.message);
  }
}
```

**Checks:**
- Must be non-empty string
- Maximum 4000 characters
- Sanitizes dangerous characters

#### `validateUrl()`

```typescript
import { validateUrl } from "@lumerisca/core";

const safeUrl = validateUrl(url, true);  // true = HTTPS only
```

**Checks:**
- Valid URL format
- HTTPS only (if httpsOnly=true)
- Not a private network address
- Maximum 2048 characters

#### `validateApiKey()`

```typescript
import { validateApiKey } from "@lumerisca/core";

const key = validateApiKey(apiKey, "openai");
```

**Validates format:**
- OpenAI: `sk-[A-Za-z0-9]{48,}`
- Anthropic: `sk-ant-[A-Za-z0-9-_]{90,}`
- OpenRouter: `sk-or-v1-[A-Za-z0-9]{64,}`

#### `sanitizeText()`

```typescript
import { sanitizeText } from "@lumerisca/core";

const safe = sanitizeText(userInput);
```

**Removes:**
- `<` and `>` characters
- `javascript:` protocol
- Inline event handlers (`onclick=`, etc.)

#### `sanitizeHtml()`

```typescript
import { sanitizeHtml } from "@lumerisca/core";

const safeHtml = sanitizeHtml(htmlContent);
```

**Removes:**
- `<script>` tags
- Event handlers
- `javascript:` URLs

**Note:** For production, consider using DOMPurify for comprehensive HTML sanitization.

#### Constants

```typescript
import { MAX_LENGTHS } from "@lumerisca/core";

MAX_LENGTHS.PROMPT          // 4000
MAX_LENGTHS.URL             // 2048
MAX_LENGTHS.TITLE           // 500
MAX_LENGTHS.API_KEY         // 200
MAX_LENGTHS.DOC_CONTENT     // 50000
```

### Rate Limiter

Token bucket rate limiting.

**Location:** `packages/core/src/utils/rateLimiter.ts`

#### `rateLimiter` (singleton)

```typescript
import { rateLimiter, DEFAULT_RATE_LIMITS } from "@lumerisca/core";

// Check if request is allowed
const result = await rateLimiter.checkLimit(
  "openai",
  DEFAULT_RATE_LIMITS.openai
);

if (!result.allowed) {
  console.log(`Rate limited. Retry after ${result.retryAfter}s`);
} else {
  // Proceed with request
}

// Reset limit for a key
rateLimiter.reset("openai");

// Clear all limits
rateLimiter.clearAll();
```

#### Default Rate Limits

```typescript
DEFAULT_RATE_LIMITS = {
  openai: {
    maxRequests: 10,
    windowMs: 60000  // 10 requests per minute
  },
  anthropic: {
    maxRequests: 10,
    windowMs: 60000
  },
  openrouter: {
    maxRequests: 20,
    windowMs: 60000
  },
  embeddings: {
    maxRequests: 100,
    windowMs: 60000
  }
}
```

#### `RateLimiter` class

```typescript
import { RateLimiter } from "@lumerisca/core";

const limiter = new RateLimiter();

await limiter.checkLimit(key, config);
limiter.reset(key);
limiter.clearAll();
limiter.getTokens(key);
```

### Retry Logic

Exponential backoff retry logic.

**Location:** `packages/core/src/utils/retry.ts`

#### `retry()`

```typescript
import { retry, DEFAULT_RETRY_CONFIG } from "@lumerisca/core";

const result = await retry(
  async () => {
    // Your async operation
    return await fetch(url);
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  }
);
```

#### `retryWithJitter()`

Same as `retry()` but adds random jitter to delays (prevents thundering herd).

```typescript
import { retryWithJitter } from "@lumerisca/core";

const result = await retryWithJitter(() => apiCall(), config);
```

#### `makeRetryable()`

Convert any async function to a retryable version.

```typescript
import { makeRetryable } from "@lumerisca/core";

const retryableFetch = makeRetryable(fetch, {
  maxAttempts: 3
});

const response = await retryableFetch(url);
```

#### `isRetryableError()`

Check if an error should trigger a retry.

```typescript
import { isRetryableError } from "@lumerisca/core";

if (isRetryableError(error)) {
  // Retry the operation
}
```

**Retryable errors:**
- Network errors
- HTTP 429 (rate limit)
- HTTP 5xx (server errors)
- Timeout errors

### Error Handling

Custom error types and utilities.

**Location:** `packages/core/src/utils/errors.ts`

#### Error Classes

```typescript
import {
  LumeriscaError,
  ApiError,
  ConfigError,
  ContextError,
  RagError,
  TimeoutError
} from "@lumerisca/core";

// Base error
throw new LumeriscaError("Something went wrong", "ERROR_CODE");

// API error
throw new ApiError("API call failed", 500, "openai");

// Config error
throw new ConfigError("Invalid API key", "apiKey");

// Timeout error
throw new TimeoutError("Request timed out", 30000);
```

#### `withTimeout()`

Add timeout to any promise.

```typescript
import { withTimeout } from "@lumerisca/core";

const result = await withTimeout(
  slowOperation(),
  5000,  // 5 second timeout
  "Operation timed out"
);
```

#### `tryCatch()`

Safe async execution with error handler.

```typescript
import { tryCatch } from "@lumerisca/core";

const result = await tryCatch(
  async () => riskyOperation(),
  (error) => {
    console.error("Error:", error);
    return defaultValue;  // Return fallback
  }
);
```

#### `formatError()`

Format error for user display.

```typescript
import { formatError } from "@lumerisca/core";

const message = formatError(error);
// Returns user-friendly message without stack trace
```

#### `extractErrorDetails()`

Extract error details for logging.

```typescript
import { extractErrorDetails } from "@lumerisca/core";

const details = extractErrorDetails(error);
// { message, name, stack, code, statusCode }
```

---

## Extension-Specific APIs

### Conversation History

**Location:** `packages/extension-chrome/src/storage/conversationHistory.ts`

```typescript
import {
  getAllConversations,
  getConversation,
  createConversation,
  addMessage,
  deleteConversation,
  clearAllConversations,
  exportConversation
} from "./storage/conversationHistory";

// Create conversation
const conversation = await createConversation(pageContext, tabId);

// Add messages
await addMessage(conversation.id, "user", "Hello!");
await addMessage(conversation.id, "assistant", "Hi there!");

// Get conversations
const all = await getAllConversations();
const one = await getConversation(conversationId);

// Export
const json = exportConversation(conversation);

// Delete
await deleteConversation(conversationId);
await clearAllConversations();
```

### Settings Storage

**Location:** `packages/extension-chrome/src/storage/settings.ts`

```typescript
import {
  getSettings,
  saveSettings,
  clearSettings,
  hasApiKey,
  updateApiKey
} from "./storage/settings";

// Get settings
const settings = await getSettings();

// Save settings
await saveSettings({
  llm: {
    provider: "openai",
    apiKey: "sk-...",
    model: "gpt-4o-mini"
  }
});

// Check if configured
const configured = await hasApiKey();

// Update just API key
await updateApiKey("openai", "sk-...");

// Clear all settings
await clearSettings();
```

---

## Type Definitions

All TypeScript types are fully documented with JSDoc comments. Import types:

```typescript
import type {
  PageContext,
  PageMap,
  RagSource,
  RagResult,
  LLMProvider,
  ChatMessage,
  LLMConfig,
  ExtensionSettings,
  LogEntry,
  RateLimitConfig,
  RetryConfig
} from "@lumerisca/core";
```

---

## Examples

### Complete RAG Pipeline

```typescript
import {
  DocumentStore,
  DEFAULT_DOCUMENTS,
  DEFAULT_PAGE_MAP,
  RagEngine,
  collectFullPageContext,
  buildPromptWithContext,
  EnhancedLLMClient
} from "@lumerisca/core";

// 1. Setup
const store = new DocumentStore();
store.addDocuments(DEFAULT_DOCUMENTS);

const ragEngine = new RagEngine(store, apiKey);

// 2. Collect context
const pageContext = collectFullPageContext(
  document,
  window.location.href,
  document.title
);

// 3. RAG retrieval
const results = await ragEngine.retrieve(
  pageContext,
  DEFAULT_PAGE_MAP,
  "How do I use this page?",
  3
);

const ragContext = ragEngine.buildContextString(results);

// 4. Build prompt
const messages = buildPromptWithContext(
  "You are a helpful assistant",
  pageContext.title,
  pageContext.url,
  pageContext.domSummary,
  ragContext,
  "How do I use this page?"
);

// 5. Call LLM
const client = new EnhancedLLMClient({
  provider: "openai",
  apiKey,
  model: "gpt-4o-mini"
});

const response = await client.chat(messages);
console.log(response);
```

---

## Contributing

To add new APIs:

1. Add implementation in `packages/core/src/`
2. Export from `packages/core/src/index.ts`
3. Add JSDoc comments
4. Update this reference document
5. Add unit tests (when test framework is set up)
6. Update type definitions

---

**Last Updated:** 2025-01-16
**Version:** 0.1.0 with Phase 1 Security Enhancements
