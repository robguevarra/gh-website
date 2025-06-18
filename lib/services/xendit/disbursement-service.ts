/**
 * Xendit Payouts Service (v2 API)
 * 
 * This service handles all interactions with Xendit's modern Payouts API v2 for affiliate payouts.
 * Updated to support Philippines market with proper channel codes and PHP currency.
 */

// Types for Xendit Payouts API v2
export interface XenditPayoutRequest {
  reference_id: string;
  channel_code: string;
  channel_properties: {
    account_number: string;
    account_holder_name: string;
  };
  amount: number;
  currency: string;
  description?: string;
  receipt_notification?: {
    email_to?: string[];
    email_cc?: string[];
    email_bcc?: string[];
  };
  metadata?: Record<string, any>;
}

export interface XenditPayoutResponse {
  id: string;
  amount: number;
  channel_code: string;
  currency: string;
  description: string;
  reference_id: string;
  status: 'ACCEPTED' | 'PENDING' | 'LOCKED' | 'CANCELLED' | 'SUCCEEDED' | 'FAILED';
  created: string;
  updated: string;
  estimated_arrival_time?: string;
  business_id: string;
  channel_properties: {
    account_number: string;
    account_holder_name: string;
  };
  receipt_notification?: {
    email_to?: string[];
    email_cc?: string[];
    email_bcc?: string[];
  };
  metadata?: Record<string, any>;
  failure_code?: string;
}

export interface XenditPayoutChannel {
  channel_category: string;
  channel_code: string;
  channel_name: string;
  currency: string;
  country: string;
  minimum_amount?: number;
  maximum_amount?: number;
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

// Philippines Bank Channel Codes (as per Xendit documentation)
export const PHILIPPINES_BANK_CHANNELS = {
  // Major Banks
  'PH_BDO': 'Banco de Oro (BDO)',
  'PH_BPI': 'Bank of the Philippine Islands (BPI)',
  'PH_METROBANK': 'Metropolitan Bank & Trust Company',
  'PH_LANDBANK': 'Land Bank of the Philippines',
  'PH_PNB': 'Philippine National Bank',
  'PH_UNIONBANK': 'Union Bank of the Philippines',
  'PH_SECURITYBANK': 'Security Bank Corporation',
  'PH_RCBC': 'Rizal Commercial Banking Corporation',
  'PH_CHINABANK': 'China Banking Corporation',
  'PH_EASTWESTBANK': 'EastWest Bank',
  
  // Digital Banks & E-Wallets
  'PH_GCASH': 'GCash',
  'PH_PAYMAYA': 'PayMaya',
  'PH_GRABPAY': 'GrabPay',
  
  // Other Banks
  'PH_PSB': 'Philippine Savings Bank',
  'PH_ROBINSONSBANK': 'Robinsons Bank Corporation',
  'PH_MAYBANK': 'Maybank Philippines',
  'PH_CIMB': 'CIMB Bank Philippines',
} as const;

class XenditPayoutService {
  private config: XenditConfig;

  constructor() {
    // Initialize configuration from environment variables
    this.config = {
      apiKey: process.env.XENDIT_SECRET_KEY || '',
      baseUrl: process.env.XENDIT_BASE_URL || 'https://api.xendit.co',
      webhookToken: process.env.XENDIT_WEBHOOK_TOKEN || '',
    };

    if (!this.config.apiKey) {
      throw new Error('XENDIT_SECRET_KEY environment variable is required');
    }
  }

  /**
   * Get authentication headers for Xendit API requests
   */
  private getAuthHeaders(idempotencyKey?: string): HeadersInit {
    const credentials = Buffer.from(`${this.config.apiKey}:`).toString('base64');
    
    const headers: HeadersInit = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GH-Website-Affiliate-System/2.0',
    };

    // Add idempotency key for POST requests to prevent duplicates
    if (idempotencyKey) {
      headers['Idempotency-key'] = idempotencyKey;
    }

    return headers;
  }

  /**
   * Make authenticated request to Xendit API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<{ data: T | null; error: XenditError | null }> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(idempotencyKey),
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
   * Create a single payout using v2 API
   */
  async createPayout(
    request: XenditPayoutRequest
  ): Promise<{ data: XenditPayoutResponse | null; error: XenditError | null }> {
    // Generate idempotency key to prevent duplicate payouts
    const idempotencyKey = `payout_${request.reference_id}_${Date.now()}`;
    
    return this.makeRequest<XenditPayoutResponse>('/v2/payouts', {
      method: 'POST',
      body: JSON.stringify(request),
    }, idempotencyKey);
  }

