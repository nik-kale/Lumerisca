# Security Policy

## Table of Contents

- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [Security Model](#security-model)
- [Threat Model](#threat-model)
- [Security Features](#security-features)
- [Best Practices for Users](#best-practices-for-users)
- [Best Practices for Developers](#best-practices-for-developers)
- [Security Audit History](#security-audit-history)

## Reporting a Vulnerability

We take the security of Lumerisca seriously. If you discover a security vulnerability, please follow these guidelines:

### Responsible Disclosure

1. **Do NOT** disclose the vulnerability publicly until it has been addressed
2. **Do NOT** exploit the vulnerability beyond what is necessary to demonstrate it
3. **DO** report it privately to our security team

### How to Report

**Email:** security@lumerisca.dev (TODO: set up dedicated email)

**Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information (for follow-up)

### What to Expect

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 7 days
- **Fix Timeline:** Depends on severity
  - Critical: Within 48 hours
  - High: Within 7 days
  - Medium: Within 30 days
  - Low: Within 90 days

### Bounty Program

We currently do not offer a bug bounty program, but we will publicly acknowledge security researchers who responsibly disclose vulnerabilities (with their permission).

## Security Model

### Trust Boundaries

```
┌─────────────────────────────────────────┐
│         User's Browser                   │
│  ┌────────────────────────────────────┐ │
│  │  Lumerisca Extension                │ │
│  │  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │  Content     │  │  Background │ │ │
│  │  │  Script      │  │  Worker     │ │ │
│  │  └──────┬───────┘  └──────┬──────┘ │ │
│  │         │                  │        │ │
│  │         └─────────┬────────┘        │ │
│  │                   │                 │ │
│  │         chrome.storage.sync         │ │
│  │        (API Keys Stored Here)       │ │
│  └────────────────────────────────────┘ │
└───────────────┬─────────────────────────┘
                │
                │ HTTPS Only
                ▼
┌───────────────────────────────────────┐
│      External LLM APIs                 │
│  - OpenAI                              │
│  - Anthropic                           │
│  - OpenRouter                          │
└───────────────────────────────────────┘
```

### Assets

1. **Critical Assets**
   - User API keys (OpenAI, Anthropic, OpenRouter)
   - Conversation history
   - Page context data

2. **Important Assets**
   - Extension settings
   - RAG documents
   - Page mappings

3. **Low-Value Assets**
   - Logs
   - UI state

## Threat Model

### Threats and Mitigations

| Threat | Likelihood | Impact | Mitigation | Status |
|--------|-----------|--------|------------|--------|
| **API Key Theft** | Medium | Critical | Encryption, validation, user warnings | ✅ Implemented |
| **XSS in Chat Messages** | Low | High | Input sanitization, CSP | ✅ Implemented |
| **MITM on API Calls** | Low | High | HTTPS only, cert validation | ✅ Implemented |
| **Rate Limit Abuse** | Medium | Medium | Token bucket algorithm | ✅ Implemented |
| **Malicious Doc Injection** | Low | Medium | URL validation, HTTPS only | ✅ Implemented |
| **Extension Impersonation** | Low | High | Code signing (future) | ⏳ Planned |
| **Local Storage Access** | Medium | Critical | Chrome's built-in encryption | ✅ By Platform |
| **Network Eavesdropping** | Low | High | HTTPS enforcement | ✅ Implemented |

### Attack Scenarios

#### 1. API Key Compromise

**Scenario:** Attacker gains access to user's Chrome profile

**Impact:** Can use API keys to make unauthorized LLM requests

**Mitigations:**
- ✅ API keys stored in `chrome.storage.sync` (encrypted by Chrome)
- ✅ Keys validated before storage
- ✅ Warning displayed about key sensitivity
- ⏳ Planned: Optional local-only storage
- ⏳ Planned: Key rotation guidance

#### 2. Malicious Prompt Injection

**Scenario:** Attacker crafts webpage with malicious content that gets included in LLM context

**Impact:** Could manipulate LLM responses

**Mitigations:**
- ✅ Input validation on all prompts (max 4000 chars)
- ✅ Sanitization of DOM content before collection
- ✅ Prompt size limits
- ✅ Clear separation of user prompts and context

#### 3. Cross-Site Scripting (XSS)

**Scenario:** Malicious content in LLM response or page context executes in extension UI

**Impact:** Could steal API keys or manipulate extension behavior

**Mitigations:**
- ✅ Content Security Policy in manifest
- ✅ Text sanitization for all displayed content
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ React's built-in XSS protection
- 🔄 TODO: DOMPurify for advanced sanitization

#### 4. API Quota Exhaustion

**Scenario:** Malicious script makes excessive API calls

**Impact:** User's API quota consumed, cost increases

**Mitigations:**
- ✅ Rate limiting (10 req/min for OpenAI/Anthropic, 20 req/min for OpenRouter)
- ✅ Request timeout (30 seconds)
- ✅ Visual confirmation before each request
- ⏳ Planned: Configurable rate limits
- ⏳ Planned: Cost tracking

#### 5. Phishing for API Keys

**Scenario:** Fake website impersonates Lumerisca settings page

**Impact:** User enters API key on malicious site

**Mitigations:**
- ✅ Extension UI clearly branded
- ✅ Settings only accessible via extension popup
- ⏳ Planned: Browser notification about official sources

## Security Features

### Implemented ✅

1. **Input Validation**
   ```typescript
   - Prompt length: Max 4000 characters
   - URL validation: HTTPS only, no private networks
   - API key format validation per provider
   - Model name validation: Alphanumeric + dash/dot/slash only
   ```

2. **Rate Limiting**
   ```typescript
   - OpenAI: 10 requests/minute
   - Anthropic: 10 requests/minute
   - OpenRouter: 20 requests/minute
   - Embeddings: 100 requests/minute
   ```

3. **Error Handling**
   ```typescript
   - Custom error types (ApiError, ValidationError, etc.)
   - Retry logic with exponential backoff
   - Timeout enforcement (30s default)
   - User-friendly error messages (no stack traces in prod)
   ```

4. **Content Security**
   ```typescript
   - Text sanitization for XSS prevention
   - HTML sanitization for displayed content
   - No inline scripts or eval()
   - React's XSS protection
   ```

5. **Network Security**
   ```typescript
   - HTTPS-only for all external requests
   - Private network blocking (localhost, 10.x.x.x, etc.)
   - Certificate validation (browser default)
   - Request timeout enforcement
   ```

6. **Storage Security**
   ```typescript
   - API keys in chrome.storage.sync (encrypted by Chrome)
   - Conversation history in chrome.storage.local
   - No sensitive data in console logs (production mode)
   - Clear storage option for users
   ```

### Planned ⏳

1. **Enhanced Encryption**
   - Additional encryption layer for API keys
   - Optional password-protected key storage

2. **Audit Logging**
   - Security event logging
   - API call audit trail
   - Export logs for review

3. **Advanced Rate Limiting**
   - Per-user customizable limits
   - Cost tracking and budgets
   - Usage analytics

4. **Code Signing**
   - Signed extension builds
   - Integrity verification
   - Tamper detection

## Best Practices for Users

### Protecting Your API Keys

1. **Use Environment-Specific Keys**
   - Don't reuse production API keys
   - Create dedicated keys for browser extensions
   - Set usage limits in provider dashboards

2. **Monitor Usage**
   - Regularly check API usage in provider dashboards
   - Set up billing alerts
   - Revoke keys if unusual activity detected

3. **Secure Your Device**
   - Use strong password/PIN for your computer
   - Enable full-disk encryption
   - Lock screen when away
   - Use Chrome's password protection

4. **Review Permissions**
   - Understand what Lumerisca can access
   - Only use on trusted networks
   - Disable extension when not needed

### Safe Usage

1. **Sensitive Information**
   - Don't paste passwords or credentials in prompts
   - Don't share private/confidential information
   - Remember: Context is sent to LLM providers

2. **Public Computers**
   - Don't use Lumerisca on public/shared computers
   - Always clear history after use
   - Log out of Chrome profile

3. **Untrusted Pages**
   - Be cautious on untrusted websites
   - Lumerisca reads page content
   - Disable on sensitive pages (banking, healthcare, etc.)

## Best Practices for Developers

### Secure Coding

1. **Input Validation**
   ```typescript
   // Always validate user input
   import { validatePrompt } from "@lumerisca/core";

   const userPrompt = validatePrompt(input); // Throws on invalid
   ```

2. **Use Provided Utilities**
   ```typescript
   // Use enhanced client with built-in security
   import { EnhancedLLMClient } from "@lumerisca/core";

   const client = new EnhancedLLMClient(config);
   // Includes: validation, rate limiting, retry, timeout
   ```

3. **Error Handling**
   ```typescript
   // Never expose internal errors to users
   try {
     await riskyOperation();
   } catch (error) {
     logger.error("Operation failed", error);
     // Show user-friendly message only
     showError("Something went wrong. Please try again.");
   }
   ```

4. **Logging**
   ```typescript
   // Never log sensitive data
   logger.info("API call", {
     provider: "openai",
     // ❌ DON'T: apiKey: apiKey
     // ✅ DO: keyPrefix: apiKey.substring(0, 7) + "..."
   });
   ```

### Code Review Checklist

- [ ] No API keys or secrets in code
- [ ] All user input validated
- [ ] Errors handled gracefully
- [ ] No sensitive data in logs
- [ ] HTTPS-only for external calls
- [ ] Rate limiting applied
- [ ] Timeouts set on network calls
- [ ] XSS prevention for displayed content
- [ ] No `eval()` or `Function()` calls
- [ ] Dependencies up to date

### Dependency Management

1. **Keep Dependencies Updated**
   ```bash
   pnpm update
   pnpm audit
   ```

2. **Review Security Advisories**
   - Check GitHub Security Advisories
   - Monitor npm audit results
   - Update promptly on critical issues

3. **Minimize Dependencies**
   - Only add necessary packages
   - Prefer standard library when possible
   - Review licenses and maintainership

## Security Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2025-01-16 | Internal | Phase 1 Security Review | 8 issues identified | ✅ All fixed |
| TBD | External | Full Security Audit | Pending | ⏳ Planned |

### Phase 1 Internal Audit (2025-01-16)

**Issues Found:**
1. ✅ Missing input validation → **Fixed:** Added comprehensive validation
2. ✅ No rate limiting → **Fixed:** Token bucket implementation
3. ✅ Missing error boundaries → **Fixed:** React ErrorBoundary added
4. ✅ Insufficient XSS protection → **Fixed:** Sanitization utilities
5. ✅ No request timeouts → **Fixed:** 30s timeout enforced
6. ✅ Missing retry logic → **Fixed:** Exponential backoff implemented
7. ✅ Inadequate error handling → **Fixed:** Custom error types + logging
8. ✅ API key validation missing → **Fixed:** Format validation per provider

## Incident Response

### If You Suspect a Security Issue

1. **Stop using the extension immediately**
2. **Revoke API keys** in provider dashboards
3. **Report the issue** to security@lumerisca.dev
4. **Clear extension data** (Settings → Clear all data)
5. **Update to latest version** when fix is released

### Incident Response Timeline

| Event | Action | Timeline |
|-------|--------|----------|
| Vulnerability reported | Acknowledge | < 48 hours |
| Severity assessed | Triage & prioritize | < 7 days |
| Fix developed | Patch created | Varies by severity |
| Fix reviewed | Code review + testing | Before release |
| Fix released | Extension updated | Auto-update |
| Users notified | Security advisory published | With release |

## Compliance

### Data Protection

**GDPR Compliance:**
- No data sent to Lumerisca servers (none exist)
- Data sent to chosen LLM provider only
- User can export/delete all data
- Privacy policy available

**CCPA Compliance:**
- Users control their data
- Can request data deletion
- No sale of user data

### Chrome Web Store Policies

Lumerisca complies with:
- Content Security Policy requirements
- Permission usage justification
- Privacy policy disclosure
- Secure data transmission (HTTPS)

## Additional Resources

- [Threat Model Documentation](./docs/threat-model.md) (TODO)
- [Privacy Policy](./PRIVACY.md) (TODO)
- [Contributing Security Improvements](./CONTRIBUTING.md#security) (TODO)
- [Security Best Practices Guide](./docs/security-best-practices.md) (TODO)

## Contact

**Security Team:** security@lumerisca.dev (TODO: set up)
**General Support:** support@lumerisca.dev (TODO: set up)
**GitHub Issues:** https://github.com/yourusername/lumerisca/issues

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Next Review:** After external security audit
