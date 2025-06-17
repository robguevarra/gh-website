import { z } from 'zod';

/**
 * Schema for payout transaction data validation
 */
export const payoutTransactionSchema = z.object({
  id: z.string().uuid({ message: 'Valid transaction UUID is required' }),
  affiliate_id: z.string().uuid({ message: 'Valid affiliate UUID is required' }),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'sent', 'scheduled', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid transaction status' }),
  }),
  payout_method: z.string().optional(),
  reference: z.string().optional(),
  processing_notes: z.string().optional(),
  batch_id: z.string().uuid().optional(),
  fee_amount: z.number().optional(),
  net_amount: z.number().optional(),
  xendit_disbursement_id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  processed_at: z.string().datetime().nullable().optional(),
});

/**
 * Type for payout transaction data
 */
export type PayoutTransaction = z.infer<typeof payoutTransactionSchema>;

/**
 * Schema for payout projection data
 */
export const payoutProjectionSchema = z.object({
  pending_amount: z.number().nonnegative(),
  estimated_next_payout: z.number().nonnegative(),
  next_payout_date: z.string().datetime().nullable(),
  threshold_amount: z.number().positive(),
});

/**
 * Type for payout projection data
 */
export type PayoutProjection = z.infer<typeof payoutProjectionSchema>;

/**
 * Schema for payout history filtering parameters
 */
export const payoutHistoryFilterSchema = z.object({
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'sent', 'scheduled', 'cancelled']).optional(),
  start_date: z.string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: 'Invalid start date format',
    })
    .optional(),
  end_date: z.string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: 'Invalid end date format',
    })
    .optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Type for payout history filtering parameters
 */
export type PayoutHistoryFilter = z.infer<typeof payoutHistoryFilterSchema>;

/**
 * Schema for payout request validation
 */
export const payoutRequestSchema = z.object({
  payment_method: z.string(),
  payment_details: z.record(z.string(), z.any()),
  amount: z.number().positive({ message: 'Requested amount must be positive' }).optional(),
  notes: z.string().optional(),
});

/**
 * Type for payout request
 */
export type PayoutRequest = z.infer<typeof payoutRequestSchema>;
