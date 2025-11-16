import type { PageContext } from "@lumerisca/core";

/**
 * Message types for communication between extension components
 */

export type MessageType =
  | "LUMERISCA_PAGE_CONTEXT"
  | "LUMERISCA_CHAT_REQUEST"
  | "LUMERISCA_CHAT_RESPONSE"
  | "LUMERISCA_ERROR"
  | "LUMERISCA_SETTINGS_UPDATED";

export interface BaseMessage<T extends MessageType, P = unknown> {
  type: T;
  payload: P;
}

/**
 * Message sent from content script with page context
 */
export interface PageContextMessage
  extends BaseMessage<"LUMERISCA_PAGE_CONTEXT", PageContext> {}

/**
 * Message sent from UI to request chat completion
 */
export interface ChatRequestMessage
  extends BaseMessage<
    "LUMERISCA_CHAT_REQUEST",
    {
      prompt: string;
      context: PageContext;
    }
  > {}

/**
 * Message sent back with chat response
 */
export interface ChatResponseMessage
  extends BaseMessage<
    "LUMERISCA_CHAT_RESPONSE",
    {
      response: string;
      requestId?: string;
    }
  > {}

/**
 * Error message
 */
export interface ErrorMessage
  extends BaseMessage<
    "LUMERISCA_ERROR",
    {
      error: string;
      details?: string;
    }
  > {}

/**
 * Settings update notification
 */
export interface SettingsUpdatedMessage
  extends BaseMessage<"LUMERISCA_SETTINGS_UPDATED", void> {}

/**
 * Union of all message types
 */
export type LumeriscaMessage =
  | PageContextMessage
  | ChatRequestMessage
  | ChatResponseMessage
  | ErrorMessage
  | SettingsUpdatedMessage;
