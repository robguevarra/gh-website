# Email Campaign Send Flow – Findings and Plan

Date: 2025-09-25 10:44 (+08)
Owner: Cascade

## Task Objective
Provide a precise, code-referenced audit of the email campaign sending pipeline. Identify root causes for “sends not pushing through,” document specific issues, and propose minimal, high-impact fixes with a validation plan.

## Current State Assessment
- The app implements multiple send paths:
  - `app/api/admin/campaigns/[id]/send/route.ts` (UI-targeted simple sender)
  - `app/api/admin/campaigns/send/route.ts` (generic sender with more safeguards)
  - `supabase/functions/process-scheduled-campaigns/` (cron-like processing for scheduled campaigns)
- Audience resolution and frequency capping are handled by Supabase Edge Functions:
  - `supabase/functions/resolve-audience-from-rules/`
  - `supabase/functions/check-frequency-limits/`
- Queue processing and delivery are handled by:
  - `supabase/functions/process-email-queue/`
  - Queue insertion helper: `lib/email/queue-utils.ts`
- Authentication and admin clients are correctly set up using `@supabase/ssr` and a service-role singleton.

## Future State Goal
- A consistent, reliable send pipeline where:
  - Audience resolution contracts are consistent across caller and function.
  - Valid recipients are included (non-bounced = NULL or FALSE).
  - UI-triggered sends also trigger immediate queue processing (or a scheduler exists).
  - Functions are Deno-safe (no invalid relative imports) and produce actionable logs.

## System Map (Key Components)
- API Routes
  - `app/api/admin/campaigns/[id]/send/route.ts` – UI-send; queues recipients, sets status to `sent` but does not trigger processing.
  - `app/api/admin/campaigns/send/route.ts` – Generic send; resolves audience via Edge Function, applies frequency cap, dedupes, queues, triggers `process-email-queue`.
  - `app/api/admin/campaigns/estimate-audience/route.ts` – Estimates counts from `SegmentRules`.
  - `app/api/admin/campaigns/[id]/route.ts` – CRUD, validates `segment_rules` shape for updates.
- Data access
  - `lib/supabase/data-access/campaign-management.ts` – CRUD + helpers (populate recipients, analytics, etc.).
  - `lib/email/queue-utils.ts` – Adds to `email_queue`, processes locally (simulated send) if needed.
- Edge Functions
  - `supabase/functions/resolve-audience-from-rules/` – Resolves userIds from rules.
  - `supabase/functions/check-frequency-limits/` – Applies frequency caps for profile_ids.
  - `supabase/functions/process-email-queue/` – Sends via Postmark, updates queue/campaign state.
  - `supabase/functions/process-scheduled-campaigns/` – Picks scheduled campaigns and queues them.
- Supabase helpers
  - `lib/supabase/route-handler.ts` – auth/SSR client, admin guard, error helpers.
  - `lib/supabase/admin.ts` – service-role client singleton.
  - `lib/supabase/server.ts` – service role client factory for server contexts.

## Findings (with Evidence)

- [F-1] Edge Function contract mismatch – audience resolution
  - Function `resolve-audience-from-rules` expects POST body with `campaignId` and `segmentRules`, returns `{ campaignId, userIds, totalCount }`.
    - File: `supabase/functions/resolve-audience-from-rules/index.ts` lines ~84–101 and ~139–143.
  - Callers often send `{ campaign_id }` (snake_case) and expect `data` array:
    - Generic send: `app/api/admin/campaigns/send/route.ts` lines ~72–93 uses `{ campaign_id: campaignId }` and reads `resolvedAudienceResponse?.data` (expects array), but function returns `userIds`.
    - Scheduled campaigns: `supabase/functions/process-scheduled-campaigns/index.ts` lines ~272–291 sends `{ campaign_id: campaignId }`, expects `data` to be array.
    - Data-access populate: `populateCampaignRecipientsFromRules(...)` (in `lib/supabase/data-access/campaign-management.ts`) logs indicate Edge Function is expected to drive snapshotting; reading code shows assumption of a `data` array rather than `{ userIds }`.
  - Impact: Audience resolution silently fails or returns empty, resulting in zero queued recipients.

