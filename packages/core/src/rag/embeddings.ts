/**
 * Embedding utilities for RAG
 */

/**
 * Generate embeddings using OpenAI API
 *
 * TODO: Implement actual OpenAI embeddings API call
 * For MVP, this can be stubbed or use a simple fallback
 *
 * @param text - Text to embed
 * @param apiKey - OpenAI API key
 * @returns Embedding vector
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Fallback to simple hash-based embedding for development
    return generateSimpleEmbedding(text);
  }
}

/**
 * Generate multiple embeddings in batch
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  // TODO: Implement batch embedding for efficiency
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text, apiKey);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Compute cosine similarity between two embedding vectors
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score (0-1, higher is more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Simple hash-based embedding for development/fallback
 * Not suitable for production but useful for testing without API keys
 */
function generateSimpleEmbedding(text: string, dimensions = 384): number[] {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode * (j + 1) + i) % dimensions;
      embedding[index] += 1 / (word.length + 1);
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => (norm > 0 ? val / norm : 0));
}
