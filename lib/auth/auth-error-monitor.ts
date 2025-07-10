/**
 * Auth Error Monitor
 * 
 * Comprehensive monitoring system for authentication errors
 * Catches all auth errors, categorizes them, and sends notifications to developers
 */

import postmarkClient from '@/lib/services/email/postmark-client';
import { securityLogger } from '@/lib/security/security-logger';

// Types for auth error monitoring
export interface AuthErrorEvent {
  id: string;
  timestamp: string;
  errorType: AuthErrorType;
  severity: AuthErrorSeverity;
  message: string;
  details: AuthErrorDetails;
  context: AuthErrorContext;
  userId?: string;
  sessionId?: string;
}

export type AuthErrorType = 
  | 'login_failure'
  | 'signup_failure'
  | 'password_reset_failure'
  | 'password_update_failure'
  | 'session_expired'
  | 'session_invalid'
  | 'token_invalid'
  | 'permission_denied'
  | 'account_locked'
  | 'rate_limit_exceeded'
  | 'provider_error'
  | 'database_error'
  | 'network_error'
  | 'validation_error'
  | 'unknown_error';

export type AuthErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuthErrorDetails {
  code?: string;
  status?: number;
  originalError?: any;
  stackTrace?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthErrorContext {
  url?: string;
  referer?: string;
  component?: string;
  action?: string;
  attempt?: number;
  previousErrors?: string[];
}

export interface AuthErrorPattern {
  type: AuthErrorType;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  affectedUsers: Set<string>;
}

// Configuration for error monitoring
export interface AuthErrorMonitorConfig {
  emailNotificationThreshold: {
    critical: number; // Send immediately if critical errors >= this number in time window
    high: number;     // Send if high errors >= this number in time window
    medium: number;   // Send if medium errors >= this number in time window
    low: number;      // Send if low errors >= this number in time window
  };
  timeWindow: number; // Time window in minutes for counting errors
  maxEmailsPerHour: number; // Rate limit for email notifications
  developerEmails: string[]; // List of developer emails to notify
  enableRealTimeAlerts: boolean; // Enable immediate alerts for critical errors
}

// Default configuration - LAUNCH MODE: Send ALL errors
const DEFAULT_CONFIG: AuthErrorMonitorConfig = {
  emailNotificationThreshold: {
    critical: 1,  // Send immediately for any critical error
    high: 1,      // LAUNCH MODE: Send every high error immediately
    medium: 1,    // LAUNCH MODE: Send every medium error immediately
    low: 5,       // LAUNCH MODE: Send if 5+ low errors in time window
  },
  timeWindow: 15, // 15-minute window
  maxEmailsPerHour: 50, // LAUNCH MODE: Increased limit to see all errors
  developerEmails: ['robneil@gmail.com'], // Hardcoded dev email for all notifications
  enableRealTimeAlerts: true,
};

export class AuthErrorMonitor {
  private static instance: AuthErrorMonitor;
  private config: AuthErrorMonitorConfig;
  private errorBuffer: AuthErrorEvent[] = [];
  private emailsSentThisHour: number = 0;
  private lastEmailReset: Date = new Date();
  private errorPatterns: Map<string, AuthErrorPattern> = new Map();

  private constructor(config: Partial<AuthErrorMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  public static getInstance(config?: Partial<AuthErrorMonitorConfig>): AuthErrorMonitor {
    if (!AuthErrorMonitor.instance) {
      AuthErrorMonitor.instance = new AuthErrorMonitor(config);
    }
    return AuthErrorMonitor.instance;
  }

  /**
   * Capture and process an authentication error
   */
  public async captureAuthError(
    errorType: AuthErrorType,
    message: string,
    details: Partial<AuthErrorDetails> = {},
    context: Partial<AuthErrorContext> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const severity = this.determineSeverity(errorType, details, context);
      const errorEvent: AuthErrorEvent = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        errorType,
        severity,
        message,
        details: details as AuthErrorDetails,
        context: context as AuthErrorContext,
        userId,
        sessionId,
      };

      // Add to buffer
      this.errorBuffer.push(errorEvent);

      // Update error patterns
      this.updateErrorPatterns(errorEvent);

      // Log to security system
      await this.logToSecuritySystem(errorEvent);

      // Check if we need to send notifications
      await this.checkAndSendNotifications(errorEvent);

      // Log successful capture
      securityLogger.info('Auth error captured', {
        errorId: errorEvent.id,
        errorType,
        severity,
        userId,
      });

    } catch (error) {
      // Don't let error monitoring break the app
      console.error('Error in auth error monitor:', error);
      securityLogger.error('Auth error monitor failure', {
        originalErrorType: errorType,
        monitorError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Determine the severity of an auth error
   */
  private determineSeverity(
    errorType: AuthErrorType,
    details: Partial<AuthErrorDetails>,
    context: Partial<AuthErrorContext>
  ): AuthErrorSeverity {
    // Critical errors - immediate attention required
    if (
      errorType === 'database_error' ||
      errorType === 'provider_error' ||
      (errorType === 'unknown_error' && details.status === 500) ||
      (context.attempt && context.attempt >= 5) // Multiple failed attempts
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      errorType === 'account_locked' ||
      errorType === 'permission_denied' ||
      errorType === 'rate_limit_exceeded' ||
      errorType === 'session_invalid' ||
      details.status === 403 ||
      details.status === 429
    ) {
      return 'high';
    }

    // Medium severity errors (LAUNCH MODE: Include login/signup failures for immediate alerts)
    if (
      errorType === 'login_failure' ||
      errorType === 'signup_failure' ||
      errorType === 'password_update_failure' ||
      errorType === 'password_reset_failure' ||
      errorType === 'token_invalid' ||
      errorType === 'validation_error'
    ) {
      return 'medium';
    }

    // Low severity errors (common user errors)
    return 'low';
  }

  /**
   * Update error patterns for trend analysis
   */
  private updateErrorPatterns(errorEvent: AuthErrorEvent): void {
    const patternKey = `${errorEvent.errorType}_${errorEvent.severity}`;
    const existing = this.errorPatterns.get(patternKey);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = errorEvent.timestamp;
      if (errorEvent.userId) {
        existing.affectedUsers.add(errorEvent.userId);
      }
    } else {
      this.errorPatterns.set(patternKey, {
        type: errorEvent.errorType,
        count: 1,
        firstOccurrence: errorEvent.timestamp,
        lastOccurrence: errorEvent.timestamp,
        affectedUsers: new Set(errorEvent.userId ? [errorEvent.userId] : []),
      });
    }
  }

  /**
   * Log error to security system
   */
  private async logToSecuritySystem(errorEvent: AuthErrorEvent): Promise<void> {
    await securityLogger.error(`auth_error_${errorEvent.errorType}`, {
      errorId: errorEvent.id,
      severity: errorEvent.severity,
      message: errorEvent.message,
      details: errorEvent.details,
      context: errorEvent.context,
      userId: errorEvent.userId,
      sessionId: errorEvent.sessionId,
    });
  }

  /**
   * Check if notifications should be sent and send them
   */
  private async checkAndSendNotifications(errorEvent: AuthErrorEvent): Promise<void> {
    // Reset email counter if an hour has passed
    const now = new Date();
    if (now.getTime() - this.lastEmailReset.getTime() >= 60 * 60 * 1000) {
      this.emailsSentThisHour = 0;
      this.lastEmailReset = now;
    }

    // Check if we've hit the email rate limit
    if (this.emailsSentThisHour >= this.config.maxEmailsPerHour) {
      securityLogger.warn('Auth error email rate limit exceeded', {
        emailsSentThisHour: this.emailsSentThisHour,
        maxEmailsPerHour: this.config.maxEmailsPerHour,
      });
      return;
    }

    const shouldSendImmediate = this.shouldSendImmediateNotification(errorEvent);
    const shouldSendBatch = await this.shouldSendBatchNotification();

    if (shouldSendImmediate || shouldSendBatch) {
      await this.sendErrorNotification(shouldSendImmediate ? [errorEvent] : this.getRecentErrors());
      this.emailsSentThisHour++;
    }
  }

  /**
   * Check if immediate notification should be sent
   * LAUNCH MODE: Send ALL errors immediately except low severity
   */
  private shouldSendImmediateNotification(errorEvent: AuthErrorEvent): boolean {
    return (
      this.config.enableRealTimeAlerts &&
      (errorEvent.severity === 'critical' || 
       errorEvent.severity === 'high' || 
       errorEvent.severity === 'medium')
    );
  }

  /**
   * Check if batch notification should be sent based on error thresholds
   */
  private async shouldSendBatchNotification(): Promise<boolean> {
    const timeWindowMs = this.config.timeWindow * 60 * 1000;
    const cutoff = new Date(Date.now() - timeWindowMs);

    const recentErrors = this.errorBuffer.filter(
      error => new Date(error.timestamp) >= cutoff
    );

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    recentErrors.forEach(error => {
      severityCounts[error.severity]++;
    });

    return (
      severityCounts.critical >= this.config.emailNotificationThreshold.critical ||
      severityCounts.high >= this.config.emailNotificationThreshold.high ||
      severityCounts.medium >= this.config.emailNotificationThreshold.medium ||
      severityCounts.low >= this.config.emailNotificationThreshold.low
    );
  }

  /**
   * Get recent errors for batch notification
   */
  private getRecentErrors(): AuthErrorEvent[] {
    const timeWindowMs = this.config.timeWindow * 60 * 1000;
    const cutoff = new Date(Date.now() - timeWindowMs);

    return this.errorBuffer.filter(
      error => new Date(error.timestamp) >= cutoff
    );
  }

  /**
   * Send error notification email to developers
   */
  private async sendErrorNotification(errors: AuthErrorEvent[]): Promise<void> {
    try {
      const isImmediate = errors.length === 1 && errors[0].severity === 'critical';
      const subject = isImmediate
        ? `🚨 CRITICAL Auth Error - Immediate Attention Required`
        : `⚠️ Auth Error Alert - ${errors.length} errors in ${this.config.timeWindow} minutes`;

      const htmlBody = this.generateErrorEmailHtml(errors, isImmediate);

             // Send to all developer emails
       for (const email of this.config.developerEmails) {
         await postmarkClient.sendEmail({
           to: { email, name: 'Developer' },
           subject,
           htmlBody,
           tag: 'auth-error-alert',
           messageStream: 'outbound',
         });
       }

      securityLogger.info('Auth error notification sent', {
        errorCount: errors.length,
        isImmediate,
        recipientCount: this.config.developerEmails.length,
      });

    } catch (error) {
      securityLogger.error('Failed to send auth error notification', {
        error: error instanceof Error ? error.message : String(error),
        errorCount: errors.length,
      });
    }
  }

  /**
   * Generate HTML email content for error notifications
   */
  private generateErrorEmailHtml(errors: AuthErrorEvent[], isImmediate: boolean): string {
    const timeWindow = this.config.timeWindow;
    const now = new Date().toISOString();

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: ${isImmediate ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            ${isImmediate ? '🚨 CRITICAL Auth Error' : '⚠️ Auth Error Alert'}
          </h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">
            ${isImmediate 
              ? 'A critical authentication error requires immediate attention' 
              : `${errors.length} authentication errors detected in the last ${timeWindow} minutes`
            }
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid ${isImmediate ? '#dc3545' : '#ffc107'};">
          <h2 style="margin-top: 0; color: #333;">Error Summary</h2>
          <p><strong>Time:</strong> ${now}</p>
          <p><strong>Error Count:</strong> ${errors.length}</p>
          <p><strong>Time Window:</strong> ${timeWindow} minutes</p>
        </div>
    `;

    // Add individual error details
    errors.forEach((error, index) => {
      html += `
        <div style="background: white; border: 1px solid #dee2e6; margin: 10px 0; border-radius: 4px;">
          <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6;">
            <h3 style="margin: 0; color: #333;">
              Error ${index + 1}: ${error.errorType.replace(/_/g, ' ').toUpperCase()}
              <span style="background: ${this.getSeverityColor(error.severity)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: normal; margin-left: 10px;">
                ${error.severity.toUpperCase()}
              </span>
            </h3>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
              ${new Date(error.timestamp).toLocaleString()}
            </p>
          </div>
          
          <div style="padding: 15px;">
            <p><strong>Message:</strong> ${error.message}</p>
            ${error.userId ? `<p><strong>User ID:</strong> ${error.userId}</p>` : ''}
            ${error.details.endpoint ? `<p><strong>Endpoint:</strong> ${error.details.endpoint}</p>` : ''}
            ${error.details.status ? `<p><strong>Status:</strong> ${error.details.status}</p>` : ''}
            ${error.details.ipAddress ? `<p><strong>IP Address:</strong> ${error.details.ipAddress}</p>` : ''}
            ${error.context.url ? `<p><strong>URL:</strong> ${error.context.url}</p>` : ''}
            ${error.context.component ? `<p><strong>Component:</strong> ${error.context.component}</p>` : ''}
            
            ${error.details.originalError ? `
              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Error Details</summary>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(error.details.originalError, null, 2)}
                </pre>
              </details>
            ` : ''}
          </div>
        </div>
      `;
    });

    // Add pattern analysis if multiple errors
    if (errors.length > 1) {
      const patterns = this.analyzeErrorPatterns(errors);
      html += `
        <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #1976d2;">Pattern Analysis</h3>
          ${patterns.map(pattern => `
            <p><strong>${pattern.type.replace(/_/g, ' ')}:</strong> ${pattern.count} occurrences</p>
          `).join('')}
        </div>
      `;
    }

    html += `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
          <h3 style="margin-top: 0; color: #333;">Recommended Actions</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${isImmediate ? `
              <li>Check application logs immediately</li>
              <li>Verify database and external service connectivity</li>
              <li>Monitor error rates in the next 15 minutes</li>
            ` : `
              <li>Review error patterns and identify common causes</li>
              <li>Check if errors are user-specific or system-wide</li>
              <li>Consider implementing additional error handling</li>
            `}
            <li>Access detailed logs at: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/security">Admin Security Dashboard</a></li>
          </ul>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get color for severity badge
   */
  private getSeverityColor(severity: AuthErrorSeverity): string {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
    }
  }

  /**
   * Analyze error patterns in a set of errors
   */
  private analyzeErrorPatterns(errors: AuthErrorEvent[]): Array<{type: string, count: number}> {
    const patterns = new Map<string, number>();
    
    errors.forEach(error => {
      const count = patterns.get(error.errorType) || 0;
      patterns.set(error.errorType, count + 1);
    });

    return Array.from(patterns.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `auth_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup interval to prevent memory leaks
   */
  private startCleanupInterval(): void {
    // Clean up old errors every hour
    setInterval(() => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.errorBuffer = this.errorBuffer.filter(
        error => new Date(error.timestamp) >= twentyFourHoursAgo
      );

      // Clean up old patterns
      this.errorPatterns.clear();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  public getErrorStatistics(timeWindow: number = 60): {
    totalErrors: number;
    errorsBySeverity: Record<AuthErrorSeverity, number>;
    errorsByType: Record<string, number>;
    affectedUsers: number;
    topErrors: Array<{type: string, count: number}>;
  } {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    const recentErrors = this.errorBuffer.filter(
      error => new Date(error.timestamp) >= cutoff
    );

    const errorsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<AuthErrorSeverity, number>;

    const errorsByType: Record<string, number> = {};
    const affectedUsers = new Set<string>();

    recentErrors.forEach(error => {
      errorsBySeverity[error.severity]++;
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      if (error.userId) {
        affectedUsers.add(error.userId);
      }
    });

    const topErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: recentErrors.length,
      errorsBySeverity,
      errorsByType,
      affectedUsers: affectedUsers.size,
      topErrors,
    };
  }

  /**
   * Manual test of error monitoring system
   */
  public async testErrorMonitoring(): Promise<void> {
    await this.captureAuthError(
      'unknown_error',
      'Test error for monitoring system',
      {
        code: 'TEST_ERROR',
        status: 500,
        endpoint: '/api/test',
      },
      {
        component: 'AuthErrorMonitor',
        action: 'test',
      },
      'test_user_id',
      'test_session_id'
    );
  }
}

// Create singleton instance
export const authErrorMonitor = AuthErrorMonitor.getInstance();

// Convenience function for capturing errors
export const captureAuthError = authErrorMonitor.captureAuthError.bind(authErrorMonitor); 