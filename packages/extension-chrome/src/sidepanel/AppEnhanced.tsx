/**
 * Enhanced App component with Phase 2-4 features
 * - Toast notifications
 * - Theme support
 * - Source citations
 * - Conversation history
 * - Copy messages
 * - Export conversations
 */

import { useState, useEffect } from "react";
import type { PageContext } from "@lumerisca/core";
import ErrorBoundary from "../components/ErrorBoundary";
import { ThemeProvider, useTheme, useThemeColors } from "../components/ThemeProvider";
import { ToastContainer, useToast } from "../components/Toast";
import ChatPanelEnhanced from "./components/ChatPanelEnhanced";
import SettingsFormEnhanced from "./components/SettingsFormEnhanced";
import { isMessageType } from "../messaging/messages";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Array<{ title: string; id: string }>;
}

function AppContent() {
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { toasts, toast, removeToast } = useToast();

  // Listen for page context updates
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (isMessageType(message, "LUMERISCA_PAGE_CONTEXT")) {
        console.log("Sidepanel: Received page context", message.payload);
        setPageContext(message.payload);
      }

      // Handle toggle command
      if (message.type === "TOGGLE_LUMERISCA") {
        // Panel is already open, could add minimize/maximize here
        toast.info("Lumerisca panel toggled");
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Request current page context on load
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            type: "LUMERISCA_GET_CONTEXT",
          })
          .catch(() => {
            console.log("Sidepanel: Could not get initial context");
          });
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [toast]);

  const handleSendMessage = (content: string) => {
    if (!pageContext) {
      toast.error("No page context available");
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Send to background for processing
    chrome.runtime
      .sendMessage({
        type: "LUMERISCA_CHAT_REQUEST",
        payload: {
          prompt: content,
          context: pageContext,
          conversationId,
        },
      })
      .then((response) => {
        if (response && response.type === "LUMERISCA_CHAT_RESPONSE") {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: response.payload.response,
            timestamp: new Date(),
            citations: response.payload.citations,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update conversation ID
          if (response.payload.conversationId) {
            setConversationId(response.payload.conversationId);
          }

          toast.success("Response received");
        } else if (response && response.type === "LUMERISCA_ERROR") {
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `Error: ${response.payload.error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          toast.error(response.payload.error);
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Failed to send message");
      });
  };

  const handleClearConversation = () => {
    setMessages([]);
    setConversationId(null);
    toast.success("Conversation cleared");
  };

  const handleExportConversation = () => {
    const exportData = {
      pageContext,
      messages,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumerisca-conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Conversation exported");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: colors.background,
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: `1px solid ${colors.border}`,
          background: colors.surface,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 600,
            background: colors.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Lumerisca
        </h1>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderLight}`,
              color: colors.text,
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Export button */}
          {!showSettings && messages.length > 0 && (
            <button
              onClick={handleExportConversation}
              title="Export conversation"
              style={{
                background: "transparent",
                border: `1px solid ${colors.borderLight}`,
                color: colors.text,
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              💾
            </button>
          )}

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? colors.surfaceHover : "transparent",
              border: `1px solid ${colors.borderLight}`,
              color: colors.text,
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {showSettings ? "Chat" : "Settings"}
          </button>
        </div>
      </div>

      {/* Page Context Info */}
      {pageContext && !showSettings && (
        <div
          style={{
            padding: "12px 16px",
            background: colors.surfaceHover,
            borderBottom: `1px solid ${colors.borderLight}`,
            fontSize: "12px",
            color: colors.textMuted,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>{pageContext.title}</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>{pageContext.pathname}</div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {showSettings ? (
          <SettingsFormEnhanced onToast={toast} />
        ) : (
          <ChatPanelEnhanced
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            pageContext={pageContext}
            onToast={toast}
          />
        )}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

/**
 * Main app with providers
 */
function AppEnhanced() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppEnhanced;
