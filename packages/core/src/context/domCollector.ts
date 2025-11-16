/**
 * Collects important context from the DOM
 * Extracts text from headings, error messages, alerts, and notifications
 */
export function collectDomContext(doc: Document): string {
  const parts: string[] = [];

  // Selectors for important UI elements
  const selectors = [
    "h1",
    "h2",
    "h3",
    ".error",
    ".alert",
    ".notification",
    "[role='alert']",
    ".warning",
    ".message",
  ];

  const selector = selectors.join(", ");
  const elements = doc.querySelectorAll(selector);

  elements.forEach((el) => {
    const text = el.textContent?.trim();

    // Filter out empty strings and overly long text (likely not a heading/alert)
    if (text && text.length > 0 && text.length < 400) {
      parts.push(text);
    }
  });

  return parts.join("\n");
}

/**
 * Collects full page context including URL info and DOM content
 */
export function collectFullPageContext(doc: Document, url: string, title: string) {
  const parsedUrl = new URL(url);

  return {
    url,
    pathname: parsedUrl.pathname,
    hostname: parsedUrl.hostname,
    title,
    domSummary: collectDomContext(doc),
  };
}
