import type { InitialContext } from "../types.js";

/**
 * Builds initial context from URL and title
 * This is the first-pass context before DOM parsing
 */
export function buildInitialContext(url: string, title: string): InitialContext {
  const parsedUrl = new URL(url);

  return {
    url,
    title,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
  };
}
