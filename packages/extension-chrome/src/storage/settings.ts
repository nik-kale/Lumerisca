import type { ExtensionSettings, LLMProvider } from "@lumerisca/core";

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  SETTINGS: "lumerisca_settings",
  PAGE_MAP_CACHE: "lumerisca_page_map",
} as const;

/**
 * Default settings
 */
const DEFAULT_SETTINGS: ExtensionSettings = {
  llm: {
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
  },
  pageMapUrl: undefined,
};

/**
 * Get extension settings from storage
 */
export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
      const settings = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
      resolve(settings);
    });
  });
}

/**
 * Save extension settings to storage
 */
export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Merge with existing settings
    getSettings().then((currentSettings) => {
      const updatedSettings: ExtensionSettings = {
        ...currentSettings,
        ...settings,
        llm: {
          ...currentSettings.llm,
          ...(settings.llm || {}),
        },
      };

      chrome.storage.sync.set(
        { [STORAGE_KEYS.SETTINGS]: updatedSettings },
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            // Notify other components of settings update
            chrome.runtime.sendMessage({
              type: "LUMERISCA_SETTINGS_UPDATED",
            });
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Clear all settings
 */
export async function clearSettings(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove(STORAGE_KEYS.SETTINGS, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings.llm.apiKey && settings.llm.apiKey.length > 0;
}

/**
 * Quick update just the API key
 */
export async function updateApiKey(
  provider: LLMProvider,
  apiKey: string
): Promise<void> {
  const settings = await getSettings();
  settings.llm.provider = provider;
  settings.llm.apiKey = apiKey;
  return saveSettings(settings);
}
