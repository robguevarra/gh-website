/**
 * TypeScript type definitions for the Affiliate Dashboard store
 */

/**
 * Membership Level type definition
 * Represents an affiliate's membership tier and associated commission rate
 */
export interface MembershipLevel {
  id: string;
  name: string;
  commissionRate: number;
}

/**
 * Affiliate Profile type definition
 * Represents an affiliate user's profile information
 */
export interface AffiliateProfile {
  id: string;
  userId: string;
  slug: string;
  commissionRate: number; // Legacy field, kept for backward compatibility
  membershipLevel?: MembershipLevel; // New field for membership-based commission rates
  isMember: boolean;
  status: 'pending' | 'active' | 'inactive' | 'flagged';
  createdAt: string;
  updatedAt: string;
  display_name?: string;
  bio?: string;
  website?: string;
  payout_method?: string;
  payout_details?: string;
  email_notifications?: boolean;
  marketing_materials?: boolean;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

/**
 * Affiliate Metrics type definition
 * Represents performance metrics for an affiliate
 */
export interface AffiliateMetrics {
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  conversionRate: number;
  averageOrderValue: number;
  earningsPerClick: number;
  timeRanges: {
    daily: Array<{
      date: string;
      clicks: number;
      conversions: number;
      earnings: number;
    }>;
    weekly: Array<{
      weekStarting: string;
      clicks: number;
      conversions: number;
      earnings: number;
    }>;
    monthly: Array<{
      month: string;
      clicks: number;
      conversions: number;
      earnings: number;
    }>;
  };
  topPerformingLinks: Array<{
    id: string;
    name: string;
    clicks: number;
    conversions: number;
    earnings: number;
    conversionRate: number;
  }>;
  recentActivity: Array<{
    date: string;
    eventType: 'click' | 'conversion';
    linkId: string;
    linkName: string;
    amount?: number;
  }>;
  lastUpdated: string;
}

/**
 * Referral Link type definition
 * Represents an affiliate's single product referral link
 */
export interface ReferralLink {
  id: string;
  slug: string;
  productName: string; // Name of the product (e.g., 'Papers to Profits')
  fullUrl: string;    // Complete affiliate link with slug parameter
  createdAt: string;  // When the affiliate account was created
  clicks: number;     // Number of clicks on this link
  conversions: number; // Number of conversions from this link
  earnings: number;   // Total earnings from this link
  conversionRate: number; // Conversion rate as a percentage
}

/**
 * Payout Transaction type definition
 * Represents a payout transaction to an affiliate
 */
export interface PayoutTransaction {
  id: string;
  amount: number;
  status: string;
  datePending: string;
  dateCleared?: string;
  datePaid?: string;
  conversionIds: string[];
  referenceId?: string;
  notes?: string;
  type?: string;
  reference?: string;
  created_at?: string;
}

/**
 * Payout Projection type definition
 * Represents projected future payouts for an affiliate
 */
export interface PayoutProjection {
  estimatedNextAmount: number;
  estimatedPayoutDate: string;
  pendingConversions: number;
  minimumPayoutThreshold: number;
  progressToThreshold: number;
  thisMonth?: number;
  nextMonth?: number;
  nextPayout?: number;
  nextPayoutDate?: string;
}

/**
 * Filter State type definition
 * Represents the current filtering options for metrics
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

/**
 * Date Range Filter type definition
 * Possible values for date range filtering
 */
export type DateRangeFilter = 'thisMonth' | 'last3Months' | 'all';

/**
 * Conversion Record type definition
 * Represents an individual affiliate conversion
 */
export interface ConversionRecord {
  id: string;
  order_id: string;
  commission_amount: number;
  status: 'pending' | 'flagged' | 'cleared' | 'paid';
  created_at: string;
  updated_at: string;
  processed_at?: string;
  product_name?: string;
  order_total?: number;
}

/**
 * Update Profile Data type definition
 * Fields that can be updated in the affiliate profile
 */
export interface UpdateProfileData {
  slug?: string;
  display_name?: string;
  bio?: string;
  website?: string;
  payout_method?: string;
  payout_details?: string;
  email_notifications?: boolean;
  marketing_materials?: boolean;
}
