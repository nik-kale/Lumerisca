/**
 * Markdown Conversion Utilities
 * Convert between HTML, plain text, and Markdown formats
 */

import { logger } from "../utils/logger.js";

const log = logger.scope("MarkdownConverter");

export interface ConversionOptions {
  preserveFormatting?: boolean;
  includeImages?: boolean;
  includeLinkUrls?: boolean;
  cleanWhitespace?: boolean;
}

/**
 * Convert HTML to Markdown
 */
export function htmlToMarkdown(
  html: string,
  options: ConversionOptions = {}
): string {
  const {
    preserveFormatting = true,
    includeImages = true,
    includeLinkUrls = true,
    cleanWhitespace = true,
  } = options;

  let markdown = html;

  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");

  // Convert bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Convert code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(/<pre[^>]*><code>(.*?)<\/code><\/pre>/gis, "```\n$1\n```\n");
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```\n");

  // Convert links
  if (includeLinkUrls) {
    markdown = markdown.replace(
      /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
      "[$2]($1)"
    );
  } else {
    markdown = markdown.replace(/<a[^>]*>(.*?)<\/a>/gi, "$1");
  }

  // Convert images
  if (includeImages) {
    markdown = markdown.replace(
      /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi,
      "![$2]($1)"
    );
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)");
  } else {
    markdown = markdown.replace(/<img[^>]*>/gi, "");
  }

  // Convert lists
  markdown = markdown.replace(/<ul[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ul>/gi, "\n");
  markdown = markdown.replace(/<ol[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ol>/gi, "\n");
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content
      .trim()
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n") + "\n\n";
  });

  // Convert horizontal rules
  markdown = markdown.replace(/<hr[^>]*>/gi, "\n---\n\n");

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");

  // Convert divs (simple removal)
  markdown = markdown.replace(/<div[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/div>/gi, "\n");

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  markdown = decodeHtmlEntities(markdown);

  // Clean whitespace
  if (cleanWhitespace) {
    markdown = markdown.replace(/\n{3,}/g, "\n\n"); // Max 2 newlines
    markdown = markdown.replace(/[ \t]+/g, " "); // Normalize spaces
    markdown = markdown.trim();
  }

  log.debug("HTML to Markdown conversion complete", {
    inputLength: html.length,
    outputLength: markdown.length,
  });

  return markdown;
}

/**
 * Convert Markdown to plain text
 */
export function markdownToPlainText(
  markdown: string,
  options: ConversionOptions = {}
): string {
  const { cleanWhitespace = true } = options;

  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Remove blockquote markers
  text = text.replace(/^>\s+/gm, "");

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, "");

  // Clean whitespace
  if (cleanWhitespace) {
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.replace(/[ \t]+/g, " ");
    text = text.trim();
  }

  return text;
}

/**
 * Convert HTML to plain text
 */
export function htmlToPlainText(
  html: string,
  options: ConversionOptions = {}
): string {
  const markdown = htmlToMarkdown(html, options);
  return markdownToPlainText(markdown, options);
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "...",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  let decoded = text;

  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  });

  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return decoded;
}

/**
 * Extract headings from Markdown
 */
export function extractHeadings(markdown: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return headings;
}

/**
 * Generate table of contents from Markdown
 */
export function generateTableOfContents(markdown: string): string {
  const headings = extractHeadings(markdown);

  if (headings.length === 0) {
    return "";
  }

  let toc = "## Table of Contents\n\n";

  headings.forEach((heading) => {
    const indent = "  ".repeat(heading.level - 1);
    const link = heading.text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

    toc += `${indent}- [${heading.text}](#${link})\n`;
  });

  return toc + "\n";
}

/**
 * Count words in Markdown (excluding code blocks)
 */
export function countWords(markdown: string): number {
  // Remove code blocks
  let text = markdown.replace(/```[\s\S]*?```/g, "");

  // Convert to plain text
  text = markdownToPlainText(text);

  // Split and count
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  return words.length;
}

/**
 * Estimate reading time (words per minute)
 */
export function estimateReadingTime(markdown: string, wpm: number = 200): number {
  const wordCount = countWords(markdown);
  return Math.ceil(wordCount / wpm);
}

/**
 * Extract links from Markdown
 */
export function extractLinks(markdown: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    });
  }

  return links;
}

/**
 * Extract images from Markdown
 */
export function extractImages(markdown: string): Array<{ alt: string; url: string }> {
  const images: Array<{ alt: string; url: string }> = [];

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
    });
  }

  return images;
}

/**
 * Format code blocks with language syntax
 */
export function formatCodeBlock(code: string, language: string = ""): string {
  return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
}

/**
 * Create Markdown table
 */
export function createTable(
  headers: string[],
  rows: string[][],
  alignment?: ("left" | "center" | "right")[]
): string {
  const headerRow = `| ${headers.join(" | ")} |`;

  const alignmentRow = headers
    .map((_, i) => {
      const align = alignment?.[i] || "left";

      if (align === "center") return ":---:";
      if (align === "right") return "---:";
      return "---";
    })
    .join(" | ");

  const tableRows = rows
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return `${headerRow}\n| ${alignmentRow} |\n${tableRows}`;
}
