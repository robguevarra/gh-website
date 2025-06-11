/**
 * Payout Error Handling and Recovery Service
 * 
 * This service provides comprehensive error handling, recovery mechanisms,
 * and admin interfaces for managing payout failures and edge cases.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Error type definitions
export enum PayoutErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_BANK_DETAILS = 'INVALID_BANK_DETAILS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  WEBHOOK_SIGNATURE_ERROR = 'WEBHOOK_SIGNATURE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum PayoutErrorSeverity {
  LOW = 'LOW',           // Minor issues, automatic retry likely to succeed
  MEDIUM = 'MEDIUM',     // Requires investigation but may be recoverable
  HIGH = 'HIGH',         // Requires immediate admin attention
  CRITICAL = 'CRITICAL', // System-wide issue affecting multiple payouts
}

export interface PayoutError {
  id?: string;
  payout_id: string;
  error_type: PayoutErrorType;
  error_code?: string;
  error_message: string;
  severity: PayoutErrorSeverity;
  context: {
    xendit_request?: any;
    xendit_response?: any;
    database_operation?: string;
    admin_user_id?: string;
    retry_count?: number;
    original_error?: any;
  };
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  retry_attempts: number;
  max_retry_attempts: number;
  next_retry_at?: string;
  is_resolved: boolean;
  is_manual_intervention_required: boolean;
}

export interface RecoveryAction {
  action_type: 'RETRY' | 'MANUAL_REVIEW' | 'SKIP' | 'REFUND' | 'ESCALATE';
  description: string;
  estimated_resolution_time?: string;
  requires_admin_approval: boolean;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ErrorAnalysis {
  error_pattern: string;
  frequency: number;
  first_occurrence: string;
  last_occurrence: string;
  affected_payouts: number;
  resolution_rate: number;
  average_resolution_time_minutes: number;
  recommended_actions: RecoveryAction[];
}

class PayoutErrorHandlingService {
  private readonly MAX_RETRY_ATTEMPTS = {
    [PayoutErrorType.NETWORK_ERROR]: 5,
    [PayoutErrorType.API_ERROR]: 3,
    [PayoutErrorType.RATE_LIMIT_EXCEEDED]: 10,
    [PayoutErrorType.TIMEOUT_ERROR]: 3,
    [PayoutErrorType.DATABASE_ERROR]: 3,
    [PayoutErrorType.AUTHENTICATION_ERROR]: 1,
    [PayoutErrorType.VALIDATION_ERROR]: 1,
    [PayoutErrorType.INSUFFICIENT_FUNDS]: 1,
    [PayoutErrorType.INVALID_BANK_DETAILS]: 1,
    [PayoutErrorType.WEBHOOK_SIGNATURE_ERROR]: 1,
    [PayoutErrorType.UNKNOWN_ERROR]: 2,
  };

  private readonly RETRY_DELAYS = {
    [PayoutErrorType.NETWORK_ERROR]: [30, 60, 300, 900, 1800], // 30s, 1m, 5m, 15m, 30m
    [PayoutErrorType.API_ERROR]: [60, 300, 900], // 1m, 5m, 15m
    [PayoutErrorType.RATE_LIMIT_EXCEEDED]: [300, 600, 900, 1200, 1800, 2400, 3000, 3600, 4200, 4800], // Progressive delays
    [PayoutErrorType.TIMEOUT_ERROR]: [60, 300, 900], // 1m, 5m, 15m
    [PayoutErrorType.DATABASE_ERROR]: [30, 60, 300], // 30s, 1m, 5m
    [PayoutErrorType.AUTHENTICATION_ERROR]: [], // No retry
    [PayoutErrorType.VALIDATION_ERROR]: [], // No retry
    [PayoutErrorType.INSUFFICIENT_FUNDS]: [], // No retry
    [PayoutErrorType.INVALID_BANK_DETAILS]: [], // No retry
    [PayoutErrorType.WEBHOOK_SIGNATURE_ERROR]: [], // No retry
    [PayoutErrorType.UNKNOWN_ERROR]: [300, 1800], // 5m, 30m
  };

  /**
   * Classify and record a payout error
   */
  async recordPayoutError({
    payoutId,
    error,
    context = {},
    adminUserId,
  }: {
    payoutId: string;
    error: Error | any;
    context?: any;
    adminUserId?: string;
  }): Promise<{ errorRecord: PayoutError | null; error: string | null }> {
    const supabase = await createServiceRoleClient();

    try {
      const errorClassification = this.classifyError(error);
      const maxRetries = this.MAX_RETRY_ATTEMPTS[errorClassification.type] || 0;
      
      const errorRecord: PayoutError = {
        payout_id: payoutId,
        error_type: errorClassification.type,
        error_code: errorClassification.code,
        error_message: errorClassification.message,
        severity: errorClassification.severity,
        context: {
          ...context,
          admin_user_id: adminUserId,
          retry_count: 0,
          original_error: error,
        },
        created_at: new Date().toISOString(),
        retry_attempts: 0,
        max_retry_attempts: maxRetries,
        next_retry_at: maxRetries > 0 ? this.calculateNextRetryTime(errorClassification.type, 0) : undefined,
        is_resolved: false,
        is_manual_intervention_required: this.requiresManualIntervention(errorClassification.type),
      };

      // Store error record in database
      const { data: savedError, error: dbError } = await supabase
        .from('payout_errors')
        .insert(errorRecord)
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save payout error:', dbError);
        return { errorRecord: null, error: dbError.message };
      }

      // Log admin activity
      if (adminUserId) {
        await logAdminActivity({
          admin_user_id: adminUserId,
          action: 'payout_error_recorded',
          target_type: 'payout',
          target_id: payoutId,
          details: {
            error_type: errorClassification.type,
            error_severity: errorClassification.severity,
            requires_manual_intervention: errorRecord.is_manual_intervention_required,
            max_retry_attempts: maxRetries,
          },
        });
      }

      return { errorRecord: savedError, error: null };
    } catch (err) {
      console.error('Error recording payout error:', err);
      return {
        errorRecord: null,
        error: err instanceof Error ? err.message : 'Failed to record error',
      };
    }
  }

  /**
   * Classify an error into type, severity, and other attributes
   */
  private classifyError(error: any): {
    type: PayoutErrorType;
    severity: PayoutErrorSeverity;
    code?: string;
    message: string;
  } {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.code || error?.error_code;

    // Network and connectivity errors
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT')) {
      return {
        type: PayoutErrorType.NETWORK_ERROR,
        severity: PayoutErrorSeverity.MEDIUM,
        code: errorCode,
        message: errorMessage,
      };
    }

    // Xendit API errors
    if (error?.error_code) {
      switch (error.error_code) {
        case 'INVALID_API_KEY':
        case 'UNAUTHORIZED':
          return {
            type: PayoutErrorType.AUTHENTICATION_ERROR,
            severity: PayoutErrorSeverity.HIGH,
            code: error.error_code,
            message: 'Authentication failed - check API credentials',
          };
        
        case 'INSUFFICIENT_BALANCE':
          return {
            type: PayoutErrorType.INSUFFICIENT_FUNDS,
            severity: PayoutErrorSeverity.HIGH,
            code: error.error_code,
            message: 'Insufficient balance in Xendit account',
          };
        
        case 'INVALID_BANK_CODE':
        case 'INVALID_ACCOUNT_NUMBER':
        case 'ACCOUNT_NUMBER_NOT_FOUND':
          return {
            type: PayoutErrorType.INVALID_BANK_DETAILS,
            severity: PayoutErrorSeverity.MEDIUM,
            code: error.error_code,
            message: 'Invalid bank account details',
          };
        
        case 'RATE_LIMIT_EXCEEDED':
          return {
            type: PayoutErrorType.RATE_LIMIT_EXCEEDED,
            severity: PayoutErrorSeverity.LOW,
            code: error.error_code,
            message: 'API rate limit exceeded',
          };
        
        default:
          return {
            type: PayoutErrorType.API_ERROR,
            severity: PayoutErrorSeverity.MEDIUM,
            code: error.error_code,
            message: errorMessage,
          };
      }
    }

    // Database errors
    if (errorMessage.includes('duplicate key') || errorMessage.includes('constraint')) {
      return {
        type: PayoutErrorType.DATABASE_ERROR,
        severity: PayoutErrorSeverity.MEDIUM,
        code: errorCode,
        message: 'Database constraint violation',
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('invalid')) {
      return {
        type: PayoutErrorType.VALIDATION_ERROR,
        severity: PayoutErrorSeverity.MEDIUM,
        code: errorCode,
        message: errorMessage,
      };
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return {
        type: PayoutErrorType.TIMEOUT_ERROR,
        severity: PayoutErrorSeverity.MEDIUM,
        code: errorCode,
        message: 'Request timeout',
      };
    }

    // Default to unknown error
    return {
      type: PayoutErrorType.UNKNOWN_ERROR,
      severity: PayoutErrorSeverity.MEDIUM,
      code: errorCode,
      message: errorMessage,
    };
  }

  /**
   * Determine if an error type requires manual intervention
   */
  private requiresManualIntervention(errorType: PayoutErrorType): boolean {
    const manualInterventionRequired = [
      PayoutErrorType.AUTHENTICATION_ERROR,
      PayoutErrorType.INSUFFICIENT_FUNDS,
      PayoutErrorType.INVALID_BANK_DETAILS,
      PayoutErrorType.VALIDATION_ERROR,
    ];

    return manualInterventionRequired.includes(errorType);
  }

  /**
   * Calculate next retry time based on error type and retry attempt
   */
  private calculateNextRetryTime(errorType: PayoutErrorType, retryAttempt: number): string {
    const delays = this.RETRY_DELAYS[errorType] || [];
    
    if (retryAttempt >= delays.length) {
      // Use last delay if we've exceeded the defined delays
      const lastDelay = delays[delays.length - 1] || 1800; // Default to 30 minutes
      const nextRetry = new Date(Date.now() + lastDelay * 1000);
      return nextRetry.toISOString();
    }

    const delay = delays[retryAttempt];
    const nextRetry = new Date(Date.now() + delay * 1000);
    return nextRetry.toISOString();
  }

  /**
   * Get payouts ready for retry
   */
  async getPayoutsReadyForRetry(): Promise<{
    payouts: Array<{
      payout_id: string;
      error_type: PayoutErrorType;
      retry_attempts: number;
      max_retry_attempts: number;
      last_error_message: string;
    }>;
    error: string | null;
  }> {
    const supabase = await createServiceRoleClient();

    try {
      const { data: errors, error: dbError } = await supabase
        .from('payout_errors')
        .select('*')
        .eq('is_resolved', false)
        .eq('is_manual_intervention_required', false)
        .lte('next_retry_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (dbError) {
        return { payouts: [], error: dbError.message };
      }

      const payouts = (errors || []).map(error => ({
        payout_id: error.payout_id,
        error_type: error.error_type as PayoutErrorType,
        retry_attempts: error.retry_attempts,
        max_retry_attempts: error.max_retry_attempts,
        last_error_message: error.error_message,
      }));

      return { payouts, error: null };
    } catch (err) {
      console.error('Error fetching payouts ready for retry:', err);
      return {
        payouts: [],
        error: err instanceof Error ? err.message : 'Failed to fetch payouts for retry',
      };
    }
  }

  /**
   * Mark an error as resolved
   */
  async resolvePayoutError({
    errorId,
    adminUserId,
    resolutionNotes,
  }: {
    errorId: string;
    adminUserId: string;
    resolutionNotes?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createServiceRoleClient();

    try {
      const { error: updateError } = await supabase
        .from('payout_errors')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', errorId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Log admin activity
      await logAdminActivity({
        admin_user_id: adminUserId,
        action: 'payout_error_resolved',
        target_type: 'payout_error',
        target_id: errorId,
        details: {
          resolution_notes: resolutionNotes,
        },
      });

      return { success: true, error: null };
    } catch (err) {
      console.error('Error resolving payout error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resolve error',
      };
    }
  }

  /**
   * Get error analysis and patterns
   */
  async getErrorAnalysis({
    dateFrom,
    dateTo,
    errorType,
  }: {
    dateFrom?: string;
    dateTo?: string;
    errorType?: PayoutErrorType;
  } = {}): Promise<{
    analysis: ErrorAnalysis[];
    summary: {
      total_errors: number;
      resolved_errors: number;
      pending_errors: number;
      manual_intervention_required: number;
      resolution_rate: number;
    };
    error: string | null;
  }> {
    const supabase = await createServiceRoleClient();

    try {
      let query = supabase
        .from('payout_errors')
        .select('*');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (errorType) {
        query = query.eq('error_type', errorType);
      }

      const { data: errors, error: dbError } = await query;

      if (dbError) {
        return {
          analysis: [],
          summary: {
            total_errors: 0,
            resolved_errors: 0,
            pending_errors: 0,
            manual_intervention_required: 0,
            resolution_rate: 0,
          },
          error: dbError.message,
        };
      }

      // Group errors by type and analyze patterns
      const errorGroups: Record<string, PayoutError[]> = {};
      (errors || []).forEach(error => {
        const key = error.error_type;
        if (!errorGroups[key]) {
          errorGroups[key] = [];
        }
        errorGroups[key].push(error);
      });

      const analysis: ErrorAnalysis[] = Object.entries(errorGroups).map(([errorType, typeErrors]) => {
        const resolvedErrors = typeErrors.filter(e => e.is_resolved);
        const resolutionTimes = resolvedErrors
          .filter(e => e.resolved_at)
          .map(e => {
            const created = new Date(e.created_at).getTime();
            const resolved = new Date(e.resolved_at!).getTime();
            return (resolved - created) / (1000 * 60); // Minutes
          });

        const averageResolutionTime = resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
          : 0;

        return {
          error_pattern: errorType,
          frequency: typeErrors.length,
          first_occurrence: typeErrors.sort((a, b) => a.created_at.localeCompare(b.created_at))[0].created_at,
          last_occurrence: typeErrors.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at,
          affected_payouts: new Set(typeErrors.map(e => e.payout_id)).size,
          resolution_rate: typeErrors.length > 0 ? (resolvedErrors.length / typeErrors.length) * 100 : 0,
          average_resolution_time_minutes: averageResolutionTime,
          recommended_actions: this.getRecommendedActions(errorType as PayoutErrorType),
        };
      });

      // Calculate summary statistics
      const totalErrors = errors?.length || 0;
      const resolvedErrors = errors?.filter(e => e.is_resolved).length || 0;
      const pendingErrors = totalErrors - resolvedErrors;
      const manualInterventionRequired = errors?.filter(e => e.is_manual_intervention_required && !e.is_resolved).length || 0;
      const resolutionRate = totalErrors > 0 ? (resolvedErrors / totalErrors) * 100 : 0;

      return {
        analysis,
        summary: {
          total_errors: totalErrors,
          resolved_errors: resolvedErrors,
          pending_errors: pendingErrors,
          manual_intervention_required: manualInterventionRequired,
          resolution_rate: resolutionRate,
        },
        error: null,
      };
    } catch (err) {
      console.error('Error generating error analysis:', err);
      return {
        analysis: [],
        summary: {
          total_errors: 0,
          resolved_errors: 0,
          pending_errors: 0,
          manual_intervention_required: 0,
          resolution_rate: 0,
        },
        error: err instanceof Error ? err.message : 'Failed to generate error analysis',
      };
    }
  }

  /**
   * Get recommended recovery actions for error types
   */
  private getRecommendedActions(errorType: PayoutErrorType): RecoveryAction[] {
    switch (errorType) {
      case PayoutErrorType.NETWORK_ERROR:
        return [
          {
            action_type: 'RETRY',
            description: 'Automatic retry with exponential backoff',
            estimated_resolution_time: '5-30 minutes',
            requires_admin_approval: false,
            risk_level: 'LOW',
          },
        ];

      case PayoutErrorType.RATE_LIMIT_EXCEEDED:
        return [
          {
            action_type: 'RETRY',
            description: 'Wait for rate limit reset and retry',
            estimated_resolution_time: '1-60 minutes',
            requires_admin_approval: false,
            risk_level: 'LOW',
          },
        ];

      case PayoutErrorType.AUTHENTICATION_ERROR:
        return [
          {
            action_type: 'MANUAL_REVIEW',
            description: 'Verify and update Xendit API credentials',
            estimated_resolution_time: '15-30 minutes',
            requires_admin_approval: true,
            risk_level: 'HIGH',
          },
        ];

      case PayoutErrorType.INSUFFICIENT_FUNDS:
        return [
          {
            action_type: 'MANUAL_REVIEW',
            description: 'Add funds to Xendit account',
            estimated_resolution_time: '1-24 hours',
            requires_admin_approval: true,
            risk_level: 'HIGH',
          },
        ];

      case PayoutErrorType.INVALID_BANK_DETAILS:
        return [
          {
            action_type: 'MANUAL_REVIEW',
            description: 'Contact affiliate to verify bank account details',
            estimated_resolution_time: '1-7 days',
            requires_admin_approval: true,
            risk_level: 'MEDIUM',
          },
          {
            action_type: 'SKIP',
            description: 'Skip this payout and notify affiliate',
            estimated_resolution_time: 'Immediate',
            requires_admin_approval: true,
            risk_level: 'MEDIUM',
          },
        ];

      default:
        return [
          {
            action_type: 'MANUAL_REVIEW',
            description: 'Investigate error and determine appropriate action',
            estimated_resolution_time: '30-60 minutes',
            requires_admin_approval: true,
            risk_level: 'MEDIUM',
          },
        ];
    }
  }
}

// Export singleton instance
export const payoutErrorHandlingService = new PayoutErrorHandlingService(); 