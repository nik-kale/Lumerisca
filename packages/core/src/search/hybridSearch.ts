/**
 * Hybrid Search Engine
 * Combines semantic search (dense vectors) with BM25 lexical search (sparse vectors)
 * Uses Reciprocal Rank Fusion (RRF) to merge results
 */

import { logger } from "../utils/logger.js";
import { generateEmbedding, cosineSimilarity } from "../rag/embeddings.js";
import { BM25, type BM25Document, type BM25Result } from "./bm25.js";
import type { RagSource } from "../types.js";

const log = logger.scope("HybridSearch");

export interface HybridSearchDocument {
  id: string;
  content: string;
  title: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface HybridSearchResult {
  id: string;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  document: HybridSearchDocument;
  source: "semantic" | "lexical" | "both";
}

export interface HybridSearchOptions {
  semanticWeight?: number;  // Weight for semantic search (0-1, default: 0.5)
  lexicalWeight?: number;   // Weight for lexical search (0-1, default: 0.5)
  rrfK?: number;            // RRF constant (default: 60)
  minSemanticScore?: number; // Minimum semantic similarity score (default: 0.3)
  minLexicalScore?: number;  // Minimum BM25 score (default: 0)
}

/**
 * Hybrid search engine combining semantic and lexical search
 */
export class HybridSearch {
  private documents: Map<string, HybridSearchDocument>;
  private bm25: BM25;
  private apiKey: string;
  private options: Required<HybridSearchOptions>;

  constructor(apiKey: string, options: HybridSearchOptions = {}) {
    this.documents = new Map();
    this.bm25 = new BM25();
    this.apiKey = apiKey;

    this.options = {
      semanticWeight: options.semanticWeight ?? 0.5,
      lexicalWeight: options.lexicalWeight ?? 0.5,
      rrfK: options.rrfK ?? 60,
      minSemanticScore: options.minSemanticScore ?? 0.3,
      minLexicalScore: options.minLexicalScore ?? 0,
    };

    // Normalize weights
    const totalWeight = this.options.semanticWeight + this.options.lexicalWeight;
    if (totalWeight > 0) {
      this.options.semanticWeight /= totalWeight;
      this.options.lexicalWeight /= totalWeight;
    }
  }

  /**
   * Add documents to the hybrid index
   */
  async addDocuments(documents: HybridSearchDocument[]): Promise<void> {
    log.info("Indexing documents", { count: documents.length });

    // Generate embeddings for documents without them
    const docsNeedingEmbeddings = documents.filter((doc) => !doc.embedding);

    if (docsNeedingEmbeddings.length > 0) {
      log.info("Generating embeddings", { count: docsNeedingEmbeddings.length });

      for (const doc of docsNeedingEmbeddings) {
        try {
          doc.embedding = await generateEmbedding(doc.content, this.apiKey);
        } catch (error) {
          log.error("Failed to generate embedding", { docId: doc.id, error });
          // Continue with other documents
        }
      }
    }

    // Store documents
    documents.forEach((doc) => {
      this.documents.set(doc.id, doc);
    });

    // Index in BM25
    const bm25Docs: BM25Document[] = documents.map((doc) => ({
      id: doc.id,
      text: doc.content,
      title: doc.title,
      metadata: doc.metadata,
    }));

    this.bm25.addDocuments(bm25Docs);

    log.info("Hybrid indexing complete", {
      total: this.documents.size,
      withEmbeddings: documents.filter((d) => d.embedding).length,
    });
  }

