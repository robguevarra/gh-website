import { z } from 'zod';

/**
 * Schema for date range filtering in metrics requests
 */
export const dateRangeSchema = z.object({
  start_date: z.string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: 'Invalid start date format',
    }),
  end_date: z.string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: 'Invalid end date format',
    })
    .optional(),
});

/**
 * Type for date range filtering
 */
export type DateRange = z.infer<typeof dateRangeSchema>;

/**
 * Schema for metrics filtering parameters
 */
export const metricsFilterSchema = z.object({
  date_range: dateRangeSchema.optional(),
  referral_link_id: z.string().uuid({ message: 'Invalid referral link ID' }).optional(),
  group_by: z.enum(['day', 'week', 'month']).optional(),
});

/**
 * Type for metrics filtering parameters
 */
export type MetricsFilter = z.infer<typeof metricsFilterSchema>;

/**
 * Schema for a single metrics data point
 */
export const metricsDataPointSchema = z.object({
  date: z.string(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  commission: z.number().nonnegative(),
});

/**
 * Type for a metrics data point
 */
export type MetricsDataPoint = z.infer<typeof metricsDataPointSchema>;

/**
 * Schema for metrics summary data
 */
export const metricsSummarySchema = z.object({
  total_clicks: z.number().int().nonnegative(),
  total_conversions: z.number().int().nonnegative(),
  total_revenue: z.number().nonnegative(),
  total_commission: z.number().nonnegative(),
  conversion_rate: z.number().nonnegative(),
  earnings_per_click: z.number().nonnegative(),
});

/**
 * Type for metrics summary data
 */
export type MetricsSummary = z.infer<typeof metricsSummarySchema>;

/**
 * Schema for the complete metrics response
 */
export const metricsResponseSchema = z.object({
  summary: metricsSummarySchema,
  data_points: z.array(metricsDataPointSchema),
  filter: metricsFilterSchema.optional(),
});

/**
 * Type for the complete metrics response
 */
export type MetricsResponse = z.infer<typeof metricsResponseSchema>;
