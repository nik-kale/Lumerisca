# Lumerisca Roadmap

This document outlines planned features and improvements for Lumerisca.

## Current Status: MVP (v0.1.0)

The MVP includes:
- Basic page context collection (URL, title, headings, errors)
- Simple page-to-docs mapping with glob patterns
- RAG retrieval using OpenAI embeddings
- Support for OpenAI, Anthropic, and OpenRouter
- Chrome extension with chat UI and settings
- Local storage for API keys

## Short-term (v0.2.0 - v0.3.0)

### Enhanced Context Collection

- [ ] **Network monitoring**: Track API calls and errors
- [ ] **Form field detection**: Identify input fields and their labels
- [ ] **Button/action detection**: Find clickable elements
- [ ] **Screenshot analysis**: Optional visual context via multimodal LLMs
- [ ] **Local storage inspection**: Read relevant localStorage/sessionStorage

### Improved RAG

- [ ] **Multiple embedding models**: Support for other providers
- [ ] **Hybrid search**: Combine keyword + semantic search
- [ ] **Document chunking**: Split long docs for better retrieval
- [ ] **Relevance scoring**: Better ranking of retrieved docs
- [ ] **Document metadata**: Tags, categories, timestamps

### Better Page Mapping

- [ ] **Regex patterns**: More flexible URL matching
- [ ] **Query parameter matching**: `/product?id=*`
- [ ] **DOM-based rules**: Match by page elements, not just URL
- [ ] **Dynamic mapping**: Load page maps from remote URLs
- [ ] **User-defined mappings**: Let users add custom patterns

### UX Improvements

- [ ] **Streaming responses**: Show LLM output as it generates
- [ ] **Conversation history**: Persist chat across sessions
- [ ] **Per-tab conversations**: Separate history per page
- [ ] **Quick actions**: Suggested follow-up questions
- [ ] **Code highlighting**: Syntax highlighting in responses
- [ ] **Copy button**: Copy responses to clipboard

### Developer Experience

- [ ] **TypeScript strict mode**: Enforce stricter types
- [ ] **Unit tests**: Core engine test coverage
- [ ] **E2E tests**: Extension flow testing
- [ ] **Documentation**: JSDoc comments everywhere
- [ ] **Example projects**: Demo apps showing integration

## Mid-term (v0.4.0 - v0.6.0)

### Advanced Features

- [ ] **Multi-turn conversations**: Context-aware follow-ups
- [ ] **Action suggestions**: "Click here to fix this"
- [ ] **Troubleshooting flows**: Step-by-step guided help
- [ ] **Onboarding tours**: Interactive walkthroughs
- [ ] **Feedback loop**: Users can rate responses
- [ ] **Analytics**: Track usage patterns (privacy-preserving)

### Integration Capabilities

- [ ] **Custom doc sources**: Load docs from APIs
- [ ] **Markdown rendering**: Better formatting in responses
- [ ] **Link detection**: Auto-link to referenced pages
- [ ] **Image support**: Show images in responses
- [ ] **Video embeds**: Link to tutorial videos

### Multi-platform Support

- [ ] **Firefox extension**: Port to Firefox
- [ ] **Edge extension**: Port to Edge
- [ ] **Safari extension**: Port to Safari (if feasible)
- [ ] **Standalone SDK**: Use Lumerisca in any web app
- [ ] **React component**: Drop-in chat widget

### Enterprise Features

- [ ] **Team docs**: Shared document repositories
- [ ] **SSO integration**: Enterprise authentication
- [ ] **Admin dashboard**: Manage docs and mappings
- [ ] **Usage analytics**: Team-wide insights
- [ ] **Custom branding**: White-label option

## Long-term (v1.0.0+)

### AI Enhancements

- [ ] **Local LLMs**: Run models in-browser (WebGPU)
- [ ] **Fine-tuning**: Custom models for specific apps
- [ ] **Multi-agent systems**: Specialized agents for different tasks
- [ ] **Memory/context management**: Long-term user memory
- [ ] **Proactive assistance**: Suggest help before asked

### Advanced RAG

- [ ] **Vector database**: More scalable storage
- [ ] **Graph-based retrieval**: Knowledge graph integration
- [ ] **Multi-hop reasoning**: Chain multiple doc sources
- [ ] **Source attribution**: Cite specific doc sections
- [ ] **Confidence scores**: How sure is the answer?

### Automation

- [ ] **Workflow automation**: Multi-step task execution
- [ ] **Form filling**: Auto-complete forms based on context
- [ ] **Data extraction**: Pull data from pages into structured format
- [ ] **Testing assistance**: Help write test cases
- [ ] **Bug reporting**: Auto-generate bug reports

### Platform

- [ ] **Lumerisca Cloud**: Optional hosted service
- [ ] **Doc hosting**: Host and manage docs
- [ ] **Marketplace**: Share and discover page maps
- [ ] **API**: Programmatic access to Lumerisca features
- [ ] **Webhooks**: Integrate with other tools

### Security & Privacy

- [ ] **End-to-end encryption**: For sensitive docs
- [ ] **Zero-knowledge architecture**: Server never sees content
- [ ] **Audit logs**: Track all actions
- [ ] **Compliance**: SOC2, GDPR, etc.
- [ ] **Self-hosted option**: Run entirely on-prem

## Research & Experiments

These are ideas to explore, not committed features:

- **Multi-modal context**: Analyze screenshots, videos
- **Voice interface**: Speak questions instead of typing
- **Browser automation**: Let AI interact with the page
- **Collaborative features**: Team-based assistance
- **Learning from feedback**: Improve responses over time
- **Cross-app context**: Share context across different apps

## Community Requests

We'll track feature requests from users and add them here. To request a feature:

1. Open a GitHub issue
2. Tag it with `feature-request`
3. Describe your use case

## Release Schedule

- **v0.2.0**: Q2 2025
- **v0.3.0**: Q3 2025
- **v0.4.0**: Q4 2025
- **v1.0.0**: 2026

Note: This is a tentative schedule and may change based on priorities and resources.

## How to Contribute

We welcome contributions! Here's how you can help:

1. **Pick an item** from Short-term or Mid-term
2. **Open an issue** to discuss your approach
3. **Submit a PR** with your implementation
4. **Update docs** if you add new features

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines (TODO: create this file).

## Feedback

Have ideas not listed here? We'd love to hear them!

- Open a GitHub issue
- Join our Discord (TODO: create)
- Email: feedback@lumerisca.dev (TODO: set up)

---

Last updated: 2025-01-16
