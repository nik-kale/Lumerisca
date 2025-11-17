# Contributing to Lumerisca

Thank you for your interest in contributing to Lumerisca! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Security](#security)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect:

- Respectful communication
- Constructive feedback
- Focus on what is best for the community
- Empathy towards other community members

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm/yarn
- Git
- Chrome browser (for testing)
- TypeScript knowledge
- React experience

### First-Time Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/lumerisca.git
   cd lumerisca
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the project**
   ```bash
   pnpm build
   ```

4. **Load extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension-chrome/dist`

5. **Make a test change**
   - Edit a file
   - Run `pnpm build:extension`
   - Reload extension in Chrome

## Development Setup

### Recommended Tools

- **Editor:** VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Chrome Extension Kit

- **Browser:** Chrome with developer tools

### Environment Variables

Lumerisca doesn't require environment variables for development. API keys are stored in Chrome's extension storage.

### Development Commands

```bash
# Build everything
pnpm build

# Build core package only
pnpm build:core

# Build extension only
pnpm build:extension

# Watch mode for extension (rebuilds on changes)
pnpm dev:extension

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

## Project Structure

```
lumerisca/
├── packages/
│   ├── core/                  # Core engine (provider-agnostic)
│   │   ├── src/
│   │   │   ├── context/       # Page context collection
│   │   │   ├── mapping/       # Page-to-docs mapping
│   │   │   ├── rag/          # RAG engine
│   │   │   ├── llm/          # LLM clients
│   │   │   └── utils/        # Utilities (logging, validation, etc.)
│   │   └── package.json
│   └── extension-chrome/      # Chrome extension
│       ├── src/
│       │   ├── background/    # Service worker
│       │   ├── contentScript/ # Page injection
│       │   ├── sidepanel/     # React UI
│       │   ├── components/    # Shared React components
│       │   ├── messaging/     # Extension messaging
│       │   └── storage/       # Chrome storage utilities
│       └── package.json
├── docs/                      # Documentation
├── SECURITY.md               # Security policy
└── CONTRIBUTING.md           # This file
```

### Key Files

- `packages/core/src/index.ts` - Core package exports
- `packages/extension-chrome/src/background/serviceWorker.ts` - Background logic
- `packages/extension-chrome/src/sidepanel/AppEnhanced.tsx` - Main UI
- `packages/extension-chrome/public/manifest.json` - Extension manifest

## Development Workflow

### 1. Choose an Issue

- Check [GitHub Issues](https://github.com/yourusername/lumerisca/issues)
- Look for "good first issue" or "help wanted" labels
- Comment on the issue to claim it

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 3. Make Changes

- Write clean, readable code
- Follow coding standards (see below)
- Add comments for complex logic
- Update documentation if needed

### 4. Test Your Changes

```bash
# Type check
pnpm type-check

# Build
pnpm build:extension

# Manual testing in Chrome
# 1. Reload extension
# 2. Test on various pages
# 3. Check console for errors
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

Commit message format:
```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat: add dark mode support

fix: resolve rate limiting issue in OpenAI client

docs: update API reference with new exports
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Define types** explicitly, avoid `any`
- **Export types** that other packages might need
- **Use interfaces** over type aliases for objects

```typescript
// Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### Code Style

- **Indentation:** 2 spaces
- **Quotes:** Double quotes for strings
- **Semicolons:** Required
- **Line length:** Max 100 characters (flexible)
- **Naming:**
  - Variables/functions: `camelCase`
  - Classes/interfaces: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `camelCase.ts` or `PascalCase.tsx`

### React Components

```typescript
// Good - Functional component with types
interface Props {
  title: string;
  onSave: () => void;
}

function MyComponent({ title, onSave }: Props) {
  return <div>{title}</div>;
}

export default MyComponent;
```

### Error Handling

```typescript
// Good - Use custom error types
import { ApiError, logger } from "@lumerisca/core";

try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", error);
  throw new ApiError("Failed to complete operation", 500);
}

// Avoid - Generic errors
try {
  await riskyOperation();
} catch (error) {
  throw new Error("Something went wrong");
}
```

### Documentation

- **JSDoc comments** for all exported functions
- **Inline comments** for complex logic
- **README updates** for new features
- **API reference updates** for new exports

```typescript
/**
 * Validates and sanitizes user input
 *
 * @param input - Raw user input string
 * @returns Sanitized input
 * @throws ValidationError if input is invalid
 *
 * @example
 * ```typescript
 * const safe = validatePrompt(userInput);
 * ```
 */
export function validatePrompt(input: string): string {
  // Implementation
}
```

## Testing

### Manual Testing

1. **Build the extension**
   ```bash
   pnpm build:extension
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Reload extension

3. **Test scenarios:**
   - [ ] Install extension fresh
   - [ ] Configure API key
   - [ ] Navigate to different pages
   - [ ] Ask questions
   - [ ] Check error handling
   - [ ] Test keyboard shortcuts
   - [ ] Try different themes
   - [ ] Export conversation

### Unit Testing

(Coming soon - test framework TBD)

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

### Integration Testing

(Coming soon)

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] TypeScript compiles without errors (`pnpm type-check`)
- [ ] Extension builds successfully (`pnpm build:extension`)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Manual testing completed

