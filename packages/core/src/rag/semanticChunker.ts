/**
 * Semantic Chunking Strategy
 * Intelligently splits text into semantically meaningful chunks
 * instead of fixed-size chunks, preserving context boundaries
 */

import { logger } from "../utils/logger.js";

const log = logger.scope("SemanticChunker");

export interface Chunk {
  id: string;
  text: string;
  index: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sourceId: string;
  startChar: number;
  endChar: number;
  sentences: number;
  tokens: number;
  type: "paragraph" | "section" | "sentence" | "custom";
  heading?: string;
  context?: string;
}

export interface ChunkingOptions {
  maxChunkSize?: number;      // Maximum tokens per chunk (default: 512)
  minChunkSize?: number;       // Minimum tokens per chunk (default: 100)
  overlapSize?: number;        // Overlap between chunks (default: 50)
  preserveParagraphs?: boolean; // Try to keep paragraphs intact (default: true)
  preserveSentences?: boolean;  // Try to keep sentences intact (default: true)
  addContext?: boolean;        // Add surrounding context (default: true)
}

/**
 * Semantic chunker for intelligent text splitting
 */
export class SemanticChunker {
  private options: Required<ChunkingOptions>;

  constructor(options: ChunkingOptions = {}) {
    this.options = {
      maxChunkSize: options.maxChunkSize ?? 512,
      minChunkSize: options.minChunkSize ?? 100,
      overlapSize: options.overlapSize ?? 50,
      preserveParagraphs: options.preserveParagraphs ?? true,
      preserveSentences: options.preserveSentences ?? true,
      addContext: options.addContext ?? true,
    };
  }

  /**
   * Chunk text into semantically meaningful pieces
   */
  chunk(text: string, sourceId: string = "unknown"): Chunk[] {
    log.debug("Starting semantic chunking", {
      sourceId,
      textLength: text.length,
    });

    // Split into paragraphs first
    const paragraphs = this.splitIntoParagraphs(text);

    const chunks: Chunk[] = [];
    let chunkIndex = 0;
    let currentPosition = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.text.trim().length === 0) {
        continue;
      }

      const paragraphTokens = this.estimateTokens(paragraph.text);

      if (paragraphTokens <= this.options.maxChunkSize) {
        // Paragraph fits in one chunk
        if (paragraphTokens >= this.options.minChunkSize) {
          chunks.push(
            this.createChunk(
              paragraph.text,
              chunkIndex++,
              sourceId,
              paragraph.start,
              paragraph.end,
              "paragraph",
              paragraph.heading
            )
          );
        } else {
          // Too small, will be merged with next
          continue;
        }
      } else {
        // Paragraph too large, split into sentences
        const sentenceChunks = this.chunkParagraph(
          paragraph.text,
          sourceId,
          paragraph.start,
          paragraph.heading
        );

        sentenceChunks.forEach((chunk) => {
          chunk.index = chunkIndex++;
          chunks.push(chunk);
        });
      }

