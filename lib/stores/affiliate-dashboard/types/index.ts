/**
 * Affiliate Dashboard Types
 * 
 * This file contains type definitions for the affiliate dashboard.
 * We maintain a clear separation between database types (prefixed with 'DB')
 * and UI types to ensure type safety and maintainability.
 */

// ==============================
// Database Types (from Supabase)
// ==============================

/**
 * Database Affiliate Profile
 */
export interface DBAffiliateProfile {
  id: string;
  user_id: string;
  slug: string;
  commission_rate: number;
  is_member: boolean;
  status: 'pending' | 'active' | 'flagged' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Database Affiliate Click
 */
export interface DBAffiliateClick {
  id: string;
  affiliate_id: string;
  visitor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referral_url: string | null;
  landing_page_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database Affiliate Conversion
 */
export interface DBAffiliateConversion {
  id: string;
  affiliate_id: string;
  click_id: string | null;
  order_id: string;
  customer_id: string | null;
  gmv: number;
  commission_amount: number;
  level: number | null;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  created_at: string;
  updated_at: string;
}

/**
 * Database Fraud Flag
 */
export interface DBFraudFlag {
  id: string;
  affiliate_id: string;
  reason: string;
  details: Record<string, any> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolver_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================
// UI Types (used in the dashboard)
// ==============================

/**
 * UI Affiliate Profile
 */
export interface AffiliateProfile {
  id: string;
  userId: string;
  slug: string;
  commissionRate: number;
  isMember: boolean;
  status: 'pending' | 'active' | 'flagged' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * UI Affiliate Performance Metrics
 */
export interface AffiliateMetrics {
  totalClicks: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  averageOrderValue: number;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  clicksByDay: Array<{
    date: string;
    count: number;
  }>;
  conversionsByDay: Array<{
    date: string;
    count: number;
  }>;
  earningsByDay: Array<{
    date: string;
    amount: number;
  }>;
  geoDistribution: Array<{
    country: string;
    count: number;
  }>;
}

/**
 * UI Affiliate Referral Link
 */
export interface ReferralLink {
  id: string;
  name: string;
  baseUrl: string;
  slug: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  fullUrl: string;
  createdAt: string;
  clicks: number;
  conversions: number;
  earnings: number;
  conversionRate: number;
  isCustom: boolean;
}

/**
 * UI QR Code Configuration
 */
export interface QRCodeConfig {
  size: number;
  margin: number;
  color: string;
  backgroundColor: string;
  includeLogo: boolean;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  format: 'png' | 'svg' | 'jpeg';
  imageUrl: string | null;
}

/**
 * UI Payout Transaction
 */
export interface PayoutTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  datePending: string;
  dateCleared: string | null;
  datePaid: string | null;
  conversionIds: string[];
  referenceId: string | null;
  notes: string | null;
}

/**
 * UI Payout Projection
 */
export interface PayoutProjection {
  estimatedNextAmount: number;
  estimatedPayoutDate: string | null;
  pendingConversions: number;
  minimumPayoutThreshold: number;
  progressToThreshold: number;
}

/**
 * Date Range Filter Type - Simplified options
 */
export type DateRangeFilter = 'thisMonth' | 'last3Months' | 'all';

/**
 * UI Filter State
 */
export interface FilterState {
  dateRange: DateRangeFilter;
  customStartDate: string | null;
  customEndDate: string | null;
  referralLinkId: string | null;
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
  };
}
