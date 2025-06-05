// Based on public.affiliate_status_type enum from Supabase schema
export type AffiliateStatusType = 'pending' | 'active' | 'flagged' | 'inactive';

// Based on public.conversion_status_type enum from Supabase schema
export type ConversionStatusType = 'pending' | 'cleared' | 'paid' | 'flagged';

// Based on public.payout_method_type enum from Supabase schema (adjust if different)
export type PayoutMethodType = 'paypal' | 'bank_transfer' | 'wise' | 'other';

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

/**
 * Represents a payout record in the affiliate system.
 * Extended with UI-specific fields for display purposes.
 */
export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method: PayoutMethodType;
  method?: string;         // Alias for payment_method in UI
  reference: string;
  created_at: string;
  date?: string;          // Formatted date for display
  paid_at?: string;
  note?: string;
}

/**
 * Represents the data structure for affiliate program global configuration.
 * Based on the public.affiliate_program_config table.
 */
export interface AffiliateProgramConfigData {
  cookie_duration_days: number;
  min_payout_threshold: number;
  terms_of_service_content?: string | null; // TEXT, can be null
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