      currentPosition = paragraph.end;
    }

    // Add overlap between chunks
    if (this.options.overlapSize > 0) {
      this.addOverlap(chunks);
    }

    // Add context if enabled
    if (this.options.addContext) {
      this.addContext(chunks);
    }

    log.info("Chunking complete", {
      sourceId,
      chunks: chunks.length,
      avgChunkSize: chunks.reduce((sum, c) => sum + c.metadata.tokens, 0) / chunks.length,
    });

    return chunks;
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): Array<{
    text: string;
    start: number;
    end: number;
    heading?: string;
  }> {
    const paragraphs: Array<{
      text: string;
      start: number;
      end: number;
      heading?: string;
    }> = [];

    // Split on double newlines or markdown headings
    const lines = text.split("\n");
    let currentParagraph = "";
    let paragraphStart = 0;
    let currentHeading: string | undefined;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check for markdown heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Save previous paragraph if exists
        if (currentParagraph.trim()) {
          paragraphs.push({
            text: currentParagraph.trim(),
            start: paragraphStart,
            end: paragraphStart + currentParagraph.length,
            heading: currentHeading,
          });
        }

        currentHeading = headingMatch[2];
        currentParagraph = "";
        paragraphStart += line.length + 1;
      } else if (trimmed === "") {
        // Empty line - end of paragraph
        if (currentParagraph.trim()) {
          paragraphs.push({
            text: currentParagraph.trim(),
            start: paragraphStart,
            end: paragraphStart + currentParagraph.length,
            heading: currentHeading,
          });

          paragraphStart += currentParagraph.length + 1;
          currentParagraph = "";
        } else {
          paragraphStart += 1;
        }
      } else {
        currentParagraph += (currentParagraph ? "\n" : "") + line;
      }
    });

    // Add last paragraph
    if (currentParagraph.trim()) {
      paragraphs.push({
        text: currentParagraph.trim(),
        start: paragraphStart,
        end: paragraphStart + currentParagraph.length,
        heading: currentHeading,
      });
    }

    return paragraphs;
  }

  /**
   * Chunk a paragraph into sentences
   */
  private chunkParagraph(
    paragraph: string,
    sourceId: string,
    startOffset: number,
    heading?: string
  ): Chunk[] {
    const sentences = this.splitIntoSentences(paragraph);
    const chunks: Chunk[] = [];

    let currentChunk = "";
    let currentStart = startOffset;
    let sentenceCount = 0;

    sentences.forEach((sentence, index) => {
      const sentenceTokens = this.estimateTokens(sentence);
      const currentTokens = this.estimateTokens(currentChunk);

      if (currentTokens + sentenceTokens <= this.options.maxChunkSize) {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? " " : "") + sentence;
        sentenceCount++;
      } else {
        // Save current chunk and start new one
        if (currentChunk) {
          chunks.push(
            this.createChunk(
              currentChunk,
              0, // Index will be set later
              sourceId,
              currentStart,
              currentStart + currentChunk.length,
              "sentence",
              heading,
              sentenceCount
            )
          );
        }

        currentChunk = sentence;
        currentStart = startOffset + paragraph.indexOf(sentence);
        sentenceCount = 1;
      }
    });

    // Add final chunk
    if (currentChunk) {
      chunks.push(
        this.createChunk(
          currentChunk,
          0,
          sourceId,
          currentStart,
          currentStart + currentChunk.length,
          "sentence",
          heading,
          sentenceCount
        )
      );
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (improved regex for better accuracy)
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Create a chunk object
   */
  private createChunk(
    text: string,
    index: number,
    sourceId: string,
    startChar: number,
    endChar: number,
    type: ChunkMetadata["type"],
    heading?: string,
    sentences?: number
  ): Chunk {
    const id = `${sourceId}-chunk-${index}`;
    const tokens = this.estimateTokens(text);
    const sentenceCount = sentences ?? this.splitIntoSentences(text).length;

    return {
      id,
      text,
      index,
      metadata: {
        sourceId,
        startChar,
        endChar,
        sentences: sentenceCount,
        tokens,
        type,
        heading,
      },
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Add overlap between consecutive chunks
   */
  private addOverlap(chunks: Chunk[]): void {
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const currentChunk = chunks[i];

      // Get last N tokens from previous chunk
      const prevWords = prevChunk.text.split(/\s+/);
      const overlapWords = prevWords.slice(-this.options.overlapSize);

      // Prepend to current chunk
      currentChunk.text = overlapWords.join(" ") + " " + currentChunk.text;
      currentChunk.metadata.tokens = this.estimateTokens(currentChunk.text);
    }
  }

  /**
   * Add context metadata to chunks
   */
  private addContext(chunks: Chunk[]): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Add information about neighboring chunks
      const contextParts: string[] = [];

      if (i > 0) {
        contextParts.push(`Previous: ${chunks[i - 1].text.substring(0, 50)}...`);
      }

      if (i < chunks.length - 1) {
        contextParts.push(`Next: ${chunks[i + 1].text.substring(0, 50)}...`);
      }

      if (contextParts.length > 0) {
        chunk.metadata.context = contextParts.join(" | ");
      }
    }
  }

  /**
   * Merge small chunks with neighbors
   */
  mergeSmallChunks(chunks: Chunk[]): Chunk[] {
    const merged: Chunk[] = [];
    let i = 0;

    while (i < chunks.length) {
      const chunk = chunks[i];

      if (chunk.metadata.tokens < this.options.minChunkSize && i < chunks.length - 1) {
        // Merge with next chunk
        const nextChunk = chunks[i + 1];

        const mergedText = chunk.text + " " + nextChunk.text;
        const mergedChunk = this.createChunk(
          mergedText,
          merged.length,
          chunk.metadata.sourceId,
          chunk.metadata.startChar,
          nextChunk.metadata.endChar,
          "custom",
          chunk.metadata.heading,
          chunk.metadata.sentences + nextChunk.metadata.sentences
        );

        merged.push(mergedChunk);
        i += 2; // Skip next chunk since it's merged
      } else {
        chunk.index = merged.length;
        merged.push(chunk);
        i++;
      }
    }

    return merged;
  }
}

/**
 * Standalone chunking function
 */
export function chunkText(
  text: string,
  sourceId?: string,
  options?: ChunkingOptions
): Chunk[] {
  const chunker = new SemanticChunker(options);
  return chunker.chunk(text, sourceId);
}

/**
 * Chunk multiple documents
 */
export function chunkDocuments(
  documents: Array<{ id: string; text: string }>,
  options?: ChunkingOptions
): Map<string, Chunk[]> {
  const chunker = new SemanticChunker(options);
  const results = new Map<string, Chunk[]>();

  documents.forEach((doc) => {
    const chunks = chunker.chunk(doc.text, doc.id);
    results.set(doc.id, chunks);
  });

  return results;
}
