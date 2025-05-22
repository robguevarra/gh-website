# Email System - Phase 3.1: Send Pipeline Correction & Review Enhancements

## Task Objective
To correct the email campaign send pipeline to ensure accurate audience targeting using `segment_rules` for both immediate and scheduled sends, and to enhance the "Review & Send" tab's audience summary to reflect this logic.

## Current State Assessment
The investigation into the email sending process has revealed a critical discrepancy:

1.  **Scheduled Campaigns**:
    *   The `process-scheduled-campaigns` Edge Function (located at `supabase/functions/process-scheduled-campaigns/index.ts`) correctly reads the `segment_rules` (JSONB field including `include: {operator, segmentIds[]}` and `exclude: {segmentIds[]}`) from the `email_campaigns` table.
    *   Its `addRecipientsToQueue` function (now named `addRecipientsToTheQueue` in the latest version of the file, lines ~280-430) contains the logic to:
        *   Invoke the `resolve-audience-from-rules` Edge Function to get `resolvedProfileIds`. (This is a change based on the plan, the older version did inline evaluation).
        *   Fetch `unified_profiles` for these IDs.
        *   Apply frequency capping using a shared utility.
        *   Call a shared `addToQueue` utility, passing `recipientData` for later substitution.
    *   The *previous* version of this function did inline segment_rules evaluation, frequency capping, and its own variable substitution before queueing. The build note plan is to refactor it to use centralized services.

2.  **Immediate Sends (via UI)**: The flow for campaigns sent immediately via the UI is flawed:
    *   The client (typically from `app/admin/email/campaigns/components/campaign-detail.tsx`) calls `POST /api/admin/campaigns/[id]/send` (handler at `app/api/admin/campaigns/[id]/send/route.ts`).
    *   This API route:
        *   Calls `addRecipientsFromSegments(campaignId)` (located in `lib/supabase/data-access/campaign-management.ts`). This function **incorrectly uses the legacy `campaign_segments` join table** to determine recipients, completely bypassing the new `segment_rules`. It populates the `campaign_recipients` table based on this potentially outdated or simple segment list. (The plan renames and refactors this to `populateCampaignRecipientsFromRules`).
        *   Then calls `triggerCampaignSend(campaignId)` (also in `lib/supabase/data-access/campaign-management.ts`).
    *   `triggerCampaignSend` updates the campaign status to 'sending' and then makes a `fetch` call to a generic API endpoint: `POST /api/admin/campaigns/send` (handler at `app/api/admin/campaigns/send/route.ts`).
    *   This generic `POST /api/admin/campaigns/send` API route:
        *   **Redundantly calls the same flawed `addRecipientsFromSegments(campaignId)` function again.**
        *   Reads from the (incorrectly populated by legacy logic) `campaign_recipients` table using `getCampaignRecipients()`.
        *   Adds entries to the `email_queue` by calling the `addToQueue()` utility from `lib/email/queue-utils.ts`. This `addToQueue` utility expects `recipientData` and does *not* perform variable substitution itself; it relies on the downstream `process-email-queue` function to do so.
    *   The net result is that **immediate sends do not respect the `segment_rules`** and may target the wrong audience.

3.  **"Review & Send" Tab Audience Summary**:
    *   The UI is orchestrated by `app/admin/email/campaigns/components/campaign-detail.tsx`.
    *   It derives `derivedSegmentsForReviewSend` by primarily looking at `segment_rules.include.segmentIds`.
    *   This is passed to `app/admin/email/campaigns/components/tabs/review-send-tab-content.tsx`, which displays only a list of included segment names. It does not show the 'AND'/'OR' operator or any excluded segments.

4.  **Downstream Email Processing (`process-email-queue` Edge Function)**:
    *   Located at `supabase/functions/process-email-queue/index.ts`.
    *   Currently, this function picks up items from `email_queue` and sends them using Postmark.
    *   **Crucial Finding**: It **does not currently perform variable substitution**. It directly uses `email.subject` and `email.html_content` fields from the `email_queue` item if they are pre-filled, or fetches template content and substitutes if they are not. The plan is to *ensure* it robustly handles fetching templates and substituting variables from `recipient_data`.
    *   The `addToQueue` utility in `lib/email/queue-utils.ts` populates `recipient_data`. The `processQueue` (non-Edge Function test utility) in `lib/email/queue-utils.ts` *does* demonstrate fetching campaign content and performing substitution, which is the model `process-email-queue` should follow.

