/**
 * Content script for Lumerisca
 * Injects a side drawer and collects page context
 */

import { collectFullPageContext } from "@lumerisca/core";
import { createPageContextMessage, sendToBackground } from "../messaging/messages.js";

// Prevent multiple injections
declare global {
  interface Window {
    __LUMERISCA_LOADED__?: boolean;
  }
}

/**
 * Initialize Lumerisca on the page
 */
function init() {
  // Check if already loaded
  if (window.__LUMERISCA_LOADED__) {
    console.log("Lumerisca: Already loaded, skipping injection");
    return;
  }

  window.__LUMERISCA_LOADED__ = true;
  console.log("Lumerisca: Initializing...");

  // Create drawer container
  const container = createDrawerContainer();
  document.body.appendChild(container);

  // Inject drawer styles
  injectStyles();

  // Collect and send initial page context
  sendPageContext();

  // Listen for URL changes (for SPAs)
  observeUrlChanges();

  console.log("Lumerisca: Initialization complete");
}

/**
 * Create the drawer container element
 */
function createDrawerContainer(): HTMLElement {
  const container = document.createElement("div");
  container.id = "lumerisca-root";
  container.setAttribute("data-lumerisca", "true");

  // Note: In a real implementation, you would either:
  // 1. Load the React app bundle here as an iframe
  // 2. Or render React components directly using a bundled script
  // For MVP, we're keeping it simple with a placeholder

  container.innerHTML = `
    <div class="lumerisca-drawer">
      <div class="lumerisca-header">
        <h3>Lumerisca</h3>
        <button class="lumerisca-close" id="lumerisca-close-btn">×</button>
      </div>
      <div class="lumerisca-content">
        <p>Loading AI assistant...</p>
        <p class="lumerisca-hint">Click the extension icon to open the full panel.</p>
      </div>
    </div>
  `;

  // Add close button handler
  setTimeout(() => {
    const closeBtn = container.querySelector("#lumerisca-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        container.style.display = "none";
      });
    }
  }, 100);

  return container;
}

/**
 * Inject CSS styles for the drawer
 */
function injectStyles(): void {
  const style = document.createElement("style");
  style.id = "lumerisca-styles";
  style.textContent = `
    #lumerisca-root {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif;
      pointer-events: none;
    }

    .lumerisca-drawer {
      width: 100%;
      height: 100%;
      background: #0b1120;
      color: #e5e7eb;
      border-left: 1px solid #1f2937;
      display: flex;
      flex-direction: column;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
    }

    .lumerisca-header {
      padding: 16px;
      border-bottom: 1px solid #1f2937;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
    }

    .lumerisca-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .lumerisca-close {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .lumerisca-close:hover {
      background: #1f2937;
      color: #e5e7eb;
    }

    .lumerisca-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    .lumerisca-hint {
      margin-top: 12px;
      font-size: 13px;
      color: #9ca3af;
      font-style: italic;
    }

    /* Scrollbar styling */
    .lumerisca-content::-webkit-scrollbar {
      width: 8px;
    }

    .lumerisca-content::-webkit-scrollbar-track {
      background: #0b1120;
    }

    .lumerisca-content::-webkit-scrollbar-thumb {
      background: #374151;
      border-radius: 4px;
    }

    .lumerisca-content::-webkit-scrollbar-thumb:hover {
      background: #4b5563;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Collect and send page context to background
 */
function sendPageContext(): void {
  try {
    const context = collectFullPageContext(
      document,
      window.location.href,
      document.title
    );

    const message = createPageContextMessage(context);
    sendToBackground(message).catch((error) => {
      console.error("Lumerisca: Failed to send page context:", error);
    });

    console.log("Lumerisca: Page context sent", context);
  } catch (error) {
    console.error("Lumerisca: Error collecting page context:", error);
  }
}

/**
 * Observe URL changes for single-page applications
 */
function observeUrlChanges(): void {
  let lastUrl = window.location.href;

  // Use MutationObserver as a fallback for URL changes
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log("Lumerisca: URL changed, updating context");
      sendPageContext();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also listen to popstate for back/forward navigation
  window.addEventListener("popstate", () => {
    sendPageContext();
  });
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
