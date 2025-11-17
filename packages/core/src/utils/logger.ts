/**
 * Centralized logging utility for Lumerisca
 * Provides structured logging with levels and optional debug mode
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix = "Lumerisca";
  private logHistory: LogEntry[] = [];
  private maxHistory = 100;

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Enable debug mode (shows all logs)
   */
  enableDebug(): void {
    this.setLevel(LogLevel.DEBUG);
  }

  /**
   * Disable all logging
   */
  disableLogging(): void {
    this.setLevel(LogLevel.NONE);
  }

  /**
   * Log a debug message
   */
  debug(component: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  /**
   * Log an info message
   */
  info(component: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, component, message, data);
  }

  /**
   * Log a warning
   */
  warn(component: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, component, message, data);
  }

  /**
   * Log an error
   */
  error(component: string, message: string, error?: any): void {
    this.log(LogLevel.ERROR, component, message, error);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      message,
      data,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.shift();
    }

    // Format and output to console
    const levelName = LogLevel[level];
    const formattedMessage = `[${this.prefix}:${component}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || "");
        break;
      case LogLevel.INFO:
        console.log(formattedMessage, data || "");
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || "");
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || "");
        break;
    }
  }

  /**
   * Get log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Create a scoped logger for a specific component
   */
  scope(component: string): ScopedLogger {
    return new ScopedLogger(this, component);
  }
}

/**
 * Scoped logger for a specific component
 */
class ScopedLogger {
  constructor(private logger: Logger, private component: string) {}

  debug(message: string, data?: any): void {
    this.logger.debug(this.component, message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(this.component, message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(this.component, message, data);
  }

  error(message: string, error?: any): void {
    this.logger.error(this.component, message, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Expose to window for debugging (in browser contexts)
if (typeof window !== "undefined") {
  (window as any).__LUMERISCA_LOGGER__ = logger;
}
