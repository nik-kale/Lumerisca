import type { PageContext } from "@lumerisca/core";
import type {
  LumeriscaMessage,
  PageContextMessage,
  ChatRequestMessage,
  ChatResponseMessage,
  ErrorMessage,
} from "./types.js";

/**
 * Helper functions for creating and sending messages
 */

export function createPageContextMessage(
  context: PageContext
): PageContextMessage {
  return {
    type: "LUMERISCA_PAGE_CONTEXT",
    payload: context,
  };
}

export function createChatRequestMessage(
  prompt: string,
  context: PageContext
): ChatRequestMessage {
  return {
    type: "LUMERISCA_CHAT_REQUEST",
    payload: { prompt, context },
  };
}

export function createChatResponseMessage(
  response: string,
  requestId?: string
): ChatResponseMessage {
  return {
    type: "LUMERISCA_CHAT_RESPONSE",
    payload: { response, requestId },
  };
}

export function createErrorMessage(
  error: string,
  details?: string
): ErrorMessage {
  return {
    type: "LUMERISCA_ERROR",
    payload: { error, details },
  };
}

/**
 * Send a message to the background service worker
 */
export async function sendToBackground<T extends LumeriscaMessage>(
  message: T
): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send a message to a specific tab
 */
export async function sendToTab<T extends LumeriscaMessage>(
  tabId: number,
  message: T
): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Type guard for message types
 */
export function isMessageType<T extends LumeriscaMessage["type"]>(
  message: any,
  type: T
): message is Extract<LumeriscaMessage, { type: T }> {
  return message && message.type === type;
}
