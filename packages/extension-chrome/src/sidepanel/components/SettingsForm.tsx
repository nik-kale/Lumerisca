import { useState, useEffect } from "react";
import type { LLMProvider } from "@lumerisca/core";
import { getSettings, saveSettings } from "../../storage/settings";

function SettingsForm() {
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [pageMapUrl, setPageMapUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Load settings on mount
  useEffect(() => {
    getSettings().then((settings) => {
      setProvider(settings.llm.provider);
      setApiKey(settings.llm.apiKey || "");
      setModel(settings.llm.model || "");
      setPageMapUrl(settings.pageMapUrl || "");
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    try {
      await saveSettings({
        llm: {
          provider,
          apiKey,
          model: model || undefined,
        },
        pageMapUrl: pageMapUrl || undefined,
      });

      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error: any) {
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const providerModels: Record<LLMProvider, string[]> = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    anthropic: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    openrouter: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.5-haiku",
      "openai/gpt-4o",
      "google/gemini-pro",
    ],
  };

  return (
    <div
      style={{
        padding: "24px",
        overflowY: "auto",
        height: "100%",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "24px",
        }}
      >
        Settings
      </h2>

      <form onSubmit={handleSave}>
        {/* Provider Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
              color: "#d1d5db",
            }}
          >
            LLM Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as LLMProvider);
              setModel(""); // Reset model when provider changes
            }}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#e5e7eb",
              fontSize: "14px",
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
              color: "#d1d5db",
            }}
          >
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${provider} API key`}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#e5e7eb",
              fontSize: "14px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "6px",
            }}
          >
            Your API key is stored locally and never shared.
          </p>
        </div>

        {/* Model Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
              color: "#d1d5db",
            }}
          >
            Model (optional)
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#e5e7eb",
              fontSize: "14px",
            }}
          >
            <option value="">Default</option>
            {providerModels[provider].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Page Map URL */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
              color: "#d1d5db",
            }}
          >
            Page Map URL (optional)
          </label>
          <input
            type="url"
            value={pageMapUrl}
            onChange={(e) => setPageMapUrl(e.target.value)}
            placeholder="https://example.com/pageMap.json"
            style={{
              width: "100%",
              padding: "10px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "6px",
              color: "#e5e7eb",
              fontSize: "14px",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "6px",
            }}
          >
            URL to a custom page mapping configuration.
          </p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving || !apiKey}
          style={{
            width: "100%",
            padding: "12px",
            background: apiKey ? "#3b82f6" : "#374151",
            border: "none",
            borderRadius: "6px",
            color: "#e5e7eb",
            fontSize: "14px",
            fontWeight: 500,
            cursor: apiKey ? "pointer" : "not-allowed",
          }}
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>

        {/* Save Message */}
        {saveMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: saveMessage.startsWith("Error")
                ? "#7f1d1d"
                : "#065f46",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#e5e7eb",
            }}
          >
            {saveMessage}
          </div>
        )}
      </form>

      {/* Help Section */}
      <div
        style={{
          marginTop: "32px",
          padding: "16px",
          background: "#1f2937",
          borderRadius: "8px",
          fontSize: "13px",
          lineHeight: "1.6",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Getting Started
        </h3>
        <ul style={{ paddingLeft: "20px", color: "#9ca3af" }}>
          <li>Get an API key from your chosen provider</li>
          <li>Enter your API key above</li>
          <li>Navigate to any page and start asking questions!</li>
          <li>Lumerisca will provide context-aware assistance</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsForm;
