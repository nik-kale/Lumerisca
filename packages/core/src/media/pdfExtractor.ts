/**
 * PDF text extraction and processing
 * Uses Mozilla's PDF.js for in-browser PDF parsing
 */

import { logger } from "../utils/logger.js";
import { LumeriscaError } from "../utils/errors.js";

const log = logger.scope("PDFExtractor");

// PDF.js will be loaded dynamically
let pdfjsLib: any = null;

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  keywords?: string;
}

export interface PDFExtraction {
  metadata: PDFMetadata;
  pages: PDFPage[];
  fullText: string;
  pageCount: number;
  fileSize: number;
  fileName: string;
}

export interface PDFTable {
  pageNumber: number;
  rows: string[][];
  headers?: string[];
}

/**
 * Maximum file size for PDF processing (10MB)
 */
const MAX_PDF_SIZE = 10 * 1024 * 1024;

/**
 * Load PDF.js library dynamically
 */
async function loadPdfJs(): Promise<void> {
  if (pdfjsLib) {
    return;
  }

  log.info("Loading PDF.js library");

  // PDF.js is loaded from CDN
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

  await new Promise<void>((resolve, reject) => {
    script.onload = () => {
      // @ts-ignore
      pdfjsLib = window.pdfjsLib;
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      log.info("PDF.js loaded successfully");
      resolve();
    };
    script.onerror = () => {
      log.error("Failed to load PDF.js");
      reject(new LumeriscaError("Failed to load PDF.js library", "MEDIA_ERROR"));
    };
    document.head.appendChild(script);
  });
}

/**
 * Validate PDF file before processing
 */
function validatePdfFile(file: File): void {
  // Check file size
  if (file.size > MAX_PDF_SIZE) {
    throw new LumeriscaError(
      `PDF file too large. Maximum size is ${MAX_PDF_SIZE / 1024 / 1024}MB`,
      "VALIDATION_ERROR"
    );
  }

  // Check file type
  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new LumeriscaError("Invalid file type. Expected PDF", "VALIDATION_ERROR");
  }

  log.info("PDF file validated", { name: file.name, size: file.size });
}

/**
 * Validate PDF data URL
 */
function validatePdfDataUrl(dataUrl: string): void {
  if (!dataUrl.startsWith("data:application/pdf;base64,")) {
    throw new LumeriscaError("Invalid PDF data URL format", "VALIDATION_ERROR");
  }

  // Rough size check (base64 is ~33% larger than binary)
  const base64Length = dataUrl.split(",")[1].length;
  const approximateSize = (base64Length * 3) / 4;

  if (approximateSize > MAX_PDF_SIZE) {
    throw new LumeriscaError(
      `PDF data too large. Maximum size is ${MAX_PDF_SIZE / 1024 / 1024}MB`,
      "VALIDATION_ERROR"
    );
  }
}

/**
 * Extract text from a PDF file
 */
export async function extractFromFile(file: File): Promise<PDFExtraction> {
  validatePdfFile(file);

  await loadPdfJs();

  log.info("Extracting PDF from file", { name: file.name, size: file.size });

  const arrayBuffer = await file.arrayBuffer();
  return await extractFromArrayBuffer(arrayBuffer, file.name, file.size);
}

/**
 * Extract text from a PDF URL
 */
export async function extractFromUrl(url: string): Promise<PDFExtraction> {
  await loadPdfJs();

  log.info("Extracting PDF from URL", { url });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new LumeriscaError(
        `Failed to fetch PDF: ${response.status}`,
        "MEDIA_ERROR"
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("pdf")) {
      throw new LumeriscaError(
        "URL does not point to a PDF file",
        "VALIDATION_ERROR"
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileName = extractFileNameFromUrl(url);
    const fileSize = arrayBuffer.byteLength;

    if (fileSize > MAX_PDF_SIZE) {
      throw new LumeriscaError(
        `PDF file too large. Maximum size is ${MAX_PDF_SIZE / 1024 / 1024}MB`,
        "VALIDATION_ERROR"
      );
    }

    return await extractFromArrayBuffer(arrayBuffer, fileName, fileSize);
  } catch (error) {
    if (error instanceof LumeriscaError) {
      throw error;
    }

    log.error("Failed to extract PDF from URL", { error, url });
    throw new LumeriscaError(`Failed to extract PDF: ${error}`, "MEDIA_ERROR");
  }
}

/**
 * Extract text from PDF ArrayBuffer
 */
async function extractFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  fileSize: number
): Promise<PDFExtraction> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    log.info("PDF loaded", { pages: pdf.numPages });

    // Extract metadata
    const metadata = await extractMetadata(pdf);

    // Extract text from all pages
    const pages: PDFPage[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const text = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        pageNumber: pageNum,
        text,
        width: viewport.width,
        height: viewport.height,
      });
    }

    const fullText = pages.map((p) => p.text).join("\n\n");

    log.info("PDF extraction complete", {
      pages: pages.length,
      textLength: fullText.length,
    });

    return {
      metadata,
      pages,
      fullText,
      pageCount: pdf.numPages,
      fileSize,
      fileName,
    };
  } catch (error) {
    log.error("Failed to extract PDF", { error });
    throw new LumeriscaError(`Failed to extract PDF: ${error}`, "MEDIA_ERROR");
  }
}

/**
 * Extract PDF metadata
 */
