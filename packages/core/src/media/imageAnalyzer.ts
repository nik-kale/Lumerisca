/**
 * Image and screenshot analysis using vision-capable LLMs
 * Supports analyzing screenshots, diagrams, charts, UI/UX, and code screenshots
 */

import { logger } from "../utils/logger.js";
import { LumeriscaError } from "../utils/errors.js";

const log = logger.scope("ImageAnalyzer");

export interface ImageAnalysis {
  description: string;
  elements: ImageElement[];
  suggestions: string[];
  analysisType: AnalysisType;
  confidence: number;
}

export interface ImageElement {
  type: string;
  description: string;
  location?: string;
  confidence?: number;
}

export type AnalysisType =
  | "ui_ux"
  | "code_screenshot"
  | "diagram"
  | "chart"
  | "document"
  | "photo"
  | "general";

export interface AnalysisOptions {
  analysisType?: AnalysisType;
  focusArea?: string;
  extractCode?: boolean;
  extractText?: boolean;
}

/**
 * Maximum image size for analysis (5MB)
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Convert image file to base64 data URL
 */
export async function imageToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new LumeriscaError(
      `Image file too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      "VALIDATION_ERROR"
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new LumeriscaError("Failed to read image file", "MEDIA_ERROR"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress image if needed (for large images)
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      // Create canvas and draw compressed image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new LumeriscaError("Failed to get canvas context", "MEDIA_ERROR"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to data URL with compression
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

      log.info("Image compressed", {
        originalSize: dataUrl.length,
        compressedSize: compressedDataUrl.length,
        reduction: `${(((dataUrl.length - compressedDataUrl.length) / dataUrl.length) * 100).toFixed(1)}%`,
      });

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new LumeriscaError("Failed to load image", "MEDIA_ERROR"));
    };

    img.src = dataUrl;
  });
}

/**
 * Detect image analysis type automatically
 */
export function detectAnalysisType(image: HTMLImageElement): AnalysisType {
  // This is a heuristic-based detection
  // In production, you might use ML models for better detection

  const canvas = document.createElement("canvas");
  canvas.width = Math.min(image.width, 100);
  canvas.height = Math.min(image.height, 100);

  const ctx = canvas.getContext("2d");
  if (!ctx) return "general";

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate color statistics
  let totalBrightness = 0;
  let totalSaturation = 0;
  let darkPixels = 0;
  let lightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (max + min) / 2 / 255;
    const saturation = max === min ? 0 : (max - min) / max;

    totalBrightness += brightness;
    totalSaturation += saturation;

    if (brightness < 0.3) darkPixels++;
    if (brightness > 0.7) lightPixels++;
  }

  const pixelCount = data.length / 4;
  const avgBrightness = totalBrightness / pixelCount;
  const avgSaturation = totalSaturation / pixelCount;
  const darkRatio = darkPixels / pixelCount;
  const lightRatio = lightPixels / pixelCount;

  // Heuristics for detection
  if (darkRatio > 0.7 && avgSaturation < 0.1) {
    return "code_screenshot"; // Dark theme code
  }

  if (lightRatio > 0.7 && avgSaturation < 0.1) {
    return "document"; // Light document
  }

  if (avgSaturation < 0.2 && (darkRatio > 0.4 || lightRatio > 0.4)) {
    return "ui_ux"; // UI mockup or wireframe
  }

  if (avgSaturation > 0.3) {
    return "photo"; // Colorful photo
  }

  return "general";
}

/**
 * Generate analysis prompt for vision-capable LLM
 */
export function generateAnalysisPrompt(
  options: AnalysisOptions = {}
): string {
  const { analysisType, focusArea, extractCode, extractText } = options;

  let prompt = "Analyze this image and provide a detailed description.\n\n";

  if (analysisType) {
    switch (analysisType) {
      case "ui_ux":
        prompt += "This appears to be a UI/UX design. Please:\n";
        prompt += "1. Describe the overall layout and structure\n";
        prompt += "2. Identify UI components (buttons, forms, navigation, etc.)\n";
        prompt += "3. Comment on design patterns and usability\n";
        prompt += "4. Suggest improvements if any\n";
        break;

      case "code_screenshot":
        prompt += "This appears to be a code screenshot. Please:\n";
        prompt += "1. Identify the programming language\n";
        prompt += "2. Explain what the code does\n";
        prompt += "3. Point out any notable patterns or issues\n";
        if (extractCode) {
          prompt += "4. Extract the code text as accurately as possible\n";
        }
        break;

      case "diagram":
        prompt += "This appears to be a diagram or flowchart. Please:\n";
        prompt += "1. Describe the overall structure and flow\n";
        prompt += "2. Identify key components and their relationships\n";
        prompt += "3. Explain the process or concept being illustrated\n";
        prompt += "4. Note any important details or annotations\n";
        break;

      case "chart":
        prompt += "This appears to be a chart or graph. Please:\n";
        prompt += "1. Identify the chart type (bar, line, pie, etc.)\n";
        prompt += "2. Describe what data is being visualized\n";
        prompt += "3. Point out key trends or insights\n";
        prompt += "4. Note axes labels, legends, and data points\n";
        break;

      case "document":
        prompt += "This appears to be a document. Please:\n";
        prompt += "1. Describe the document type and structure\n";
        prompt += "2. Identify headings, sections, and key information\n";
        if (extractText) {
          prompt += "3. Extract the text content accurately\n";
        }
        prompt += "4. Note any important formatting or highlights\n";
        break;

      case "photo":
        prompt += "This appears to be a photograph. Please:\n";
        prompt += "1. Describe what's in the image\n";
        prompt += "2. Identify key objects, people, or scenes\n";
        prompt += "3. Note the setting and context\n";
        prompt += "4. Describe notable details or features\n";
        break;

      default:
        prompt += "Please provide a comprehensive analysis covering:\n";
        prompt += "1. Overall description of the image\n";
        prompt += "2. Key elements and their arrangement\n";
        prompt += "3. Any text visible in the image\n";
        prompt += "4. Notable features or details\n";
    }
  }

  if (focusArea) {
    prompt += `\nSpecifically focus on: ${focusArea}\n`;
  }

  return prompt;
}

/**
 * Generate prompt for UI/UX analysis
 */
export function generateUIAnalysisPrompt(): string {
  return generateAnalysisPrompt({ analysisType: "ui_ux" });
}

/**
 * Generate prompt for code screenshot analysis
 */
export function generateCodeAnalysisPrompt(extractCode: boolean = true): string {
  return generateAnalysisPrompt({
    analysisType: "code_screenshot",
    extractCode,
  });
}

/**
 * Generate prompt for diagram explanation
 */
export function generateDiagramAnalysisPrompt(): string {
  return generateAnalysisPrompt({ analysisType: "diagram" });
}

/**
 * Parse analysis response from LLM
 */
export function parseAnalysisResponse(
  response: string,
  analysisType: AnalysisType
): ImageAnalysis {
  // Extract structured information from response
  const elements: ImageElement[] = [];
  const suggestions: string[] = [];

  // Simple pattern matching for structured data
  // In production, you might use more sophisticated NLP

  // Extract numbered lists (elements or suggestions)
  const numberedListRegex = /\d+\.\s+(.+?)(?=\n\d+\.|\n\n|$)/gs;
  const matches = response.matchAll(numberedListRegex);

  for (const match of matches) {
    const item = match[1].trim();

    // Check if it's a suggestion (contains words like "should", "could", "improve")
    if (
      item.match(/\b(should|could|improve|suggest|recommend|consider)\b/i)
    ) {
      suggestions.push(item);
    } else {
      // Otherwise, treat as an element
      elements.push({
        type: analysisType,
        description: item,
      });
    }
  }

  // Estimate confidence based on response length and structure
  const confidence = Math.min(
    95,
    60 + Math.min(35, response.length / 50)
  );

  return {
    description: response,
    elements,
    suggestions,
    analysisType,
    confidence,
  };
}

/**
 * Take screenshot of current viewport
 */
export async function captureScreenshot(): Promise<string> {
  try {
    // Use chrome.tabs.captureVisibleTab for extension context
    if (typeof chrome !== "undefined" && chrome.tabs) {
      return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              reject(
                new LumeriscaError(
                  chrome.runtime.lastError.message || "Failed to capture screenshot",
                  "MEDIA_ERROR"
                )
              );
            } else {
              resolve(dataUrl);
            }
          }
        );
      });
    }

    throw new LumeriscaError(
      "Screenshot capture not available in this context",
      "MEDIA_ERROR"
    );
  } catch (error) {
    log.error("Failed to capture screenshot", { error });
    throw new LumeriscaError(
      `Failed to capture screenshot: ${error}`,
      "MEDIA_ERROR"
    );
  }
}

/**
 * Annotate image with highlights or markers
 */
export function annotateImage(
  imageDataUrl: string,
  annotations: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    color?: string;
  }>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new LumeriscaError("Failed to get canvas context", "MEDIA_ERROR"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw annotations
      annotations.forEach((annotation) => {
        ctx.strokeStyle = annotation.color || "#ff0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          annotation.x,
          annotation.y,
          annotation.width,
          annotation.height
        );

        if (annotation.label) {
          ctx.fillStyle = annotation.color || "#ff0000";
          ctx.font = "14px Arial";
          ctx.fillText(
            annotation.label,
            annotation.x,
            annotation.y - 5
          );
        }
      });

      const annotatedDataUrl = canvas.toDataURL("image/png");
      resolve(annotatedDataUrl);
    };

    img.onerror = () => {
      reject(new LumeriscaError("Failed to load image", "MEDIA_ERROR"));
    };

    img.src = imageDataUrl;
  });
}

/**
 * Compare two images and highlight differences
 */
export function compareImages(
  image1DataUrl: string,
  image2DataUrl: string,
  threshold: number = 30
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img1 = new Image();
    const img2 = new Image();

    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(img1.width, img2.width);
          canvas.height = Math.max(img1.height, img2.height);

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new LumeriscaError("Failed to get canvas context", "MEDIA_ERROR"));
            return;
          }

          // Draw both images
          ctx.drawImage(img1, 0, 0);
          const data1 = ctx.getImageData(0, 0, canvas.width, canvas.height);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img2, 0, 0);
          const data2 = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Calculate differences
          const diffData = ctx.createImageData(canvas.width, canvas.height);

          for (let i = 0; i < data1.data.length; i += 4) {
            const diff =
              Math.abs(data1.data[i] - data2.data[i]) +
              Math.abs(data1.data[i + 1] - data2.data[i + 1]) +
              Math.abs(data1.data[i + 2] - data2.data[i + 2]);

            if (diff > threshold) {
              // Highlight difference in red
              diffData.data[i] = 255;
              diffData.data[i + 1] = 0;
              diffData.data[i + 2] = 0;
              diffData.data[i + 3] = 255;
            } else {
              // Keep original pixel (grayscale)
              const avg =
                (data1.data[i] + data1.data[i + 1] + data1.data[i + 2]) / 3;
              diffData.data[i] = avg;
              diffData.data[i + 1] = avg;
              diffData.data[i + 2] = avg;
              diffData.data[i + 3] = 255;
            }
          }

          ctx.putImageData(diffData, 0, 0);
          const diffDataUrl = canvas.toDataURL("image/png");
          resolve(diffDataUrl);
        } catch (error) {
          reject(new LumeriscaError(`Failed to compare images: ${error}`, "MEDIA_ERROR"));
        }
      }
    };

    img1.onload = onLoad;
    img2.onload = onLoad;

    img1.onerror = () => reject(new LumeriscaError("Failed to load first image", "MEDIA_ERROR"));
    img2.onerror = () => reject(new LumeriscaError("Failed to load second image", "MEDIA_ERROR"));

    img1.src = image1DataUrl;
    img2.src = image2DataUrl;
  });
}