- [F-2] Recipient filter excludes valid, non-bounced recipients in UI path
  - UI path `[id]/send` fetches profiles with `.not('email', 'is', null).is('email_bounced', null)`.
    - File: `app/api/admin/campaigns/[id]/send/route.ts` lines ~89–96.
  - DB typically uses `email_bounced = FALSE` for “not bounced”. This filter only allows `NULL` and excludes `FALSE` → many valid recipients are missed.
  - Generic route uses the correct filter: `.or('email_bounced.is.null,email_bounced.eq.false')`.
    - File: `app/api/admin/campaigns/send/route.ts` lines ~98–104.
  - Impact: UI-triggered sends may queue zero recipients, even with a large valid audience.

- [F-3] UI path does not trigger queue processing
  - `[id]/send` route queues emails and sets campaign to `sent` but never invokes `process-email-queue`.
    - File: `app/api/admin/campaigns/[id]/send/route.ts` lines ~111–139.
  - Generic path invokes `process-email-queue` after queueing.
    - File: `app/api/admin/campaigns/send/route.ts` lines ~173–191.
  - Impact: Without a Supabase Scheduler job or manual trigger, emails remain unprocessed in `email_queue`.

- [F-4] Deno-relative import risk in `process-email-queue`
  - The function imports `../../../lib/services/email/template-utils.ts` (outside function dir).
    - File: `supabase/functions/process-email-queue/index.ts` line ~5.
  - Supabase Functions typically can only import files bundled or inside their folder. This path is likely invalid in deployment, breaking the function.
  - Impact: Even with queued emails, sending may fail at runtime.

- [F-5] Segment rules model inconsistency across system
  - API/UI use `SegmentRules` with `include: { operator: 'AND'|'OR', segmentIds: string[] }` and `exclude: { segmentIds: string[] }`.
    - Ex: `app/api/admin/campaigns/estimate-audience/route.ts`.
  - `resolve-audience-from-rules` Edge Function expects a rules array like `{ type: 'include_segment'|'exclude_segment'|'include_segment_list'|..., segment_id(s) }`.
  - Impact: Even if we passed rules to the function, shapes don’t match; resolution fails.

- [F-6] Health metrics query in `process-email-queue` likely invalid
  - Uses `.select('status, count').groupby('status')`.
    - File: `supabase/functions/process-email-queue/index.ts` lines ~539–567.
  - PostgREST uses aggregates like `select('status, count:id')` and auto group-by; no `groupby` method exists on the client.
  - Impact: Health endpoint fails; not a blocker for sending, but misleading.

- [F-7] Campaign status semantics
  - `[id]/send` sets status to `sending` then to `sent` immediately after queuing.
    - File: `app/api/admin/campaigns/[id]/send/route.ts` lines ~37–39 and ~131–137.
  - `process-email-queue` marks campaigns `completed` only if current status is `sent` and no pending/retrying queue items remain.
    - File: `supabase/functions/process-email-queue/index.ts` lines ~663–669.
  - Impact: Acceptable as-is, but errors in queue processing may leave campaigns stuck at `sent`.

- [F-8] Queue item field differences across sources
  - `[id]/send` inserts queue items via `addToQueue` that do not include `sender_email`/`sender_name`.
    - File: `lib/email/queue-utils.ts` lines ~38–49 – insert omits sender fields.
  - `process-email-queue` uses `email.sender_email` and `email.sender_name`, falling back to `POSTMARK_FROM_EMAIL` if not provided.
    - File: `supabase/functions/process-email-queue/index.ts` lines ~416–434 and ~418–434.
  - Impact: Not a blocker thanks to fallback; but better to standardize queue item schema.

## Recommended Immediate Fixes (Minimal Changes)

- [Fix-1] Correct bounced filter in `[id]/send`
  - Change `.not('email', 'is', null).is('email_bounced', null)` to `.not('email', 'is', null).or('email_bounced.is.null,email_bounced.eq.false')`.
  - File: `app/api/admin/campaigns/[id]/send/route.ts` (~89–96).
  - Expected effect: Include valid, non-bounced recipients.

- [Fix-2] Trigger queue processing in `[id]/send`
  - After successful queueing (`successCount > 0`), invoke `adminClient.functions.invoke('process-email-queue', { body: { triggered_by: 'immediate_send' } })`.
  - File: `app/api/admin/campaigns/[id]/send/route.ts` after line ~129.
  - Expected effect: Immediate processing without waiting for scheduler.

