/**
 * Intelligent Model Router
 * Automatically selects the best AI model based on task type, context length,
 * quality requirements, and cost constraints
 */

import { logger } from "../utils/logger.js";
import type { LLMProvider, ChatMessage } from "../types.js";

const log = logger.scope("ModelRouter");

export interface ModelCapabilities {
  provider: LLMProvider;
  model: string;
  contextWindow: number;
  costPer1kTokens: number;
  strengths: TaskType[];
  supportsVision: boolean;
  supportsStreaming: boolean;
  speed: "fast" | "medium" | "slow";
  quality: "basic" | "good" | "excellent" | "best";
}

export type TaskType =
  | "code"
  | "writing"
  | "analysis"
  | "creative"
  | "technical"
  | "translation"
  | "summarization"
  | "conversation"
  | "vision"
  | "general";

export interface RoutingOptions {
  taskType?: TaskType;
  maxCost?: number; // Max cost per 1k tokens
  minQuality?: "basic" | "good" | "excellent" | "best";
  requireVision?: boolean;
  preferSpeed?: boolean;
  contextLength?: number;
}

export interface RoutingResult {
  provider: LLMProvider;
  model: string;
  reason: string;
  estimatedCost: number;
  capabilities: ModelCapabilities;
}

/**
 * Model registry with capabilities
 */
const MODEL_REGISTRY: ModelCapabilities[] = [
  // OpenAI Models
  {
    provider: "openai",
    model: "gpt-4o",
    contextWindow: 128000,
    costPer1kTokens: 0.005,
    strengths: ["code", "analysis", "technical", "vision", "general"],
    supportsVision: true,
    supportsStreaming: true,
    speed: "fast",
    quality: "excellent",
  },
  {
    provider: "openai",
    model: "gpt-4-turbo",
    contextWindow: 128000,
    costPer1kTokens: 0.01,
    strengths: ["code", "writing", "analysis", "technical", "vision"],
    supportsVision: true,
    supportsStreaming: true,
    speed: "medium",
    quality: "best",
  },
  {
    provider: "openai",
    model: "gpt-3.5-turbo",
    contextWindow: 16385,
    costPer1kTokens: 0.001,
    strengths: ["conversation", "general", "summarization"],
    supportsVision: false,
    supportsStreaming: true,
    speed: "fast",
    quality: "good",
  },

  // Anthropic Models
  {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    contextWindow: 200000,
    costPer1kTokens: 0.003,
    strengths: ["writing", "analysis", "code", "creative", "vision"],
    supportsVision: true,
    supportsStreaming: true,
    speed: "fast",
    quality: "best",
  },
  {
    provider: "anthropic",
    model: "claude-3-opus-20240229",
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    strengths: ["writing", "creative", "analysis", "technical"],
    supportsVision: true,
    supportsStreaming: true,
    speed: "slow",
    quality: "best",
  },
  {
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    contextWindow: 200000,
    costPer1kTokens: 0.00025,
    strengths: ["conversation", "general", "summarization"],
    supportsVision: true,
    supportsStreaming: true,
    speed: "fast",
    quality: "good",
  },
];

/**
 * Intelligent model router
 */
export class ModelRouter {
  private models: ModelCapabilities[];

  constructor(customModels: ModelCapabilities[] = []) {
    this.models = [...MODEL_REGISTRY, ...customModels];
  }

