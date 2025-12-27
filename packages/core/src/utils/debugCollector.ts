import { logger } from './logger.js';
import { performanceMonitor } from './performance.js';

export interface DebugEvent {
  type: string;
  data: any;
  timestamp?: number;
  sanitized?: any;
}

export class DebugCollector {
  private events: DebugEvent[] = [];
  private enabled: boolean = false;
  private maxEvents: number = 1000;

  constructor() {
    this.loadState();
  }

  private loadState() {
    // In a browser environment, we could load from localStorage
    if (typeof localStorage !== 'undefined') {
      this.enabled = localStorage.getItem('lumerisca_debug_enabled') === 'true';
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lumerisca_debug_enabled', String(enabled));
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public capture(event: DebugEvent): void {
    if (!this.enabled) return;

    const capturedEvent: DebugEvent = {
      ...event,
      timestamp: Date.now(),
      sanitized: this.sanitize(event.data)
    };

    this.events.push(capturedEvent);
    
    // Prune if too large
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  public export(): string {
    return JSON.stringify({
      events: this.events,
      environment: this.getEnvironment(),
      performance: performanceMonitor.getMetrics(),
      logs: logger.getHistory ? logger.getHistory() : []
    }, null, 2);
  }

  private sanitize(data: any): any {
    if (!data) return data;
    
    // Deep clone to avoid mutating original
    try {
      const str = JSON.stringify(data);
      // Redact API keys
      const redacted = str.replace(/sk-[a-zA-Z0-9\-_]+/g, '[REDACTED]');
      return JSON.parse(redacted);
    } catch (e) {
      return '[Unable to sanitize data]';
    }
  }

  private getEnvironment(): any {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
  }
}

export const debugCollector = new DebugCollector();

