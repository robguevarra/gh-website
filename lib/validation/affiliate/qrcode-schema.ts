import { z } from 'zod';

/**
 * Schema for QR code generation request
 */
export const qrCodeRequestSchema = z.object({
  referral_link_id: z.string().uuid({ message: 'Valid referral link UUID is required' }).optional(),
  url: z.string().url({ message: 'Valid URL is required' }).optional(),
  size: z.number().int().positive().min(100).max(1000).default(300),
  dark_color: z.string().regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i, { message: 'Invalid color format. Use hex format (e.g., #000 or #000000).' }).default('#000000'),
  light_color: z.string().regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i, { message: 'Invalid color format. Use hex format (e.g., #FFF or #FFFFFF).' }).default('#FFFFFF'),
  include_logo: z.boolean().default(true),
}).refine(
  data => data.referral_link_id || data.url,
  {
    message: 'Either referral_link_id or url must be provided',
    path: ['referral_link_id'],
  }
);

/**
 * Type for QR code generation request
 */
export type QrCodeRequest = z.infer<typeof qrCodeRequestSchema>;

/**
 * Schema for QR code response
 */
export const qrCodeResponseSchema = z.object({
  qr_code_url: z.string().url(),
  original_url: z.string().url(),
});

/**
 * Type for QR code response
 */
export type QrCodeResponse = z.infer<typeof qrCodeResponseSchema>;
