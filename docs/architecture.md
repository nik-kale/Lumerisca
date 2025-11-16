# Lumerisca Architecture

This document describes the architecture and design decisions behind Lumerisca.

## Overview

Lumerisca is a browser-based AI assistant that provides page-aware, context-sensitive help using RAG (Retrieval-Augmented Generation) without requiring any backend infrastructure.

## Core Principles

1. **No Backend**: Everything runs in the browser (extension)
2. **Privacy-First**: API keys stored locally, no data sent to third parties
3. **Scoped Knowledge**: RAG retrieval limited to page-relevant docs
4. **Provider-Agnostic**: Works with multiple LLM providers

## Architecture Layers

### 1. Core Engine (`@lumerisca/core`)

Pure TypeScript library with no browser dependencies. Can be reused in other contexts (Node.js, other browsers, SDKs).

**Modules:**

- **Context Collection**
  - `urlContext.ts`: Extract URL/pathname info
  - `domCollector.ts`: Parse DOM for headings, errors, alerts
  - `networkContext.ts`: (Future) Monitor network requests

- **Page Mapping**
  - `pageMapper.ts`: Match URL patterns to document sets
  - Simple glob pattern matching (`/dashboard*`)
  - Configurable via JSON

- **RAG Engine**
  - `documentStore.ts`: In-memory document storage
  - `embeddings.ts`: Generate embeddings via OpenAI API
  - `ragEngine.ts`: Semantic search with cosine similarity
  - Fallback to keyword-based search if embeddings fail

- **LLM Integration**
  - `providers.ts`: Provider configurations
  - `llmClient.ts`: Unified interface for OpenAI/Anthropic/OpenRouter
  - Message formatting per provider's API requirements

### 2. Chrome Extension (`@lumerisca/extension-chrome`)

Manifest V3 extension with three main components:

**Content Script** (`contentScript.ts`)
- Runs on every page
- Injects side drawer UI (or signals to open popup)
- Collects page context using core engine
- Sends context to background worker

**Background Service Worker** (`serviceWorker.ts`)
- Persistent background script
- Stores extension state
- Handles RAG + LLM orchestration
- Routes messages between content script and popup

**Side Panel UI** (`sidepanel/`)
- React-based chat interface
- Settings form for API keys
- Displays page context
- Sends user queries to background

## Data Flow

```
┌─────────────────┐
│   Web Page      │
└────────┬────────┘
         │
         │ (1) Page Load
         ▼
┌─────────────────┐
│ Content Script  │
│ - Inject drawer │
│ - Collect ctx   │
└────────┬────────┘
         │
         │ (2) Send context
         ▼
┌─────────────────┐
│ Background SW   │
│ - Store context │
└─────────────────┘
         ▲
         │ (3) User asks question
         │
┌─────────────────┐
│  Side Panel UI  │
│ - Chat UI       │
│ - Settings      │
└────────┬────────┘
         │
         │ (4) Chat request
         ▼
┌─────────────────┐
│ Background SW   │
│ - Page mapping  │
│ - RAG retrieval │
│ - LLM call      │
└────────┬────────┘
         │
         │ (5) Response
         ▼
┌─────────────────┐
│  Side Panel UI  │
│ - Display answer│
└─────────────────┘
```

## Key Design Decisions

### Why No Backend?

- **Simplicity**: No infrastructure to maintain
- **Privacy**: User's API key never leaves their browser
- **Cost**: No hosting costs
- **Speed**: Direct API calls, no proxy latency

### Why Scoped RAG?

Traditional chatbots use all available knowledge. Lumerisca only uses docs relevant to the current page, which:

- Reduces noise in LLM context
- Improves answer accuracy
- Lowers token costs
- Faster retrieval

### Why Multiple Providers?

- User choice based on cost/performance preferences
- Redundancy if one provider has issues
- OpenRouter gives access to many models

### Why Embeddings + Fallback?

- Embeddings (OpenAI) provide semantic search
- Keyword fallback ensures basic functionality without embeddings API
- Graceful degradation if embeddings fail

## Extension Components

### Manifest V3

We use Manifest V3 (the latest Chrome extension format):

