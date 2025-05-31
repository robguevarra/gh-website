/**
 * Security Monitoring Service
 * Provides functionality to monitor security aspects of the application
 * and generate notifications for security issues
 */

import { securityLogger } from '../security-logger';
import { runSecurityAudit, SecurityAuditCheckType, SecurityAuditResult } from '../security-audit';

// Interface for security monitor options
export interface SecurityMonitorOptions {
  // Base URL for the application
  baseUrl?: string;
  // Interval in milliseconds for periodic checks
  checkIntervalMs?: number;
  // Whether to automatically send notifications for security issues
  autoNotify?: boolean;
  // Callback function to handle security issues
  onIssueDetected?: (issue: SecurityIssue) => Promise<void>;
}

// Interface for security issue
export interface SecurityIssue {
  // ID of the issue
  id: string;
  // Type of the issue
  type: 'audit_failure' | 'suspicious_activity' | 'rate_limit_exceeded' | 'auth_failure';
  // Severity of the issue
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Title of the issue
  title: string;
  // Description of the issue
  description: string;
  // Source of the issue
  source: string;
  // Timestamp of the issue
  timestamp: Date;
  // Raw data related to the issue
  data?: any;
  // Recommendations for fixing the issue
  recommendations?: string[];
}

// Default options for the security monitor
const defaultOptions: SecurityMonitorOptions = {
  baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  checkIntervalMs: 3600000, // 1 hour
  autoNotify: true,
};

/**
 * Security Monitor class
 * Provides functionality to monitor security aspects of the application
 */
export class SecurityMonitor {
  private options: SecurityMonitorOptions;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastCheckTime: Date | null = null;
  private detectedIssues: SecurityIssue[] = [];

  /**
   * Constructor
   * @param options Security monitor options
   */
  constructor(options: SecurityMonitorOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Start the security monitor
   */
  public start(): void {
    if (this.isRunning) {
      securityLogger.warn('Security monitor is already running');
      return;
    }

    this.isRunning = true;
    securityLogger.info('Starting security monitor', {
      checkIntervalMs: this.options.checkIntervalMs,
      autoNotify: this.options.autoNotify,
    });

    // Run an initial check
    this.runSecurityCheck();

    // Set up periodic checks
    if (this.options.checkIntervalMs && this.options.checkIntervalMs > 0) {
      this.checkInterval = setInterval(() => {
        this.runSecurityCheck();
      }, this.options.checkIntervalMs);
    }
  }

  /**
   * Stop the security monitor
   */
  public stop(): void {
    if (!this.isRunning) {
      securityLogger.warn('Security monitor is not running');
      return;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    securityLogger.info('Stopped security monitor');
  }

  /**
   * Run a security check
   */
  public async runSecurityCheck(): Promise<SecurityIssue[]> {
    try {
      securityLogger.info('Running security check');
      this.lastCheckTime = new Date();

      // Run a security audit
      const auditResult = await runSecurityAudit({
        baseUrl: this.options.baseUrl,
        checks: [
          SecurityAuditCheckType.HEADERS,
          SecurityAuditCheckType.CSRF,
          SecurityAuditCheckType.RATE_LIMITING,
          SecurityAuditCheckType.JWT,
        ],
      });

      // Process the audit result
      const issues = this.processAuditResult(auditResult);

      // Store the detected issues
      this.detectedIssues = [...this.detectedIssues, ...issues];

      // Notify about the issues if auto-notify is enabled
      if (this.options.autoNotify && issues.length > 0) {
        await this.notifyIssues(issues);
      }

      securityLogger.info('Security check completed', {
        issuesDetected: issues.length,
      });

      return issues;
    } catch (error) {
      securityLogger.error('Error running security check', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Process the audit result and generate security issues
   * @param auditResult Security audit result
   * @returns Array of security issues
   */
  private processAuditResult(auditResult: SecurityAuditResult): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Process failed checks
    const failedChecks = auditResult.checks.filter(check => !check.passed);

    for (const check of failedChecks) {
      const issue: SecurityIssue = {
        id: `audit-${check.checkId}-${Date.now()}`,
        type: 'audit_failure',
        severity: this.mapCheckIdToSeverity(check.checkId),
        title: `Security Audit Failure: ${check.checkId}`,
        description: check.details || 'A security check has failed',
        source: 'security-audit',
        timestamp: new Date(),
        recommendations: check.recommendations,
        data: check,
      };

      issues.push(issue);
    }

    return issues;
  }

  /**
   * Map a check ID to a severity level
   * @param checkId Check ID
   * @returns Severity level
   */
  private mapCheckIdToSeverity(checkId: string): 'low' | 'medium' | 'high' | 'critical' {
    // Map check IDs to severity levels
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'http-security-check': 'high',
      'csrf-check': 'critical',
      'rate-limiting-check': 'medium',
      'jwt-security-check': 'high',
    };

    return severityMap[checkId] || 'medium';
  }

  /**
   * Notify about security issues
   * @param issues Security issues to notify about
   */
  private async notifyIssues(issues: SecurityIssue[]): Promise<void> {
    try {
      // If a custom handler is provided, use it
      if (this.options.onIssueDetected) {
        for (const issue of issues) {
          await this.options.onIssueDetected(issue);
        }
        return;
      }

      // Otherwise, use the default notification mechanism
      for (const issue of issues) {
        // Log the issue
        securityLogger.warn('Security issue detected', {
          issueId: issue.id,
          type: issue.type,
          severity: issue.severity,
          title: issue.title,
        });

        // Send a notification via the API
        if (typeof fetch !== 'undefined') {
          try {
            const response = await fetch('/api/security/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: this.mapSeverityToNotificationType(issue.severity),
                title: issue.title,
                message: issue.description,
                source: issue.source,
                actionRequired: issue.severity === 'high' || issue.severity === 'critical',
                actionLink: '/admin/security/audit',
                actionText: 'View Security Audit',
                metadata: {
                  issueId: issue.id,
                  issueType: issue.type,
                  issueSeverity: issue.severity,
                  recommendations: issue.recommendations,
                },
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to send notification: ${response.statusText}`);
            }
          } catch (error) {
            securityLogger.error('Error sending security notification', {
              error: error instanceof Error ? error.message : String(error),
              issueId: issue.id,
            });
          }
        }
      }
    } catch (error) {
      securityLogger.error('Error notifying about security issues', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Map a severity level to a notification type
   * @param severity Severity level
   * @returns Notification type
   */
  private mapSeverityToNotificationType(severity: string): 'info' | 'warning' | 'error' | 'success' {
    const typeMap: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
      'low': 'info',
      'medium': 'warning',
      'high': 'warning',
      'critical': 'error',
    };

    return typeMap[severity] || 'info';
  }

  /**
   * Get the detected issues
   * @returns Array of detected issues
   */
  public getDetectedIssues(): SecurityIssue[] {
    return [...this.detectedIssues];
  }

  /**
   * Clear the detected issues
   */
  public clearDetectedIssues(): void {
    this.detectedIssues = [];
    securityLogger.info('Cleared detected security issues');
  }

  /**
   * Get the last check time
   * @returns Last check time or null if no check has been run
   */
  public getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Check if the security monitor is running
   * @returns True if the security monitor is running, false otherwise
   */
  public isMonitorRunning(): boolean {
    return this.isRunning;
  }
}

// Export a singleton instance of the security monitor
export const securityMonitor = new SecurityMonitor();
