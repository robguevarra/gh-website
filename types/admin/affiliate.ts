// Based on public.affiliate_status_type enum from Supabase schema
export type AffiliateStatusType = 'pending' | 'active' | 'flagged' | 'inactive';

// Based on public.conversion_status_type enum from Supabase schema
export type ConversionStatusType = 'pending' | 'cleared' | 'paid' | 'flagged';

// Based on public.payout_method_type enum from Supabase schema (adjust if different)
export type PayoutMethodType = 'paypal' | 'bank_transfer' | 'wise' | 'other';

// Based on public.payout_status_type enum from Supabase schema
// Actual values from DB are: 'failed', 'processing', 'sent'
// 'completed' is used in the UI as an alias for 'sent'
export type PayoutStatusType = 'pending' | 'processing' | 'sent' | 'failed' | 'completed';
export type PayoutBatchStatusType = 'pending' | 'verified' | 'processing' | 'completed' | 'failed';

/**
 * Represents a payout record for display in the admin interface list view.
 * Contains basic information about payouts for listing in tables.
 */
export interface AdminAffiliatePayout {
  payout_id: string;                    // From affiliate_payouts.id
  affiliate_id: string;                 // From affiliate_payouts.affiliate_id
  affiliate_name: string;               // Generated from unified_profiles.first_name + last_name
  affiliate_email: string;              // From unified_profiles.email
  amount: number;                       // From affiliate_payouts.amount
  status: PayoutStatusType;             // From affiliate_payouts.status
  payout_method: string;                // From affiliate_payouts.payout_method
  reference?: string | null;            // From affiliate_payouts.reference
  transaction_date?: string | null;     // From affiliate_payouts.transaction_date
  created_at: string;                   // From affiliate_payouts.created_at
  scheduled_at?: string | null;         // From affiliate_payouts.scheduled_at
  processed_at?: string | null;         // From affiliate_payouts.processed_at
  xendit_disbursement_id?: string | null; // From affiliate_payouts.xendit_disbursement_id
  processing_notes?: string | null;     // From affiliate_payouts.processing_notes
  fee_amount?: number | null;           // From affiliate_payouts.fee_amount
  net_amount?: number | null;           // From affiliate_payouts.net_amount
  batch_id?: string | null;             // From affiliate_payouts.batch_id
}

/**
 * Represents the data structure for an item in the admin affiliate list.
 * Combines data from 'affiliates' and 'unified_profiles' tables,
 * plus aggregated metrics.
 */
export interface AdminAffiliateListItem {
  affiliate_id: string;       // From affiliates.id
  user_id: string;            // From affiliates.user_id (links to unified_profiles.id)
  name: string;               // Assumed to be from unified_profiles.full_name or similar
  email: string;              // From unified_profiles.email
  slug: string;               // From affiliates.slug
  status: AffiliateStatusType;  // From affiliates.status
  membership_level_name?: string; // From membership_levels.name via unified_profiles
  tier_commission_rate?: number;  // From membership_levels.commission_rate via unified_profiles
  current_membership_level_id?: string | null; // The ID of the affiliate's current membership level from unified_profiles via unified_profiles
  joined_date: string;        // From affiliates.created_at (ISO string or formatted)
  
  // Aggregated data
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;     // Monetary value
  ctr?: number;              // Click-through rate (calculated metric)
  fraud_flags?: FraudFlagItem[]; // Array of fraud flags associated with the affiliate
}

/**
 * Represents a click record in the affiliate system.
 * Based on the public.affiliate_clicks table.
 * Extended with UI-specific fields for display purposes.
 */
/**
 * Represents a fraud flag record in the affiliate system.
 * Based on the public.fraud_flags table.
 */
