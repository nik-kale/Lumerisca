/**
 * Theme provider and utilities for Lumerisca
 * Supports dark and light themes
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme colors
 */
export const themes = {
  dark: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    background: "#0b1120",
    surface: "#111827",
    surfaceHover: "#1f2937",
    border: "#1f2937",
    borderLight: "#374151",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
    textDim: "#6b7280",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
  },
  light: {
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    background: "#ffffff",
    surface: "#f9fafb",
    surfaceHover: "#f3f4f6",
    border: "#e5e7eb",
    borderLight: "#d1d5db",
    text: "#111827",
    textMuted: "#6b7280",
    textDim: "#9ca3af",
    error: "#dc2626",
    warning: "#d97706",
    success: "#059669",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
  },
};

/**
 * Theme provider component
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // Load theme from storage
    chrome.storage.sync.get("lumerisca_theme", (result) => {
      if (result.lumerisca_theme) {
        setThemeState(result.lumerisca_theme);
      }
    });
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    chrome.storage.sync.set({ lumerisca_theme: newTheme });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/**
 * Get current theme colors
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return themes[theme];
}
