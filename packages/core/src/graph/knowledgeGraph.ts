/**
 * Knowledge Graph
 * Builds and maintains a graph of entities and their relationships
 * extracted from documents and web pages
 */

import { logger } from "../utils/logger.js";

const log = logger.scope("KnowledgeGraph");

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];
  metadata: Record<string, any>;
  mentions: Mention[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Mention {
  documentId: string;
  position: number;
  context: string;
  confidence: number;
}

export interface Relationship {
  id: string;
  type: RelationType;
  source: string; // Entity ID
  target: string; // Entity ID
  properties: Record<string, any>;
  weight: number;
  createdAt: Date;
}

export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "concept"
  | "technology"
  | "product"
  | "event"
  | "document"
  | "unknown";

export type RelationType =
  | "related_to"
  | "part_of"
  | "created_by"
  | "located_in"
  | "works_for"
  | "depends_on"
  | "mentioned_with"
  | "custom";

export interface GraphQuery {
  entityId?: string;
  entityType?: EntityType;
  relationshipType?: RelationType;
  limit?: number;
}

/**
 * Knowledge graph for entity and relationship tracking
 */
export class KnowledgeGraph {
  private entities: Map<string, Entity>;
  private relationships: Map<string, Relationship>;
  private entityIndex: Map<string, Set<string>>; // name -> entity IDs
  private relationshipIndex: Map<string, Set<string>>; // entityId -> relationship IDs

  constructor() {
    this.entities = new Map();
    this.relationships = new Map();
    this.entityIndex = new Map();
    this.relationshipIndex = new Map();
  }

  /**
   * Add an entity to the graph
   */
  addEntity(
    name: string,
    type: EntityType = "unknown",
    metadata: Record<string, any> = {}
  ): Entity {
    const normalizedName = this.normalizeName(name);

    // Check if entity already exists
    const existing = this.findEntityByName(normalizedName);
    if (existing) {
      log.debug("Entity already exists", { name, id: existing.id });
      return existing;
    }

    const id = this.generateEntityId(normalizedName, type);

    const entity: Entity = {
      id,
      type,
      name: normalizedName,
      aliases: [],
      metadata,
      mentions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entities.set(id, entity);

    // Update index
    if (!this.entityIndex.has(normalizedName)) {
      this.entityIndex.set(normalizedName, new Set());
    }
    this.entityIndex.get(normalizedName)!.add(id);

    log.debug("Entity added", { id, name, type });

    return entity;
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(
    sourceId: string,
    targetId: string,
    type: RelationType = "related_to",
    properties: Record<string, any> = {},
    weight: number = 1.0
  ): Relationship | null {
    if (!this.entities.has(sourceId) || !this.entities.has(targetId)) {
      log.warn("Cannot create relationship: entities not found", {
        sourceId,
        targetId,
      });
      return null;
    }

    const id = `${sourceId}-${type}-${targetId}`;

    // Check if relationship exists
    const existing = this.relationships.get(id);
    if (existing) {
      // Update weight (increase connection strength)
      existing.weight += weight;
      log.debug("Relationship weight updated", { id, newWeight: existing.weight });
      return existing;
    }

    const relationship: Relationship = {
      id,
      type,
      source: sourceId,
      target: targetId,
      properties,
      weight,
      createdAt: new Date(),
    };

    this.relationships.set(id, relationship);

    // Update index
    [sourceId, targetId].forEach((entityId) => {
      if (!this.relationshipIndex.has(entityId)) {
        this.relationshipIndex.set(entityId, new Set());
      }
      this.relationshipIndex.get(entityId)!.add(id);
    });

    log.debug("Relationship added", { id, type, source: sourceId, target: targetId });

    return relationship;
  }

  /**
   * Add a mention of an entity in a document
   */
  addMention(
    entityId: string,
    documentId: string,
    position: number,
    context: string,
    confidence: number = 1.0
  ): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    entity.mentions.push({
      documentId,
      position,
      context,
      confidence,
    });

    entity.updatedAt = new Date();

    log.debug("Mention added", { entityId, documentId, position });
  }

  /**
   * Find entity by name
   */
  findEntityByName(name: string): Entity | undefined {
    const normalizedName = this.normalizeName(name);
    const entityIds = this.entityIndex.get(normalizedName);

    if (!entityIds || entityIds.size === 0) {
      return undefined;
    }

    // Return first matching entity
    const id = Array.from(entityIds)[0];
    return this.entities.get(id);
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all relationships for an entity
   */
  getRelationships(entityId: string): Relationship[] {
    const relationshipIds = this.relationshipIndex.get(entityId);

    if (!relationshipIds) {
      return [];
    }

    return Array.from(relationshipIds)
      .map((id) => this.relationships.get(id))
      .filter((r): r is Relationship => r !== undefined);
  }

  /**
   * Get connected entities (neighbors in graph)
   */
  getConnectedEntities(entityId: string): Entity[] {
    const relationships = this.getRelationships(entityId);
    const connectedIds = new Set<string>();

    relationships.forEach((rel) => {
      if (rel.source === entityId) {
        connectedIds.add(rel.target);
      } else {
        connectedIds.add(rel.source);
      }
    });

    return Array.from(connectedIds)
      .map((id) => this.entities.get(id))
      .filter((e): e is Entity => e !== undefined);
  }

  /**
   * Query the graph
   */
  query(query: GraphQuery): Entity[] {
    let results = Array.from(this.entities.values());

    // Filter by entity ID
    if (query.entityId) {
      const entity = this.entities.get(query.entityId);
      return entity ? [entity] : [];
    }

    // Filter by entity type
    if (query.entityType) {
      results = results.filter((e) => e.type === query.entityType);
    }

    // Filter by relationship type
    if (query.relationshipType) {
      const entityIds = new Set<string>();

      this.relationships.forEach((rel) => {
        if (rel.type === query.relationshipType) {
          entityIds.add(rel.source);
          entityIds.add(rel.target);
        }
      });

      results = results.filter((e) => entityIds.has(e.id));
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Find path between two entities
   */
  findPath(sourceId: string, targetId: string, maxDepth: number = 5): Entity[] | null {
    if (!this.entities.has(sourceId) || !this.entities.has(targetId)) {
      return null;
    }

    if (sourceId === targetId) {
      return [this.entities.get(sourceId)!];
    }

    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (path.length > maxDepth) {
        continue;
      }

      if (id === targetId) {
        return path
          .map((entityId) => this.entities.get(entityId))
          .filter((e): e is Entity => e !== undefined);
      }

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);

      const connected = this.getConnectedEntities(id);
      connected.forEach((entity) => {
        if (!visited.has(entity.id)) {
          queue.push({
            id: entity.id,
            path: [...path, entity.id],
          });
        }
      });
    }

    return null;
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    entityCount: number;
    relationshipCount: number;
    entityTypes: Record<EntityType, number>;
    relationshipTypes: Record<RelationType, number>;
    avgDegree: number;
  } {
    const entityTypes: Record<string, number> = {};
    const relationshipTypes: Record<string, number> = {};

    this.entities.forEach((entity) => {
      entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
    });

    this.relationships.forEach((rel) => {
      relationshipTypes[rel.type] = (relationshipTypes[rel.type] || 0) + 1;
    });

    const totalDegree = Array.from(this.relationshipIndex.values()).reduce(
      (sum, rels) => sum + rels.size,
      0
    );

    const avgDegree = this.entities.size > 0 ? totalDegree / this.entities.size : 0;

    return {
      entityCount: this.entities.size,
      relationshipCount: this.relationships.size,
      entityTypes: entityTypes as Record<EntityType, number>,
      relationshipTypes: relationshipTypes as Record<RelationType, number>,
      avgDegree,
    };
  }

  /**
   * Export graph to JSON
   */
  export(): string {
    const data = {
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values()),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import graph from JSON
   */
  import(json: string): void {
    const data = JSON.parse(json);

    data.entities.forEach((entity: Entity) => {
      this.entities.set(entity.id, entity);

      const normalizedName = this.normalizeName(entity.name);
      if (!this.entityIndex.has(normalizedName)) {
        this.entityIndex.set(normalizedName, new Set());
      }
      this.entityIndex.get(normalizedName)!.add(entity.id);
    });

    data.relationships.forEach((rel: Relationship) => {
      this.relationships.set(rel.id, rel);

      [rel.source, rel.target].forEach((entityId) => {
        if (!this.relationshipIndex.has(entityId)) {
          this.relationshipIndex.set(entityId, new Set());
        }
        this.relationshipIndex.get(entityId)!.add(rel.id);
      });
    });

    log.info("Graph imported", this.getStats());
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.entities.clear();
    this.relationships.clear();
    this.entityIndex.clear();
    this.relationshipIndex.clear();

    log.info("Knowledge graph cleared");
  }

  /**
   * Normalize entity name for consistent matching
   */
  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Generate unique entity ID
   */
  private generateEntityId(name: string, type: EntityType): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(name);
    return `${type}-${hash}-${timestamp}`;
  }

  /**
   * Simple hash function for string
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Extract simple entities from text (basic NER)
 */
export function extractEntities(text: string): Array<{ name: string; type: EntityType }> {
  const entities: Array<{ name: string; type: EntityType }> = [];

  // Simple pattern-based extraction (in production, use ML-based NER)

  // Capitalized words (potential proper nouns)
  const properNouns = text.match(/\b[A-Z][a-z]+\b/g) || [];

  properNouns.forEach((noun) => {
    entities.push({
      name: noun,
      type: "unknown",
    });
  });

  // Common technology patterns
  const techPatterns = [
    /\b(React|Vue|Angular|Node\.js|Python|JavaScript|TypeScript|Java|Go|Rust)\b/gi,
    /\b(API|REST|GraphQL|WebSocket|HTTP|HTTPS|JSON|XML)\b/gi,
  ];

  techPatterns.forEach((pattern) => {
    const matches = text.match(pattern) || [];
    matches.forEach((match) => {
      entities.push({
        name: match,
        type: "technology",
      });
    });
  });

  return entities;
}
