# Lumerisca

**Page-aware AI assistant with scoped RAG and in-browser analysis**

Lumerisca is a Chrome extension that provides intelligent, context-aware assistance based on the current page you're viewing. It uses RAG (Retrieval-Augmented Generation) to scope its knowledge to relevant documentation for each page, making it perfect for in-app help, onboarding, and troubleshooting.

## Features

- **Page-Aware Context**: Automatically understands what page you're on
- **Scoped RAG**: Uses only relevant documentation for each page pattern
- **Multiple LLM Providers**: Works with OpenAI, Anthropic, and OpenRouter
- **No Backend Required**: All processing happens in your browser
- **Privacy-First**: Your API key stays local, never sent to any third party
- **Smart Context Collection**: Extracts page title, URL, headings, and error messages

## Architecture

Lumerisca is built as a monorepo with two main packages:

- **`@lumerisca/core`**: Pure TypeScript engine for context collection, page mapping, RAG, and LLM integration
- **`@lumerisca/extension-chrome`**: Chrome extension (Manifest V3) with React-based UI

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended) or npm/yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/lumerisca.git
cd lumerisca
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build the packages**

```bash
# Build everything
pnpm build

# Or build individually
pnpm build:core
pnpm build:extension
```

### Loading the Extension in Chrome

1. **Build the extension** (if you haven't already)

```bash
pnpm build:extension
```

2. **Create placeholder icons** (temporary for development)

```bash
cd packages/extension-chrome/public

# Option 1: Use ImageMagick (if installed)
convert -size 16x16 xc:#3b82f6 icon16.png
convert -size 48x48 xc:#3b82f6 icon48.png
convert -size 128x128 xc:#3b82f6 icon128.png

# Option 2: Download any PNG and rename it to icon16.png, icon48.png, icon128.png
# The extension will work with any placeholder images for development
```

3. **Load in Chrome**

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `packages/extension-chrome/dist` directory

4. **Configure your API key**

   - Click the Lumerisca extension icon
   - Go to Settings
   - Select your LLM provider (OpenAI, Anthropic, or OpenRouter)
   - Enter your API key
   - Save settings

5. **Start using Lumerisca**

   - Navigate to any webpage
   - Click the extension icon to open the side panel
   - Ask questions about the page!

## Development

### Project Structure

```
lumerisca/
├── packages/
│   ├── core/                  # Core engine
│   │   ├── src/
│   │   │   ├── context/       # Page context collection
│   │   │   ├── mapping/       # Page-to-docs mapping
│   │   │   ├── rag/          # RAG engine & document store
│   │   │   ├── llm/          # LLM client & providers
│   │   │   └── types.ts      # TypeScript types
│   │   └── package.json
│   └── extension-chrome/      # Chrome extension
│       ├── src/
│       │   ├── background/    # Service worker
│       │   ├── contentScript/ # Page injection
│       │   ├── sidepanel/     # React UI
│       │   ├── messaging/     # Message passing
│       │   └── storage/       # Settings storage
│       ├── public/
│       │   └── manifest.json
│       └── package.json
└── docs/                      # Documentation
```

### Development Workflow

1. **Watch mode for development**

```bash
pnpm dev:extension
```

This will rebuild the extension automatically when files change.

2. **Reload the extension in Chrome**

After making changes:
- Go to `chrome://extensions/`
- Click the refresh icon on the Lumerisca extension
- Or use the keyboard shortcut (varies by OS)

3. **Type checking**

```bash
pnpm type-check
```

4. **Clean build artifacts**

```bash
pnpm clean
```

## How It Works

### 1. Page Context Collection

When you visit a page, Lumerisca automatically collects:
- URL and pathname
- Page title
- Important DOM elements (headings, error messages, alerts)

### 2. Page Mapping

The extension maps URL patterns to relevant documentation:

```json
{
  "entries": [
    {
      "pattern": "/dashboard*",
      "sources": ["dashboard_intro", "metrics_guide"]
    },
    {
      "pattern": "/settings*",
      "sources": ["settings_overview", "account_management"]
    }
  ]
}
```

### 3. RAG Retrieval

When you ask a question:
1. The page pattern is matched to find relevant doc IDs
2. Documents are filtered to only those IDs
3. Your question is embedded (using OpenAI embeddings API)
4. Top K most similar documents are retrieved via cosine similarity

### 4. LLM Response

The retrieved context is combined with your question and sent to your chosen LLM provider, which returns a context-aware answer.

## Configuration

### Page Mapping

You can customize which documents appear for which pages by:

1. **Using the default map** (built-in)
2. **Providing a custom URL** in extension settings pointing to your own `pageMap.json`

### Document Sources

For MVP, documents are hardcoded in `packages/core/src/rag/documentStore.ts`. In production, you would:

1. Host your docs as JSON
2. Load them from a URL
3. Update the document store

### Supported LLM Providers

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **OpenRouter**: Access to multiple models via one API

## Customization

### Adding Your Own Documents

Edit `packages/core/src/rag/documentStore.ts`:

```typescript
export const DEFAULT_DOCUMENTS: RagSource[] = [
  {
    id: "my_custom_doc",
    title: "My Custom Documentation",
    content: `# Your documentation content here...`,
  },
  // ... more docs
];
```

### Customizing Page Patterns

Edit `packages/core/src/mapping/pageMapper.ts`:

```typescript
export const DEFAULT_PAGE_MAP: PageMap = {
  entries: [
    {
      pattern: "/my-app/dashboard*",
      sources: ["dashboard_help", "metrics"],
    },
    // ... more mappings
  ],
};
```

## Troubleshooting

### Extension not loading

- Make sure you built the extension: `pnpm build:extension`
- Check that icon files exist in `packages/extension-chrome/public/`
- Look for errors in `chrome://extensions/` with Developer mode enabled

### No API responses

- Verify your API key is set in Settings
- Check the browser console for errors (F12 → Console)
- Make sure you have internet connectivity
- Verify your API key has sufficient credits/quota

### Content script not injecting

- Check the page allows content scripts (some pages like `chrome://` do not)
- Look for console errors in the page (F12 → Console)
- Try reloading the extension

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for planned features and improvements.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Built with:
- TypeScript
- React
- Vite
- Chrome Extension APIs
- OpenAI / Anthropic / OpenRouter APIs

---

**Lumerisca** - Making every page smarter, one context at a time.
