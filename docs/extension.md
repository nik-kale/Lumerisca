# Chrome Extension Guide

This document provides detailed information about the Lumerisca Chrome extension.

## Overview

The Lumerisca extension is built using:
- **Manifest V3** (latest Chrome extension format)
- **TypeScript** for type safety
- **React** for the UI
- **Vite** for fast builds

## Extension Structure

```
packages/extension-chrome/
├── public/
│   ├── manifest.json          # Extension manifest
│   ├── sidepanel.html         # Popup/sidepanel HTML
│   └── icon*.png              # Extension icons
├── src/
│   ├── background/
│   │   └── serviceWorker.ts   # Background service worker
│   ├── contentScript/
│   │   └── contentScript.ts   # Injected into web pages
│   ├── sidepanel/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Main app component
│   │   └── components/        # React components
│   ├── messaging/
│   │   ├── types.ts           # Message type definitions
│   │   └── messages.ts        # Message helpers
│   └── storage/
│       └── settings.ts        # Settings storage utilities
└── vite.config.ts             # Vite build configuration
```

## Building the Extension

### Development Build

```bash
# Watch mode - rebuilds on file changes
pnpm dev:extension

# Or one-time build
pnpm build:extension
```

Output is in `packages/extension-chrome/dist/`

### Production Build

```bash
NODE_ENV=production pnpm build:extension
```

This creates an optimized build with:
- Minified JavaScript
- Source maps for debugging
- Optimized React bundles

## Loading in Chrome

1. Build the extension
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `packages/extension-chrome/dist`

## Components

### 1. Manifest (manifest.json)

Defines extension metadata and permissions.

**Key Fields:**

```json
{
  "manifest_version": 3,
  "name": "Lumerisca",
  "permissions": ["storage", "scripting", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "serviceWorker.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["contentScript.js"]
  }]
}
```

### 2. Content Script

**Purpose:** Runs on every web page to collect context.

**What it does:**
- Injects a side drawer (optional visual indicator)
- Collects page URL, title, DOM content
- Sends context to background worker
- Observes URL changes for SPAs

**Key Functions:**

```typescript
// Collect page context
const context = collectFullPageContext(
  document,
  window.location.href,
  document.title
);

// Send to background
sendToBackground(createPageContextMessage(context));
```

**DOM Collection:**
- Headings: `h1`, `h2`, `h3`
- Errors: `.error`, `[role="alert"]`
- Notifications: `.notification`, `.alert`

### 3. Background Service Worker

**Purpose:** Orchestrates RAG + LLM calls.

**What it does:**
- Receives page context from content script
- Handles chat requests from UI
- Performs RAG retrieval
- Calls LLM APIs
- Returns responses to UI

**Message Handlers:**

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LUMERISCA_CHAT_REQUEST") {
    handleChatRequest(message.payload)
      .then(response => sendResponse(response));
    return true; // Async response
  }
});
```

**RAG Flow:**

1. Get page context
2. Resolve relevant doc IDs via page mapping
3. Generate query embedding
4. Compute similarity scores
5. Select top K documents
6. Build LLM prompt
7. Call LLM API
8. Return response

### 4. Side Panel UI

**Purpose:** Chat interface for users.

**Components:**

- **App.tsx**: Main container
  - Manages state (messages, context)
  - Handles message sending
  - Routes between chat and settings

- **ChatPanel.tsx**: Chat interface
  - Message list with auto-scroll
  - Input field with suggestions
  - Loading states

- **SettingsForm.tsx**: Configuration
  - Provider selection
  - API key input (password field)
  - Model selection
  - Save to chrome.storage

**State Management:**

```typescript
const [pageContext, setPageContext] = useState<PageContext | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [showSettings, setShowSettings] = useState(false);
```

## Messaging

### Message Types

```typescript
type MessageType =
  | "LUMERISCA_PAGE_CONTEXT"     // Content → Background
  | "LUMERISCA_CHAT_REQUEST"     // UI → Background
  | "LUMERISCA_CHAT_RESPONSE"    // Background → UI
  | "LUMERISCA_ERROR"            // Background → UI
  | "LUMERISCA_SETTINGS_UPDATED" // Settings changed
```

### Message Flow

```
Content Script → Background:
{
  type: "LUMERISCA_PAGE_CONTEXT",
  payload: {
    url: "https://example.com/dashboard",
    title: "Dashboard",
    pathname: "/dashboard",
    hostname: "example.com",
    domSummary: "Dashboard\nMetrics\nAnalytics..."
  }
}

