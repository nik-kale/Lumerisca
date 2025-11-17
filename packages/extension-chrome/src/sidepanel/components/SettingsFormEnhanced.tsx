/**
 * Enhanced Settings Form with custom system prompts
 */

import { useState, useEffect } from "react";
import type { LLMProvider } from "@lumerisca/core";
import { getSettings, saveSettings } from "../../storage/settings";
import { useThemeColors } from "../../components/ThemeProvider";

interface SettingsFormEnhancedProps {
  onToast: any;
}

function SettingsFormEnhanced({ onToast }: SettingsFormEnhancedProps) {
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [pageMapUrl, setPageMapUrl] = useState("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const colors = useThemeColors();

  // Load settings on mount
  useEffect(() => {
    getSettings().then((settings) => {
      setProvider(settings.llm.provider);
      setApiKey(settings.llm.apiKey || "");
      setModel(settings.llm.model || "");
      setPageMapUrl(settings.pageMapUrl || "");
      setCustomSystemPrompt(settings.customSystemPrompt || "");
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await saveSettings({
        llm: {
          provider,
          apiKey,
          model: model || undefined,
        },
        pageMapUrl: pageMapUrl || undefined,
        customSystemPrompt: customSystemPrompt || undefined,
      });

      onToast.success("Settings saved successfully!");
    } catch (error: any) {
      onToast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCustomSystemPrompt("");
    onToast.info("Custom prompt reset");
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

  const defaultPrompt = `You are Lumerisca, an AI assistant that provides context-aware help based on the current page.`;

  return (
    <div
      style={{
        padding: "24px",
        overflowY: "auto",
        height: "100%",
      }}
    >
      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px" }}>
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
              color: colors.text,
            }}
          >
            LLM Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as LLMProvider);
              setModel("");
            }}
            style={{
              width: "100%",
              padding: "10px",
              background: colors.background,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "6px",
              color: colors.text,
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
              color: colors.text,
            }}
          >
            API Key
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider} API key`}
              style={{
                width: "100%",
                padding: "10px",
                paddingRight: "80px",
                background: colors.background,
                border: `1px solid ${colors.borderLight}`,
                borderRadius: "6px",
                color: colors.text,
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: colors.textMuted,
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showApiKey ? "Hide" : "Show"}
            </button>
          </div>
          <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
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
              color: colors.text,
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
              background: colors.background,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "6px",
              color: colors.text,
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

        {/* Custom System Prompt */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: colors.text }}>
              Custom System Prompt (Advanced)
            </label>
            {customSystemPrompt && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.textMuted,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Reset to default
              </button>
            )}
          </div>
          <textarea
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            placeholder={defaultPrompt}
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              background: colors.background,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "6px",
              color: colors.text,
              fontSize: "13px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
          <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
            Customize how Lumerisca responds. Leave empty for default behavior.
          </p>
        </div>

        {/* Page Map URL */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
              color: colors.text,
            }}
          >
            Page Map URL (Advanced)
          </label>
          <input
            type="url"
            value={pageMapUrl}
            onChange={(e) => setPageMapUrl(e.target.value)}
            placeholder="https://example.com/pageMap.json"
            style={{
              width: "100%",
              padding: "10px",
              background: colors.background,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "6px",
              color: colors.text,
              fontSize: "14px",
            }}
          />
          <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
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
            background: apiKey ? colors.primary : colors.borderLight,
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            cursor: apiKey ? "pointer" : "not-allowed",
          }}
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      {/* Help Section */}
      <div
        style={{
          marginTop: "32px",
          padding: "16px",
          background: colors.surface,
          borderRadius: "8px",
          fontSize: "13px",
          lineHeight: "1.6",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
          Getting Started
        </h3>
        <ul style={{ paddingLeft: "20px", color: colors.textMuted }}>
          <li>Get an API key from your chosen provider</li>
          <li>Enter your API key above</li>
          <li>Navigate to any page and start asking questions!</li>
          <li>Lumerisca will provide context-aware assistance</li>
        </ul>

        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: "12px", color: colors.textDim }}>
            <strong>Keyboard Shortcuts:</strong>
            <br />
            Ctrl+Shift+L (Cmd+Shift+L on Mac) - Toggle panel
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsFormEnhanced;