async function extractMetadata(pdf: any): Promise<PDFMetadata> {
  try {
    const metadata = await pdf.getMetadata();
    const info = metadata.info;

    return {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      creationDate: info.CreationDate || undefined,
      modificationDate: info.ModDate || undefined,
      keywords: info.Keywords || undefined,
    };
  } catch (error) {
    log.warn("Failed to extract metadata", { error });
    return {};
  }
}

/**
 * Extract filename from URL
 */
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split("/").pop() || "document.pdf";
    return fileName;
  } catch {
    return "document.pdf";
  }
}

/**
 * Search for text in PDF
 */
export function searchInPdf(
  extraction: PDFExtraction,
  query: string,
  caseSensitive: boolean = false
): Array<{ pageNumber: number; text: string; index: number }> {
  const results: Array<{ pageNumber: number; text: string; index: number }> = [];

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  extraction.pages.forEach((page) => {
    const pageText = caseSensitive ? page.text : page.text.toLowerCase();
    let index = pageText.indexOf(searchQuery);

    while (index !== -1) {
      // Extract context around match (50 chars before and after)
      const start = Math.max(0, index - 50);
      const end = Math.min(pageText.length, index + query.length + 50);
      const context = page.text.substring(start, end);

      results.push({
        pageNumber: page.pageNumber,
        text: context,
        index,
      });

      index = pageText.indexOf(searchQuery, index + 1);
    }
  });

  log.info("PDF search complete", { query, results: results.length });
  return results;
}

/**
 * Generate chat prompt for PDF
 */
export function generatePdfChatPrompt(
  extraction: PDFExtraction,
  question: string
): string {
  const { metadata, fullText, pageCount, fileName } = extraction;

  let prompt = `I have a PDF document to discuss:\n\n`;
  prompt += `**File**: ${fileName}\n`;
  prompt += `**Pages**: ${pageCount}\n`;

  if (metadata.title) {
    prompt += `**Title**: ${metadata.title}\n`;
  }
  if (metadata.author) {
    prompt += `**Author**: ${metadata.author}\n`;
  }

  prompt += `\n**Content**:\n${fullText}\n\n`;
  prompt += `**Question**: ${question}\n`;

  return prompt;
}

/**
 * Generate summary prompt for PDF
 */
export function generatePdfSummaryPrompt(extraction: PDFExtraction): string {
  const { metadata, fullText, pageCount, fileName } = extraction;

  let prompt = `Summarize this PDF document:\n\n`;
  prompt += `**File**: ${fileName}\n`;
  prompt += `**Pages**: ${pageCount}\n`;

  if (metadata.title) {
    prompt += `**Title**: ${metadata.title}\n`;
  }
  if (metadata.author) {
    prompt += `**Author**: ${metadata.author}\n`;
  }

  prompt += `\n**Content**:\n${fullText}\n\n`;
  prompt += `Provide a comprehensive summary with:\n`;
  prompt += `1. Main topic and purpose\n`;
  prompt += `2. Key points and arguments\n`;
  prompt += `3. Important findings or conclusions\n`;
  prompt += `4. Target audience\n`;

  return prompt;
}

/**
 * Extract text from specific page range
 */
export function extractPageRange(
  extraction: PDFExtraction,
  startPage: number,
  endPage: number
): string {
  const start = Math.max(1, startPage);
  const end = Math.min(extraction.pageCount, endPage);

  const relevantPages = extraction.pages.filter(
    (page) => page.pageNumber >= start && page.pageNumber <= end
  );

  return relevantPages.map((page) => page.text).join("\n\n");
}

/**
 * Simple table detection (detects text aligned in columns)
 */
export function detectTables(extraction: PDFExtraction): PDFTable[] {
  const tables: PDFTable[] = [];

  // This is a simple heuristic-based table detection
  // For production, consider using a dedicated table extraction library

  extraction.pages.forEach((page) => {
    const lines = page.text.split("\n");

    // Look for patterns of repeated spacing that might indicate columns
    const possibleTables: string[][] = [];
    let currentTable: string[] = [];

    lines.forEach((line) => {
      // Check if line has multiple tab or space-separated values
      const parts = line.split(/\s{2,}|\t/).filter((p) => p.trim().length > 0);

      if (parts.length >= 2) {
        currentTable.push(line);
      } else if (currentTable.length >= 2) {
        possibleTables.push([...currentTable]);
        currentTable = [];
      } else {
        currentTable = [];
      }
    });

    // Process detected tables
    possibleTables.forEach((tableLines) => {
      const rows = tableLines.map((line) =>
        line.split(/\s{2,}|\t/).filter((p) => p.trim().length > 0)
      );

      if (rows.length >= 2) {
        tables.push({
          pageNumber: page.pageNumber,
          rows: rows.slice(1),
          headers: rows[0],
        });
      }
    });
  });

  log.info("Table detection complete", { tables: tables.length });
  return tables;
}

/**
 * Generate citation for PDF
 */
export function generateCitation(
  extraction: PDFExtraction,
  style: "apa" | "mla" | "chicago" = "apa"
): string {
  const { metadata } = extraction;

  if (!metadata.author && !metadata.title) {
    return `Document: ${extraction.fileName}`;
  }

  const author = metadata.author || "Unknown Author";
  const title = metadata.title || extraction.fileName;
  const year = metadata.creationDate
    ? new Date(metadata.creationDate).getFullYear()
    : "n.d.";

  switch (style) {
    case "apa":
      return `${author}. (${year}). ${title}.`;
    case "mla":
      return `${author}. "${title}." ${year}.`;
    case "chicago":
      return `${author}. ${title}. ${year}.`;
    default:
      return `${author}. (${year}). ${title}.`;
  }
}
