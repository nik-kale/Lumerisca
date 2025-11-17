/**
 * Enhanced Background Service Worker for Lumerisca
 * Handles message routing, LLM API calls with full security features, and RAG processing
 */

import {
  DocumentStore,
  DEFAULT_DOCUMENTS,
  DEFAULT_PAGE_MAP,
  RagEngine,
  buildPromptWithContext,
  EnhancedLLMClient,
  simpleKeywordRetrieval,
  logger,
  validatePrompt,
  formatError,
  ApiError,
  RateLimitError,
  TimeoutError,
  extractYouTubeData,
  generateSummaryPrompt as generateYouTubeSummary,
  extractPdfFromUrl,
  generatePdfSummaryPrompt,
  extractFromImageUrl,
  extractCodeFromOCR,
  getConfidenceLevel,
} from "@lumerisca/core";
import type { PageContext, RagResult } from "@lumerisca/core";
import { getSettings } from "../storage/settings.js";
import { isMessageType, createChatResponseMessage, createErrorMessage } from "../messaging/messages.js";
import type { LumeriscaMessage } from "../messaging/types.js";
import {
  getOrCreateConversation,
  addMessage,
  getAllConversations,
} from "../storage/conversationHistory.js";

const log = logger.scope("Background");

// Initialize document store with default documents
const documentStore = new DocumentStore();
documentStore.addDocuments(DEFAULT_DOCUMENTS);

log.info("Background service worker initialized", {
  documentCount: documentStore.size(),
});

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  log.debug("Received message", { type: message.type });

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
        log.error("Chat request failed", error);
        const userMessage = getUserFriendlyError(error);
        sendResponse(createErrorMessage(userMessage, error.message));
      });
    return true; // Will respond asynchronously
  }

  // Handle conversation history requests
  if (message.type === "GET_CONVERSATION_HISTORY") {
    getAllConversations()
      .then((conversations) => {
        sendResponse({ conversations });
      })
      .catch((error) => {
        log.error("Failed to get conversation history", error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  return false;
});

/**
 * Handle page context updates
 */
function handlePageContext(context: PageContext, sender: chrome.runtime.MessageSender): void {
  log.info("Page context received", {
    url: context.url,
    title: context.title,
    pathname: context.pathname,
    tabId: sender.tab?.id,
  });

  // Store context for the tab
  if (sender.tab?.id) {
    // Context will be stored when conversation is created/updated
    log.debug("Context ready for tab", { tabId: sender.tab.id });
  }
}

/**
 * Handle chat requests with full security and conversation history
 */
async function handleChatRequest(
  payload: { prompt: string; context: PageContext; conversationId?: string },
  sender: chrome.runtime.MessageSender
): Promise<any> {
  const { prompt, context, conversationId } = payload;

  log.info("Processing chat request", {
    promptLength: prompt.length,
    tabId: sender.tab?.id,
  });

  try {
    // Validate prompt
    const validatedPrompt = validatePrompt(prompt);

    // Get settings
    const settings = await getSettings();

    if (!settings.llm.apiKey) {
      throw new ApiError(
        "API key not configured. Please add your API key in Settings.",
        401
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      context,
      sender.tab?.id
    );

    // Add user message to history
    await addMessage(conversation.id, "user", validatedPrompt);

    // Perform RAG retrieval
    let ragContext = "";
    let retrieval: RagResult[] = [];
    let citations: Array<{ title: string; id: string }> = [];

    try {
      log.debug("Starting RAG retrieval");

      // Try using embeddings-based RAG for OpenAI
      if (settings.llm.provider === "openai") {
        const ragEngine = new RagEngine(documentStore, settings.llm.apiKey);
        retrieval = await ragEngine.retrieve(context, DEFAULT_PAGE_MAP, validatedPrompt, 3);
        ragContext = ragEngine.buildContextString(retrieval);
      } else {
        // Fallback to keyword-based retrieval for other providers
        retrieval = simpleKeywordRetrieval(
          context,
          DEFAULT_PAGE_MAP,
          validatedPrompt,
          documentStore,
          3
        );
        ragContext = retrieval
          .map((r, i) => `[Document ${i + 1}: ${r.source.title}]\n${r.source.content}`)
          .join("\n\n---\n\n");
      }

      // Extract citations
      citations = retrieval.map((r) => ({
        title: r.source.title,
        id: r.source.id,
      }));

      log.info("RAG retrieval complete", {
        documentCount: retrieval.length,
        citationCount: citations.length,
      });
    } catch (ragError) {
      log.warn("RAG error, falling back to keyword search", ragError);
      retrieval = simpleKeywordRetrieval(
        context,
        DEFAULT_PAGE_MAP,
        validatedPrompt,
        documentStore,
        3
      );
      ragContext = retrieval
        .map((r, i) => `[Document ${i + 1}: ${r.source.title}]\n${r.source.content}`)
        .join("\n\n---\n\n");
      citations = retrieval.map((r) => ({
        title: r.source.title,
        id: r.source.id,
      }));
    }

    // Build prompt
    const systemPrompt = settings.customSystemPrompt ||
      `You are Lumerisca, an AI assistant that provides context-aware help based on the current page.`;

    const messages = buildPromptWithContext(
      systemPrompt,
      context.title,
      context.url,
      context.domSummary || "No additional page content captured.",
      ragContext || "No relevant documentation found.",
      validatedPrompt
    );

    log.debug("Calling LLM", {
      provider: settings.llm.provider,
      model: settings.llm.model || "default",
    });

    // Call LLM using enhanced client
    const client = new EnhancedLLMClient(
      {
        provider: settings.llm.provider,
        apiKey: settings.llm.apiKey,
        model: settings.llm.model,
        baseUrl: settings.llm.baseUrl,
      },
      30000 // 30 second timeout
    );

    const response = await client.chat(messages);

    log.info("LLM response received", {
      responseLength: response.length,
    });

    // Add assistant message to history
    await addMessage(conversation.id, "assistant", response);

    // Return response with citations
    return {
      type: "LUMERISCA_CHAT_RESPONSE",
      payload: {
        response,
        citations,
        conversationId: conversation.id,
      },
    };
  } catch (error: any) {
    log.error("Chat request error", error);
    throw error;
  }
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error: any): string {
  if (error instanceof RateLimitError) {
    return `Rate limit exceeded. Please wait ${error.retryAfter} seconds before trying again.`;
  }

  if (error instanceof TimeoutError) {
    return "Request timed out. Please try again.";
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return "Invalid API key. Please check your settings.";
    }
    if (error.statusCode === 429) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (error.statusCode && error.statusCode >= 500) {
      return "The AI service is currently unavailable. Please try again later.";
    }
  }

  return formatError(error);
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  log.info("Extension installed/updated", { reason: details.reason });

  if (details.reason === "install") {
    log.info("First install - welcome!");
    // Could open welcome page here
  }

  if (details.reason === "update") {
    log.info("Extension updated", {
      previousVersion: details.previousVersion,
    });
  }

  // Create context menus for media processing
  createContextMenus();
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener((command) => {
  log.debug("Command received", { command });

  if (command === "toggle-lumerisca") {
    // Send message to content script to toggle drawer
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "TOGGLE_LUMERISCA",
        }).catch((error) => {
          log.warn("Failed to send toggle command", error);
        });
      }
    });
  }
});

