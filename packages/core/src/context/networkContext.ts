/**
 * Network context collection (future feature)
 *
 * TODO: Implement network request monitoring
 * - Track recent API calls
 * - Capture error responses
 * - Monitor XHR/fetch requests
 * - Detect failed network requests
 */

export interface NetworkEvent {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
  error?: string;
}

export class NetworkContextCollector {
  private events: NetworkEvent[] = [];
  private maxEvents = 50;

  /**
   * Start monitoring network requests
   * TODO: Implement using chrome.webRequest or fetch/XHR interception
   */
  start(): void {
    // Placeholder for future implementation
    console.log("NetworkContextCollector: start() - not yet implemented");
  }

  /**
   * Stop monitoring network requests
   */
  stop(): void {
    // Placeholder for future implementation
    console.log("NetworkContextCollector: stop() - not yet implemented");
  }

  /**
   * Get recent network events
   */
  getEvents(): NetworkEvent[] {
    return [...this.events];
  }

  /**
   * Clear all tracked events
   */
  clear(): void {
    this.events = [];
  }
}
