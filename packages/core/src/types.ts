/**
 * Core types for Lumerisca
 */

/**
 * Context about the current page
 */
export interface PageContext {
  /** Full URL of the page */
  url: string;
  /** Pathname portion of the URL */
  pathname: string;
  /** Hostname of the page */
  hostname: string;
  /** Page title */
  title: string;
  /** Summary of important DOM content (headings, errors, notifications) */
  domSummary: string;
}

/**
 * Initial context from URL and title (before DOM parsing)
 */
export interface InitialContext {
  url: string;
  title: string;
  hostname: string;
  pathname: string;
}

/**
 * Entry in the page map that maps path patterns to doc sources
 */
export interface PageMapEntry {
  /** Glob pattern for matching paths (e.g., "/dashboard*") */
  pattern: string;
  /** Array of document source IDs to use for this pattern */
  sources: string[];
}

/**
 * Complete page mapping configuration
 */
export interface PageMap {
  entries: PageMapEntry[];
}

/**
 * A document source for RAG
 */
export interface RagSource {
  /** Unique identifier for this source */
  id: string;
  /** Human-readable title */
  title: string;
  /** Full content/text of the document */
  content: string;
  /** Optional embedding vector (for similarity search) */
  embedding?: number[];
}

/**
 * Result from RAG retrieval
 */
export interface RagResult {
  /** The source document */
  source: RagSource;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * LLM provider types
 */
export type LLMProvider = "openai" | "anthropic" | "openrouter";

/**
 * Message format for LLM chat
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Configuration for LLM client
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Settings stored in extension storage
 */
export interface ExtensionSettings {
  llm: LLMConfig;
  pageMapUrl?: string;
  customSystemPrompt?: string;
  theme?: "dark" | "light";
}

/**
 * Conversation history entry
 */
export interface Conversation {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  context: {
    url: string;
    title: string;
  };
}
