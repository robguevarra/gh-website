# Handoff: Facebook Data Ingestion & KPI Alignment — Phase 1 (Deploy + Dedup)

Date: 2025-10-30
Owner: Rob Guevarra
Prepared by: Cascade (AI)
Scope: Marketing data ingestion (Facebook), deduplication, and KPI parity in Admin dashboard

---

## 1) Objective
Deliver a robust, context-sensitive Facebook Ads ingestion pipeline and align Admin KPIs by removing duplication and ensuring the UI aggregates from a deduplicated source.

---

## 2) Final State Summary
- Edge Function fetches campaigns/adsets/ads/insights daily and is idempotent.
- Ingestion automatically chooses the correct date window (backfill or daily) based on `ad_spend` last ingested date.
- Currency captured via `account_currency` and stored to `ad_spend.currency`.
- Database deduplication via `public.ad_spend_dedup`; `marketing_performance_view` repointed to this view.
- Summary and By-Channel APIs read from `marketing_performance_view` (deduped) with normalized dates.
- UI “Performance by Acquisition Channel” shows CTR/CPC/CPM + totals row, matching Summary totals for same range.

---

## 3) Key Results (QA)
- 2025-01-01 → 2025-09-30 (Facebook only): total dedup spend ≈ ₱172,638.63
- 2025-02-01 → 2025-10-30 (Facebook only): total dedup spend ≈ ₱186,219.01
- Data bounds in `marketing_performance_view`: min=2024-09-02, max=2025-10-29

Use these URLs to validate:
- Summary (debug): `/api/admin/marketing/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&debug=1`
- By-Channel (debug): `/api/admin/marketing/by-channel?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&debug=1`
  - Both should match when using the same date window.

---

## 4) Implementation Details

### 4.1 Edge Function (Supabase)
- File: `supabase/functions/fetch-facebook-ads-data/index.ts`
- Changes:
  - Added `account_currency` to insights fetch; stored to `ad_spend.currency`.
  - Idempotency without unique constraints: delete existing rows in target date range, then insert.
  - Auto date window:
    - If table empty: backfill last N days (env `FB_BACKFILL_DAYS`, default 60) up to yesterday (UTC).
    - If data exists: backfill from day after last ingested date up to yesterday; otherwise use `date_preset=yesterday`.
  - Resolved foreign keys by mapping FB IDs to internal UUIDs for campaigns/adsets/ads.

Env/Secrets required (in Supabase):
- `FB_ADS_TOKEN`, `FB_AD_ACCOUNT_ID`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `FB_BACKFILL_DAYS`, `FB_INSIGHTS_DATE_PRESET`

Deploy/Invoke:
- Deploy: `supabase functions deploy fetch-facebook-ads-data`
- Invoke (HTTPS, anon key): `POST /functions/v1/fetch-facebook-ads-data`
- Returns JSON summary (fetched vs upserted and errors list)

### 4.2 Database
- New view: `public.ad_spend_dedup`
  - One row per day×entity (prefers `ad_id`, else `adset_id`, else `campaign_id`), picks latest by `created_at` (ROW_NUMBER window).
- Repointed: `public.marketing_performance_view` → uses `ad_spend_dedup` for advertising rows; unions P2P enrollment rows.
- KPI matview refreshed: `marketing_kpis_channel_daily` (if materialized in your environment).

### 4.3 API
- Summary: `app/api/admin/marketing/summary/route.ts`
  - Reads `marketing_performance_view` (deduped), filters by normalized `YYYY-MM-DD`, sums spend.
  - `debug=1` returns filters and a note for diagnostics.
- By-Channel: `app/api/admin/marketing/by-channel/route.ts`
  - Reads filtered rows from `marketing_performance_view` where `source_channel='facebook'`, sums in server code.
  - Uses `.range(0, 100000)` to avoid pagination undercounts.
  - `export const dynamic = 'force-dynamic'` to avoid caching.
  - `debug=1` returns filters and a note for diagnostics.
- Data Bounds: `app/api/admin/marketing/data-bounds/route.ts`
  - Returns min/max dates from performance view (facebook), falling back to `ad_spend` or KPI matview.

