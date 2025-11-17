/**
 * Enhanced LLM Client with security, stability, and performance improvements
 * This version includes: validation, rate limiting, retry logic, timeouts, and proper error handling
 */

import type { ChatMessage, LLMConfig, LLMProvider } from "../types.js";
import { getProviderConfig, getDefaultModel } from "./providers.js";
import { logger } from "../utils/logger.js";
import { validateApiKey, validateModel, validatePrompt } from "../utils/validation.js";
import { rateLimiter, RateLimitError, DEFAULT_RATE_LIMITS } from "../utils/rateLimiter.js";
import { retry, RetryExhaustedError } from "../utils/retry.js";
import { ApiError, withTimeout } from "../utils/errors.js";

const log = logger.scope("LLMClient");

/**
 * Enhanced LLM Client with full security and stability features
 */
export class EnhancedLLMClient {
  private config: LLMConfig;
  private requestTimeoutMs: number = 30000; // 30 seconds default

  constructor(config: LLMConfig, timeoutMs?: number) {
    // Validate configuration
    this.validateConfig(config);
    this.config = config;

    if (timeoutMs) {
      this.requestTimeoutMs = timeoutMs;
    }

    log.info("Enhanced LLM client initialized", {
      provider: config.provider,
      model: config.model || "default",
    });
  }

  /**
   * Validate LLM configuration
   */
  private validateConfig(config: LLMConfig): void {
    try {
      validateApiKey(config.apiKey, config.provider);

      if (config.model) {
        validateModel(config.model);
      }
    } catch (error: any) {
      log.error("Invalid LLM configuration", error);
      throw error;
    }
  }

  /**
   * Send a chat completion request with all safety features
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const { provider } = this.config;

    // Validate messages
    this.validateMessages(messages);

    // Check rate limit
    const rateLimitResult = await rateLimiter.checkLimit(
      provider,
      DEFAULT_RATE_LIMITS[provider]
    );

    if (!rateLimitResult.allowed) {
      const error = new RateLimitError(
        `Rate limit exceeded for ${provider}. Retry after ${rateLimitResult.retryAfter} seconds.`,
        rateLimitResult.retryAfter!
      );
      log.warn("Rate limit exceeded", { provider, retryAfter: rateLimitResult.retryAfter });
      throw error;
    }

    // Make request with retry and timeout
    try {
      log.debug("Sending chat request", { provider, messageCount: messages.length });

      const result = await retry(
        async () => {
          const promise = this.makeRequest(messages);
          return withTimeout(promise, this.requestTimeoutMs, `${provider} API request timed out`);
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
        }
      );

      log.info("Chat request successful", { provider, responseLength: result.length });
      return result;

    } catch (error: any) {
      log.error("Chat request failed", error);

      if (error instanceof RetryExhaustedError) {
        throw new ApiError(
          `Failed to complete request after ${error.attempts} attempts`,
          500,
          provider,
          error.lastError
        );
      }

      throw error;
    }
  }

  /**
   * Validate chat messages
   */
  private validateMessages(messages: ChatMessage[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages must be a non-empty array");
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error("Each message must have role and content");
      }

      if (!["system", "user", "assistant"].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }

      // Validate content length
      validatePrompt(message.content);
    }
  }

  /**
   * Make the actual API request
   */
  private async makeRequest(messages: ChatMessage[]): Promise<string> {
    const { provider, apiKey, model, baseUrl } = this.config;

    switch (provider) {
      case "openai":
      case "openrouter":
        return this.callOpenAICompatible(messages, provider, apiKey, model, baseUrl);
      case "anthropic":
        return this.callAnthropic(messages, apiKey, model, baseUrl);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Call OpenAI-compatible API (OpenAI, OpenRouter)
   */
  private async callOpenAICompatible(
    messages: ChatMessage[],
    provider: LLMProvider,
    apiKey: string,
    model?: string,
    baseUrl?: string
  ): Promise<string> {
    const providerConfig = getProviderConfig(provider);
    const url = `${baseUrl || providerConfig.baseUrl}/chat/completions`;
    const selectedModel = model || providerConfig.defaultModel;

    log.debug("Calling OpenAI-compatible API", { provider, model: selectedModel, url });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(provider === "openrouter" && {
          "HTTP-Referer": "https://lumerisca.dev",
          "X-Title": "Lumerisca",
        }),
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        try {
          errorDetails = await response.text();
        } catch {
          // Use default error details
        }
      }

      throw ApiError.fromResponse(response, provider);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new ApiError("Invalid response format from API", 500, provider);
    }

    return data.choices[0].message.content;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(
    messages: ChatMessage[],
    apiKey: string,
    model?: string,
    baseUrl?: string
  ): Promise<string> {
    const providerConfig = getProviderConfig("anthropic");
    const url = `${baseUrl || providerConfig.baseUrl}/messages`;
    const selectedModel = model || providerConfig.defaultModel;

    log.debug("Calling Anthropic API", { model: selectedModel, url });

    // Anthropic requires separating system messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const systemPrompt = systemMessages.map((m) => m.content).join("\n\n");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 4096,
        messages: nonSystemMessages,
        ...(systemPrompt && { system: systemPrompt }),
      }),
    });

    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        try {
          errorDetails = await response.text();
        } catch {
          // Use default error details
        }
      }

      throw ApiError.fromResponse(response, "anthropic");
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new ApiError("Invalid response format from API", 500, "anthropic");
    }

    return data.content[0].text;
  }

  /**
   * Set custom timeout for requests
   */
  setTimeout(timeoutMs: number): void {
    this.requestTimeoutMs = timeoutMs;
    log.debug("Request timeout updated", { timeoutMs });
  }
}

/**
 * Enhanced convenience function to call LLM with all safety features
 */
export async function callLLMEnhanced(
  provider: LLMProvider,
  apiKey: string,
  messages: ChatMessage[],
  model?: string,
  baseUrl?: string,
  timeoutMs?: number
): Promise<string> {
  const client = new EnhancedLLMClient(
    {
      provider,
      apiKey,
      model,
      baseUrl,
    },
    timeoutMs
  );

  return client.chat(messages);
}