## Screenshots
(if applicable)
```

### Review Process

1. **Automated checks:** Must pass (when CI is set up)
2. **Code review:** At least one maintainer approval required
3. **Testing:** Changes must be manually tested
4. **Documentation:** Must be up-to-date

### Merging

- Maintainers will merge approved PRs
- Squash and merge is preferred
- Delete branch after merge

## Security

### Reporting Vulnerabilities

**DO NOT** open a public issue for security vulnerabilities.

Instead:
1. Email: security@lumerisca.dev (TODO: set up)
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

See [SECURITY.md](./SECURITY.md) for full policy.

### Security Best Practices

When contributing code:

- **Never commit API keys** or secrets
- **Validate all user input** using provided utilities
- **Sanitize output** to prevent XSS
- **Use HTTPS** for all external requests
- **Follow principle of least privilege**
- **Log security events** appropriately
- **Don't expose sensitive data** in errors

```typescript
// Good - Use validation utilities
import { validatePrompt, validateUrl } from "@lumerisca/core";

const safePrompt = validatePrompt(userInput);
const safeUrl = validateUrl(url, true); // HTTPS only

// Bad - No validation
const prompt = userInput;
const data = await fetch(url);
```

## Feature Requests

### Proposing New Features

1. **Check existing issues** first
2. **Open a discussion** (GitHub Discussions TODO)
3. **Describe the feature:**
   - What problem does it solve?
   - Who benefits from it?
   - How should it work?
   - Any alternatives considered?

4. **Wait for feedback** before implementing
5. **Create an issue** if approved

### Design Documents

For major features, create a design document:

```markdown
## Feature: [Name]

### Problem
What problem are we solving?

### Solution
How will this feature solve it?

### Technical Design
- Architecture changes
- New components
- Data flow
- APIs

### Alternatives Considered
What else did we consider?

### Implementation Plan
1. Step 1
2. Step 2
...

### Testing Plan
How will we test this?

### Documentation
What docs need updating?
```

## Documentation

### What to Document

- **Code:** JSDoc comments
- **Features:** README and docs/
- **APIs:** API reference
- **Setup:** Installation guide
- **Usage:** User guide
- **Security:** Security policy

### Documentation Style

- **Clear and concise**
- **Examples included**
- **Up-to-date**
- **Well-organized**
- **Beginner-friendly**

## Release Process

(For maintainers)

1. **Version bump** in package.json files
2. **Update CHANGELOG.md**
3. **Create release branch**
4. **Final testing**
5. **Merge to main**
6. **Tag release**
7. **Build production**
8. **Submit to Chrome Web Store**

## Getting Help

- **Documentation:** See [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/lumerisca/issues)
- **Discussions:** (TODO: GitHub Discussions)
- **Discord:** (TODO: set up)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md (TODO)
- Mentioned in release notes
- Added to GitHub contributors list

Thank you for contributing to Lumerisca! 🚀
