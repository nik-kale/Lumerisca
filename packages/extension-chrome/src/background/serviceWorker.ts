/**
 * Background service worker for Lumerisca
 * Handles message routing, LLM API calls, and RAG processing
 */

import {
  DocumentStore,
  DEFAULT_DOCUMENTS,
  DEFAULT_PAGE_MAP,
  RagEngine,
  buildPromptWithContext,
  callLLM,
  simpleKeywordRetrieval,
} from "@lumerisca/core";
import type { PageContext } from "@lumerisca/core";
import { getSettings } from "../storage/settings.js";
import { isMessageType, createChatResponseMessage, createErrorMessage } from "../messaging/messages.js";
import type { LumeriscaMessage } from "../messaging/types.js";

// Initialize document store with default documents
const documentStore = new DocumentStore();
documentStore.addDocuments(DEFAULT_DOCUMENTS);

console.log("Lumerisca: Background service worker initialized");
console.log("Lumerisca: Loaded documents:", documentStore.size());

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log("Lumerisca: Received message:", message.type);

  // Handle page context updates
  if (isMessageType(message, "LUMERISCA_PAGE_CONTEXT")) {
    handlePageContext(message.payload, sender);
    sendResponse({ success: true });
    return false;
  }

  // Handle chat requests
  if (isMessageType(message, "LUMERISCA_CHAT_REQUEST")) {
    handleChatRequest(message.payload, sender)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error("Lumerisca: Chat request error:", error);
        sendResponse(createErrorMessage("Failed to process request", error.message));
      });
    return true; // Will respond asynchronously
  }

  return false;
});

/**
 * Handle page context updates
 */
function handlePageContext(context: PageContext, sender: chrome.runtime.MessageSender): void {
  console.log("Lumerisca: Page context received:", {
    url: context.url,
    title: context.title,
    pathname: context.pathname,
  });

  // TODO: Store context per tab if needed
  // Could be useful for maintaining conversation history per tab
}

/**
 * Handle chat requests
 */
async function handleChatRequest(
  payload: { prompt: string; context: PageContext },
  sender: chrome.runtime.MessageSender
): Promise<any> {
  const { prompt, context } = payload;

  console.log("Lumerisca: Processing chat request:", prompt);

  try {
    // Get settings
    const settings = await getSettings();

    if (!settings.llm.apiKey) {
      throw new Error(
        "API key not configured. Please set your API key in the extension settings."
      );
    }

    // Perform RAG retrieval
    let ragContext = "";
    let retrieval: any[] = [];

    try {
      // Try using embeddings-based RAG if API key is available
      if (settings.llm.provider === "openai") {
        const ragEngine = new RagEngine(documentStore, settings.llm.apiKey);
        retrieval = await ragEngine.retrieve(context, DEFAULT_PAGE_MAP, prompt, 3);
        ragContext = ragEngine.buildContextString(retrieval);
      } else {
        // Fallback to keyword-based retrieval for other providers
        retrieval = simpleKeywordRetrieval(context, DEFAULT_PAGE_MAP, prompt, documentStore, 3);
        ragContext = retrieval
          .map((r, i) => `[Document ${i + 1}: ${r.source.title}]\n${r.source.content}`)
          .join("\n\n---\n\n");
      }

      console.log("Lumerisca: RAG retrieved", retrieval.length, "documents");
    } catch (ragError) {
      console.error("Lumerisca: RAG error, falling back to keyword search:", ragError);
      retrieval = simpleKeywordRetrieval(context, DEFAULT_PAGE_MAP, prompt, documentStore, 3);
      ragContext = retrieval
        .map((r, i) => `[Document ${i + 1}: ${r.source.title}]\n${r.source.content}`)
        .join("\n\n---\n\n");
    }

    // Build prompt
    const systemPrompt = `You are Lumerisca, an AI assistant that provides context-aware help based on the current page.`;

    const messages = buildPromptWithContext(
      systemPrompt,
      context.title,
      context.url,
      context.domSummary || "No additional page content captured.",
      ragContext || "No relevant documentation found.",
      prompt
    );

    console.log("Lumerisca: Calling LLM with provider:", settings.llm.provider);

    // Call LLM
    const response = await callLLM(
      settings.llm.provider,
      settings.llm.apiKey,
      messages,
      settings.llm.model
    );

    console.log("Lumerisca: LLM response received");

    return createChatResponseMessage(response);
  } catch (error: any) {
    console.error("Lumerisca: Error processing chat request:", error);
    throw error;
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Lumerisca: Extension installed/updated", details.reason);

  if (details.reason === "install") {
    // Open welcome page or settings on first install
    console.log("Lumerisca: First install - welcome!");
  }
});
