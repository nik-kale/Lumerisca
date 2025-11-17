/**
 * Conversation history storage utility
 * Manages per-tab conversation history with chrome.storage
 */

import type { PageContext } from "@lumerisca/core";

/**
 * Message in a conversation
 */
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * Conversation session for a specific page/tab
 */
export interface Conversation {
  id: string;
  tabId?: number;
  pageContext: PageContext;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEYS = {
  CONVERSATIONS: "lumerisca_conversations",
  MAX_CONVERSATIONS: 50,
  MAX_MESSAGES_PER_CONVERSATION: 100,
} as const;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all conversations from storage
 */
export async function getAllConversations(): Promise<Conversation[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS, (result) => {
      const conversations = result[STORAGE_KEYS.CONVERSATIONS] || [];

      // Parse dates
      const parsed = conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));

      resolve(parsed);
    });
  });
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const conversations = await getAllConversations();
  return conversations.find((c) => c.id === id) || null;
}

/**
 * Get conversation for a specific tab
 */
export async function getConversationByTab(tabId: number): Promise<Conversation | null> {
  const conversations = await getAllConversations();
  return conversations.find((c) => c.tabId === tabId) || null;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  pageContext: PageContext,
  tabId?: number
): Promise<Conversation> {
  const conversation: Conversation = {
    id: generateId(),
    tabId,
    pageContext,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conversations = await getAllConversations();
  conversations.push(conversation);

  // Limit total conversations
  while (conversations.length > STORAGE_KEYS.MAX_CONVERSATIONS) {
    conversations.shift();
  }

  await saveConversations(conversations);

  return conversation;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<ConversationMessage> {
  const message: ConversationMessage = {
    id: generateId(),
    role,
    content,
    timestamp: new Date(),
  };

  const conversations = await getAllConversations();
  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push(message);
  conversation.updatedAt = new Date();

  // Limit messages per conversation
  while (conversation.messages.length > STORAGE_KEYS.MAX_MESSAGES_PER_CONVERSATION) {
    conversation.messages.shift();
  }

  await saveConversations(conversations);

  return message;
}

/**
 * Update conversation's page context
 */
export async function updateConversationContext(
  conversationId: string,
  pageContext: PageContext
): Promise<void> {
  const conversations = await getAllConversations();
  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.pageContext = pageContext;
  conversation.updatedAt = new Date();

  await saveConversations(conversations);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const conversations = await getAllConversations();
  const filtered = conversations.filter((c) => c.id !== conversationId);
  await saveConversations(filtered);
}

/**
 * Clear all conversations
 */
export async function clearAllConversations(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(STORAGE_KEYS.CONVERSATIONS, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Export conversation as JSON
 */
export function exportConversation(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

/**
 * Export all conversations
 */
export async function exportAllConversations(): Promise<string> {
  const conversations = await getAllConversations();
  return JSON.stringify(conversations, null, 2);
}

/**
 * Save conversations to storage
 */
async function saveConversations(conversations: Conversation[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEYS.CONVERSATIONS]: conversations },
      () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Get or create conversation for current tab
 */
export async function getOrCreateConversation(
  pageContext: PageContext,
  tabId?: number
): Promise<Conversation> {
  if (tabId) {
    const existing = await getConversationByTab(tabId);
    if (existing) {
      // Update context if URL changed
      if (existing.pageContext.url !== pageContext.url) {
        await updateConversationContext(existing.id, pageContext);
      }
      return await getConversation(existing.id) || existing;
    }
  }

  return await createConversation(pageContext, tabId);
}
