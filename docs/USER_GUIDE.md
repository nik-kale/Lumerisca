# Lumerisca User Guide

**Welcome to Lumerisca!** This guide will help you get the most out of your page-aware AI assistant.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Using Lumerisca](#using-lumerisca)
4. [Settings](#settings)
5. [Tips & Tricks](#tips--tricks)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)
8. [Privacy & Security](#privacy--security)

## Quick Start

### Installation (5 minutes)

1. **Download** or clone the Lumerisca repository
2. **Install dependencies:**
   ```bash
   cd Lumerisca
   pnpm install
   ```

3. **Build the extension:**
   ```bash
   pnpm build:extension
   ```

4. **Create icons** (temporary placeholders):
   ```bash
   cd packages/extension-chrome/public
   # Option 1: Use any PNG image
   # Copy/download a PNG and duplicate it as:
   # - icon16.png
   # - icon48.png
   # - icon128.png
   ```

5. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select `Lumerisca/packages/extension-chrome/dist`

6. **Configure your API key:**
   - Click the Lumerisca extension icon
   - Click "Settings"
   - Choose your LLM provider
   - Enter your API key
   - Click "Save Settings"

7. **Start using:**
   - Navigate to any webpage
   - Click the extension icon
   - Ask your first question!

### Getting API Keys

#### OpenAI
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. **Important:** Set usage limits in your account settings

#### Anthropic
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

#### OpenRouter
1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up or log in
3. Go to Keys section
4. Generate a new API key
5. Copy the key (starts with `sk-or-v1-`)

## Features

### 1. Page-Aware Context

Lumerisca automatically understands what page you're on:
- **URL and title** of the current page
- **Headings** (h1, h2, h3)
- **Error messages** and alerts
- **Notifications** and important UI elements

This context is used to provide relevant, targeted answers.

### 2. Scoped RAG (Retrieval-Augmented Generation)

Instead of using all available documentation, Lumerisca:
- Maps URL patterns to specific doc sets
- Only searches relevant documentation
- Provides focused, accurate answers
- Reduces noise and irrelevant information

**Example:**
- On `/dashboard` → Uses dashboard docs
- On `/settings` → Uses settings docs
- On `/help` → Uses help center docs

### 3. Multi-Provider Support

Choose your preferred LLM provider:

| Provider | Best For | Cost | Speed |
|----------|----------|------|-------|
| **OpenAI** | General use, good balance | $$ | Fast |
| **Anthropic** | Complex reasoning, safety | $$$ | Medium |
| **OpenRouter** | Access to multiple models | Varies | Varies |

### 4. Conversation Interface

- **Chat-style UI** for natural interaction
- **Message history** within session
- **Quick suggestions** to get started
- **Copy responses** for later use

### 5. Privacy-First Architecture

- **No backend servers** - everything runs in your browser
- **API keys stored locally** in encrypted Chrome storage
- **No data collection** - we don't see your conversations
- **Full control** - export or delete data anytime

## Using Lumerisca

### Basic Usage

1. **Navigate to a page** you need help with
2. **Click the extension icon** to open Lumerisca
3. **Type your question** in the input field
4. **Press Send** or hit Enter
5. **Read the response** - context-aware answer from the AI

### Example Questions

**On a dashboard page:**
- "What do these metrics mean?"
- "How do I export this data?"
- "Why is my error rate increasing?"

**On a settings page:**
- "How do I change my password?"
- "What does two-factor authentication do?"
- "How do I invite team members?"

**On an error page:**
- "What does this error mean?"
- "How do I fix this issue?"
- "What are the common causes of this error?"

### Advanced Usage

#### Multi-Turn Conversations

Lumerisca remembers context within a conversation:

```
You: What are the main metrics on this dashboard?
Lumerisca: The main metrics are response time, error rate...

You: How do I improve error rate?
Lumerisca: To improve error rate, you can...
```

#### Page Navigation

- Context updates automatically when you navigate
- Each tab has independent conversation history
- URL changes trigger context refresh

## Settings

### LLM Provider

Choose between OpenAI, Anthropic, or OpenRouter.

**When to use which:**
- **OpenAI:** Best all-around choice, good speed and cost
- **Anthropic:** More thoughtful responses, better for complex questions
- **OpenRouter:** Access multiple models, good for experimentation

### API Key

Enter your API key from your chosen provider.

**Security tips:**
- Use a dedicated key for Lumerisca
- Set usage limits in your provider dashboard
- Monitor usage regularly
- Never share your API key

### Model Selection

Choose a specific model or use the default.

**Popular choices:**
- `gpt-4o-mini` (OpenAI) - Fast, affordable
- `gpt-4o` (OpenAI) - More capable, slower
- `claude-3-5-haiku` (Anthropic) - Fast, affordable
- `claude-3-5-sonnet` (Anthropic) - Most capable

### Page Map URL

*(Advanced)* Load custom page-to-docs mappings from a URL.

**Format:**
```json
{
  "entries": [
    {
      "pattern": "/your-path*",
      "sources": ["doc_id_1", "doc_id_2"]
    }
  ]
}
```

## Tips & Tricks

### Getting Better Answers

1. **Be specific:**
   - ❌ "Help with this page"
   - ✅ "How do I export metrics from this dashboard?"

2. **Provide context if needed:**
   - ❌ "What's wrong?"
   - ✅ "I'm seeing a 404 error when I click the export button"

3. **Ask follow-ups:**
   - First question gets you started
   - Follow-ups dive deeper
   - Lumerisca remembers conversation context

### Keyboard Shortcuts

*(Coming soon)*
- `Ctrl+Shift+L` - Open/close Lumerisca
- `Esc` - Close Lumerisca
- `Ctrl+K` - Focus input field

### Power User Features

#### Export Conversations

*(Coming soon)* Save your conversations for later reference.

#### Custom Prompts

*(Coming soon)* Set custom system prompts for specific use cases.

#### Dark Mode

*(Coming soon)* Toggle between light and dark themes.

## Troubleshooting

### Extension Not Loading

**Symptoms:** Extension icon doesn't appear or is grayed out

**Solutions:**
1. Check that you built the extension: `pnpm build:extension`
2. Verify icon files exist in `packages/extension-chrome/public/`
3. Reload the extension in `chrome://extensions/`
4. Check browser console for errors (F12 → Console)

### No API Responses

**Symptoms:** Questions send but no answer appears

**Solutions:**
1. **Check API key:**
   - Go to Settings
   - Verify API key is correct
   - Try entering it again

2. **Check rate limits:**
   - You may be hitting rate limits
   - Wait a minute and try again
   - Check provider dashboard for quota

3. **Check internet connection:**
   - Ensure you're online
   - Try opening another website

4. **Check provider status:**
   - Visit provider status page
   - OpenAI: status.openai.com
   - Anthropic: status.anthropic.com

### Slow Responses

**Symptoms:** Answers take a long time to appear

**Possible causes:**
1. **Model choice:** Some models are slower
2. **Network latency:** Slow internet connection
3. **Provider load:** High demand on provider
4. **Large context:** Very long pages take longer to process

**Solutions:**
- Try a faster model (e.g., `gpt-4o-mini` instead of `gpt-4o`)
- Check your internet speed
- Wait and retry during off-peak hours

### Content Script Not Injecting

**Symptoms:** Side drawer doesn't appear on pages

**Possible causes:**
- Some pages block content scripts (chrome://, file://)
- Extension hasn't reloaded after changes
- Conflicting extension

**Solutions:**
1. Check if page allows extensions (try on github.com)
2. Reload extension: chrome://extensions/ → Refresh icon
3. Disable other extensions temporarily to test

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "API key not configured" | No API key in settings | Add API key in Settings |
| "Rate limit exceeded" | Too many requests | Wait 1 minute, try again |
| "Invalid API key" | Key format wrong or revoked | Check key in provider dashboard |
| "Request timeout" | Request took too long | Check internet, retry |
| "Failed after X attempts" | Multiple retry failures | Check provider status, wait and retry |

## FAQ

### General

**Q: Is Lumerisca free?**
A: Lumerisca is open source and free to use. However, you need your own API key from LLM providers, which may have costs.

**Q: Does Lumerisca work offline?**
A: No, Lumerisca requires an internet connection to call LLM APIs.

**Q: What browsers are supported?**
A: Currently Chrome and Edge. Firefox and Safari support planned.

**Q: Can I use Lumerisca on mobile?**
A: Not yet. Mobile browser extensions are planned for the future.

### Privacy & Security

**Q: Where is my data stored?**
A: All data is stored locally in your browser using Chrome's storage API. API keys are encrypted by Chrome.

**Q: Do you see my conversations?**
A: No. There is no Lumerisca backend. Your conversations go directly from your browser to your chosen LLM provider.

**Q: What data does Lumerisca send to LLM providers?**
A: Only the page context (URL, title, headings) and your question. This is visible to your chosen provider.

**Q: Can I delete my data?**
A: Yes. Settings → Clear all data. This removes all conversations and settings from your browser.

**Q: Is my API key safe?**
A: API keys are stored in Chrome's encrypted storage. However, if someone gains access to your Chrome profile, they could potentially access it. See [Security Best Practices](#privacy--security).

### Usage

**Q: How many questions can I ask?**
A: Rate limits apply (10/min for OpenAI/Anthropic, 20/min for OpenRouter). You also have API quota limits set by your provider.

**Q: Can I use multiple API keys?**
A: Not simultaneously. You can switch providers in Settings, which changes which API key is used.

**Q: Does conversation history persist?**
A: Currently within session only. Persistent history across sessions is coming soon.

**Q: Can I customize which docs are used?**
A: Advanced users can provide a custom page map URL in Settings. Documentation for this feature is coming soon.

### Troubleshooting

**Q: Why aren't my questions being answered accurately?**
A: Make sure you're on a page that has relevant documentation mapped. The default page map is limited. Consider customizing it for your needs.

**Q: Why is the extension slow?**
A: Several factors affect speed: model choice, internet connection, provider load, and page complexity. Try a faster model like `gpt-4o-mini`.

**Q: Can I use Lumerisca on internal/private company pages?**
A: Yes, but be cautious. Page context is sent to LLM providers. Don't use on pages with sensitive information unless your provider's privacy policy permits it.

## Privacy & Security

### What Lumerisca Collects

**Lumerisca itself collects nothing.** There are no Lumerisca servers.

### What Your LLM Provider Sees

When you ask a question, we send:
- Page URL
- Page title
- Page headings and visible text
- Your question

This goes to your chosen provider (OpenAI, Anthropic, or OpenRouter).

### Security Best Practices

1. **Protect your API key:**
   - Never share it
   - Set usage limits
   - Monitor usage regularly
   - Rotate keys periodically

2. **Be careful what you share:**
   - Don't ask questions about passwords or credentials
   - Avoid pages with sensitive personal information
   - Remember: Page content is sent to LLM provider

3. **On shared computers:**
   - Don't use Lumerisca on public/shared computers
   - Always log out of Chrome profile when done

4. **Review permissions:**
   - Lumerisca needs to read page content
   - This is necessary for page-aware assistance
   - Disable extension on sensitive pages if concerned

For more details, see our [Security Policy](../SECURITY.md).

## Getting Help

### Resources

- **Documentation:** [docs/](./index.md)
- **GitHub Issues:** [github.com/yourusername/lumerisca/issues](https://github.com/yourusername/lumerisca/issues)
- **Roadmap:** [docs/roadmap.md](./roadmap.md)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md) (TODO)

### Support Channels

- **Bug reports:** GitHub Issues
- **Feature requests:** GitHub Issues (tag: feature-request)
- **Security issues:** security@lumerisca.dev (TODO: set up)
- **General questions:** GitHub Discussions (TODO: set up)

## What's Next?

Check out:
- [Extension Development Guide](./extension.md) - For developers
- [Architecture Documentation](./architecture.md) - How it works
- [Security Policy](../SECURITY.md) - Security details
- [Roadmap](./roadmap.md) - Upcoming features

---

**Happy using Lumerisca!** 🚀

We hope Lumerisca makes every page smarter and more helpful. If you have feedback or suggestions, we'd love to hear from you!