- **Service Worker**: Background script (replaces V2 background pages)
- **Content Scripts**: Injected into web pages
- **Host Permissions**: Required for `<all_urls>` to work everywhere
- **Storage API**: Chrome sync storage for settings

### Messaging

Extension uses `chrome.runtime.sendMessage` for communication:

```typescript
// Content Script → Background
chrome.runtime.sendMessage({
  type: "LUMERISCA_PAGE_CONTEXT",
  payload: { url, title, ... }
});

// UI → Background
chrome.runtime.sendMessage({
  type: "LUMERISCA_CHAT_REQUEST",
  payload: { prompt, context }
});

// Background → UI (response)
sendResponse({
  type: "LUMERISCA_CHAT_RESPONSE",
  payload: { response }
});
```

### Storage

Settings stored in `chrome.storage.sync`:

```typescript
{
  lumerisca_settings: {
    llm: {
      provider: "openai",
      apiKey: "sk-...",
      model: "gpt-4"
    },
    pageMapUrl: "https://..."
  }
}
```

## RAG Implementation

### Document Storage

MVP uses in-memory storage with hardcoded docs:

```typescript
const DEFAULT_DOCUMENTS = [
  {
    id: "dashboard_intro",
    title: "Dashboard Introduction",
    content: "...",
    embedding: [0.123, 0.456, ...] // generated on-demand
  }
];
```

Future: Load from URL or IndexedDB.

### Embedding Generation

Uses OpenAI `text-embedding-3-small` model:

```typescript
POST https://api.openai.com/v1/embeddings
{
  "model": "text-embedding-3-small",
  "input": "document text"
}
```

Returns 1536-dimensional vector.

### Similarity Search

Cosine similarity between query and document embeddings:

```typescript
similarity = dot(queryVec, docVec) / (norm(queryVec) * norm(docVec))
```

Top K documents by similarity are returned.

### Context Building

Selected documents are formatted into LLM prompt:

```
You are Lumerisca, an AI assistant...

Current Page: Dashboard
URL: /dashboard

[Document 1: Dashboard Intro]
Content here...

[Document 2: Metrics Guide]
Content here...

User Question: How do I view my metrics?
```

## Security Considerations

### API Key Storage

- Stored in `chrome.storage.sync` (encrypted by Chrome)
- Never sent to any server except the LLM provider
- User can clear it anytime

### Content Security Policy

- Extension uses CSP to prevent XSS
- No inline scripts in popup/sidepanel
- All code bundled via Vite

### Permissions

Extension requests:
- `storage`: For settings
- `scripting`: To inject content script
- `activeTab`: Current tab info
- `<all_urls>`: Work on any page (can be restricted)

## Performance

### Optimization Strategies

1. **Lazy Loading**: Only load docs when needed
2. **Embedding Caching**: Store embeddings with documents
3. **Debounced Context Updates**: Don't update on every DOM mutation
4. **Efficient Bundling**: Vite code-splitting for faster loads

### Potential Bottlenecks

- Embedding API calls (mitigated by caching)
- Large document sets (future: pagination)
- Multiple tabs (each needs own context)

## Future Enhancements

See [roadmap.md](./roadmap.md) for planned improvements.

## Testing Strategy

(TODO: Not yet implemented)

- Unit tests for core functions
- Integration tests for RAG engine
- E2E tests for extension flows
- Manual testing in Chrome

## Deployment

### Development Build

```bash
pnpm build:extension
# Load from packages/extension-chrome/dist
```

### Production Build

1. Build with production flag
2. Generate proper icons (PNG)
3. Create ZIP for Chrome Web Store
4. Submit for review

## Monitoring & Debugging

### Console Logs

All components log to console with `Lumerisca:` prefix:

```javascript
console.log("Lumerisca: Background service worker initialized");
```

### Chrome DevTools

- **Background worker**: chrome://extensions → Service Worker
- **Content script**: Regular page DevTools
- **Popup**: Right-click extension icon → Inspect

### Error Handling

All errors caught and displayed to user in chat:

```typescript
try {
  const response = await callLLM(...);
} catch (error) {
  return createErrorMessage("Failed to call LLM", error.message);
}
```

## Conclusion

Lumerisca's architecture prioritizes simplicity, privacy, and extensibility. The core engine is provider-agnostic and reusable, while the Chrome extension provides a polished user experience.