/**
 * Create context menus for media processing
 */
function createContextMenus(): void {
  // Remove existing menus
  chrome.contextMenus.removeAll(() => {
    // Image context menu
    chrome.contextMenus.create({
      id: "lumerisca-extract-text",
      title: "Lumerisca: Extract Text (OCR)",
      contexts: ["image"],
    });

    chrome.contextMenus.create({
      id: "lumerisca-analyze-image",
      title: "Lumerisca: Analyze Image",
      contexts: ["image"],
    });

    // Link context menus
    chrome.contextMenus.create({
      id: "lumerisca-summarize-youtube",
      title: "Lumerisca: Summarize Video",
      contexts: ["link"],
      targetUrlPatterns: ["*://www.youtube.com/watch?v=*", "*://youtu.be/*"],
    });

    chrome.contextMenus.create({
      id: "lumerisca-summarize-pdf",
      title: "Lumerisca: Summarize PDF",
      contexts: ["link"],
      targetUrlPatterns: ["*.pdf"],
    });

    // Page context menu for YouTube
    chrome.contextMenus.create({
      id: "lumerisca-summarize-current-video",
      title: "Lumerisca: Summarize This Video",
      contexts: ["page"],
      documentUrlPatterns: ["*://www.youtube.com/watch?v=*"],
    });

    log.info("Context menus created");
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  log.debug("Context menu clicked", { menuItemId: info.menuItemId });

  if (!tab?.id) {
    log.error("No tab ID available");
    return;
  }

  switch (info.menuItemId) {
    case "lumerisca-extract-text":
      handleExtractText(info.srcUrl!, tab.id);
      break;

    case "lumerisca-analyze-image":
      handleAnalyzeImage(info.srcUrl!, tab.id);
      break;

    case "lumerisca-summarize-youtube":
      handleSummarizeYouTube(info.linkUrl!, tab.id);
      break;

    case "lumerisca-summarize-current-video":
      handleSummarizeYouTube(info.pageUrl!, tab.id);
      break;

    case "lumerisca-summarize-pdf":
      handleSummarizePdf(info.linkUrl!, tab.id);
      break;
  }
});

/**
 * Handle OCR text extraction from image
 */
async function handleExtractText(imageUrl: string, tabId: number): Promise<void> {
  try {
    log.info("Extracting text from image", { imageUrl });

    // Show loading notification
    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "Extracting text from image...",
        type: "info",
      },
    });

    const ocrResult = await extractFromImageUrl(imageUrl);

    log.info("OCR complete", {
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence,
    });

    // Send result to tab
    chrome.tabs.sendMessage(tabId, {
      type: "MEDIA_PROCESSED",
      payload: {
        type: "ocr",
        data: {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          confidenceLevel: getConfidenceLevel(ocrResult.confidence),
        },
      },
    });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: `Text extracted (${getConfidenceLevel(ocrResult.confidence)} confidence)`,
        type: "success",
      },
    });
  } catch (error) {
    log.error("OCR failed", error);

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: `Failed to extract text: ${formatError(error)}`,
        type: "error",
      },
    });
  }
}