## Future State Goal
1.  **Corrected Immediate Send Pipeline**: The immediate send mechanism will correctly interpret and apply `segment_rules` from the `email_campaigns` table to generate the accurate list of recipients, which are then correctly processed and added to `email_queue`.
2.  **Unified Recipient Generation Logic**: A single, reliable source of truth for `segment_rules` evaluation (the `resolve-audience-from-rules` Edge Function) will be used by both scheduled and immediate send paths.
3.  **Accurate `campaign_recipients` Population**: The `campaign_recipients` table will always be populated based on the full evaluation of `segment_rules` for record-keeping.
4.  **Enhanced "Review & Send" Tab**: The audience summary on this tab will clearly display:
    *   The operator (AND/OR) for included segments.
    *   A list of all included segment names.
    *   A list of all excluded segment names (if any).
5.  **Optimized API Calls**: Redundant calls within the immediate send pipeline will be eliminated.
6.  **Consistent Queueing**: Both scheduled and immediate sends will populate `email_queue` with items containing `campaignId`, `recipientEmail`, and `recipientData` (e.g., `UnifiedProfile`), relying on `process-email-queue` Edge Function for template fetching and variable substitution.

## Relevant Context
> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Email System Phase 3 Build Note: `ProjectDocs/Build_Notes/active/email-system_phase-3_advanced-features-and-ux-polish.md`
> 2. Project context (`ProjectContext.md`)
> 3. Build Notes Guidelines (`ProjectDocs/build-notes-guidelines.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From `email-system_phase-3_advanced-features-and-ux-polish.md`
- The definition of `SegmentRules` (`{ version: 1, include: { operator: 'AND'|'OR', segmentIds: [] }, exclude: { segmentIds: [] } }`) is in `types/campaigns.ts`.
- The `process-scheduled-campaigns` Edge Function contains the existing `segment_rules` interpretation logic (which will be refactored).
- UI components: `app/admin/email/campaigns/components/campaign-detail.tsx`, `app/admin/email/campaigns/components/tabs/review-send-tab-content.tsx`.
- `email_campaigns` table has `segment_rules` JSONB field.
- `addToQueue` utility exists in `lib/email/queue-utils.ts`.

## Implementation Plan

**Developer Notes**:
*   The `process-email-queue` Edge Function (`supabase/functions/process-email-queue/index.ts`) **must be updated** (or confirmed to be correctly working) to fetch email template content (subject, HTML) based on `campaign_id` from the queue item, and perform variable substitution using `recipient_data` (also from the queue item) before sending via Postmark. This is a prerequisite for emails to be sent correctly with personalized content.
    - **Status (Update March 20, 2024):** This function has been significantly updated. It now correctly fetches campaign content (subject, HTML body) directly from the `email_campaigns` table. It correctly uses `substituteVariables` with `recipient_data`. Issues with template fetching logic and `email_events` logging (incorrect column names `email_address`, `status`, `template_id`, incorrect `event_type` values, and `raw_response` vs `payload` mismatch) have been resolved. Logic to update campaign status to 'completed' via `checkAndFinalizeCampaigns` has been implemented.
    - **Status (Update May 22, 2024):** The `process-email-queue` function now also updates the `campaign_recipients` table, setting `status` to 'sent' and `sent_at` to the current timestamp for the corresponding `user_id` and `campaign_id` after a successful send. This provides a more immediate reflection of send status in the `campaign_recipients` table.
    - **Status (Update May 23, 2024):** Further debugging and corrections applied to `process-email-queue`:
        - Corrected `substituteVariables` call to properly handle subject and HTML body substitutions, resolving a `TypeError` that was causing send failures.
        - Fixed logging to `email_events` by storing `error_message` within the `payload` (JSONB) field due to a schema mismatch (non-existent `error_message` column). This resolved "Could not find column" errors.
        - Corrected `updateEmailStatus` call for successful sends to use `provider_message_id` (the correct column name in `email_queue`) instead of `messageId`. This ensures `email_queue` status correctly updates to 'sent' and `provider_message_id` is populated.
        - Removed internal operational logging (`sent`, `send_failed`) from `process-email-queue` to `email_events` table, reserving `email_events` for Postmark webhook data. This resolved `email_events_event_type_check` constraint violations.
*   Utility functions should be created in `lib/` for shared logic like frequency capping to maintain DRY principles.
    - **Status (Update March 20, 2024):** Assumed to be in place and used by relevant API routes and Edge Functions.

### 1. Centralize `segment_rules` Evaluation Logic (New Edge Function `resolve-audience-from-rules`)
   - **Task**: Review and confirm the existing `supabase/functions/resolve-audience-from-rules/index.ts` Edge Function.
     - **Input**: `{ campaign_id: string }`.
     - **Logic**:\n       1. Fetches `segment_rules` from `email_campaigns` for `campaign_id`.\n       2. Implements audience resolution (AND/OR include, exclude) using `user_segments`.\n       3. Returns `{ data: string[] | null, error: any }` where `data` is `finalProfileIds`.\n     - **Error Handling**: Ensure robust error handling and logging.
   - **Status**: This function has already been created and seems largely correct per initial review. Minor adjustments or confirmations might be needed.
     - **Status (Update March 20, 2024):** Confirmed to be used correctly by the API routes for immediate sends. No direct modifications in this session.

### 2. Shared Utilities
   - **Task**: Confirm and test the shared utility for frequency capping.
     - **Location**: `lib/email/frequency-capping.ts` (already created).
     - **Function**: `getPermittedProfileIds(profileIds: string[], supabaseClient: SupabaseClient, logger?: Logger): Promise<string[]>`
     - **Logic**: Filters profile IDs based on recent send activity in `email_queue`.
     - **Status (Update March 20, 2024):** Assumed correct and used by API routes.
   - **Task**: Review `addToQueue` in `lib/email/queue-utils.ts`.
     - **Confirmation**: This function correctly adds items to `email_queue` with `campaignId`, `recipientEmail`, `recipientData`, `priority`, and `scheduledAt`. It does not and should not do variable substitution itself. It uses an admin Supabase client.
     - **Status (Update March 20, 2024):** Confirmed.

### 3. Modify `process-scheduled-campaigns` Edge Function
   - **Location**: `supabase/functions/process-scheduled-campaigns/index.ts`.
   - **Task**: Update the `addRecipientsToTheQueue` function (previously `addRecipientsToQueue`):\n     1.  Ensure it correctly invokes the `resolve-audience-from-rules` Edge Function to get `finalProfileIds`. (Already updated to do this).\n     2.  Fetch `unified_profiles` for these IDs (filter out bounced). (Already does this in batches).\n     3.  Apply frequency capping using the shared utility from `lib/email/frequency-capping.ts`. (Already updated to do this).\n     4.  For each valid profile, call `addToQueue` (from `lib/email/queue-utils.ts`) with `campaignId`, `recipientEmail`, and `recipientData` (the `UnifiedProfile` object). (Already updated to do this).\n     5.  **Confirm** that its internal variable substitution logic and direct email content construction are fully removed. (The current version passes `null` for subject/html_content to `addToQueue`, relying on `process-email-queue`).
   - **Status (Update March 20, 2024):** No direct changes to this function in the current session, but its reliance on `process-email-queue` (which *was* heavily modified) is critical. Task items 1-5 confirmed as per prior work.

### 4. Correct Immediate Send Flow
   - **A. Refactor `addRecipientsFromSegments` to `populateCampaignRecipientsFromRules` (in `lib/supabase/data-access/campaign-management.ts`)**:
     - **Task**: Confirm the refactoring is complete and correct.
     - **Function Name**: `populateCampaignRecipientsFromRules`.
     - **Parameters**: `(campaignId: string, adminSupabaseClient: SupabaseClient)`.
     - **Logic**:\n       1.  Invokes the `resolve-audience-from-rules` Edge Function with `campaignId` to get the list of `userIds`. (The current version in `campaign-management.ts` does this).\n       2.  Upserts these `userIds` into the `campaign_recipients` table for the given `campaignId` with status `\'pending\'`.\n       3.  Returns `{ count: number }`.\n     - **Note**: Confirm it no longer reads from the legacy `campaign_segments` table. (The current version seems correct).
     - **Status (Update March 20, 2024):** Confirmed as per prior work. The `campaign_recipients` table schema was corrected by adding the `status TEXT NOT NULL DEFAULT 'pending'` column, which was a blocker for this function.
   - **B. Update `POST /api/admin/campaigns/[id]/send/route.ts` (Handler at `app/api/admin/campaigns/[id]/send/route.ts`)**:
     - **Task**: Modify this route to:\n       1.  Call the refactored `populateCampaignRecipientsFromRules(campaignId, adminSupabaseClient)`. (Current version does this).\n       2.  Invoke `resolve-audience-from-rules` Edge Function with `campaign.id` to get `finalProfileIds`. (Current version does this).\n       3.  Fetch `unified_profiles` for these `finalProfileIds` (filter out bounced emails). (Current version does this).\n       4.  Apply frequency capping using the shared utility from `lib/email/frequency-capping.ts`. (Current version does this).\n       5.  Implement campaign-specific duplicate check against `email_queue` for the current campaign. (Current version does this).\n       6.  For each valid profile, call `addToQueue` (from `lib/email/queue-utils.ts`) with the campaign ID, recipient\'s email, and the `UnifiedProfile` object as `recipientData`. (Current version does this).\n       7.  Review the call to `triggerCampaignSend(id)`. The build note says \"remains for now,\" but its role is diminished. It primarily updates campaign status. Ensure this is appropriate. (Current version still calls it).\n       8.  Ensure `recalculateCampaignAnalytics(id)` is called to create/update analytics record. (Current version does this).
     - **Status (Update March 20, 2024):** Items 1-6 and 8 are confirmed as per prior work. Item 7 **RESOLVED**: The call to `triggerCampaignSend(id)` was **removed**. This route now directly updates the campaign status to 'sending' (or 'sent' after queuing) and includes `status_message`.
   - **C. Update `POST /api/admin/campaigns/send/route.ts` (Handler at `app/api/admin/campaigns/send/route.ts`)**:
     - This is the generic send route, potentially called by `triggerCampaignSend`.
     - **Task**: This route has been updated to perform the same logic as the specific `/[id]/send` route (steps 4.B.2 through 4.B.6 and 4.B.8).
     - **Confirm**: That it no longer calls the legacy `addRecipientsFromSegments`.
     - **Confirm**: That redundant logic with `triggerCampaignSend` and the specific `/[id]/send` route is minimized. Ideally, `triggerCampaignSend` should only update status, and one of these API routes becomes the sole immediate send processor.
     - **Status (Update March 20, 2024):** Logic confirmed to mirror the specific send route. The call to `triggerCampaignSend(id)` was also **removed** from this route. It now directly updates campaign status to 'sending' (or 'sent') and includes `status_message`. Redundancy minimized.
   - **D. Update `triggerCampaignSend` (in `lib/supabase/data-access/campaign-management.ts`)**:
     - **Task**: Review its interaction with the generic `/api/admin/campaigns/send` route.\n       - Currently, `triggerCampaignSend` updates campaign status to \'sending\' and then `fetch`es `POST /api/admin/campaigns/send`.\n       - Given that `POST /api/admin/campaigns/send` now also does full audience resolution and queueing, `triggerCampaignSend` might be simplified to just update status, or the call to the generic API from `triggerCampaignSend` might be removed if the specific `/[id]/send` is the primary entry point for UI-triggered sends. This needs clarification and streamlining to avoid redundant processing.
     - **Status (Update March 20, 2024):** **RESOLVED**. `triggerCampaignSend` has been simplified to *only* update the campaign status to 'sending' using the admin client. The `fetch` call to the generic `/api/admin/campaigns/send` route was **removed**. This clarifies its role and removes redundant processing.

### 5. Enhance \"Review & Send\" Tab Audience Summary
   - **Task**: In `app/admin/email/campaigns/components/campaign-detail.tsx`:\n     1. Create a derivation logic for an `audienceSummaryForReview` object from `currentCampaign.segment_rules`.\n        ```typescript\n        // Example structure for the summary object\n        interface AudienceSummaryForReview {\n          includeOperator: \'AND\' | \'OR\';\n          includedSegments: Array<{ id: string; name: string }>;\n          excludedSegments: Array<{ id: string; name: string }>;\n        }\n        // Derivation logic:\n        // const audienceSummaryForReview = {\n        //   includeOperator: currentCampaign.segment_rules.include.operator,\n        //   includedSegments: (currentCampaign.segment_rules.include.segmentIds || []).map(id => ({ id, name: getSegmentDetails(id)?.name || \'Unknown\' })),\n        //   excludedSegments: (currentCampaign.segment_rules.exclude?.segmentIds || []).map(id => ({ id, name: getSegmentDetails(id)?.name || \'Unknown\' }))\n        // };\n        ```\n     2. Pass this `audienceSummaryForReview` object as a prop to `ReviewSendTabContent.tsx`.
   - **Task**: Update `app/admin/email/campaigns/components/tabs/review-send-tab-content.tsx`:\n     1. Modify its props to accept `audienceSummary: AudienceSummaryForReview | null`.\n     2. Update its rendering logic to display the include operator (AND/OR), the list of included segment names, and the list of excluded segment names, using the new `audienceSummary` prop.\n     3. Adjust local validation logic (`validateCampaignLocal`) to check `audienceSummary.includedSegments.length` instead of `campaignSegments.length`.
   - **Status (Update March 20, 2024):** **COMPLETED**. `campaign-detail.tsx` now correctly derives `audienceSummaryForReview` and passes it. `ReviewSendTabContent.tsx` was updated to accept and render this summary, including the operator, included segments, and excluded segments. Validation logic was also updated.

### 6. Testing and Verification
   - **Task**: Create test campaigns with various `segment_rules` (AND, OR, with/without exclusions).
     - **Status (Update March 20, 2024):** Ongoing.
   - **Task**: Test immediate send functionality:\n     - Verify correct `userIds` (and thus `recipientEmail` and `recipientData`) are added to `email_queue` based on `segment_rules`.\n     - Verify `campaign_recipients` table is correctly populated by `populateCampaignRecipientsFromRules`.
     - **Status (Update March 20, 2024):** Tested. `campaign_recipients.status` column fixed. API routes populate queue correctly.
   - **Task**: Test scheduled send functionality (ensure `process-scheduled-campaigns` works as expected with the centralized logic and correctly populates `email_queue`).
     - **Status (Update March 20, 2024):** Relies on correct `process-email-queue`.
   - **Task**: Verify the \"Review & Send\" tab accurately displays the full audience summary.
     - **Status (Update March 20, 2024):** **COMPLETED**.
   - **Task**: Ensure `process-email-queue` correctly fetches templates and substitutes variables using `recipient_data`.
     - **Status (Update March 20, 2024):** **COMPLETED**. Issues with template fetching, variable substitution, and event logging resolved. Logic to mark campaigns 'completed' also added.
     - **Status (Update May 22, 2024):** **ENHANCED**. The function now also updates `campaign_recipients.status` to 'sent' and `campaign_recipients.sent_at` upon successful send, further improving data accuracy.
     - **Status (Update May 23, 2024):** **FURTHER ENHANCED AND DEBUGGED.**
        - Resolved `TypeError` during variable substitution by correcting how `substituteVariables` is called for subject and body.
        - Fixed `email_events` logging for failures by correctly placing error information into the `payload` field (this was mainly about removing the direct logging that caused errors, as per previous fix).
        - Corrected `email_queue` status updates for successful sends to use `provider_message_id` column.
        - Removed internal send/fail logging from `process-email-queue` to `email_events` to prevent check constraint violations, aligning `email_events` for Postmark webhook data.
        - As a result of these fixes, `email_queue` items should now correctly transition to 'sent' (with `provider_message_id`) or 'failed' (with `last_error`), and `campaign_recipients` are correctly updated upon successful send.

**Additional UI/UX Enhancements (Implemented March 20, 2024):**
- **Real-time Sending Progress:**
    - Created new API endpoint `GET /api/admin/campaigns/[id]/sending-stats` to provide counts (totalQueued, processed, failed, retrying, pending) from `email_queue` and `campaign_analytics`.
    - `app/admin/email/campaigns/components/tabs/overview-tab-content.tsx` updated to:
        - Fetch from `/sending-stats` endpoint with polling for campaigns in 'sending' or 'sent' status.
        - Display these stats and a `Progress` bar in a "Sending Progress" card.
- **Toast Notifications:**
    - Refined toast messages in `ReviewSendTabContent.tsx` (initial confirmation) and `CampaignDetail.tsx` (after API call) for better user feedback during the send process.
    - `useCampaignStore.ts`'s `sendCampaign` action updated to return a more detailed object for richer toast messages.
- **Campaign Status Lifecycle:**
    - API routes (`/[id]/send` and `/send`) now update campaign status to `sent` after successfully queueing emails and set `status_message`.
    - `process-email-queue` function in `supabase/functions/process-email-queue/index.ts` now includes `checkAndFinalizeCampaigns` function to update campaign status to `completed` and set `completed_at` and `status_message` when all associated emails are processed.
    - SQL error in `sending-stats` route related to `GROUP BY` clause for `email_queue.status` was fixed.


## Technical Considerations
- **Performance of `resolve-audience-from-rules` Edge Function**: Confirmed to be critical and seems reasonably implemented. Database indexing on `user_segments(segment_id, user_id)` is vital.
- **`process-email-queue` Variable Substitution**: Re-emphasize that this Edge Function **must** handle template fetching and variable substitution using `recipient_data`. The current version (`supabase/functions/process-email-queue/index.ts`) has been updated to do this.
  - **Status (Update March 20, 2024):** **CONFIRMED AND IMPLEMENTED.**
- **Code Duplication/Streamlining**: Pay close attention to the roles of `triggerCampaignSend`, `POST /api/admin/campaigns/[id]/send`, and `POST /api/admin/campaigns/send` to eliminate redundant audience resolution or queueing steps.
  - **Status (Update March 20, 2024):** **RESOLVED.** `triggerCampaignSend` simplified; API routes handle full send logic without redundant calls.
- **Transaction Management & Idempotency**: Ensure operations are idempotent where possible, and status updates accurately reflect the state, especially across API calls and Edge Function invocations.
  - **Status (Update March 20, 2024):** Improved by refining status updates and conditional updates (e.g., only updating campaign to 'completed' if status is 'sent').

## Completion Status
Partially Completed. Major corrections to the send pipeline and UI enhancements for audience review and sending progress are done.
The core objectives regarding `segment_rules` application for immediate sends, unified recipient generation, and enhanced "Review & Send" tab are largely met. The `process-email-queue` function is now significantly more robust.

## Next Steps After Completion
- Address any remaining ambiguities in the immediate send flow (roles of `triggerCampaignSend` vs. API routes).
  - **Status (Update March 20, 2024):** This seems largely resolved. `triggerCampaignSend` is now minimal.
- Resume other tasks from \"Email System - Phase 3: Advanced Features & UX Polish\".
- Conduct thorough end-to-end testing of the entire email campaign lifecycle.
  - **Status (Update March 20, 2024):** This is the primary remaining step for this build note.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes (especially Phase 2 & 3) for context and established patterns.
> 2. Consult the implementation strategy and architecture planning documents if available.
> 3. Align your work with the project context (`ProjectContext.md`), design context (`designContext.md` if used), and these build notes guidelines (`ProjectDocs/build-notes-guidelines.md`).
> 4. Follow the established folder structure, naming conventions, and coding standards.
> 5. Include this reminder in all future build notes to maintain consistency. 
> 6. 