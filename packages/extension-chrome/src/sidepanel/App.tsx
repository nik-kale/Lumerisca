import { useState, useEffect } from "react";
import type { PageContext } from "@lumerisca/core";
import ChatPanel from "./components/ChatPanel";
import SettingsForm from "./components/SettingsForm";
import { isMessageType } from "../messaging/messages";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function App() {
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Listen for page context updates
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (isMessageType(message, "LUMERISCA_PAGE_CONTEXT")) {
        console.log("Sidepanel: Received page context", message.payload);
        setPageContext(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Request current page context on load
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "LUMERISCA_GET_CONTEXT",
        }).catch(() => {
          console.log("Sidepanel: Could not get initial context");
        });
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleSendMessage = (content: string) => {
    if (!pageContext) {
      console.error("No page context available");
      return;
    }

    // Add user message
    const userMessage: Message = {
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
        },
      })
      .then((response) => {
        if (response && response.type === "LUMERISCA_CHAT_RESPONSE") {
          const assistantMessage: Message = {
            role: "assistant",
            content: response.payload.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else if (response && response.type === "LUMERISCA_ERROR") {
          const errorMessage: Message = {
            role: "assistant",
            content: `Error: ${response.payload.error}\n\n${response.payload.details || ""}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0b1120",
        color: "#e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1f2937",
          background: "#111827",
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
            background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Lumerisca
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: showSettings ? "#1f2937" : "transparent",
            border: "1px solid #374151",
            color: "#e5e7eb",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {showSettings ? "Chat" : "Settings"}
        </button>
      </div>

      {/* Page Context Info */}
      {pageContext && !showSettings && (
        <div
          style={{
            padding: "12px 16px",
            background: "#1f2937",
            borderBottom: "1px solid #374151",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>
            {pageContext.title}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>
            {pageContext.pathname}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {showSettings ? (
          <SettingsForm />
        ) : (
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            pageContext={pageContext}
          />
        )}
      </div>
    </div>
  );
}

export default App;