UI → Background:
{
  type: "LUMERISCA_CHAT_REQUEST",
  payload: {
    prompt: "How do I view my metrics?",
    context: { url, title, ... }
  }
}

Background → UI:
{
  type: "LUMERISCA_CHAT_RESPONSE",
  payload: {
    response: "To view your metrics, click on..."
  }
}
```

## Storage

### Settings Schema

Stored in `chrome.storage.sync`:

```typescript
{
  lumerisca_settings: {
    llm: {
      provider: "openai" | "anthropic" | "openrouter",
      apiKey: string,
      model?: string
    },
    pageMapUrl?: string
  }
}
```

### Storage API

```typescript
// Get settings
const settings = await getSettings();

// Save settings
await saveSettings({
  llm: {
    provider: "openai",
    apiKey: "sk-..."
  }
});

// Check if configured
const hasKey = await hasApiKey();
```

## Permissions

### Required Permissions

- **storage**: Save user settings
- **scripting**: Inject content script
- **activeTab**: Access current tab info

### Host Permissions

- **<all_urls>**: Work on any webpage
  - Can be restricted to specific domains in production

## Development Tips

### Hot Reload

Vite's watch mode rebuilds on changes, but Chrome needs manual reload:

```bash
# Terminal 1: Watch mode
pnpm dev:extension

# After changes:
# 1. Go to chrome://extensions/
# 2. Click refresh icon on Lumerisca
```

### Debugging

**Content Script:**
- Open DevTools on the page (F12)
- Check Console for "Lumerisca:" logs

**Background Worker:**
- Go to chrome://extensions/
- Click "Service worker" under Lumerisca
- Opens DevTools for background script

**UI (Popup):**
- Right-click extension icon
- Select "Inspect popup"

### Common Issues

**Content script not injecting:**
- Check page allows content scripts
- Some pages like `chrome://` block scripts
- Check manifest matches pattern

**Service worker inactive:**
- Chrome puts idle workers to sleep
- They wake on messages
- Check "Service worker" link stays "active"

**API errors:**
- Verify API key is correct
- Check network tab for failed requests
- Look for CORS issues (shouldn't happen with direct API calls)

## Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script injects on test page
- [ ] Page context collected and sent
- [ ] Settings can be saved
- [ ] Chat message sends successfully
- [ ] LLM response displays correctly
- [ ] Settings persist after reload
- [ ] Works on multiple tabs simultaneously

### Test Pages

Create test HTML files with:
- Various heading structures
- Error messages
- Different URL patterns
- Dynamic content (SPA simulation)

## Publishing to Chrome Web Store

### Preparation

1. **Build production version**
   ```bash
   NODE_ENV=production pnpm build:extension
   ```

2. **Create proper icons**
   - 16x16, 48x48, 128x128 PNG
   - Professional design
   - Add to public/ directory

3. **Write store listing**
   - Description
   - Screenshots
   - Privacy policy

4. **Create ZIP**
   ```bash
   cd packages/extension-chrome/dist
   zip -r lumerisca-extension.zip .
   ```

5. **Submit to Chrome Web Store**
   - Developer Dashboard
   - Upload ZIP
   - Fill out listing
   - Submit for review

### Review Process

- Takes 1-3 business days
- May request changes
- Must comply with policies

## Security Best Practices

1. **API Keys**
   - Stored in chrome.storage (encrypted by Chrome)
   - Never logged or sent to third parties
   - Use password input fields

2. **Content Security Policy**
   - No inline scripts
   - All resources bundled
   - No eval() or unsafe practices

3. **Permissions**
   - Request minimum necessary
   - Justify in store listing
   - Consider optional permissions

4. **Error Handling**
   - Catch all errors
   - Don't expose sensitive info
   - User-friendly error messages

## Performance Optimization

1. **Code Splitting**
   - Vite automatically splits chunks
   - Lazy load heavy components

2. **Caching**
   - Cache embeddings
   - Cache doc store
   - Use chrome.storage wisely

3. **Debouncing**
   - Don't update context on every keystroke
   - Debounce DOM mutations

4. **Bundle Size**
   - Keep dependencies minimal
   - Tree-shake unused code
   - Monitor bundle size

## Next Steps

- Add automated tests
- Implement streaming responses
- Add conversation history
- Support more LLM providers
- Enhance UI/UX

For more information, see [architecture.md](./architecture.md) and [roadmap.md](./roadmap.md).