  /**
   * Create multiple payouts in a batch
   * Note: Xendit v2 doesn't have native batch API, so this creates individual payouts
   */
  async createBatchPayouts(
    payouts: XenditPayoutRequest[]
  ): Promise<{
    successes: XenditPayoutResponse[];
    failures: Array<{ request: XenditPayoutRequest; error: XenditError }>;
  }> {
    const successes: XenditPayoutResponse[] = [];
    const failures: Array<{ request: XenditPayoutRequest; error: XenditError }> = [];

    // Process payouts sequentially to avoid rate limiting
    for (const payout of payouts) {
      const result = await this.createPayout(payout);
      
      if (result.data) {
        successes.push(result.data);
      } else if (result.error) {
        failures.push({
          request: payout,
          error: result.error,
        });
      }

      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { successes, failures };
  }

  /**
   * Get payout details by ID
   */
  async getPayout(
    payoutId: string
  ): Promise<{ data: XenditPayoutResponse | null; error: XenditError | null }> {
    return this.makeRequest<XenditPayoutResponse>(`/v2/payouts/${payoutId}`);
  }

  /**
   * Get available payout channels for Philippines
   */
  async getPayoutChannels(): Promise<{
    data: XenditPayoutChannel[] | null;
    error: XenditError | null;
  }> {
    return this.makeRequest<XenditPayoutChannel[]>('/payouts_channels');
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
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookToken)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Calculate payout fee for Philippines (approximate)
   * Note: Actual fees may vary based on Xendit's current pricing
   */
  calculatePayoutFee(amount: number, channelCode: string): number {
    // Philippines payout fees (as of 2024)
    const fees: Record<string, { base: number; percentage: number; min?: number; max?: number }> = {
      // Bank transfers
      'PH_BDO': { base: 15, percentage: 0 }, // PHP 15 flat fee
      'PH_BPI': { base: 15, percentage: 0 },
      'PH_METROBANK': { base: 15, percentage: 0 },
      'PH_LANDBANK': { base: 15, percentage: 0 },
      'PH_PNB': { base: 15, percentage: 0 },
      'PH_UNIONBANK': { base: 15, percentage: 0 },
      'PH_SECURITYBANK': { base: 15, percentage: 0 },
      'PH_RCBC': { base: 15, percentage: 0 },
      'PH_CHINABANK': { base: 15, percentage: 0 },
      'PH_EASTWESTBANK': { base: 15, percentage: 0 },
      
      // E-wallets (typically higher fees)
      'PH_GCASH': { base: 0, percentage: 0.025, min: 5, max: 50 }, // 2.5% with min/max
      'PH_PAYMAYA': { base: 0, percentage: 0.025, min: 5, max: 50 },
      'PH_GRABPAY': { base: 0, percentage: 0.025, min: 5, max: 50 },
    };

    const feeStructure = fees[channelCode] || { base: 15, percentage: 0 }; // Default to bank fee
    
    let fee = feeStructure.base + (amount * feeStructure.percentage);
    
    if (feeStructure.min && fee < feeStructure.min) {
      fee = feeStructure.min;
    }
    
    if (feeStructure.max && fee > feeStructure.max) {
      fee = feeStructure.max;
    }
    
    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format payout data for Xendit v2 payout request
   */
  formatPayoutForXendit(payout: {
    id: string;
    affiliate_id: string;
    amount: number;
    channel_code: string;
    account_number: string;
    account_holder_name: string;
    reference?: string;
    description?: string;
    affiliate_email?: string;
  }): XenditPayoutRequest {
    return {
      reference_id: payout.reference || `payout_${payout.id}`,
      channel_code: payout.channel_code,
      channel_properties: {
        account_number: payout.account_number,
        account_holder_name: payout.account_holder_name,
      },
      amount: Math.round(payout.amount * 100) / 100, // Ensure 2 decimal places
      currency: 'PHP',
      description: payout.description || `Affiliate commission payout for ${payout.affiliate_id}`,
      // ❌ DISABLED: Xendit automatic emails replaced with custom branded email system
      // receipt_notification: payout.affiliate_email ? {
      //   email_to: [payout.affiliate_email],
      // } : undefined,
      metadata: {
        affiliate_id: payout.affiliate_id,
        payout_id: payout.id,
        system: 'gh-website-affiliate',
      },
    };
  }

  /**
   * Map Xendit v2 status to our internal status
   */
  mapStatusToInternal(xenditStatus: string): 'processing' | 'paid' | 'failed' {
    switch (xenditStatus.toUpperCase()) {
      case 'ACCEPTED':
      case 'PENDING':
      case 'LOCKED':
        return 'processing';
      case 'SUCCEEDED':
        return 'paid'; // Fix: Use 'paid' instead of 'completed' for payout status
      case 'CANCELLED':
      case 'FAILED':
        return 'failed';
      default:
        return 'processing';
    }
  }

  /**
   * Check if status is final (no more updates expected)
   */
  isFinalStatus(status: string): boolean {
    return ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(status.toUpperCase());
  }

  /**
   * Generate unique reference ID for payout
   */
  generateReferenceId(prefix: string = 'payout'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate channel code for Philippines
   */
  isValidPhilippinesChannel(channelCode: string): boolean {
    return Object.keys(PHILIPPINES_BANK_CHANNELS).includes(channelCode);
  }

  /**
   * Get channel name from code
   */
  getChannelName(channelCode: string): string {
    return PHILIPPINES_BANK_CHANNELS[channelCode as keyof typeof PHILIPPINES_BANK_CHANNELS] || channelCode;
  }
}

// Export singleton instance
export const xenditPayoutService = new XenditPayoutService();

// Export utility functions
export const XenditUtils = {
  /**
   * Map Xendit status to our internal status
   */
  mapStatusToInternal(xenditStatus: string): 'processing' | 'paid' | 'failed' {
    return xenditPayoutService.mapStatusToInternal(xenditStatus);
  },

  /**
   * Check if status is final (no more updates expected)
   */
  isFinalStatus(status: string): boolean {
    return xenditPayoutService.isFinalStatus(status);
  },

  /**
   * Generate unique reference ID for payout
   */
  generateReferenceId(prefix: string = 'payout'): string {
    return xenditPayoutService.generateReferenceId(prefix);
  },

  /**
   * Validate Philippines channel code
   */
  isValidPhilippinesChannel(channelCode: string): boolean {
    return xenditPayoutService.isValidPhilippinesChannel(channelCode);
  },

  /**
   * Get channel display name
   */
  getChannelName(channelCode: string): string {
    return xenditPayoutService.getChannelName(channelCode);
  },
};

// Backward compatibility - keep old service name but point to new implementation
export const xenditDisbursementService = xenditPayoutService; 