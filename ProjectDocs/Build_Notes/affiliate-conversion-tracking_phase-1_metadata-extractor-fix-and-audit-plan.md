# Affiliate Conversion Tracking — Phase 1: Metadata Extractor Fix and Audit Plan

## Task Objective
Ensure purchases with affiliate data in transaction metadata correctly create rows in `affiliate_conversions` and document an audit plan to quantify any missed conversions.

## Current State Assessment
- Xendit webhook handler (`app/api/webhooks/xendit/route.ts`) extracts affiliate data via `extractAffiliateTrackingFromMetadata(tx.metadata)`.
- The extractor only supported nested `metadata.affiliateTracking.{affiliateSlug, visitorId}`.
- `payment-actions.ts` logs affiliate data using flat keys: `affiliate_slug`, `visitor_id`, `affiliate_capture_time`.
- Result: For P2P/course flows, webhook failed to find affiliate data, skipped `recordAffiliateConversion`, leaving `affiliate_conversions` empty despite metadata containing affiliate info.

## Future State Goal
- Webhook reliably attributes conversions regardless of whether affiliate data is nested or flat in metadata.
- Ability to audit and optionally backfill missed conversions.

## Implementation Plan
1) Fix extractor to support both nested and flat forms
   - [x] Update `lib/services/affiliate/conversion-service.ts` `extractAffiliateTrackingFromMetadata` to read:
     - Nested: `metadata.affiliateTracking.affiliateSlug`, `metadata.affiliateTracking.visitorId`
     - Flat: `metadata.affiliate_slug`, `metadata.visitor_id`
     - Optional camelCase fallbacks: `metadata.affiliateSlug`, `metadata.visitorId`
   - [x] Add lightweight logging when extracted.

2) Verify runtime path
   - [ ] Re-run a test payment through the P2P/course flow and observe `[Webhook][P2P] Conversion recorded:` log.
   - [ ] Confirm a new row exists in `affiliate_conversions` with `order_id = tx.id`.

3) Audit scope of missed conversions (read-only)
   - [ ] Create a temporary admin endpoint to return counts of transactions with `(metadata -> affiliate_slug OR visitor_id)` AND no matching row in `affiliate_conversions` by `order_id`.
   - [ ] Break down counts by `transaction_type` to focus on affected flows.

4) Backfill plan (optional)
   - [ ] Build a guarded admin tool that iterates candidates and calls the same attribution pipeline to insert conversions idempotently (skips if exists).
   - [ ] Dry-run mode first; then execute with limited time window.

5) Documentation and cleanup
   - [x] Capture RCA and fix in these build notes.
   - [ ] After successful verification and optional backfill, move this file to `completed/`.

## Notes
- E‑com flow already writes `metadata.affiliateTracking`, so it was unaffected.
- P2P/course flow writes flat keys; the fix normalizes extraction without changing upstream loggers, minimizing risk. 