/**
 * Performance monitoring utilities
 * Track metrics like response times, API calls, and usage statistics
 */

import { logger } from "./logger.js";

const log = logger.scope("Performance");

/**
 * Performance metric types
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Performance metrics store
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      log.warn("Timer not found", { name });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric(name, duration, metadata);
    return duration;
  }

  /**
   * Record a metric directly
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    log.debug("Metric recorded", { name, duration, metadata });
  }

  /**
   * Get all metrics
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get percentile for a metric
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = metrics.map((m) => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: metrics.length,
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
    log.info("Metrics cleared");
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator to measure function execution time
 */
export function measured(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTimer(name);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        performanceMonitor.endTimer(name);
      }
    };

    return descriptor;
  };
}

/**
 * Measure async function execution
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTimer(name);
  try {
    const result = await fn();
    performanceMonitor.endTimer(name, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(name, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Measure sync function execution
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  performanceMonitor.startTimer(name);
  try {
    const result = fn();
    performanceMonitor.endTimer(name, metadata);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(name, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Log performance summary
 */
export function logPerformanceSummary(): void {
  const metricNames = new Set(performanceMonitor.getMetrics().map((m) => m.name));

  console.log("=== Performance Summary ===");
  for (const name of metricNames) {
    const stats = performanceMonitor.getStats(name);
    console.log(`${name}:`, stats);
  }
  console.log("========================");
}

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).__LUMERISCA_PERF__ = performanceMonitor;
}