### 4.4 UI
- Summary cards: `app/admin/marketing/components/MarketingMetricCards.tsx` (unchanged formatting; now fed by deduped Summary).
- Channel table: `app/admin/marketing/components/MarketingChannelComparison.tsx`
  - Added CTR, CPC, CPM columns and a totals row derived from spend/impressions/clicks.
  - Derived metrics are client-side; can be moved server-side later for consistency.
- Store: `lib/stores/admin/marketingAnalyticsStore.ts`
  - Fetches Summary, By-Channel, and Facebook details with normalized ISO strings that are converted to `YYYY-MM-DD` in APIs.

---

## 5) Known Decisions & Rationale
- Use delete-then-insert for ad_spend instead of on_conflict upsert because no suitable unique constraint exists (and failed attempts caused errors). This guarantees idempotency for target windows.
- Standardize aggregation source to `marketing_performance_view` to avoid duplication and ensure RLS-friendly reads.
- Avoid PostgREST aggregate selectors on views; fetch rows and sum in server to prevent schema cache errors and to control ranges.
- Normalize dates to `YYYY-MM-DD` in APIs to prevent timezone drift.

---

## 6) Open Items / Next Steps
1) Schedule daily run for `fetch-facebook-ads-data` (Supabase Dashboard cron) — no params; function auto-selects range.
2) Optional DB hardening: Add partial unique indexes on `public.ad_spend` after validating ingestion, then switch Edge Function back to true upserts.
3) Metrics expansion:
   - Add `reach` to `ad_spend`, fetch from Facebook, compute CTR/CPC/CPM server-side.
   - Optionally parse insights/actions into a separate fact table for richer events (e.g., link_clicks).
4) Currency normalization: If multiple currencies appear, add conversion at aggregation time or store FX rates.
5) UI observability: Add a tiny "Filters used" line (YYYY-MM-DD) near tables/cards for transparency.

---

## 7) Operational Notes
- Health checks:
  - Watch Edge Function logs in Supabase Dashboard after scheduled invocations.
  - Check for non-empty `errors` arrays in function response.
- Troubleshooting:
  - If By-Channel and Summary totals diverge, compare `debug` payloads for filter mismatch.
  - If aggregation fails, ensure APIs read from `marketing_performance_view` and that the view compiles.
- Performance:
  - For larger windows, `.range(0, 100000)` in By-Channel prevents undercounts; switch to server-side SQL with an RPC if needed later.

---

## 8) Rollback Plan
- Revert Summary/By-Channel routes to previous commit if necessary.
- Restore prior `marketing_performance_view` definition if new view introduces issues.
- Temporarily disable Edge Function schedule; re-enable after fixes.

---

## 9) Reference Queries
- Sum (Facebook only) Jan–Sep 2025:
  ```sql
  SELECT ROUND(SUM(spend)::numeric,2) AS total
  FROM public.marketing_performance_view
  WHERE source_channel='facebook' AND date BETWEEN '2025-01-01' AND '2025-09-30';
  ```
- Sum (Facebook only) Feb 1–Oct 30 2025:
  ```sql
  SELECT ROUND(SUM(spend)::numeric,2) AS total
  FROM public.marketing_performance_view
  WHERE source_channel='facebook' AND date BETWEEN '2025-02-01' AND '2025-10-30';
  ```

---

## 10) File Index
- Edge Function: `supabase/functions/fetch-facebook-ads-data/index.ts`
- Views: `public.ad_spend_dedup`, `public.marketing_performance_view`
- APIs:
  - Summary: `app/api/admin/marketing/summary/route.ts`
  - By-Channel: `app/api/admin/marketing/by-channel/route.ts`
  - Data Bounds: `app/api/admin/marketing/data-bounds/route.ts`
- UI Components:
  - Summary: `app/admin/marketing/components/MarketingMetricCards.tsx`
  - Channels: `app/admin/marketing/components/MarketingChannelComparison.tsx`
  - Page shell: `app/admin/marketing/MarketingAnalyticsContent.tsx`
  - Store: `lib/stores/admin/marketingAnalyticsStore.ts`

---

## 11) Contact / Ownership
- Primary: Rob Guevarra
- Support: Cascade (AI) — available to implement next steps (metrics expansion, CRON, hardening).
