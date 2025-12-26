# Lumerisca Feature Discovery Analysis

**Date:** December 26, 2025
**Repository:** Lumerisca
**Analyst:** Claude (Automated Feature Discovery)

---

## Executive Summary

This analysis identifies **10 high-impact feature opportunities** for the Lumerisca Chrome extension based on a systematic review of the codebase across six dimensions: code quality, security, observability, developer experience, functional enhancements, and architecture.

The codebase demonstrates strong foundations with comprehensive TypeScript types, security audits, and good documentation. Key gaps include missing test infrastructure, CI/CD pipeline, and several performance optimizations that would significantly improve the extension's reliability and developer experience.

---

## Priority Summary Table

| # | Feature | Category | Effort | Value | Priority Score |
|---|---------|----------|--------|-------|----------------|
| 1 | Add Vitest Test Framework & Initial Tests | Developer Experience | Medium | High | 1.5 |
| 2 | Implement GitHub Actions CI/CD Pipeline | Developer Experience | Low | High | 3.0 |
| 3 | Add ESLint + Prettier Configuration | Code Quality | Low | Medium | 2.0 |
| 4 | Implement LLM Response Streaming | Functional Enhancement | Medium | High | 1.5 |
| 5 | Add Persistent Embedding Cache (IndexedDB) | Performance | Medium | High | 1.5 |
| 6 | Implement Content Security Policy (CSP) | Security | Low | High | 3.0 |
| 7 | Add Parallel Embedding Generation | Performance | Low | Medium | 2.0 |
| 8 | Implement Conversation Export to Multiple Formats | Functional Enhancement | Medium | Medium | 1.0 |
| 9 | Add Debug Mode with Enhanced Error Reporting | Observability | Low | Medium | 2.0 |
| 10 | Implement Dynamic Model Registry Configuration | Architecture | Medium | Medium | 1.0 |

**Priority Score Formula:** Value (High=3, Medium=2, Low=1) / Effort (High=3, Medium=2, Low=1)

---

## Detailed Feature Requests

---

### Feature #1: Add Vitest Test Framework & Initial Tests

**Category:** Developer Experience
**Effort:** Medium | **Value:** High | **Priority Score:** 1.5

#### Problem Statement

The codebase has **zero test coverage** - no test files exist, no test runner is configured, and the CONTRIBUTING.md explicitly marks testing as "Coming soon." This creates significant risk for regressions when modifying core utilities like validation, RAG engine, or LLM clients. Without tests, contributors cannot verify their changes don't break existing functionality.

#### Proposed Solution

- Install and configure Vitest (optimized for Vite projects) with TypeScript support
- Add `vitest.config.ts` for both `@lumerisca/core` and extension packages
- Create initial test suites for critical modules:
  - `validation.test.ts` - Test all input validation functions
  - `rateLimiter.test.ts` - Test token bucket algorithm
  - `bm25.test.ts` - Test search ranking accuracy
  - `embeddings.test.ts` - Test cosine similarity calculations
- Add test scripts to root `package.json`: `test`, `test:watch`, `test:coverage`
- Configure coverage thresholds (minimum 60% for core utilities)

#### Implementation Details

```bash
# packages/core/package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['dist/**', '**/*.d.ts']
    }
  }
});
```

#### Success Metrics

- Test suite passes in < 30 seconds
- Minimum 60% code coverage for `src/utils/` directory
- All validation edge cases covered with tests
- Test commands documented in CONTRIBUTING.md

---

### Feature #2: Implement GitHub Actions CI/CD Pipeline

**Category:** Developer Experience
**Effort:** Low | **Value:** High | **Priority Score:** 3.0

#### Problem Statement

No CI/CD pipeline exists (`.github/` directory is empty). This means:
- No automated type checking on pull requests
- No build verification before merge
- No automated test runs (once tests exist)
- No dependency vulnerability scanning
- Contributors have no way to verify their changes work in a clean environment

#### Proposed Solution

