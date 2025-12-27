import { openDB, IDBPDatabase } from 'idb';
import { logger } from '../utils/logger.js';

const log = logger.scope('EmbeddingCache');

interface CachedEmbedding {
  id: string;
  contentHash: string;
  embedding: number[];
  createdAt: number;
}

export class EmbeddingCache {
  private db: IDBPDatabase | null = null;
  private dbName = 'lumerisca-embeddings';
  private storeName = 'embeddings';

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      log.warn('IndexedDB not available, cache disabled');
      return;
    }

    try {
      this.db = await openDB(this.dbName, 1, {
        upgrade: (db) => {
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        },
      });
      log.info('Embedding cache initialized');
    } catch (error) {
      log.error('Failed to initialize embedding cache', { error });
    }
  }

  async get(docId: string, contentHash: string): Promise<number[] | null> {
    if (!this.db) return null;

    try {
      const cached = await this.db.get(this.storeName, docId) as CachedEmbedding | undefined;
      
      if (cached && cached.contentHash === contentHash) {
        log.debug('Cache hit', { docId });
        return cached.embedding;
      }
    } catch (error) {
      log.error('Error reading from cache', { error });
    }

    return null;
  }

  async set(docId: string, contentHash: string, embedding: number[]): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put(this.storeName, {
        id: docId,
        contentHash,
        embedding,
        createdAt: Date.now()
      });
    } catch (error) {
      log.error('Error writing to cache', { error });
    }
  }
}

// Simple hash function for content
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

