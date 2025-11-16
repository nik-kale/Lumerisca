import type { RagSource } from "../types.js";

/**
 * Simple in-memory document store
 * For MVP, this stores documents in memory with optional embeddings
 */
export class DocumentStore {
  private documents: Map<string, RagSource> = new Map();

  /**
   * Add a document to the store
   */
  addDocument(doc: RagSource): void {
    this.documents.set(doc.id, doc);
  }

  /**
   * Add multiple documents at once
   */
  addDocuments(docs: RagSource[]): void {
    for (const doc of docs) {
      this.addDocument(doc);
    }
  }

  /**
   * Get a document by ID
   */
  getDocument(id: string): RagSource | undefined {
    return this.documents.get(id);
  }

  /**
   * Get multiple documents by IDs
   */
  getDocuments(ids: string[]): RagSource[] {
    const results: RagSource[] = [];
    for (const id of ids) {
      const doc = this.documents.get(id);
      if (doc) {
        results.push(doc);
      }
    }
    return results;
  }

  /**
   * Get all documents
   */
  getAllDocuments(): RagSource[] {
    return Array.from(this.documents.values());
  }

  /**
   * Check if a document exists
   */
  hasDocument(id: string): boolean {
    return this.documents.has(id);
  }

  /**
   * Remove a document
   */
  removeDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Get count of documents
   */
  size(): number {
    return this.documents.size;
  }
}

/**
 * Default demo documents for testing
 */
export const DEFAULT_DOCUMENTS: RagSource[] = [
  {
    id: "dashboard_intro",
    title: "Dashboard Introduction",
    content: `# Dashboard Overview

The dashboard provides a comprehensive view of your application's key metrics and performance indicators.

Key features:
- Real-time metrics visualization
- Customizable widgets
- Time range filtering
- Export capabilities

Use the dashboard to monitor your application's health and identify trends.`,
  },
  {
    id: "metrics_guide",
    title: "Metrics Guide",
    content: `# Understanding Metrics

This guide explains the various metrics available in your dashboard:

## Response Time
Average time to process requests. Lower is better. Target: <200ms

## Error Rate
Percentage of requests that result in errors. Target: <1%

## Throughput
Number of requests processed per second. Higher indicates more traffic.

## Active Users
Current number of users actively using your application.

You can filter metrics by time range and export data for further analysis.`,
  },
  {
    id: "settings_overview",
    title: "Settings Overview",
    content: `# Settings

Configure your application preferences in the settings panel.

Available sections:
- Account settings
- Notification preferences
- Security & privacy
- API keys
- Team management

Changes are saved automatically.`,
  },
  {
    id: "account_management",
    title: "Account Management",
    content: `# Managing Your Account

Your account settings allow you to:
- Update profile information
- Change password
- Configure two-factor authentication
- Manage email preferences
- Delete your account

Security best practices:
- Use a strong, unique password
- Enable two-factor authentication
- Review connected devices regularly`,
  },
  {
    id: "help_center",
    title: "Help Center",
    content: `# Help Center

Welcome to the help center! Here you can find answers to common questions.

Popular topics:
- Getting started
- Troubleshooting
- API documentation
- Billing & subscriptions
- Feature requests

Can't find what you're looking for? Contact support at support@example.com`,
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    content: `# FAQ

## How do I reset my password?
Go to Settings > Account > Change Password

## How do I invite team members?
Navigate to Settings > Team and click "Invite Member"

## What payment methods are accepted?
We accept credit cards, PayPal, and bank transfers for enterprise plans.

## How do I cancel my subscription?
Go to Settings > Billing > Cancel Subscription

## Where can I find API documentation?
Visit /docs/api or click Help > API Documentation`,
  },
  {
    id: "general_help",
    title: "General Help",
    content: `# General Help

This page provides context-aware assistance based on your current location.

Features:
- Ask questions about the current page
- Get help with common tasks
- Learn about available features
- Troubleshoot issues

Try asking: "What can I do on this page?" or "How do I...?"`,
  },
];