- Create `.github/workflows/ci.yml` for continuous integration
- Implement the following jobs:
  - **Type Check:** Run `pnpm type-check` on all PRs
  - **Build:** Verify `pnpm build` succeeds
  - **Test:** Run tests (once Feature #1 is implemented)
  - **Security:** Run `pnpm audit` for dependency vulnerabilities
- Add status badges to README.md
- Configure branch protection rules recommendation in docs

#### Implementation Details

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm type-check
      - run: pnpm build
      - run: pnpm audit --audit-level=high
```

#### Success Metrics

- CI runs complete in < 5 minutes
- All PRs blocked until CI passes
- Build artifacts generated successfully
- Zero high/critical vulnerabilities in dependencies

---

### Feature #3: Add ESLint + Prettier Configuration

**Category:** Code Quality
**Effort:** Low | **Value:** Medium | **Priority Score:** 2.0

#### Problem Statement

No linting or formatting configuration exists in the repository. The CONTRIBUTING.md mentions code style guidelines but there's no automated enforcement. This leads to:
- Inconsistent code style across files
- Potential bugs caught only at runtime
- Time wasted on style discussions in code reviews

#### Proposed Solution

- Install ESLint with TypeScript and React plugins
- Install Prettier for consistent formatting
- Add `.eslintrc.cjs` with recommended TypeScript rules
- Add `.prettierrc` matching the style guidelines in CONTRIBUTING.md
- Add `lint` and `format` scripts to package.json
- Create `.vscode/settings.json` for editor integration

#### Implementation Details

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

#### Success Metrics

- `pnpm lint` reports zero errors
- Pre-commit hook formats all staged files
- VS Code auto-formats on save with provided settings
- All existing code passes linting (with minimal rule adjustments)

---

### Feature #4: Implement LLM Response Streaming

**Category:** Functional Enhancement
**Effort:** Medium | **Value:** High | **Priority Score:** 1.5

#### Problem Statement

The current LLM client (`llmClient.ts:17-114`) waits for the entire response before displaying it to the user. For long responses, this creates a poor user experience with extended wait times and no visual feedback. Competing extensions like Sider and Merlin offer streaming responses that appear word-by-word.

#### Proposed Solution

- Add streaming support to `EnhancedLLMClient` class
- Implement `chatStream()` method returning an `AsyncIterableIterator<string>`
- Support streaming for both OpenAI and Anthropic APIs
- Update service worker to forward streaming chunks to sidepanel
- Add streaming UI component with typing indicator
- Implement graceful fallback to non-streaming for unsupported models

#### Implementation Details

```typescript
// packages/core/src/llm/llmClientEnhanced.ts
async *chatStream(messages: ChatMessage[]): AsyncIterableIterator<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify({
      ...this.getBody(messages),
      stream: true
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // Parse SSE format
    yield this.parseStreamChunk(chunk);
  }
}
```

#### Success Metrics

- First token appears within 500ms of request
- Streaming works for GPT-4o, GPT-3.5, Claude 3.5 Sonnet
- Memory usage stays constant during long responses
- Graceful degradation for models without streaming support

---

### Feature #5: Add Persistent Embedding Cache (IndexedDB)

**Category:** Performance
**Effort:** Medium | **Value:** High | **Priority Score:** 1.5

#### Problem Statement

Document embeddings are stored only in memory (`RagSource.embedding` in `types.ts:59`). This means:
- Embeddings are regenerated every time the service worker restarts
- Each page reload triggers new OpenAI API calls for the same documents
- Users incur unnecessary API costs
- Slower initial response times due to embedding generation

The ROADMAP.md mentions "Incremental Updates" for v3.0, but basic caching should be implemented now.

#### Proposed Solution

- Create `packages/core/src/rag/embeddingCache.ts` using IndexedDB
- Implement content-hash based cache keys to detect document changes
- Add cache invalidation based on document content hash
- Integrate cache with `RagEngine.ensureEmbeddings()`
- Add cache statistics to performance monitor
- Implement cache size limits with LRU eviction

#### Implementation Details

```typescript
// packages/core/src/rag/embeddingCache.ts
interface CachedEmbedding {
  id: string;
  contentHash: string;
  embedding: number[];
  createdAt: number;
}

export class EmbeddingCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB('lumerisca-embeddings', 1, {
      upgrade(db) {
        db.createObjectStore('embeddings', { keyPath: 'id' });
      }
    });
  }

  async get(docId: string, contentHash: string): Promise<number[] | null> {
    const cached = await this.db.get('embeddings', docId);
    if (cached && cached.contentHash === contentHash) {
      return cached.embedding;
    }
    return null;
  }

  async set(docId: string, contentHash: string, embedding: number[]): Promise<void> {
    await this.db.put('embeddings', { id: docId, contentHash, embedding, createdAt: Date.now() });
  }
}
```

#### Success Metrics

- Cache hit rate > 80% after initial session
- Page reload shows cached embeddings in < 100ms
- API costs reduced by 50%+ for repeat queries
- Cache size stays under 50MB with LRU eviction

---

### Feature #6: Implement Content Security Policy (CSP)

**Category:** Security
**Effort:** Low | **Value:** High | **Priority Score:** 3.0

#### Problem Statement

The security audit (`SECURITY_AUDIT_V2.md:442-444`) explicitly recommends adding CSP headers, but this hasn't been implemented. The manifest.json lacks a `content_security_policy` field. This leaves the extension vulnerable to XSS attacks if any injected content bypasses sanitization.

#### Proposed Solution

- Add `content_security_policy` to `manifest.json`
- Configure restrictive policy for extension pages
- Allow only necessary external resources (OpenAI, Anthropic, YouTube APIs)
- Add Subresource Integrity (SRI) hashes for any CDN resources
- Document CSP configuration in SECURITY.md

#### Implementation Details

```json
// packages/extension-chrome/public/manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://openrouter.ai https://www.youtube.com"
  }
}
```

```typescript
// Add SRI for Tesseract.js if loaded from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
script.integrity = 'sha384-XXXXXX'; // Generate actual hash
script.crossOrigin = 'anonymous';
```

#### Success Metrics

- CSP prevents inline script execution
- All CDN resources have valid SRI hashes
- Extension functions normally with CSP enabled
- Security audit passes CSP validation

---

### Feature #7: Add Parallel Embedding Generation

**Category:** Performance
**Effort:** Low | **Value:** Medium | **Priority Score:** 2.0

#### Problem Statement

In `ragEngine.ts:67-73`, embeddings are generated sequentially in a `for` loop:

```typescript
for (const doc of docs) {
  if (!doc.embedding) {
    doc.embedding = await generateEmbedding(doc.content, this.apiKey);
  }
}
```

This is inefficient when multiple documents need embeddings. With 10 documents and 500ms per embedding request, this takes 5 seconds instead of ~1 second with parallelization.

#### Proposed Solution

- Modify `ensureEmbeddings()` to use `Promise.all()` with concurrency control
- Add configurable concurrency limit (default: 5) to respect rate limits
- Use `p-limit` or implement a simple semaphore for concurrency
- Add progress tracking for embedding generation
- Update performance metrics to track parallel embedding times

#### Implementation Details

```typescript
// packages/core/src/rag/ragEngine.ts
private async ensureEmbeddings(docs: RagSource[], concurrency = 5): Promise<void> {
  const docsNeedingEmbeddings = docs.filter(doc => !doc.embedding);

  // Process in batches to respect rate limits
  const results = await Promise.all(
    chunk(docsNeedingEmbeddings, concurrency).map(async batch => {
      return Promise.all(
        batch.map(async doc => {
          doc.embedding = await generateEmbedding(doc.content, this.apiKey);
          return doc;
        })
      );
    })
  );
}
```

#### Success Metrics

- 10 documents embedded in < 2 seconds (vs 5+ seconds sequential)
- No rate limit errors with default concurrency
- Memory usage stays reasonable with batch processing
- Progress callback fires for each completed embedding

---

### Feature #8: Implement Conversation Export to Multiple Formats

**Category:** Functional Enhancement
**Effort:** Medium | **Value:** Medium | **Priority Score:** 1.0

#### Problem Statement

Currently, conversations can only be exported as JSON (`conversationHistory.ts`). Users frequently need to share conversations in more accessible formats like Markdown, PDF, or plain text. The ROADMAP.md (v4.0) mentions "Export Conversations" but basic export should be available now.

#### Proposed Solution

- Add `ConversationExporter` class in core package
- Implement export formats:
  - Markdown (with proper message formatting)
  - Plain text (stripped formatting)
  - HTML (styled for sharing)
- Add export button to chat panel UI
- Include metadata (date, model used, page context) in exports
- Support downloading as file or copying to clipboard

#### Implementation Details

```typescript
// packages/core/src/converter/conversationExporter.ts
export class ConversationExporter {
  toMarkdown(conversation: Conversation): string {
    let md = `# ${conversation.title || 'Conversation'}\n`;
    md += `**Date:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
    md += `**Page:** ${conversation.context.url}\n\n---\n\n`;

    for (const message of conversation.messages) {
      const role = message.role === 'user' ? '**You:**' : '**Lumerisca:**';
      md += `${role}\n\n${message.content}\n\n---\n\n`;
    }
    return md;
  }

  toPlainText(conversation: Conversation): string { /* ... */ }
  toHtml(conversation: Conversation): string { /* ... */ }
}
```

#### Success Metrics

- Export completes in < 1 second for 100-message conversation
- Markdown renders correctly in GitHub/Obsidian
- HTML export includes all styling inline
- Export includes all citations and sources

---

### Feature #9: Add Debug Mode with Enhanced Error Reporting

**Category:** Observability
**Effort:** Low | **Value:** Medium | **Priority Score:** 2.0

#### Problem Statement

When users encounter issues, debugging is difficult because:
- Logs are only in console (requires DevTools)
- Performance metrics are in-memory only (`performance.ts`)
- No easy way to export diagnostic information
- Users can't provide detailed bug reports

#### Proposed Solution

- Add debug mode toggle in settings
- When enabled, collect and persist:
  - Full request/response logs (sanitized of API keys)
  - Performance metrics history
  - Error stack traces with context
- Add "Export Debug Info" button that creates a sanitized JSON bundle
- Implement automatic error reporting (opt-in) to identify common issues
- Add debug overlay showing current state

#### Implementation Details

```typescript
// packages/core/src/utils/debugCollector.ts
export class DebugCollector {
  private events: DebugEvent[] = [];

  capture(event: DebugEvent): void {
    if (!this.isEnabled()) return;
    this.events.push({
      ...event,
      timestamp: Date.now(),
      sanitized: this.sanitize(event.data)
    });
    this.persist();
  }

  export(): string {
    return JSON.stringify({
      events: this.events,
      environment: this.getEnvironment(),
      performance: performanceMonitor.getMetrics(),
      logs: logger.getHistory()
    }, null, 2);
  }

  private sanitize(data: any): any {
    // Remove API keys, personal data
    return JSON.parse(
      JSON.stringify(data).replace(/sk-[a-zA-Z0-9-_]+/g, '[REDACTED]')
    );
  }
}
```

#### Success Metrics

- Debug export includes all relevant diagnostic info
- No sensitive data (API keys, personal info) in exports
- Debug mode adds < 5% performance overhead
- Users can submit debug bundles with bug reports

---

### Feature #10: Implement Dynamic Model Registry Configuration

**Category:** Architecture
**Effort:** Medium | **Value:** Medium | **Priority Score:** 1.0

#### Problem Statement

The model registry in `modelRouter.ts:56-126` is hard-coded. When new models are released (e.g., GPT-4.5, Claude 4) or pricing changes, users must wait for an extension update. Power users can't add custom models (local Ollama, custom OpenRouter models).

#### Proposed Solution

- Create a model configuration schema stored in Chrome storage
- Allow users to add/edit model entries via settings UI
- Provide default registry that updates from a remote JSON endpoint
- Validate custom model configurations before saving
- Support custom capability scoring for routing decisions
- Add model testing feature to verify configuration

#### Implementation Details

```typescript
// packages/core/src/models/modelRegistry.ts
export interface ModelRegistryConfig {
  version: string;
  models: ModelCapabilities[];
  lastUpdated: number;
}

export class ModelRegistry {
  private config: ModelRegistryConfig;

  async loadConfig(): Promise<void> {
    // Try loading from storage
    const stored = await chrome.storage.local.get('modelRegistry');
    if (stored.modelRegistry) {
      this.config = stored.modelRegistry;
    } else {
      this.config = { version: '1.0', models: DEFAULT_MODELS, lastUpdated: Date.now() };
    }
  }

  async addModel(model: ModelCapabilities): Promise<void> {
    this.validateModel(model);
    this.config.models.push(model);
    await this.persist();
  }

  async updateFromRemote(url?: string): Promise<void> {
    const response = await fetch(url || DEFAULT_REGISTRY_URL);
    const remote = await response.json();
    this.config = { ...remote, lastUpdated: Date.now() };
    await this.persist();
  }
}
```

#### Success Metrics

- Users can add custom models without code changes
- Model registry can be updated without extension update
- Invalid configurations are rejected with clear errors
- Custom models work with intelligent routing

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
1. **Feature #2** - GitHub Actions CI/CD
2. **Feature #6** - Content Security Policy
3. **Feature #3** - ESLint + Prettier

### Phase 2: Developer Experience (Week 2)
4. **Feature #1** - Vitest Test Framework
5. **Feature #9** - Debug Mode

### Phase 3: Performance (Week 3)
6. **Feature #7** - Parallel Embedding Generation
7. **Feature #5** - Persistent Embedding Cache

### Phase 4: User Experience (Week 4)
8. **Feature #4** - LLM Response Streaming
9. **Feature #8** - Conversation Export
10. **Feature #10** - Dynamic Model Registry

---

## Risk Assessment

| Feature | Risk Level | Mitigation |
|---------|------------|------------|
| Test Framework | Low | Incremental adoption, start with utils |
| CI/CD Pipeline | Low | Simple workflow, can iterate |
| ESLint/Prettier | Low | Auto-fix most issues |
| Streaming | Medium | Fallback to non-streaming |
| Embedding Cache | Medium | Migration path for existing data |
| CSP | Low | Test thoroughly in dev |
| Parallel Embeddings | Low | Configurable concurrency |
| Export Formats | Low | Add formats incrementally |
| Debug Mode | Low | Opt-in feature |
| Model Registry | Medium | Schema validation |

---

## Appendix: Code References

Key files analyzed during this review:
- `packages/core/src/utils/validation.ts` - Input validation
- `packages/core/src/utils/logger.ts` - Logging infrastructure
- `packages/core/src/utils/rateLimiter.ts` - Rate limiting
- `packages/core/src/utils/performance.ts` - Performance monitoring
- `packages/core/src/utils/errors.ts` - Error handling
- `packages/core/src/llm/llmClient.ts` - LLM client
- `packages/core/src/llm/llmClientEnhanced.ts` - Enhanced LLM client
- `packages/core/src/rag/ragEngine.ts` - RAG engine
- `packages/core/src/models/modelRouter.ts` - Model routing
- `packages/extension-chrome/src/background/serviceWorker.ts` - Service worker
- `packages/extension-chrome/public/manifest.json` - Extension manifest
- `docs/SECURITY_AUDIT_V2.md` - Security audit report
- `CONTRIBUTING.md` - Contribution guidelines
- `ROADMAP.md` - Product roadmap

---

*Generated by Claude Feature Discovery Analysis*
