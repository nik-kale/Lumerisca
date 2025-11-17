/**
 * BM25 (Best Matching 25) algorithm for lexical search
 * Industry-standard ranking function for information retrieval
 *
 * BM25 is a probabilistic ranking function that scores documents based on
 * term frequency and inverse document frequency, with adjustments for
 * document length normalization.
 */

import { logger } from "../utils/logger.js";

const log = logger.scope("BM25");

export interface BM25Document {
  id: string;
  text: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface BM25Result {
  id: string;
  score: number;
  document: BM25Document;
}

export interface BM25Params {
  k1?: number;  // Term frequency saturation parameter (default: 1.5)
  b?: number;   // Length normalization parameter (default: 0.75)
  boost?: Record<string, number>;  // Field boost factors
}

interface TermStats {
  tf: number;  // Term frequency in document
  df: number;  // Document frequency (how many docs contain term)
  idf: number; // Inverse document frequency
}

/**
 * BM25 search engine
 */
export class BM25 {
  private documents: Map<string, BM25Document>;
  private index: Map<string, Map<string, number>>; // term -> docId -> tf
  private docFreq: Map<string, number>; // term -> df
  private docLength: Map<string, number>; // docId -> length
  private avgDocLength: number;
  private params: Required<BM25Params>;

  constructor(documents: BM25Document[] = [], params: BM25Params = {}) {
    this.documents = new Map();
    this.index = new Map();
    this.docFreq = new Map();
    this.docLength = new Map();
    this.avgDocLength = 0;

    this.params = {
      k1: params.k1 ?? 1.5,
      b: params.b ?? 0.75,
      boost: params.boost ?? {},
    };

    if (documents.length > 0) {
      this.addDocuments(documents);
    }
  }

  /**
   * Add documents to the index
   */
  addDocuments(documents: BM25Document[]): void {
    documents.forEach((doc) => this.addDocument(doc));
    this.computeAverageDocLength();

    log.info("Documents indexed", {
      total: this.documents.size,
      terms: this.index.size,
      avgLength: this.avgDocLength.toFixed(2),
    });
  }

  /**
   * Add single document to index
   */
  addDocument(document: BM25Document): void {
    if (this.documents.has(document.id)) {
      log.warn("Document already exists, skipping", { id: document.id });
      return;
    }

    this.documents.set(document.id, document);

    const tokens = this.tokenize(document.text);
    const termFreq = this.computeTermFrequency(tokens);

    this.docLength.set(document.id, tokens.length);

    // Update index and document frequency
    termFreq.forEach((tf, term) => {
      if (!this.index.has(term)) {
        this.index.set(term, new Map());
      }

      this.index.get(term)!.set(document.id, tf);

      // Update document frequency
      const df = this.docFreq.get(term) || 0;
      this.docFreq.set(term, df + 1);
    });
  }

  /**
   * Remove document from index
   */
  removeDocument(docId: string): void {
    const doc = this.documents.get(docId);
    if (!doc) return;

    const tokens = this.tokenize(doc.text);
    const uniqueTerms = new Set(tokens);

    // Update document frequency
    uniqueTerms.forEach((term) => {
      const df = this.docFreq.get(term) || 0;
      this.docFreq.set(term, Math.max(0, df - 1));

      // Remove from index
      const termDocs = this.index.get(term);
      if (termDocs) {
        termDocs.delete(docId);
        if (termDocs.size === 0) {
          this.index.delete(term);
        }
      }
    });

    this.documents.delete(docId);
    this.docLength.delete(docId);

    this.computeAverageDocLength();
  }

  /**
   * Search documents using BM25
   */
  search(query: string, limit: number = 10): BM25Result[] {
    const queryTerms = this.tokenize(query);

    if (queryTerms.length === 0) {
      return [];
    }

    const scores = new Map<string, number>();

    // Calculate BM25 score for each document
    this.documents.forEach((doc, docId) => {
      let score = 0;

      queryTerms.forEach((term) => {
        const termScore = this.calculateTermScore(term, docId);
        score += termScore;
      });

      if (score > 0) {
        scores.set(docId, score);
      }
    });

    // Sort by score and return top results
    const results = Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id, score]) => ({
        id,
        score,
        document: this.documents.get(id)!,
      }));

    log.debug("BM25 search complete", {
      query,
      queryTerms: queryTerms.length,
      results: results.length,
      topScore: results[0]?.score.toFixed(4),
    });

    return results;
  }

  /**
   * Calculate BM25 score for a term in a document
   */
  private calculateTermScore(term: string, docId: string): number {
    const termDocs = this.index.get(term);
    if (!termDocs || !termDocs.has(docId)) {
      return 0;
    }

    const tf = termDocs.get(docId)!;
    const df = this.docFreq.get(term) || 0;
    const idf = this.calculateIDF(df);
    const docLen = this.docLength.get(docId) || 0;

    // BM25 formula
    const numerator = tf * (this.params.k1 + 1);
    const denominator =
      tf + this.params.k1 * (1 - this.params.b + this.params.b * (docLen / this.avgDocLength));

    return idf * (numerator / denominator);
  }

  /**
   * Calculate Inverse Document Frequency
   */
  private calculateIDF(df: number): number {
    const N = this.documents.size;

    // Smoothed IDF to avoid division by zero
    return Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  /**
   * Compute term frequency for tokens
   */
  private computeTermFrequency(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();

    tokens.forEach((token) => {
      freq.set(token, (freq.get(token) || 0) + 1);
    });

    return freq;
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter((token) => token.length > 2) // Filter short tokens
      .filter((token) => !this.isStopWord(token)); // Filter stop words
  }

  /**
   * Check if token is a stop word
   */
  private isStopWord(token: string): boolean {
    // Common English stop words
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "as",
      "by",
      "with",
      "from",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "can",
      "may",
      "might",
      "must",
      "this",
      "that",
      "these",
      "those",
      "it",
      "its",
      "they",
      "them",
      "their",
      "there",
      "here",
      "where",
      "when",
      "what",
      "which",
      "who",
      "how",
      "not",
      "no",
      "yes",
    ]);

    return stopWords.has(token);
  }

  /**
   * Compute average document length
   */
  private computeAverageDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocLength = 0;
      return;
    }

    const totalLength = Array.from(this.docLength.values()).reduce((sum, len) => sum + len, 0);

    this.avgDocLength = totalLength / this.documents.size;
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): BM25Document | undefined {
    return this.documents.get(id);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): BM25Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    termCount: number;
    avgDocLength: number;
    totalTokens: number;
  } {
    const totalTokens = Array.from(this.docLength.values()).reduce((sum, len) => sum + len, 0);

    return {
      documentCount: this.documents.size,
      termCount: this.index.size,
      avgDocLength: this.avgDocLength,
      totalTokens,
    };
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.index.clear();
    this.docFreq.clear();
    this.docLength.clear();
    this.avgDocLength = 0;

    log.info("BM25 index cleared");
  }

  /**
   * Export index to JSON
   */
  export(): string {
    return JSON.stringify({
      documents: Array.from(this.documents.values()),
      params: this.params,
    });
  }

  /**
   * Import index from JSON
   */
  static import(json: string): BM25 {
    const data = JSON.parse(json);
    return new BM25(data.documents, data.params);
  }
}

/**
 * Standalone BM25 search function
 */
export function bm25Search(
  documents: BM25Document[],
  query: string,
  limit: number = 10,
  params?: BM25Params
): BM25Result[] {
  const bm25 = new BM25(documents, params);
  return bm25.search(query, limit);
}
