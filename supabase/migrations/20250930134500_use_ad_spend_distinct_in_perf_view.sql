-- Deduplicate ad spend rows at the (date, ad_id/adset_id/campaign_id, spend, imps, clicks) level
CREATE OR REPLACE VIEW public.ad_spend_distinct AS
SELECT DISTINCT
  date,
  ad_id,
  adset_id,
  campaign_id,
  currency,
  spend,
  impressions,
  clicks
FROM public.ad_spend;

-- Rebuild performance view to source from distinct spend
CREATE OR REPLACE VIEW public.marketing_performance_view AS
SELECT
  spend.date,
  spend.spend,
  spend.impressions,
  spend.clicks,
  spend.currency AS spend_currency,
  camp.id AS campaign_id,
  camp.fb_campaign_id,
  camp.name AS campaign_name,
  camp.objective AS campaign_objective,
  camp.status AS campaign_status,
  ads.id AS adset_id,
  ads.fb_adset_id,
  ads.name AS adset_name,
  ads.status AS adset_status,
  ad.id AS ad_id,
  ad.fb_ad_id,
  ad.name AS ad_name,
  ad.status AS ad_status,
  NULL::uuid AS transaction_id,
  NULL::uuid AS enrollment_id,
  NULL::numeric AS attributed_revenue,
  NULL::text AS conversion_event,
  'facebook'::text AS source_channel
FROM public.ad_spend_distinct spend
LEFT JOIN public.ad_ads     ad  ON spend.ad_id = ad.id
LEFT JOIN public.ad_adsets  ads ON ad.adset_id = ads.id
LEFT JOIN public.ad_campaigns camp ON ads.campaign_id = camp.id

UNION ALL

SELECT
  DATE(e.enrolled_at) AS date,
  NULL::numeric AS spend,
  NULL::integer AS impressions,
  NULL::integer AS clicks,
  t.currency AS spend_currency,
  NULL::uuid AS campaign_id,
  NULL::text AS fb_campaign_id,
  NULL::text AS campaign_name,
  NULL::text AS campaign_objective,
  NULL::text AS campaign_status,
  NULL::uuid AS adset_id,
  NULL::text AS fb_adset_id,
  NULL::text AS adset_name,
  NULL::text AS adset_status,
  NULL::uuid AS ad_id,
  NULL::text AS fb_ad_id,
  NULL::text AS ad_name,
  NULL::text AS ad_status,
  e.transaction_id,
  e.id AS enrollment_id,
  t.amount AS attributed_revenue,
  'p2p_enrollment'::text AS conversion_event,
  CASE
    WHEN up.tags IS NOT NULL AND array_length(up.tags, 1) > 0 THEN up.tags[1]
    ELSE 'organic/unknown'::text
  END AS source_channel
FROM public.enrollments_backup_2025_06_30_02_45_55 e
JOIN public.transactions_backup_2025_06_30_02_45_55 t ON e.transaction_id = t.id
JOIN public.unified_profiles_backup_2025_06_30_02_45_55 up ON e.user_id = up.id
WHERE t.status = 'COMPLETED'::text
  AND NOT EXISTS (
    SELECT 1 FROM public.ad_attributions aa WHERE aa.transaction_id = e.transaction_id
  );
