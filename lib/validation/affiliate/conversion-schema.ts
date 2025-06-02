import { z } from 'zod';

/**
 * Schema for affiliate conversion data to be inserted into the database
 */
export const affiliateConversionInsertSchema = z.object({
  affiliate_id: z.string().uuid(),
  click_id: z.string().uuid().nullable(),
  order_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable(),
  gmv: z.number().positive(),
  level: z.number().int().min(1).max(2).default(1), // Level 1 or 2
  sub_id: z.string().nullable().optional() // For network partner tracking
});

/**
 * Type for affiliate conversion data to be inserted into the database
 */
export type AffiliateConversionInsert = z.infer<typeof affiliateConversionInsertSchema>;

/**
 * Schema for affiliate conversion status updates
 */
export const conversionStatusSchema = z.enum([
  'pending',
  'cleared',
  'paid',
  'flagged'
]);

/**
 * Type for affiliate conversion status
 */
export type ConversionStatus = z.infer<typeof conversionStatusSchema>;

/**
 * Schema for network postback status updates
 */
export const postbackStatusSchema = z.enum([
  'pending',
  'sent',
  'failed',
  'retrying'
]);

/**
 * Type for network postback status
 */
export type PostbackStatus = z.infer<typeof postbackStatusSchema>;
