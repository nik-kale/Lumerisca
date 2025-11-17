/**
 * Task Management System
 * AI-powered task extraction, prioritization, and organization
 */

import { logger } from "../utils/logger.js";

const log = logger.scope("TaskManager");

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tags: string[];
  sourceUrl?: string;
  sourceDocument?: string;
  estimatedTime?: number; // minutes
  actualTime?: number; // minutes
  dependencies: string[]; // Task IDs
  subtasks: string[]; // Task IDs
  metadata: Record<string, any>;
}

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "waiting"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  hasDeadline?: boolean;
  overdueOnly?: boolean;
}

/**
 * Task Manager for organizing and tracking tasks
 */
export class TaskManager {
  private tasks: Map<string, Task>;

  constructor() {
    this.tasks = new Map();
  }

  /**
   * Create a new task
   */
  createTask(
    title: string,
    options: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">> = {}
  ): Task {
    const id = this.generateTaskId();
    const now = new Date();

    const task: Task = {
      id,
      title: title.trim(),
      description: options.description,
      status: options.status || "todo",
      priority: options.priority || "medium",
      dueDate: options.dueDate,
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
      sourceUrl: options.sourceUrl,
      sourceDocument: options.sourceDocument,
      estimatedTime: options.estimatedTime,
      dependencies: options.dependencies || [],
      subtasks: options.subtasks || [],
      metadata: options.metadata || {},
    };

    this.tasks.set(id, task);

    log.debug("Task created", { id, title, priority: task.priority });

    return task;
  }

  /**
   * Update a task
   */
  updateTask(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id);
    if (!task) {
      log.warn("Task not found", { id });
      return null;
    }

    Object.assign(task, updates, { updatedAt: new Date() });

    // Set completedAt when status changes to completed
    if (updates.status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    log.debug("Task updated", { id, updates: Object.keys(updates) });

    return task;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    const deleted = this.tasks.delete(id);

    if (deleted) {
      // Remove from dependencies and subtasks
      this.tasks.forEach((task) => {
        task.dependencies = task.dependencies.filter((depId) => depId !== id);
        task.subtasks = task.subtasks.filter((subId) => subId !== id);
      });

      log.debug("Task deleted", { id });
    }

    return deleted;
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Filter tasks
   */
  filterTasks(filter: TaskFilter): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (filter.status) {
      tasks = tasks.filter((t) => filter.status!.includes(t.status));
    }

    if (filter.priority) {
      tasks = tasks.filter((t) => filter.priority!.includes(t.priority));
    }

    if (filter.tags && filter.tags.length > 0) {
      tasks = tasks.filter((t) =>
        filter.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    if (filter.hasDeadline !== undefined) {
      tasks = tasks.filter((t) =>
        filter.hasDeadline ? t.dueDate !== undefined : t.dueDate === undefined
      );
    }

    if (filter.overdueOnly) {
      const now = new Date();
      tasks = tasks.filter(
        (t) => t.dueDate && t.dueDate < now && t.status !== "completed"
      );
    }

    return tasks;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.filterTasks({ status: [status] });
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(): Task[] {
    return this.filterTasks({ overdueOnly: true });
  }

  /**
   * Calculate task priority score for sorting
   */
  getPriorityScore(task: Task): number {
    const priorityScores = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    let score = priorityScores[task.priority];

    // Boost score if task is overdue
    if (task.dueDate && task.dueDate < new Date()) {
      score += 2;
    }

    // Boost score if deadline is soon (within 2 days)
    if (task.dueDate) {
      const daysUntilDue =
        (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      if (daysUntilDue > 0 && daysUntilDue <= 2) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Get tasks sorted by priority
   */
  getTasksByPriority(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => this.getPriorityScore(b) - this.getPriorityScore(a)
    );
  }

  /**
   * Estimate task time using AI heuristics
   */
  estimateTaskTime(task: Task): number {
    // Simple heuristic based on description length and complexity keywords
    const description = (task.title + " " + (task.description || "")).toLowerCase();

    let baseTime = 30; // 30 minutes default

    // Adjust based on complexity keywords
    if (description.match(/\b(quick|simple|small|minor)\b/)) {
      baseTime = 15;
    }

    if (description.match(/\b(complex|large|major|difficult)\b/)) {
      baseTime = 120;
    }

    if (description.match(/\b(research|analyze|design)\b/)) {
      baseTime += 30;
    }

    if (description.match(/\b(implement|build|create)\b/)) {
      baseTime += 60;
    }

    if (description.match(/\b(test|validate|review)\b/)) {
      baseTime += 20;
    }

    return baseTime;
  }

  /**
   * Export tasks to JSON
   */
  export(): string {
    return JSON.stringify(Array.from(this.tasks.values()), null, 2);
  }

  /**
   * Import tasks from JSON
   */
  import(json: string): void {
    const tasks = JSON.parse(json);

    tasks.forEach((task: any) => {
      // Convert date strings back to Date objects
      task.createdAt = new Date(task.createdAt);
      task.updatedAt = new Date(task.updatedAt);
      if (task.dueDate) task.dueDate = new Date(task.dueDate);
      if (task.completedAt) task.completedAt = new Date(task.completedAt);

      this.tasks.set(task.id, task);
    });

    log.info("Tasks imported", { count: tasks.length });
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
    log.info("All tasks cleared");
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    completed: number;
    avgCompletionTime?: number;
  } {
    const tasks = Array.from(this.tasks.values());

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    tasks.forEach((task) => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    });

    const completed = tasks.filter((t) => t.status === "completed");
    const completedWithTime = completed.filter((t) => t.actualTime);

    const avgCompletionTime =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, t) => sum + (t.actualTime || 0), 0) /
          completedWithTime.length
        : undefined;

    return {
      total: tasks.length,
      byStatus: byStatus as Record<TaskStatus, number>,
      byPriority: byPriority as Record<TaskPriority, number>,
      overdue: this.getOverdueTasks().length,
      completed: completed.length,
      avgCompletionTime,
    };
  }

  /**
   * Generate task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Extract tasks from text using pattern matching
 */
export function extractTasksFromText(text: string): Array<{ title: string; priority?: TaskPriority }> {
  const tasks: Array<{ title: string; priority?: TaskPriority }> = [];

  // Common task patterns
  const patterns = [
    /^[-*]\s+\[[ x]\]\s+(.+)$/gim, // Markdown checkboxes
    /^[-*]\s+TODO:?\s+(.+)$/gim, // TODO items
    /^[-*]\s+(.+)$/gim, // Simple bullet points
    /^\d+\.\s+(.+)$/gim, // Numbered lists
  ];

  patterns.forEach((pattern) => {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const title = match[1].trim();

      // Detect priority from keywords
      let priority: TaskPriority = "medium";

      if (title.match(/\b(urgent|asap|critical|important)\b/i)) {
        priority = "urgent";
      } else if (title.match(/\b(high|priority)\b/i)) {
        priority = "high";
      } else if (title.match(/\b(low|minor|optional)\b/i)) {
        priority = "low";
      }

      tasks.push({ title, priority });
    }
  });

  return tasks;
}
