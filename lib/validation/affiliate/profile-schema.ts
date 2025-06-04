import { z } from 'zod';

/**
 * Schema for affiliate profile data validation
 */
export const affiliateProfileSchema = z.object({
  id: z.string().uuid({ message: 'Valid affiliate UUID is required' }),
  user_id: z.string().uuid({ message: 'Valid user UUID is required' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters' })
    .max(50, { message: 'Slug cannot exceed 50 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  status: z.enum(['pending', 'active', 'flagged', 'inactive'], {
    errorMap: () => ({ message: 'Invalid affiliate status' }),
  }),
  commission_rate: z.number()
    .min(0, { message: 'Commission rate cannot be negative' })
    .max(1, { message: 'Commission rate cannot exceed 1 (100%)' }),
  is_member: z.boolean(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

/**
 * Type for affiliate profile data
 */
export type AffiliateProfile = z.infer<typeof affiliateProfileSchema>;

/**
 * Schema for affiliate profile update operations
 * Only allows updating specific fields
 */
export const affiliateProfileUpdateSchema = z.object({
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters' })
    .max(50, { message: 'Slug cannot exceed 50 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
    .optional(),
  // Admin-only fields below - should be validated in the route handler
  status: z.enum(['pending', 'active', 'flagged', 'inactive'], {
    errorMap: () => ({ message: 'Invalid affiliate status' }),
  }).optional(),
  commission_rate: z.number()
    .min(0, { message: 'Commission rate cannot be negative' })
    .max(1, { message: 'Commission rate cannot exceed 1 (100%)' })
    .optional(),
  is_member: z.boolean().optional(),
});

/**
 * Type for affiliate profile update operations
 */
export type AffiliateProfileUpdate = z.infer<typeof affiliateProfileUpdateSchema>;

/**
 * Schema for validating query parameters in GET requests
 */
export const affiliateProfileQuerySchema = z.object({
  include_metrics: z.enum(['true', 'false']).optional(),
  include_links: z.enum(['true', 'false']).optional(),
});

/**
 * Type for affiliate profile query parameters
 */
export type AffiliateProfileQuery = z.infer<typeof affiliateProfileQuerySchema>;