- [Fix-3] Align the audience resolution contract (choose ONE consistent contract)
  - Option A (recommended): Edge Function accepts `{ campaignId }` only and reads `segment_rules` from `email_campaigns` internally. Function returns `{ userIds }`.
    - Update callers to send `{ campaignId }` (camelCase) and read `response.userIds`.
  - Option B: Standardize on `{ segmentRules: SegmentRules }` and convert to function’s internal rule array.
  - Apply to:
    - `app/api/admin/campaigns/send/route.ts` (lines ~72–93 and ~89–93)
    - `lib/supabase/data-access/campaign-management.ts` (in `populateCampaignRecipientsFromRules`)
    - `supabase/functions/process-scheduled-campaigns/index.ts` (lines ~272–291)
  - Expected effect: Audience resolution returns the correct, non-empty set.

- [Fix-4] Make `process-email-queue` Deno-safe
  - Move `substituteVariables` into `supabase/functions/_shared/` and import via relative URL, or inline a minimal safe helper.
  - File: `supabase/functions/process-email-queue/index.ts` line ~5.
  - Expected effect: Prevent runtime import errors in Edge environment.

## Logging Plan (Actionable)

- `[id]/send` route:
  - Log counts at each stage: segment users found, profiles fetched, queued success/failed.
  - Example: `console.log('[SEND/UI]', { step: 'profiles_fetched', campaignId, total: allProfiles.length });`
  - On queue error, log: `console.warn('[SEND/UI]', { step: 'queue_fail', email: profile.email, error: queueError?.message });`

- Generic send route:
  - After invoking each function, log the exact request body and the first 5 IDs returned.
  - On duplicates filtered, log the duplicates count.

- `populateCampaignRecipientsFromRules`:
  - Log outgoing payload, raw function response, and upsert summary (count of intended recipients vs. DB `count`).

- Edge Functions:
  - `resolve-audience-from-rules`: log input body, validated schema result; on error, return 400 with details.
  - `check-frequency-limits`: already logs; keep `LOG_LEVEL=debug` while diagnosing.
  - `process-email-queue`: add one-time startup log noting Postmark token presence (masked) and whether the substitution helper import succeeded.

## Test Plan

- Scenario A: UI send
  1. Ensure a test profile exists with `email_bounced = FALSE` and a valid email.
  2. Fix [Fix-1] and [Fix-2].
  3. Trigger `POST /api/admin/campaigns/{id}/send`.
  4. Confirm server logs show non-zero fetched profiles and queueing success.
  5. Verify `email_queue` moves to `sent` and campaign eventually to `completed`.

- Scenario B: Generic send
  1. Apply [Fix-3] to align function contract.
  2. Trigger `POST /api/admin/campaigns/send` with `{ campaignId }`.
  3. Confirm `resolve-audience-from-rules` receives expected body and returns non-empty `userIds`.
  4. Verify queueing and processing logs.

- Scenario C: Scheduled campaigns
  1. Schedule a campaign in the near future.
  2. Ensure `process-scheduled-campaigns` is invoked (Scheduler or manual).
  3. Verify audience resolution contract and queueing per [Fix-3].

## Medium-Term Recommendations

- Unify on `SegmentRules` in DB (`email_campaigns.segment_rules`) and let `resolve-audience-from-rules` read from DB given only `{ campaignId }`.
- Prefer the generic send path from the UI (or bring its safeguards into `[id]/send`).
- Standardize queue item schema to always include `sender_email`, `sender_name`.
- Fix `getQueueMetrics` to use valid aggregate syntax (optional; improves observability).
- Add Supabase scheduled invocations for:
  - `process-email-queue` (e.g., every 1–5 minutes)
  - `process-scheduled-campaigns` (e.g., every minute)

## Open Questions / Risks

- Does production deployment bundle function code? If not, [F-4] is likely breaking sends.
- Are RLS policies configured to allow function/service-role access as coded? Current code assumes service-role keys are present.
- Do all expected DB columns exist (e.g., `processing_locks`, `email_queue.*` fields used by functions)?

## Appendix – Contracts (Proposed)

- `resolve-audience-from-rules` (Proposed)
  - Request: `{ campaignId: string }`
  - Response: `{ userIds: string[], totalCount: number }`
  - Internally: read `email_campaigns.segment_rules` and resolve audience.

- `check-frequency-limits`
  - Request: `{ profile_ids: string[] }`
  - Response: `{ data: string[] } // permitted profile IDs`

- `process-email-queue`
  - Request: optional `{ triggered_by?: string }`
  - Response: processing summary.

---

Action Next (if approved): Implement [Fix-1] and [Fix-2] immediately. Then align [Fix-3] and [Fix-4], add logs, and set up Scheduler.