export interface FraudFlagItem {
  id: string;
  affiliate_id: string;
  reason: string;
  details?: any; // JSONB can store any valid JSON value, using 'any' for flexibility
  resolved: boolean;
  resolved_at?: string | null;
  resolver_notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a fraud flag item for display in the admin list,
 * including associated affiliate information.
 */
export interface AdminFraudFlagListItem extends FraudFlagItem {
  affiliate_name: string;    // From unified_profiles (via affiliates table)
  affiliate_email: string;   // From unified_profiles (via affiliates table)
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  visitor_id?: string;
  ip_address?: string;
  user_agent?: string;
  referral_url?: string;
  landing_page_url?: string;
  landing_page?: string;  // Shortened version of landing_page_url for UI
  created_at: string;
  updated_at: string;
  date?: string;         // Formatted date for display
  source?: string;       // Derived from referral_url for display
}

/**
 * Represents a conversion record in the affiliate system.
 * Based on the public.affiliate_conversions table.
 * Extended with UI-specific fields for display purposes.
 */
export interface AffiliateConversion {
  id: string;
  affiliate_id: string;
  click_id?: string;
  order_id: string;
  customer_id?: string;
  gmv: number;               // Gross Merchandise Value
  commission_amount: number;
  amount?: number;           // Alias for gmv in UI
  commission?: number;       // Alias for commission_amount in UI
  level?: number;
  status: ConversionStatusType;
  created_at: string;
  updated_at: string;
  date?: string;            // Formatted date for display
  product_name?: string;    // Additional info for display purposes
  customer_name?: string;   // Additional info for display purposes
}

export interface AdminPayoutBatch {
  id: string;
  batch_name?: string;
  status: PayoutBatchStatusType;
  payout_count?: number;
  total_amount?: number;
  created_at?: string;
  processed_at?: string | null;
  completed_at?: string | null;
  created_by?: string;
}

export interface PayoutBatchStats {
  totalBatches: number;
  pendingBatches: number;
  processingBatches: number;
  completedBatches: number;
  totalAmount: number;
}

/**
 * Represents a detailed view of an affiliate payout with additional information
 * for the admin detail page, including items and verification history.
 */
export interface AdminAffiliatePayoutDetail {
  id: string;                          // From affiliate_payouts.id (same as payout_id)
  affiliate_id: string;                 // From affiliate_payouts.affiliate_id
  affiliate_name: string;               // Generated from unified_profiles.first_name + last_name
  affiliate_email: string;              // From unified_profiles.email
  affiliate_slug: string;               // From affiliates.slug
  amount: number;                       // From affiliate_payouts.amount
  status: PayoutStatusType;             // From affiliate_payouts.status
  payout_method: string;                // From affiliate_payouts.payout_method
  reference?: string | null;            // From affiliate_payouts.reference
  transaction_date?: string | null;     // From affiliate_payouts.transaction_date
  created_at: string;                   // From affiliate_payouts.created_at
  updated_at: string;                   // From affiliate_payouts.updated_at
  scheduled_at?: string | null;         // From affiliate_payouts.scheduled_at
  processed_at?: string | null;         // From affiliate_payouts.processed_at
  xendit_disbursement_id?: string | null; // From affiliate_payouts.xendit_disbursement_id
  processing_notes?: string | null;     // From affiliate_payouts.processing_notes
  fee_amount?: number | null;           // From affiliate_payouts.fee_amount
  net_amount?: number | null;           // From affiliate_payouts.net_amount
  batch_id?: string | null;             // From affiliate_payouts.batch_id
  
  // Additional details
  payout_details: any;                  // JSON details about the payout
  verification_required: boolean;       // Whether verification is required
  affiliate_avatar_url?: string | null; // From unified_profiles.avatar_url
  
  // Payout items (conversions included in this payout)
  payout_items?: PayoutItemDetail[];    // Items included in this payout
  item_count?: number;                  // Convenience count of items
  
  // Verification information
  verifications?: PayoutVerificationDetail[];
  has_verification?: boolean | null;    // Convenience flag for verification status
}

/**
 * Represents a single item (conversion) included in a payout
 */
export interface PayoutItemDetail {
  item_id: string;                      // From payout_items.id
  conversion_id: string | null;         // From payout_items.conversion_id
  amount: number;                       // From payout_items.amount
  order_id?: string | null;             // From affiliate_conversions.order_id
  gmv?: number | null;                  // From affiliate_conversions.gmv
  commission_amount?: number | null;    // From affiliate_conversions.commission_amount
  created_at?: string | null;           // From affiliate_conversions.created_at
}

/**
 * Represents a verification record for a payout
 */
export interface PayoutVerificationDetail {
  verification_id: string;              // From admin_verifications.id
  admin_id: string;                     // From admin_verifications.admin_user_id
  admin_name: string;                   // Generated from unified_profiles.first_name + last_name
  type: string;                         // From admin_verifications.verification_type
  is_verified: boolean;                 // From admin_verifications.is_verified
  notes?: string | null;                // From admin_verifications.notes
  verified_at?: string | null;          // From admin_verifications.verified_at
  created_at: string;                   // From admin_verifications.created_at
}

/**
 * Represents the data structure for affiliate program global configuration.
 * Based on the public.affiliate_program_config table.
 */
export type PayoutScheduleType = 'monthly' | 'quarterly' | 'bi_annually' | 'annually';

/**
 * Represents an affiliate payout item for display in admin UI lists.
 * Based on the public.affiliate_payouts table with joined affiliate info.
 */
export interface AdminAffiliatePayoutItem {
  id: string;                      // From affiliate_payouts.id
  affiliate_id: string;            // From affiliate_payouts.affiliate_id
  affiliate_name?: string;         // From unified_profiles.full_name or similar
  amount: number | string;         // From affiliate_payouts.amount
  status: string;                  // From affiliate_payouts.status
  payout_method: string;           // From affiliate_payouts.payout_method
  reference?: string | null;       // From affiliate_payouts.reference
  transaction_date?: string | null; // From affiliate_payouts.transaction_date
  created_at?: string;             // From affiliate_payouts.created_at
  xendit_disbursement_id?: string | null; // From affiliate_payouts.xendit_disbursement_id
  processed_at?: string | null;    // From affiliate_payouts.processed_at
  processing_notes?: string | null; // From affiliate_payouts.processing_notes
  fee_amount?: number | null;      // From affiliate_payouts.fee_amount
  net_amount?: number | null;      // From affiliate_payouts.net_amount
  scheduled_at?: string | null;    // From affiliate_payouts.scheduled_at
}

/**
 * Represents the data structure for affiliate program global configuration.
 * Based on the public.affiliate_program_config table.
 */
export interface AffiliateProgramConfigData {
  cookie_duration_days: number;
  min_payout_threshold: number;
  terms_of_service_content?: string | null; // TEXT, can be null
  payout_schedule?: PayoutScheduleType | null; // Added
  payout_currency?: string | null;             // Added (e.g., 'USD', 'PHP')
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}
