import { z } from 'zod';

/**
 * Schema for simplified referral link data validation
 * The simplified approach uses a single product referral link format
 * 
 * NOTE: Using camelCase for property names to match frontend store implementation
 */
export const referralLinkSchema = z.object({
  id: z.string().uuid({ message: 'Valid link UUID is required' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters' })
    .max(50, { message: 'Slug cannot exceed 50 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  productName: z.string().min(1, { message: 'Product name is required' }),
  fullUrl: z.string().url({ message: 'Valid full URL is required' }),
  createdAt: z.string().datetime().optional(),
  clicks: z.number().int().nonnegative().optional(),
  conversions: z.number().int().nonnegative().optional(),
  earnings: z.number().nonnegative().optional(),
  conversionRate: z.number().nonnegative().optional(),
});

/**
 * Type for referral link data
 */
export type ReferralLink = z.infer<typeof referralLinkSchema>;

/**
 * In the simplified single product approach, we no longer need schemas for creating
 * or updating referral links since links are automatically generated based on
 * the affiliate's slug when they sign up for the program.
 * 
 * The following schemas are kept for reference but are no longer used in the application.
 */

/**
 * Schema for referral link query parameters in GET requests
 * We've simplified this schema to only include the include_metrics parameter
 * since we no longer need pagination for multiple links
 */
export const referralLinkQuerySchema = z.object({
  include_metrics: z.enum(['true', 'false']).optional()
  // Removed limit and offset since we only have a single link now
});

/**
 * Type for referral link query parameters
 */
export type ReferralLinkQuery = z.infer<typeof referralLinkQuerySchema>;

// Keep empty export declarations for backward compatibility to avoid import errors
export const createReferralLinkSchema = referralLinkSchema;
export const updateReferralLinkSchema = referralLinkSchema;
export type CreateReferralLink = ReferralLink;
export type UpdateReferralLink = ReferralLink;
