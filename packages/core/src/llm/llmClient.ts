import type { ChatMessage, LLMConfig, LLMProvider } from "../types.js";
import { getProviderConfig, getDefaultModel } from "./providers.js";

/**
 * LLM Client for making chat completion requests
 */
export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[]): Promise<string> {
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
      const errorText = await response.text();
      throw new Error(
        `${provider} API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
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
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

/**
 * Convenience function to call LLM without creating a client instance
 */
export async function callLLM(
  provider: LLMProvider,
  apiKey: string,
  messages: ChatMessage[],
  model?: string,
  baseUrl?: string
): Promise<string> {
  const client = new LLMClient({
    provider,
    apiKey,
    model,
    baseUrl,
  });

  return client.chat(messages);
}

/**
 * Build a prompt with page context and RAG results
 */
export function buildPromptWithContext(
  systemPrompt: string,
  pageTitle: string,
  pageUrl: string,
  pageSummary: string,
  ragContext: string,
  userQuestion: string
): ChatMessage[] {
  const contextPrompt = `You are Lumerisca, an AI assistant that provides context-aware help based on the current page.

Current Page Context:
- Title: ${pageTitle}
- URL: ${pageUrl}
- Page Content Summary:
${pageSummary}

Relevant Documentation:
${ragContext}

Please answer the user's question using the context above. Be concise and helpful.`;

  return [
    {
      role: "system",
      content: systemPrompt || contextPrompt,
    },
    {
      role: "user",
      content: userQuestion,
    },
  ];
}
