import type { PageContext, PageMap } from "../types.js";

/**
 * Resolves which document sources should be used for a given page context
 *
 * @param ctx - Current page context
 * @param pageMap - Page mapping configuration
 * @returns Array of document source IDs to use for RAG
 */
export function resolvePageSources(ctx: PageContext, pageMap: PageMap): string[] {
  const pathname = ctx.pathname;
  const matched: string[] = [];

  for (const entry of pageMap.entries) {
    if (matchPath(entry.pattern, pathname)) {
      matched.push(...entry.sources);
    }
  }

  // Remove duplicates
  return Array.from(new Set(matched));
}

/**
 * Matches a path pattern against a pathname
 * Supports simple glob patterns with wildcards
 *
 * Patterns:
 * - Exact match: "/dashboard" matches "/dashboard"
 * - Wildcard suffix: "/dashboard*" matches "/dashboard", "/dashboard/metrics", etc.
 * - Wildcard anywhere: "*settings*" matches "/user/settings", "/admin/settings/profile", etc.
 *
 * @param pattern - Glob pattern to match
 * @param path - Pathname to test
 * @returns True if the path matches the pattern
 */
function matchPath(pattern: string, path: string): boolean {
  // Exact match
  if (pattern === path) {
    return true;
  }

  // Convert glob pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Default page map for demonstration
 * In production, this would be loaded from extension settings or a URL
 */
export const DEFAULT_PAGE_MAP: PageMap = {
  entries: [
    {
      pattern: "/dashboard*",
      sources: ["dashboard_intro", "metrics_guide"],
    },
    {
      pattern: "/settings*",
      sources: ["settings_overview", "account_management"],
    },
    {
      pattern: "/help*",
      sources: ["help_center", "faq"],
    },
    {
      pattern: "*",
      sources: ["general_help"],
    },
  ],
};
