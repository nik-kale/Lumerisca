/**
 * OCR (Optical Character Recognition) engine
 * Uses Tesseract.js for in-browser text extraction from images
 */

import { logger } from "../utils/logger.js";
import { LumeriscaError } from "../utils/errors.js";

const log = logger.scope("OCREngine");

// Tesseract.js will be loaded dynamically
let Tesseract: any = null;

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  language: string;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
  bbox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCROptions {
  language?: string;
  preserveFormatting?: boolean;
  extractTables?: boolean;
}

/**
 * Maximum image size for OCR (5MB)
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Supported image formats
 */
const SUPPORTED_FORMATS = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"];

/**
 * Load Tesseract.js library dynamically
 */
async function loadTesseract(): Promise<void> {
  if (Tesseract) {
    return;
  }

  log.info("Loading Tesseract.js library");

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js";

  await new Promise<void>((resolve, reject) => {
    script.onload = () => {
      // @ts-ignore
      Tesseract = window.Tesseract;
      log.info("Tesseract.js loaded successfully");
      resolve();
    };
    script.onerror = () => {
      log.error("Failed to load Tesseract.js");
      reject(new LumeriscaError("Failed to load Tesseract.js library", "MEDIA_ERROR"));
    };
    document.head.appendChild(script);
  });
}

/**
 * Validate image file before processing
 */
function validateImageFile(file: File): void {
  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new LumeriscaError(
      `Image file too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      "VALIDATION_ERROR"
    );
  }

  // Check file type
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    throw new LumeriscaError(
      `Unsupported image format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }

  log.info("Image file validated", { name: file.name, type: file.type, size: file.size });
}

/**
 * Extract text from image file
 */
export async function extractFromImage(
  file: File,
  options: OCROptions = {}
): Promise<OCRResult> {
  validateImageFile(file);

  await loadTesseract();

  const language = options.language || "eng";

  log.info("Starting OCR", { fileName: file.name, language });

  try {
    const worker = await Tesseract.createWorker(language);

    const result = await worker.recognize(file);

    await worker.terminate();

    log.info("OCR complete", {
      textLength: result.data.text.length,
      confidence: result.data.confidence,
    });

    return processOCRResult(result.data, options);
  } catch (error) {
    log.error("OCR failed", { error });
    throw new LumeriscaError(`OCR failed: ${error}`, "MEDIA_ERROR");
  }
}

/**
 * Extract text from image URL
 */
export async function extractFromImageUrl(
  url: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  await loadTesseract();

  const language = options.language || "eng";

  log.info("Starting OCR from URL", { url, language });

  try {
    const worker = await Tesseract.createWorker(language);

    const result = await worker.recognize(url);

    await worker.terminate();

    log.info("OCR complete", {
      textLength: result.data.text.length,
      confidence: result.data.confidence,
    });

    return processOCRResult(result.data, options);
  } catch (error) {
    log.error("OCR failed", { error });
    throw new LumeriscaError(`OCR failed: ${error}`, "MEDIA_ERROR");
  }
}

/**
 * Extract text from data URL
 */
export async function extractFromDataUrl(
  dataUrl: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  await loadTesseract();

  const language = options.language || "eng";

  log.info("Starting OCR from data URL", { language });

  try {
    const worker = await Tesseract.createWorker(language);

    const result = await worker.recognize(dataUrl);

    await worker.terminate();

    log.info("OCR complete", {
      textLength: result.data.text.length,
      confidence: result.data.confidence,
    });

    return processOCRResult(result.data, options);
  } catch (error) {
    log.error("OCR failed", { error });
    throw new LumeriscaError(`OCR failed: ${error}`, "MEDIA_ERROR");
  }
}

/**
 * Process Tesseract result into our OCR result format
 */
function processOCRResult(data: any, options: OCROptions): OCRResult {
  const words: OCRWord[] = data.words.map((word: any) => ({
    text: word.text,
    confidence: word.confidence,
    bbox: {
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
    },
  }));

  const lines: OCRLine[] = data.lines.map((line: any) => ({
    text: line.text,
    confidence: line.confidence,
    words: line.words.map((word: any) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: {
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
      },
    })),
    bbox: {
      x: line.bbox.x0,
      y: line.bbox.y0,
      width: line.bbox.x1 - line.bbox.x0,
      height: line.bbox.y1 - line.bbox.y0,
    },
  }));

  let text = data.text;

  // Preserve formatting if requested
  if (options.preserveFormatting) {
    text = preserveFormatting(lines);
  }

  return {
    text,
    confidence: data.confidence,
    words,
    lines,
    language: options.language || "eng",
  };
}

