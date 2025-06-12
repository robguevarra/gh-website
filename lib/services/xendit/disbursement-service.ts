/**
 * Xendit Disbursement Service
 * 
 * This service handles all interactions with Xendit's Disbursement API for affiliate payouts.
 * It provides methods for creating disbursements, checking statuses, and handling responses.
 */

// Types for Xendit API integration
export interface XenditDisbursementRequest {
  reference_id: string;
  amount: number;
  currency: string;
  channel_code: string;
  account_name: string;
  account_number: string;
  description?: string;
  email_to?: string[];
  email_cc?: string[];
  email_bcc?: string[];
}

export interface XenditDisbursementResponse {
  id: string;
  user_id: string;
  reference_id: string;
  amount: number;
  currency: string;
  channel_code: string;
  account_name: string;
  disbursement_description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  updated: string;
  created: string;
  email_to?: string[];
  email_cc?: string[];
  email_bcc?: string[];
  failure_code?: string;
}

export interface XenditBatchDisbursementRequest {
  reference: string;
  disbursements: XenditDisbursementRequest[];
}

export interface XenditError {
  error_code: string;
  message: string;
  errors?: Array<{
    field: string;
    location: string;
    value: string;
    issue: string;
  }>;
}

// Configuration interface
interface XenditConfig {
  apiKey: string;
  baseUrl: string;
  webhookToken?: string;
}

class XenditDisbursementService {
  private config: XenditConfig;

  constructor() {
    // Initialize configuration from environment variables
    this.config = {
      apiKey: process.env.XENDIT_SECRET_KEY || '',
      baseUrl: process.env.XENDIT_BASE_URL || 'https://api.xendit.co',
      webhookToken: process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || '',
    };

    if (!this.config.apiKey) {
      throw new Error('XENDIT_SECRET_KEY environment variable is required');
    }
  }

  /**
   * Get authentication headers for Xendit API requests
   */
  private getAuthHeaders(): HeadersInit {
    const credentials = Buffer.from(`${this.config.apiKey}:`).toString('base64');
    
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GH-Website-Affiliate-System/1.0',
    };
  }

  /**
   * Make authenticated request to Xendit API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: XenditError | null }> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Xendit API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        });

        return {
          data: null,
          error: responseData as XenditError,
        };
      }

      return {
        data: responseData as T,
        error: null,
      };
    } catch (error) {
      console.error('Xendit Service Error:', error);
      
      return {
        data: null,
        error: {
          error_code: 'SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown service error',
        },
      };
    }
  }

  /**
   * Create a single disbursement
   */
  async createDisbursement(
    request: XenditDisbursementRequest
  ): Promise<{ data: XenditDisbursementResponse | null; error: XenditError | null }> {
    return this.makeRequest<XenditDisbursementResponse>('/disbursements', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Create multiple disbursements in a batch
   * Note: Xendit doesn't have a native batch disbursement API, so this creates individual disbursements
   */
  async createBatchDisbursements(
    disbursements: XenditDisbursementRequest[]
  ): Promise<{
    successes: XenditDisbursementResponse[];
    failures: Array<{ request: XenditDisbursementRequest; error: XenditError }>;
  }> {
    const successes: XenditDisbursementResponse[] = [];
    const failures: Array<{ request: XenditDisbursementRequest; error: XenditError }> = [];

    // Process disbursements sequentially to avoid rate limiting
    for (const disbursement of disbursements) {
      const result = await this.createDisbursement(disbursement);
      
      if (result.data) {
        successes.push(result.data);
      } else if (result.error) {
        failures.push({
          request: disbursement,
          error: result.error,
        });
      }

      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { successes, failures };
  }

  /**
   * Get disbursement details by ID
   */
  async getDisbursement(
    disbursementId: string
  ): Promise<{ data: XenditDisbursementResponse | null; error: XenditError | null }> {
    return this.makeRequest<XenditDisbursementResponse>(`/disbursements/${disbursementId}`);
  }

  /**
   * Get disbursement details by reference ID
   */
  async getDisbursementByReferenceId(
    referenceId: string
  ): Promise<{ data: XenditDisbursementResponse | null; error: XenditError | null }> {
    return this.makeRequest<XenditDisbursementResponse>(`/disbursements?reference_id=${referenceId}`);
  }

  /**
   * Get available disbursement banks
   */
  async getAvailableBanks(): Promise<{
    data: Array<{
      name: string;
      code: string;
      can_disburse: boolean;
      can_name_validate: boolean;
    }> | null;
    error: XenditError | null;
  }> {
    return this.makeRequest('/available_disbursements_banks');
  }

  /**
   * Validate bank account details
   */
  async validateBankAccount(
    channelCode: string,
    accountNumber: string,
    accountName: string
  ): Promise<{
    data: {
      is_name_match: boolean;
      account_name: string;
    } | null;
    error: XenditError | null;
  }> {
    return this.makeRequest('/account_validation', {
      method: 'POST',
      body: JSON.stringify({
        channel_code: channelCode,
        account_number: accountNumber,
        account_name: accountName,
      }),
    });
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    rawBody: string,
    receivedSignature: string
  ): boolean {
    if (!this.config.webhookToken) {
      console.warn('Webhook verification token not configured');
      return false;
    }

    try {
      const crypto = require('crypto');
      const computedSignature = crypto
        .createHmac('sha256', this.config.webhookToken)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Calculate disbursement fees (approximate)
   * Note: Actual fees may vary based on Xendit's current pricing
   */
  calculateDisbursementFee(amount: number, bankCode: string): number {
    // Standard disbursement fees (as of 2024)
    // These should be updated based on current Xendit pricing
    const baseFee = 4000; // IDR 4,000 base fee
    const percentageFee = amount * 0.001; // 0.1% of amount
    
    return Math.max(baseFee, percentageFee);
  }

  /**
   * Format payout data for Xendit disbursement request
   */
  formatPayoutForDisbursement(payout: {
    id: string;
    affiliate_id: string;
    amount: number;
    channel_code: string; // Updated from bank_code
    account_number: string;
    account_name: string; // Updated from account_holder_name
    currency?: string; // Added optional currency
    reference?: string;
    description?: string;
  }): XenditDisbursementRequest {
    return {
      reference_id: payout.reference || `payout_${payout.id}`,
      amount: payout.amount,
      currency: payout.currency || 'PHP', // Default to PHP for Philippines
      channel_code: payout.channel_code,
      account_name: payout.account_name,
      account_number: payout.account_number,
      description: payout.description || `Affiliate commission payout for ${payout.affiliate_id}`,
    };
  }
}

// Export singleton instance
export const xenditDisbursementService = new XenditDisbursementService();

// Export utility functions
export const XenditUtils = {
  /**
   * Map Xendit status to our internal status
   */
  mapStatusToInternal(xenditStatus: string): 'processing' | 'sent' | 'failed' {
    switch (xenditStatus.toUpperCase()) {
      case 'PENDING':
        return 'processing';
      case 'COMPLETED':
        return 'sent';
      case 'FAILED':
        return 'failed';
      default:
        return 'processing';
    }
  },

  /**
   * Check if status is final (no more updates expected)
   */
  isFinalStatus(status: string): boolean {
    return ['COMPLETED', 'FAILED'].includes(status.toUpperCase());
  },

  /**
   * Generate unique external ID for disbursement
   */
  generateExternalId(prefix: string = 'payout'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  },
}; 