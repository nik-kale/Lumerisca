/**
 * Enhanced Chat Panel with citations, copy buttons, and loading states
 */

import { useState, useRef, useEffect } from "react";
import type { PageContext } from "@lumerisca/core";
import { useThemeColors } from "../../components/ThemeProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Array<{ title: string; id: string }>;
}

interface ChatPanelEnhancedProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onClearConversation: () => void;
  pageContext: PageContext | null;
  onToast: any;
}

function ChatPanelEnhanced({
  messages,
  onSendMessage,
  onClearConversation,
  pageContext,
  onToast,
}: ChatPanelEnhancedProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const colors = useThemeColors();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track loading state
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput("");
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    onToast.success("Message copied to clipboard");
  };

  const suggestions = [
    "What can I do on this page?",
    "Explain this page to me",
    "How do I get started?",
    "Help me troubleshoot an issue",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: colors.background,
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", opacity: 0.6 }}>💬</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Ask me anything
            </h2>
            <p style={{ fontSize: "14px", color: colors.textMuted, marginBottom: "24px" }}>
              I can help you understand this page and answer questions.
            </p>

            {pageContext && (
              <div style={{ marginTop: "24px" }}>
                <p style={{ fontSize: "12px", color: colors.textDim, marginBottom: "12px" }}>
                  Try asking:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      style={{
                        background: colors.surface,
                        border: `1px solid ${colors.borderLight}`,
                        color: colors.text,
                        padding: "8px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        maxWidth: "280px",
                        textAlign: "left",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onCopy={handleCopyMessage}
                colors={colors}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: colors.surface,
                    color: colors.textMuted,
                    fontSize: "14px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <LoadingDots />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "16px",
          borderTop: `1px solid ${colors.border}`,
          background: colors.surface,
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pageContext ? "Ask a question..." : "Loading page context..."}
            disabled={!pageContext || isLoading}
            style={{
              flex: 1,
              padding: "12px",
              background: colors.background,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "8px",
              color: colors.text,
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || !pageContext || isLoading}
            style={{
              padding: "12px 24px",
              background: input.trim() && !isLoading ? colors.primary : colors.borderLight,
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>

        {/* Clear conversation button */}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClearConversation}
            style={{
              width: "100%",
              padding: "8px",
              background: "transparent",
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "6px",
              color: colors.textMuted,
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear Conversation
          </button>
        )}
      </form>
    </div>
  );
}

/**
 * Individual message item
 */
function MessageItem({ message, onCopy, colors }: any) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: message.role === "user" ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "12px 16px",
          borderRadius: "12px",
          background: message.role === "user" ? colors.primary : colors.surface,
          color: message.role === "user" ? "#fff" : colors.text,
          fontSize: "14px",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          position: "relative",
        }}
      >
        {message.content}

        {/* Copy button */}
        <button
          onClick={() => onCopy(message.content)}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: message.role === "user" ? "rgba(0,0,0,0.2)" : colors.surfaceHover,
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            cursor: "pointer",
            color: message.role === "user" ? "#fff" : colors.textMuted,
          }}
        >
          📋
        </button>
      </div>

      {/* Citations */}
      {message.citations && message.citations.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "11px",
            color: colors.textDim,
            maxWidth: "85%",
          }}
        >
          <strong>Sources:</strong>{" "}
          {message.citations.map((citation: any, i: number) => (
            <span key={citation.id}>
              {i > 0 && ", "}
              {citation.title}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div
        style={{
          fontSize: "11px",
          color: colors.textDim,
          marginTop: "4px",
          marginLeft: message.role === "user" ? "0" : "8px",
          marginRight: message.role === "user" ? "8px" : "0",
        }}
      >
        {message.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}

/**
 * Loading dots animation
 */
function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "currentColor",
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ChatPanelEnhanced;