/**
 * Preserve text formatting based on bounding boxes
 */
function preserveFormatting(lines: OCRLine[]): string {
  // Sort lines by vertical position
  const sortedLines = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);

  let formattedText = "";
  let previousY = 0;

  sortedLines.forEach((line) => {
    // Add line breaks for vertical spacing
    const verticalGap = line.bbox.y - previousY;
    if (previousY > 0 && verticalGap > line.bbox.height * 1.5) {
      formattedText += "\n\n";
    } else if (previousY > 0) {
      formattedText += "\n";
    }

    // Add horizontal spacing for indentation
    const indentation = Math.floor(line.bbox.x / 20);
    formattedText += " ".repeat(indentation);

    formattedText += line.text;

    previousY = line.bbox.y + line.bbox.height;
  });

  return formattedText;
}

/**
 * Detect tables in OCR result
 */
export function detectTablesInOCR(result: OCRResult): string[][] {
  const tables: string[][] = [];

  // Group lines by vertical position (rows)
  const rows: OCRLine[][] = [];
  let currentRow: OCRLine[] = [];
  let previousY = 0;

  result.lines.forEach((line) => {
    const verticalGap = Math.abs(line.bbox.y - previousY);

    if (previousY > 0 && verticalGap > line.bbox.height * 0.5) {
      if (currentRow.length > 0) {
        rows.push([...currentRow]);
        currentRow = [];
      }
    }

    currentRow.push(line);
    previousY = line.bbox.y;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Check if rows have consistent column structure
  if (rows.length >= 2) {
    // Sort words in each row by horizontal position
    const sortedRows = rows.map((row) => {
      const allWords = row.flatMap((line) => line.words);
      return allWords.sort((a, b) => a.bbox.x - b.bbox.x);
    });

    // Simple table detection: check if rows have similar number of elements
    const avgWordsPerRow =
      sortedRows.reduce((sum, row) => sum + row.length, 0) / sortedRows.length;

    const isTable = sortedRows.every(
      (row) => Math.abs(row.length - avgWordsPerRow) <= 2
    );

    if (isTable) {
      return sortedRows.map((row) => row.map((word) => word.text));
    }
  }

  return tables;
}

/**
 * Extract code from screenshot
 */
export function extractCodeFromOCR(result: OCRResult): string {
  let code = result.text;

  // Common code patterns to detect
  const codeIndicators = [
    /function\s+\w+\s*\(/,
    /class\s+\w+/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /import\s+.*from/,
    /export\s+(default|const|function|class)/,
    /{[\s\S]*}/,
    /\bif\s*\(/,
    /\bfor\s*\(/,
    /\bwhile\s*\(/,
  ];

  const hasCodePattern = codeIndicators.some((pattern) => pattern.test(code));

  if (hasCodePattern) {
    // Clean up common OCR errors in code
    code = code
      .replace(/\bl\s/g, "1") // 'l' often misread as '1'
      .replace(/\bO\b/g, "0") // 'O' often misread as '0'
      .replace(/\s+\./g, ".") // Remove spaces before dots
      .replace(/\.\s+/g, "."); // Remove spaces after dots

    log.info("Code detected and cleaned", { originalLength: result.text.length });
  }

  return code;
}

/**
 * Get OCR confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 90) return "Excellent";
  if (confidence >= 75) return "Good";
  if (confidence >= 60) return "Fair";
  if (confidence >= 40) return "Poor";
  return "Very Poor";
}

/**
 * Supported languages for OCR
 */
export const SUPPORTED_LANGUAGES = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  jpn: "Japanese",
  kor: "Korean",
  chi_sim: "Chinese (Simplified)",
  chi_tra: "Chinese (Traditional)",
  ara: "Arabic",
  hin: "Hindi",
  ben: "Bengali",
  vie: "Vietnamese",
  tha: "Thai",
  tur: "Turkish",
  pol: "Polish",
  nld: "Dutch",
  swe: "Swedish",
};

/**
 * Download Tesseract language data
 * This is automatically handled by Tesseract.js but we expose it for progress tracking
 */
export async function downloadLanguage(
  language: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  await loadTesseract();

  log.info("Downloading language data", { language });

  try {
    const worker = await Tesseract.createWorker(language, 1, {
      logger: (m: any) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(m.progress);
        }
      },
    });

    await worker.terminate();

    log.info("Language data downloaded", { language });
  } catch (error) {
    log.error("Failed to download language", { error, language });
    throw new LumeriscaError(
      `Failed to download language data: ${error}`,
      "MEDIA_ERROR"
    );
  }
}
