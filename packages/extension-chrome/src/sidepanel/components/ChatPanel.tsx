import { useState, useRef, useEffect } from "react";
import type { PageContext } from "@lumerisca/core";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  pageContext: PageContext | null;
}

function ChatPanel({ messages, onSendMessage, pageContext }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    onSendMessage(input);
    setInput("");

    // Reset loading after a delay (in case response is slow)
    setTimeout(() => setIsLoading(false), 500);
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
        background: "#0b1120",
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
            <div
              style={{
                fontSize: "32px",
                marginBottom: "16px",
                opacity: 0.6,
              }}
            >
              💬
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Ask me anything
            </h2>
            <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "24px" }}>
              I can help you understand this page and answer questions.
            </p>

            {pageContext && (
              <div style={{ marginTop: "24px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "12px",
                  }}
                >
                  Try asking:
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      style={{
                        background: "#1f2937",
                        border: "1px solid #374151",
                        color: "#e5e7eb",
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
          messages.map((message, i) => (
            <div
              key={i}
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
                  background:
                    message.role === "user" ? "#3b82f6" : "#1f2937",
                  color: "#e5e7eb",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.content}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginTop: "4px",
                  marginLeft: message.role === "user" ? "0" : "8px",
                  marginRight: message.role === "user" ? "8px" : "0",
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "16px",
          borderTop: "1px solid #1f2937",
          background: "#111827",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pageContext
                ? "Ask a question..."
                : "Loading page context..."
            }
            disabled={!pageContext || isLoading}
            style={{
              flex: 1,
              padding: "12px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#e5e7eb",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || !pageContext || isLoading}
            style={{
              padding: "12px 24px",
              background: input.trim() && !isLoading ? "#3b82f6" : "#374151",
              border: "none",
              borderRadius: "8px",
              color: "#e5e7eb",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