/**
 * Handle image analysis
 */
async function handleAnalyzeImage(imageUrl: string, tabId: number): Promise<void> {
  try {
    log.info("Analyzing image", { imageUrl });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "Analyzing image...",
        type: "info",
      },
    });

    // Send to AI for analysis
    chrome.tabs.sendMessage(tabId, {
      type: "MEDIA_PROCESSED",
      payload: {
        type: "image-analysis",
        data: {
          imageUrl,
          prompt: "Please analyze this image and describe what you see.",
        },
      },
    });
  } catch (error) {
    log.error("Image analysis failed", error);

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: `Failed to analyze image: ${formatError(error)}`,
        type: "error",
      },
    });
  }
}

/**
 * Handle YouTube video summarization
 */
async function handleSummarizeYouTube(url: string, tabId: number): Promise<void> {
  try {
    log.info("Summarizing YouTube video", { url });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "Extracting video transcript...",
        type: "info",
      },
    });

    const extraction = await extractYouTubeData(url);

    log.info("YouTube data extracted", {
      title: extraction.metadata.title,
      duration: extraction.metadata.duration,
      transcriptLength: extraction.fullText.length,
    });

    // Send to AI for summarization
    const summaryPrompt = generateYouTubeSummary(extraction);

    chrome.tabs.sendMessage(tabId, {
      type: "MEDIA_PROCESSED",
      payload: {
        type: "youtube",
        data: {
          metadata: extraction.metadata,
          chapters: extraction.chapters,
          transcript: extraction.transcript,
          summaryPrompt,
        },
      },
    });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "Video transcript extracted! Generating summary...",
        type: "success",
      },
    });
  } catch (error) {
    log.error("YouTube summarization failed", error);

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: `Failed to process video: ${formatError(error)}`,
        type: "error",
      },
    });
  }
}

/**
 * Handle PDF summarization
 */
async function handleSummarizePdf(url: string, tabId: number): Promise<void> {
  try {
    log.info("Summarizing PDF", { url });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "Extracting PDF content...",
        type: "info",
      },
    });

    const extraction = await extractPdfFromUrl(url);

    log.info("PDF extracted", {
      fileName: extraction.fileName,
      pages: extraction.pageCount,
      textLength: extraction.fullText.length,
    });

    // Send to AI for summarization
    const summaryPrompt = generatePdfSummaryPrompt(extraction);

    chrome.tabs.sendMessage(tabId, {
      type: "MEDIA_PROCESSED",
      payload: {
        type: "pdf",
        data: {
          metadata: extraction.metadata,
          pageCount: extraction.pageCount,
          fileName: extraction.fileName,
          summaryPrompt,
        },
      },
    });

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: "PDF content extracted! Generating summary...",
        type: "success",
      },
    });
  } catch (error) {
    log.error("PDF summarization failed", error);

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: {
        message: `Failed to process PDF: ${formatError(error)}`,
        type: "error",
      },
    });
  }
}

// Log when service worker becomes inactive (for debugging)
self.addEventListener("beforeunload", () => {
  log.debug("Service worker becoming inactive");
});
