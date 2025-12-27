import type { PageContext, PageMap, RagSource, RagResult } from "../types.js";
import { resolvePageSources } from "../mapping/pageMapper.js";
import { cosineSimilarity, generateEmbedding } from "./embeddings.js";
import { DocumentStore } from "./documentStore.js";

/**
 * RAG Engine for context-aware document retrieval
 */
export class RagEngine {
  private documentStore: DocumentStore;
  private apiKey: string;

  constructor(documentStore: DocumentStore, apiKey: string) {
    this.documentStore = documentStore;
    this.apiKey = apiKey;
  }

  /**
   * Retrieve relevant documents for a query given the current page context
   *
   * @param ctx - Current page context
   * @param pageMap - Page mapping configuration
   * @param query - User's query
   * @param topK - Number of top results to return (default: 3)
   * @returns Array of relevant documents with similarity scores
   */
  async retrieve(
    ctx: PageContext,
    pageMap: PageMap,
    query: string,
    topK = 3
  ): Promise<RagResult[]> {
    // Step 1: Get relevant document IDs for this page
    const sourceIds = resolvePageSources(ctx, pageMap);

    // Step 2: Get the actual documents
    const candidateDocs = this.documentStore.getDocuments(sourceIds);

    if (candidateDocs.length === 0) {
      console.warn("No documents found for page:", ctx.pathname);
      return [];
    }

    // Step 3: Generate query embedding
    const queryEmbedding = await generateEmbedding(query, this.apiKey);

    // Step 4: Ensure all documents have embeddings
    await this.ensureEmbeddings(candidateDocs);

    // Step 5: Compute similarity scores
    const results: RagResult[] = candidateDocs
      .map((doc) => ({
        source: doc,
        score: doc.embedding
          ? cosineSimilarity(queryEmbedding, doc.embedding)
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  /**
   * Ensure all documents have embeddings, generating them if needed
   */
  private async ensureEmbeddings(docs: RagSource[], concurrency = 5): Promise<void> {
    const docsNeedingEmbeddings = docs.filter((doc) => !doc.embedding);

    // Process in batches to respect rate limits
    for (let i = 0; i < docsNeedingEmbeddings.length; i += concurrency) {
      const batch = docsNeedingEmbeddings.slice(i, i + concurrency);
      
      await Promise.all(
        batch.map(async (doc) => {
          try {
            doc.embedding = await generateEmbedding(doc.content, this.apiKey);
          } catch (error) {
            console.error(`Failed to generate embedding for doc ${doc.id}:`, error);
            // Continue with other docs even if one fails
          }
        })
      );
    }
  }

  /**
   * Build a context string from RAG results for LLM prompt
   */
  buildContextString(results: RagResult[]): string {
    if (results.length === 0) {
      return "No relevant documentation found.";
    }

    const contextParts = results.map((result, index) => {
      return `[Document ${index + 1}: ${result.source.title}]\n${result.source.content}`;
    });

    return contextParts.join("\n\n---\n\n");
  }
}

/**
 * Simple retrieval without embeddings (keyword-based fallback)
 * Useful for development when API keys are not available
 */
export function simpleKeywordRetrieval(
  ctx: PageContext,
  pageMap: PageMap,
  query: string,
  documentStore: DocumentStore,
  topK = 3
): RagResult[] {
  const sourceIds = resolvePageSources(ctx, pageMap);
  const candidateDocs = documentStore.getDocuments(sourceIds);

  const queryTerms = query.toLowerCase().split(/\s+/);

  const results: RagResult[] = candidateDocs
    .map((doc) => {
      const content = doc.content.toLowerCase();
      let score = 0;

      // Simple keyword matching
      for (const term of queryTerms) {
        if (term.length > 2) {
          // Ignore very short terms
          const matches = (content.match(new RegExp(term, "g")) || []).length;
          score += matches;
        }
      }

      // Normalize score
      score = score / (queryTerms.length + 1);

      return { source: doc, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}
