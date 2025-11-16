import type { LLMProvider } from "../types.js";

/**
 * Provider configurations
 */
export interface ProviderConfig {
  name: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  supportsStreaming: boolean;
}

export const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    supportsStreaming: true,
  },
  anthropic: {
    name: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-20241022",
    supportsStreaming: true,
  },
  openrouter: {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-haiku",
    supportsStreaming: true,
  },
};

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  return PROVIDERS[provider];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  return PROVIDERS[provider].defaultModel;
}