  /**
   * Route to best model based on options
   */
  route(
    messages: ChatMessage[],
    options: RoutingOptions = {}
  ): RoutingResult {
    log.debug("Routing request", {
      taskType: options.taskType,
      messageCount: messages.length,
    });

    // Filter models by requirements
    let candidates = this.filterByRequirements(options);

    if (candidates.length === 0) {
      log.warn("No models match requirements, using fallback");
      candidates = this.models.slice(0, 1); // Fallback to first model
    }

    // Estimate context length needed
    const contextLength = this.estimateContextLength(messages);

    // Filter by context window
    candidates = candidates.filter((m) => m.contextWindow >= contextLength);

    if (candidates.length === 0) {
      throw new Error(
        `Context length ${contextLength} exceeds all model limits`
      );
    }

    // Detect task type if not provided
    const taskType = options.taskType || this.detectTaskType(messages);

    // Score candidates
    const scored = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, {
        ...options,
        taskType,
        contextLength,
      }),
    }));

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0].model;

    log.info("Model selected", {
      provider: best.provider,
      model: best.model,
      score: scored[0].score.toFixed(2),
      taskType,
    });

    return {
      provider: best.provider,
      model: best.model,
      reason: this.generateReason(best, taskType, options),
      estimatedCost: this.estimateCost(best, contextLength),
      capabilities: best,
    };
  }

  /**
   * Filter models by requirements
   */
  private filterByRequirements(options: RoutingOptions): ModelCapabilities[] {
    let filtered = [...this.models];

    if (options.requireVision) {
      filtered = filtered.filter((m) => m.supportsVision);
    }

    if (options.maxCost !== undefined) {
      filtered = filtered.filter((m) => m.costPer1kTokens <= options.maxCost!);
    }

    if (options.minQuality) {
      const qualityOrder = ["basic", "good", "excellent", "best"];
      const minIndex = qualityOrder.indexOf(options.minQuality);

      filtered = filtered.filter(
        (m) => qualityOrder.indexOf(m.quality) >= minIndex
      );
    }

    if (options.contextLength) {
      filtered = filtered.filter((m) => m.contextWindow >= options.contextLength!);
    }

    return filtered;
  }

  /**
   * Score a model for given options
   */
  private scoreModel(
    model: ModelCapabilities,
    options: RoutingOptions & { taskType: TaskType; contextLength: number }
  ): number {
    let score = 0;

    // Task strength (0-10 points)
    if (model.strengths.includes(options.taskType)) {
      score += 10;
    } else if (model.strengths.includes("general")) {
      score += 5;
    }

    // Quality (0-10 points)
    const qualityScores = { basic: 2, good: 5, excellent: 8, best: 10 };
    score += qualityScores[model.quality];

    // Cost efficiency (0-5 points, inverse of cost)
    const costScore = Math.max(0, 5 - model.costPer1kTokens * 100);
    score += costScore;

    // Speed (0-5 points if speed preferred)
    if (options.preferSpeed) {
      const speedScores = { fast: 5, medium: 3, slow: 1 };
      score += speedScores[model.speed];
    }

    // Context window (0-5 points based on headroom)
    const headroom = model.contextWindow - options.contextLength;
    const headroomScore = Math.min(5, headroom / 10000);
    score += headroomScore;

    return score;
  }

  /**
   * Detect task type from messages
   */
  private detectTaskType(messages: ChatMessage[]): TaskType {
    const lastMessage = messages[messages.length - 1]?.content || "";
    const text = lastMessage.toLowerCase();

    // Code indicators
    if (
      text.match(/\b(code|function|class|bug|debug|implement|refactor)\b/) ||
      text.match(/```/)
    ) {
      return "code";
    }

    // Writing indicators
    if (
      text.match(/\b(write|essay|article|blog|story|draft|compose)\b/)
    ) {
      return "writing";
    }

    // Analysis indicators
    if (
      text.match(/\b(analyze|evaluate|compare|assess|review|examine)\b/)
    ) {
      return "analysis";
    }

    // Creative indicators
    if (
      text.match(/\b(creative|imagine|brainstorm|ideas|innovative)\b/)
    ) {
      return "creative";
    }

    // Summarization indicators
    if (
      text.match(/\b(summarize|tldr|summary|brief|overview)\b/)
    ) {
      return "summarization";
    }

    // Translation indicators
    if (
      text.match(/\b(translate|translation|language)\b/)
    ) {
      return "translation";
    }

    return "general";
  }

  /**
   * Estimate context length in tokens
   */
  private estimateContextLength(messages: ChatMessage[]): number {
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0
    );

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }

  /**
   * Estimate cost for context length
   */
  private estimateCost(
    model: ModelCapabilities,
    contextLength: number
  ): number {
    return (contextLength / 1000) * model.costPer1kTokens;
  }

  /**
   * Generate human-readable routing reason
   */
  private generateReason(
    model: ModelCapabilities,
    taskType: TaskType,
    options: RoutingOptions
  ): string {
    const reasons: string[] = [];

    if (model.strengths.includes(taskType)) {
      reasons.push(`optimized for ${taskType} tasks`);
    }

    if (options.preferSpeed && model.speed === "fast") {
      reasons.push("fast response time");
    }

    if (model.quality === "best") {
      reasons.push("best quality");
    } else if (model.quality === "excellent") {
      reasons.push("excellent quality");
    }

    if (model.costPer1kTokens < 0.002) {
      reasons.push("cost-effective");
    }

    if (options.requireVision && model.supportsVision) {
      reasons.push("supports vision");
    }

    return reasons.join(", ");
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelCapabilities[] {
    return [...this.models];
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: LLMProvider): ModelCapabilities[] {
    return this.models.filter((m) => m.provider === provider);
  }

  /**
   * Get models by task type
   */
  getModelsByTaskType(taskType: TaskType): ModelCapabilities[] {
    return this.models.filter((m) => m.strengths.includes(taskType));
  }
}

/**
 * Standalone routing function
 */
export function routeToModel(
  messages: ChatMessage[],
  options: RoutingOptions = {}
): RoutingResult {
  const router = new ModelRouter();
  return router.route(messages, options);
}