  /**
   * Search using hybrid approach
   */
  async search(
    query: string,
    limit: number = 10
  ): Promise<HybridSearchResult[]> {
    log.debug("Starting hybrid search", { query, limit });

    // Perform semantic search
    const semanticResults = await this.semanticSearch(query, limit * 2);

    // Perform lexical search
    const lexicalResults = this.bm25.search(query, limit * 2);

    // Merge results using Reciprocal Rank Fusion
    const mergedResults = this.mergeResults(
      semanticResults,
      lexicalResults,
      limit
    );

    log.info("Hybrid search complete", {
      query,
      semanticResults: semanticResults.length,
      lexicalResults: lexicalResults.length,
      mergedResults: mergedResults.length,
    });

    return mergedResults;
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(
    query: string,
    limit: number
  ): Promise<Array<{ id: string; score: number }>> {
    try {
      const queryEmbedding = await generateEmbedding(query, this.apiKey);

      const results: Array<{ id: string; score: number }> = [];

      this.documents.forEach((doc, id) => {
        if (!doc.embedding) return;

        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

        if (similarity >= this.options.minSemanticScore) {
          results.push({ id, score: similarity });
        }
      });

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      return results.slice(0, limit);
    } catch (error) {
      log.error("Semantic search failed", { error });
      return [];
    }
  }

  /**
   * Merge semantic and lexical results using Reciprocal Rank Fusion
   */
  private mergeResults(
    semanticResults: Array<{ id: string; score: number }>,
    lexicalResults: BM25Result[],
    limit: number
  ): HybridSearchResult[] {
    const { semanticWeight, lexicalWeight, rrfK } = this.options;

    // Create maps for quick lookup
    const semanticMap = new Map(
      semanticResults.map((r, index) => [r.id, { score: r.score, rank: index + 1 }])
    );

    const lexicalMap = new Map(
      lexicalResults.map((r, index) => [r.id, { score: r.score, rank: index + 1 }])
    );

    // Get all unique document IDs
    const allIds = new Set([
      ...semanticMap.keys(),
      ...lexicalMap.keys(),
    ]);

    // Calculate RRF scores
    const results: HybridSearchResult[] = [];

    allIds.forEach((id) => {
      const semanticData = semanticMap.get(id);
      const lexicalData = lexicalMap.get(id);

      // Reciprocal Rank Fusion formula
      const semanticRRF = semanticData
        ? semanticWeight / (rrfK + semanticData.rank)
        : 0;

      const lexicalRRF = lexicalData
        ? lexicalWeight / (rrfK + lexicalData.rank)
        : 0;

      const finalScore = semanticRRF + lexicalRRF;

      // Filter by minimum scores
      const meetsSemanticMin =
        !semanticData || semanticData.score >= this.options.minSemanticScore;

      const meetsLexicalMin =
        !lexicalData || lexicalData.score >= this.options.minLexicalScore;

      if (meetsSemanticMin && meetsLexicalMin) {
        const document = this.documents.get(id);

        if (document) {
          results.push({
            id,
            score: finalScore,
            semanticScore: semanticData?.score || 0,
            lexicalScore: lexicalData?.score || 0,
            document,
            source: semanticData && lexicalData
              ? "both"
              : semanticData
              ? "semantic"
              : "lexical",
          });
        }
      }
    });

    // Sort by final score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): HybridSearchDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): HybridSearchDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Remove document from index
   */
  removeDocument(id: string): void {
    this.documents.delete(id);
    this.bm25.removeDocument(id);
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.bm25.clear();

    log.info("Hybrid search index cleared");
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    withEmbeddings: number;
    bm25Stats: ReturnType<BM25["getStats"]>;
  } {
    const withEmbeddings = Array.from(this.documents.values()).filter(
      (d) => d.embedding
    ).length;

    return {
      documentCount: this.documents.size,
      withEmbeddings,
      bm25Stats: this.bm25.getStats(),
    };
  }

  /**
   * Update search options
   */
  updateOptions(options: Partial<HybridSearchOptions>): void {
    Object.assign(this.options, options);

    // Normalize weights if both were provided
    if (options.semanticWeight !== undefined || options.lexicalWeight !== undefined) {
      const totalWeight = this.options.semanticWeight + this.options.lexicalWeight;
      if (totalWeight > 0) {
        this.options.semanticWeight /= totalWeight;
        this.options.lexicalWeight /= totalWeight;
      }
    }

    log.info("Search options updated", this.options);
  }
}

/**
 * Standalone hybrid search function
 */
export async function hybridSearch(
  documents: HybridSearchDocument[],
  query: string,
  apiKey: string,
  limit: number = 10,
  options?: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const search = new HybridSearch(apiKey, options);
  await search.addDocuments(documents);
  return await search.search(query, limit);
}

/**
 * Convert RagSource to HybridSearchDocument
 */
export function ragSourceToHybridDoc(source: RagSource): HybridSearchDocument {
  return {
    id: source.id,
    content: source.content,
    title: source.title,
    metadata: {
      url: source.url,
      tags: source.tags,
    },
  };
}
