# Marketing Data Re-ingestion — Phase 1: Cleanup and Dedup

## Task Objective
Re-ingest Facebook ad spend data for recent months to restore up-to-date analytics, and implement durable DB-layer safeguards to prevent duplicate spend inflation.

## Current State Assessment
- `public.ad_spend` contains historical data up to 2025-04-22, with many duplicate rows per (date, entity), inflating totals.
- UI endpoints now deduplicate in-memory, but DB remains a single source of truth for reports and downstream consumers.
- `marketing_performance_view` aggregates on top of `ad_spend`, so duplication propagates to KPI matview without DB fixes.

## Future State Goal
- Clean ad spend table (backup + truncate) and re-ingest fresh, correct data for a chosen range.
- Add DB constraints/views to prevent duplication.
- Refresh KPI matview and validate UI parity (Summary vs Channel) for selected windows.

## Implementation Plan

1. Backup & Truncate
   - [ ] Create backup table: `CREATE TABLE public.ad_spend_backup_{YYYYMMDDHHMM} AS TABLE public.ad_spend;`
   - [ ] TRUNCATE ONLY `public.ad_spend` (retain structure).

2. DB-layer Safeguards
   - [ ] Create partial unique indexes to prevent duplicates per entity level:
     - `(date, ad_id) WHERE ad_id IS NOT NULL`
     - `(date, adset_id) WHERE ad_id IS NULL AND adset_id IS NOT NULL`
     - `(date, campaign_id) WHERE ad_id IS NULL AND adset_id IS NULL AND campaign_id IS NOT NULL`
   - [ ] (Optional) Create `ad_spend_dedup` view using window functions (ROW_NUMBER per (date, coalesced entity)) and consider pointing `marketing_performance_view` to it.
   - [ ] Rebuild `marketing_performance_view` if needed to read from dedup source.

3. Re-ingestion
   - [ ] Choose source: CSV exports vs Meta Graph API.
   - [ ] Implement idempotent loader:
     - CSV path(s) → parse, normalize to columns: `date, ad_id, adset_id, campaign_id, spend, impressions, clicks, currency`.
     - Upsert strategy per entity level using conflict targets.
     - Record idempotency key for safe retries.
   - [ ] Run loader for the chosen range (e.g., 2025-04-23 → today).

4. KPI Refresh & Validation
   - [ ] `REFRESH MATERIALIZED VIEW public.marketing_kpis_channel_daily;`
   - [ ] Validate UI parity across Summary and Channel for sample windows.
   - [ ] Remove API-level dedup if DB layer is confirmed correct and performant.

## Notes & Risks
- PostgREST upsert with partial unique indexes: conflict target `(date, ad_id)`/etc. should work where predicate matches, but rows missing `ad_id` require separate upsert paths.
- If re-ingest uses Graph API, secure storage of tokens is required; prefer server-only env (`SUPABASE_SERVICE_ROLE_KEY` usage for ingestion).
- Consider audit logging for ad spend changes in future phases.

## Completion Checklist
- [ ] Backup created and retained.
- [ ] Table truncated.
- [ ] Unique indexes created.
- [ ] Re-ingestion completed for target range.
- [ ] KPI matview refreshed.
- [ ] UI validated with realistic totals and parity.
