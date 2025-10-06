-- Marketing KPIs per channel per day
-- Creates a materialized view aggregating base metrics and computing standard KPIs

CREATE MATERIALIZED VIEW IF NOT EXISTS public.marketing_kpis_channel_daily AS
SELECT
  (date::date)                             AS date,
  COALESCE(source_channel, 'unknown')      AS source_channel,
  SUM(spend)::numeric                      AS spend,
  SUM(impressions)::bigint                 AS impressions,
  SUM(clicks)::bigint                      AS clicks,
  COUNT(DISTINCT enrollment_id)::bigint    AS enrollments,
  SUM(attributed_revenue)::numeric         AS attributed_revenue,
  CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) ELSE NULL END AS ctr,
  CASE WHEN SUM(clicks) > 0 THEN (SUM(spend) / NULLIF(SUM(clicks), 0)) ELSE NULL END AS cpc,
  CASE WHEN SUM(impressions) > 0 THEN ((SUM(spend) / NULLIF(SUM(impressions), 0)) * 1000) ELSE NULL END AS cpm,
  CASE WHEN COUNT(DISTINCT enrollment_id) > 0 THEN (SUM(spend) / NULLIF(COUNT(DISTINCT enrollment_id), 0)) ELSE NULL END AS cpa,
  CASE WHEN SUM(spend) > 0 THEN (SUM(attributed_revenue) / NULLIF(SUM(spend), 0)) ELSE NULL END AS roas
FROM public.marketing_performance_view
GROUP BY 1, 2
WITH NO DATA;

-- Indexes for fast range/channel queries
CREATE INDEX IF NOT EXISTS idx_mkpi_daily_date ON public.marketing_kpis_channel_daily(date);
CREATE INDEX IF NOT EXISTS idx_mkpi_daily_channel ON public.marketing_kpis_channel_daily(source_channel);
-- Required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS uq_mkpi_daily_date_channel ON public.marketing_kpis_channel_daily(date, source_channel);

-- Helper function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_marketing_kpis_channel_daily()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.marketing_kpis_channel_daily;
END;
$$;
