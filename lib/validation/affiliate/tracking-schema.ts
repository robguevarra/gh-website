import { z } from 'zod';

/**
 * Schema for affiliate click tracking query parameters
 */
export const affiliateClickParamsSchema = z.object({
  a: z.string().min(1, { message: 'Affiliate slug is required' }),
  ref: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  cb: z.string().optional(), // Cache buster parameter
});

/**
 * Type for affiliate click tracking parameters
 */
export type AffiliateClickParams = z.infer<typeof affiliateClickParamsSchema>;

/**
 * Schema for user agent parsed data
 */
export const userAgentDetailsSchema = z.object({
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
});

/**
 * Type for user agent details
 */
export type UserAgentDetails = z.infer<typeof userAgentDetailsSchema>;

/**
 * Schema for UTM parameters
 */
export const utmParamsSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
});

/**
 * Type for UTM parameters
 */
export type UtmParams = z.infer<typeof utmParamsSchema>;

/**
 * Schema for affiliate click data to be inserted into the database
 */
export const affiliateClickInsertSchema = z.object({
  affiliate_id: z.string().uuid({ message: 'Valid affiliate UUID is required' }),
  visitor_id: z.string().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  referral_url: z.string().nullable().optional(),
  landing_page_url: z.string().nullable().optional(),
  user_agent_details: userAgentDetailsSchema.nullable().optional(),
  utm_params: utmParamsSchema.nullable().optional(),
});

/**
 * Type for affiliate click data to be inserted
 */
export type AffiliateClickInsert = z.infer<typeof affiliateClickInsertSchema>;

/**
 * Schema for affiliate tracking cookie options
 */
export const trackingCookieOptionsSchema = z.object({
  name: z.string(),
  value: z.string(),
  maxAge: z.number(),
  path: z.string(),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  sameSite: z.enum(['strict', 'lax', 'none']),
});

/**
 * Type for tracking cookie options
 */
export type TrackingCookieOptions = z.infer<typeof trackingCookieOptionsSchema>;

/**
 * Schema for affiliate tracking pixel configuration
 */
export const trackingPixelConfigSchema = z.object({
  endpoint: z.string().default('/api/affiliate/click'),
  debug: z.boolean().default(false),
  cookieName: z.string().default('gh_aff'),
  visitorCookieName: z.string().default('gh_vid'),
  cookieDuration: z.number().default(30), // days
  requestTimeout: z.number().default(5000), // milliseconds
});

/**
 * Type for tracking pixel configuration
 */
export type TrackingPixelConfig = z.infer<typeof trackingPixelConfigSchema>;
