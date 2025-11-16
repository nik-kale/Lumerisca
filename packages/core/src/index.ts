/**
 * @lumerisca/core
 * Core engine for Lumerisca browser AI assistant
 */

// Types
export type {
  PageContext,
  InitialContext,
  PageMap,
  PageMapEntry,
  RagSource,
  RagResult,
  LLMProvider,
  ChatMessage,
  LLMConfig,
  ExtensionSettings,
} from "./types.js";

// Context collectors
export { buildInitialContext } from "./context/urlContext.js";
export { collectDomContext, collectFullPageContext } from "./context/domCollector.js";
export { NetworkContextCollector } from "./context/networkContext.js";

// Page mapping
export { resolvePageSources, DEFAULT_PAGE_MAP } from "./mapping/pageMapper.js";

// RAG
export { DocumentStore, DEFAULT_DOCUMENTS } from "./rag/documentStore.js";
export {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
} from "./rag/embeddings.js";
export { RagEngine, simpleKeywordRetrieval } from "./rag/ragEngine.js";

// LLM
export { PROVIDERS, getProviderConfig, getDefaultModel } from "./llm/providers.js";
export { LLMClient, callLLM, buildPromptWithContext } from "./llm/llmClient.js";
