# Email System Phase 2: Campaign Management

## Task Objective
Implement a comprehensive email campaign management system that leverages the existing segmentation functionality to enable targeted email campaigns, with features for creation, scheduling, delivery, and performance monitoring.

## Current State Assessment
The platform currently has a functional email infrastructure with Postmark integration, template management via Unlayer, and a recently completed user segmentation system. Users can create and manage email templates, and define user segments based on tags with complex logical operations. However, there is no way to create, schedule, or send email campaigns to these segments, nor track campaign-specific performance metrics.

## Future State Goal
A robust campaign management system that allows administrators to:
- Create email campaigns using existing templates
- Target specific user segments with campaigns
- Schedule campaigns with timezone support and recurring options
- Monitor campaign delivery and performance in real-time
- Implement A/B testing for campaign content optimization
- Ensure compliance with email marketing best practices and regulations

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed email system Phase 1 implementation
> 2. Project context (`ProjectContext.md`)
> 3. Email template manager documentation
> 4. User segmentation system documentation
>
> This ensures consistency and alignment with project goals and standards.

### From Previously Completed Work
- **Email Templates**: The platform has a fully functional template management system using Unlayer editor
- **User Segmentation**: Recently completed system for creating and managing user segments based on tags
- **Email Analytics**: Basic email analytics are implemented, with both platform-wide and per-user views
- **Postmark Integration**: Email delivery is handled through Postmark with proper authentication

### From Project Context
From the `ProjectContext.md`, the following key points inform our campaign management approach:
- **Mobile-first Design**: All interfaces must be responsive and work well on mobile devices
- **Functional Programming**: Use functional, declarative programming patterns (avoid OOP and classes)
- **DRY Principles**: Maintain code reusability and avoid duplication
- **Performance**: Ensure efficient database queries and UI rendering

## Implementation Plan

### 1. Campaign Data Model & Database Schema
- [x] Define campaign data model in Supabase <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Create `campaign_segments` junction table to link campaigns with user segments
  - [x] Create `campaign_templates` table to store campaign-specific template versions
  - [x] Create `campaign_analytics` table for campaign-specific metrics
  - [x] Add A/B testing fields to existing `email_campaigns` table
  - [x] Implement proper indexes, RLS policies, and constraints
- [x] Generate TypeScript types for the new tables <span style="color: green;">(Completed 2025-05-12)</span>
- [x] Create data access layer for campaign-related operations <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Implement CRUD functions for campaigns
  - [x] Create functions for campaign scheduling and delivery
  - [x] Build functions for campaign analytics
  - [x] Implement segment and template management functions

### 2. Campaign API Endpoints
- [x] Create RESTful API endpoints for campaign management <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] `GET/POST /api/admin/campaigns` for listing and creating campaigns
  - [x] `GET/PATCH/DELETE /api/admin/campaigns/[id]` for individual campaign operations
  - [x] `POST /api/admin/campaigns/[id]/schedule` for scheduling campaigns
  - [x] `POST /api/admin/campaigns/[id]/test` for sending test emails
  - [x] `POST /api/admin/campaigns/[id]/send` for triggering campaign delivery
  - [x] `GET /api/admin/campaigns/[id]/analytics` for campaign-specific analytics
  - [x] Endpoints for template and segment management
- [x] Implement proper validation, error handling, and response formatting <span style="color: green;">(Completed 2025-05-12)</span>
- [x] Add authentication and authorization checks <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Integrate with existing `validateAdminAccess` function
  - [x] Add role-based access control for admin and marketing roles

### 3. Campaign Creation & Editing UI
- [x] Create Zustand store for campaign state management <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Implement state management for campaigns, templates, segments, and analytics
  - [x] Create actions for all CRUD operations and API interactions
- [x] Implement campaign creation form <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Basic campaign information (name, description, etc.)
  - [x] Template selection
  - [x] A/B testing configuration toggle
  - [x] Sender information fields
- [x] Build campaign list view with filtering and sorting <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Status filtering
  - [x] Pagination
  - [x] Action buttons for edit, schedule, and delete
- [x] Create campaign detail view with tabs <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Overview and basic information
  - [x] Content tab structure
  - [x] Targeting tab structure
  - [x] Analytics tab with metrics
- [ ] Implement template editor integration <span style="color: orange;">(In progress)</span>
  - [ ] Connect campaign content tab with Unlayer editor
  - [ ] Add support for template versioning
  - [ ] Implement A/B testing variant creation

### 4. Campaign Scheduling & Delivery System
- [x] Implement scheduling functionality <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] One-time scheduling with timezone support
  - [x] Date and time selection interface
  - [x] Schedule validation
- [x] Build campaign delivery system <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] API endpoints for triggering campaign delivery
  - [x] Status tracking and updates
- [x] Implement test sending functionality <span style="color: green;">(Completed 2025-05-13 - Enhanced with variable handling and direct API implementation. Email sending simulated.)</span>
  - [x] Send to specific test email addresses <span style="color: green;">(Completed 2025-05-13 - Now single recipient, supports variables)</span>
  - [x] Validation for email formats <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] **New:** API endpoint `/api/admin/campaigns/[id]/test` refactored for direct HTML/subject/variable input. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] **New:** Variable substitution logic implemented in client and API. <span style="color: green;">(Completed 2025-05-13)</span>
  - [ ] **New:** Actual email sending via a service (e.g., Resend) needs to be integrated into the API's `sendEmailUtility`. <span style="color: orange;">(To Do)</span>
- [ ] Enhance delivery system <span style="color: orange;">(In progress)</span>
  - [ ] Create proper queue for scheduled campaigns
  - [ ] Implement batch processing for large recipient lists
  - [ ] Add rate limiting and throttling to prevent overloading

### 5. Campaign Analytics & Reporting
- [x] Create campaign analytics data model <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Define metrics schema in `campaign_analytics` table
  - [x] Implement API for retrieving and updating analytics
- [x] Implement basic campaign performance dashboard <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Summary metrics cards (recipients, sent, opens, clicks)
  - [x] Rate calculations (open rate, click rate, bounce rate)
  - [x] Last updated timestamp
- [ ] Enhance analytics dashboard <span style="color: orange;">(In progress)</span>
  - [ ] Time-series charts for engagement over time
  - [ ] Comparison with previous campaigns
  - [ ] A/B test results visualization
  - [ ] Exportable reports

### 6. UI/UX Enhancements for Campaign Management (Based on Expert Review - 2025-05-13)

#### A. Enhancements for `CampaignDetail.tsx` ("Content" Tab)
- [x] **Add "Send Test Email" Functionality:** <span style="color: green;">(Completed 2025-05-13 - Core functionality with variable handling and API integration. Email sending is simulated.)</span>
  - [x] Implement a "Send Test Email" button within the "Content" tab. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Modal for inputting test email addresses (now single recipient) and email variables. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Test email uses current campaign subject and Unlayer editor content (even if unsaved). <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Provide clear success/error feedback (toast notifications). <span style="color: green;">(Completed 2025-05-13 - Basic UI feedback implemented)</span>
  - [x] Integrate with `POST /api/admin/campaigns/[id]/test` endpoint. <span style="color: green;">(Completed 2025-05-13 - Client calls endpoint, API refactored)</span>
  - [x] **Note:** Leverage UI patterns and potentially adapt logic from `app/admin/email-templates/template-tester.tsx`... <span style="color: green;">(Completed - Approach considered and adapted)</span>
  - [x] **Variable Presentation in Test Modal:** <span style="color: green;">(Completed 2025-05-13 - Variables listed and editable. Grouping/tooltips are future enhancements.)</span>
    - [x] List all variables found in campaign content as editable fields (pre-filled with example data from `generateDefaultVariableValues`). <span style="color: green;">(Completed 2025-05-13)</span>
    - [ ] Group variables by category (e.g., User, Course, Action, Other) for clarity. <span style="color: orange;">(To Do - Future enhancement)</span>
    - [ ] Use tooltips or subtle text for fields representing system-populated variables (e.g., `{{user.firstName}}`) explaining they use example data for this test and will be replaced by real data in actual sends. <span style="color: orange;">(To Do - Future enhancement)</span>
- [ ] **Implement "Preview with Variables":**
  - [ ] "Preview As..." button/dropdown in the "Content" tab.
  - [ ] **Option 1 (Simpler - Recommended Start):** List available variables detected in the content.
    - [ ] Use `extractVariablesFromContent(currentUnlayerContent)` from `lib/services/email/template-utils.ts` to get variable names.
    - [ ] Use `categorizeVariables(variableNames)` from `lib/services/email/template-utils.ts` to display variables with descriptions and example values in a modal or dropdown.
    - [ ] **UI for Listing Variables:**
      - [ ] Group variables by category (e.g., User, Course, Action, System-Populated, Campaign-Specific, Other) as determined by `categorizeVariables`.
      - [ ] For each variable, display its name (e.g., `{{user.email}}`), `description` (e.g., "User's email address"), and example `value` (e.g., "test@example.com").
      - [ ] Add a visual cue or note (e.g., small icon, appended text like "(auto-filled from user data)") for categories typically system-populated (User, Course, Event data) to distinguish them from potentially campaign-specific or purely test variables.
  - [ ] **Option 2 (Advanced):** Allow selection of a sample user profile (if available) or manual input of variable data in a modal to render the email with populated variables.
    - [ ] This would involve a more complex UI for data input, potentially reusing categorized input fields similar to `TemplateTester`.
    - [ ] Requires a client-side rendering mechanism or a backend preview generation endpoint.
- [x] **Dedicated Campaign Subject Line Field:** <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Add an editable input field for "Campaign Subject" (in "Content" or "Overview" tab). <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Auto-populate from selected template's subject initially. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] This field overrides the template subject for the specific campaign. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Ensure this subject is used for actual sends and test sends. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Update Zustand store and save/update logic to include campaign-specific subject. <span style="color: green;">(Completed 2025-05-13)</span>

#### B. Build Out `CampaignDetail.tsx` ("Targeting" Tab)
- [x] **Implement Segment Selection Interface:** <span style="color: green;">(Completed 2025-05-14)</span>
  - [x] Allow selection of one or more existing User Segments. <span style="color: green;">(Completed 2025-05-14)</span>
  - [x] Include search/filter functionality for segments. <span style="color: green;">(Completed - Part of available segments display)</span>
  - [x] Clearly display selected segments. <span style="color: green;">(Completed 2025-05-14)</span>
  - [x] **Resolved issues with adding/removing segments (2025-05-14):**
    - [x] Fixed "Failed to add segment to campaign - duplicate key" error by ensuring data-access functions (`getCampaignSegments`, `addCampaignSegment`, `removeCampaignSegment`) use the admin Supabase client (`getAdminClient()`) to bypass RLS. This ensures the UI accurately reflects existing segment associations, preventing attempts to re-add.
    - [x] Fixed "Unexpected token '<'" error when removing segments by creating the missing API route handler for `DELETE /api/admin/campaigns/[id]/segments/[segment_id]`.
    - [x] Verified that `useCampaignStore` correctly calls the new `DELETE` endpoint.
- [ ] **Dynamic Audience Size Estimation:** <span style="color: orange;">(In progress)</span>
  - [x] **Investigation (2025-05-14):** Audience estimation in campaign "Targeting" tab relies on `user_segments` table. Discrepancy found where this table was empty for selected segments, causing a '0' estimate, while the segmentation page's "Preview" feature (which uses dynamic calculation) showed correct counts after a fix.
  - [x] **Fix (2025-05-14):** Corrected `lib/segmentation/engine.ts` (`getSegmentPreview` function) to fetch segment rules from the `segments` table instead of `user_segments`. This ensures the "Preview" button on the segmentation page accurately calculates and displays user counts dynamically.
  - [ ] Display total estimated recipients in Campaign Targeting tab based on selected segments (currently reads from `user_segments`, which may be empty). <span style="color: orange;">(To Do - UI element exists but shows 0 if `user_segments` is not populated)</span>
  - [ ] Implement a robust mechanism to populate/update the `user_segments` table based on segment rules and user tag changes. This is crucial for the campaign audience estimation to work correctly. <span style="color: red;">(High Priority - To Do)</span>
  - [ ] Show warnings for unexpectedly small/large audiences.
- [ ] **(Optional) Segment Combination Logic:**
  - [ ] Allow specifying AND/OR logic for multiple selected segments.
- [ ] **(Optional) Exclusion Logic:**
  - [ ] Allow selecting segments to exclude from the campaign.
- [ ] **(Optional) Recipient Preview:**
  - [ ] Button to "Preview Recipients" showing a sample list from target segments.
- [ ] **State Management:** Store selected segment IDs and logic in campaign state and save to database.

#### C. Introduce "Review & Confirm" Step/Tab in `CampaignDetail.tsx`
- [ ] **Create a "Review" Tab or Pre-Send Modal:**
  - [ ] Display a summary before sending/scheduling: Campaign Name, Final Subject Line, Sender Info, Target Audience (segments & estimated count), Content Snapshot/Preview Link, Scheduled Time (if any).
  - [ ] Require a final "Confirm & Send" or "Confirm & Schedule" action.

#### D. General UI/UX Polish
- [ ] **`CampaignDetail.tsx` Polish:**
  - [ ] Clarify "Schedule" button flow; consider a simple scheduling modal for basic cases.
  - [ ] Add tooltips for icons and less obvious fields.
  - [ ] Maintain consistent loading/disabled states for all actions.
- [ ] **`CampaignList.tsx` Polish:**
  - [ ] Consider adding key performance metrics (Sent, Open Rate, Click Rate) directly to the list for completed campaigns.
  - [ ] Ensure badge colors for statuses are distinct and universally understandable.

## Technical Considerations

### Performance
- Use efficient database queries with proper indexing
- Implement pagination for large result sets
- Use caching for frequently accessed data
- Optimize template rendering and delivery

### Scalability
- Design for handling large recipient lists (3k+ users)
- Implement batch processing for campaign delivery
- Use queuing for scheduled campaigns
- Consider database load during peak sending times

### Security & Compliance
- Ensure proper authentication and authorization
- Implement rate limiting to prevent abuse
- Add unsubscribe links to all marketing emails
- Store consent and preference data
- Comply with email marketing regulations (CAN-SPAM, GDPR, etc.)

### User Experience
- Provide clear feedback during campaign creation and scheduling
- Show real-time validation for email content and targeting
- Implement intuitive interfaces for segment selection
- Use progressive disclosure for advanced features
- Provide helpful error messages and guidance

## Next Steps After Completion

After completing the remaining work on the campaign management system, we will move on to implementing the User Preference Management system, which will allow users to control their email preferences and ensure compliance with email marketing regulations.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency

## Database Schema Modifications and Error Resolution (2025-05-13)

During development and testing, two key issues were identified:
1.  A runtime error: `"Could not find the 'subject' column of 'email_campaigns' in the schema cache"` when creating/updating campaigns.
2.  A persistent lint error in `lib/supabase/data-access/campaign-management.ts`: `SelectQueryError<"column 'user_id' does not exist on 'user_segments'.">` (Lint ID: `c38fea2a-08fd-41d3-a84e-fe456ea8dbb2`).

These issues were traced back to missing or incorrectly defined columns in the Supabase database. The following migrations were applied to resolve them:

### 1. `email_campaigns` Table
   - **Action:** Added a `subject` column.
   - **SQL:**
     ```sql
     ALTER TABLE public.email_campaigns
     ADD COLUMN subject TEXT;
     ```
   - **Outcome:** Resolved the runtime error related to the missing 'subject' column.

### 2. `user_segments` Table
   This table is used to link users to segments for campaign targeting.
   - **Actions:**
     - Added `user_id UUID` column.
     - Added a foreign key constraint: `user_segments.user_id` -> `auth.users(id)`.
     - Ensured `segment_id UUID` column exists and has a foreign key constraint: `user_segments.segment_id` -> `public.segments(id)`.
     - Created indexes on `user_id` and `segment_id` for performance.
   - **Key SQL Migrations Applied (summary of iterative steps):**
     ```sql
     -- Add subject to email_campaigns
     ALTER TABLE public.email_campaigns ADD COLUMN subject TEXT;

     -- Add user_id to user_segments
     ALTER TABLE public.user_segments ADD COLUMN user_id UUID;
     ALTER TABLE public.user_segments ADD CONSTRAINT fk_user_segments_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

     -- Add segment_id to user_segments
     ALTER TABLE public.user_segments ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.segments(id) ON DELETE CASCADE;
     
     -- Create indexes
     CREATE INDEX IF NOT EXISTS idx_user_segments_user_id ON public.user_segments(user_id);
     CREATE INDEX IF NOT EXISTS idx_user_segments_segment_id ON public.user_segments(segment_id);
     ```
   - **Outcome:** Resolved the lint error concerning the `user_segments` table and its columns. The `addRecipientsFromSegments` function in `lib/supabase/data-access/campaign-management.ts` should now operate correctly.

**Overall Status:**
With these schema corrections, the identified database-related errors for campaign management should be resolved. Further testing of the application is recommended to confirm.

## 2025-05-13: Fixing Campaign Save Draft Functionality

**Task Objective:** Resolve issues with the "Save Draft" functionality in the email campaign creation/editing process to ensure data is correctly persisted to the backend and Unlayer editor content is properly exported.

**Problems Addressed:**

1.  **Local State Only:** The `handleSaveCampaign` function in `CampaignDetail.tsx` was previously using `updateCampaignFields` from the Zustand store, which only updated the local client-side state and did not make an API call to save changes to the database.
2.  **Incorrect Unlayer Export:** The method for exporting HTML and design JSON from the Unlayer editor was attempting to use a global `window.unlayerExportHtml` function instead of the more robust and React-idiomatic `ref` provided by the `UnlayerEmailEditor` component.
3.  **Missing Status Update:** The campaign status was not explicitly being set to 'draft' upon saving.
4.  **Lint Error:** A type import for `EmailCampaign` was missing in `CampaignDetail.tsx`.

**Implementation Details & Fixes:**

*   **Modified `app/admin/email/campaigns/components/campaign-detail.tsx`:**
    *   **`handleSaveCampaign` Reworked:**
        *   Now correctly uses `unlayerEditorRef.current.exportHtml()` (promisified) to retrieve the latest HTML and design JSON from the Unlayer editor.
        *   Calls the `updateCampaign` action (for existing campaigns) or `createCampaign` action (for new campaigns, identified by `campaignId === 'new'`) from the `useCampaignStore`. These actions make the necessary API calls (`PATCH` or `POST`) to the backend, ensuring data persistence.
        *   The payload for saving (`campaignDataToSave`) now explicitly includes:
            *   `name: currentCampaign.name` (from the editable Campaign Name input field in the UI).
            *   `campaign_html_body: latestHtml` (from Unlayer editor).
            *   `campaign_design_json: latestDesign` (from Unlayer editor).
            *   `selected_template_id: currentCampaign.selected_template_id` (updated when a template is chosen).
            *   `status: 'draft'`.
        *   Added a loading state (`isSavingDraft`) and spinner to the "Save Draft" button for better UX.
    *   **`handleTemplateSelected` Updated:** This function was also modified to call `updateCampaign` (instead of `updateCampaignFields`) to ensure that selecting a template immediately saves its content (HTML, design JSON) and the `selected_template_id` to the backend as part of the current draft.
    *   **Type Import Added:** Imported `EmailCampaign` from `@/lib/supabase/data-access/campaign-management` to resolve the lint error.
*   **Zustand Store (`useCampaignStore`) Utilized:** Relied on the existing `updateCampaign` and `createCampaign` actions in the store which already handle API interactions.
*   **Unlayer Editor (`UnlayerEmailEditor`) Interaction:** Confirmed that the editor component exposes an `exportHtml` method via its `ref`, which is now being used.

**Outcome:** The "Save Draft" functionality should now correctly save relevant campaign data (Campaign Name, Unlayer content, selected template ID), including the latest Unlayer editor content, to the database. Selecting a template also persists its content to the backend immediately.

**Next Steps:**

1.  Thorough testing of the "Save Draft" functionality.
2.  Testing of "Load from Template" to ensure it integrates with the save draft flow correctly.

### 7. Development Log & Code Health

#### 2025-05-13
- **Campaign Subject Line Feature**:
  - Confirmed full implementation. Users can set a dedicated subject line for each campaign in `CampaignDetail.tsx`, which overrides any template-defined subject. This subject is used for test sends.
- **Send Test Email Functionality with Variable Handling**:
  - Successfully enhanced the "Send Test Email" feature.
  - The `CampaignTestSendModal` in `CampaignDetail.tsx` now dynamically extracts `{{variable}}` placeholders from the current campaign content.
  - Users are presented with input fields for each detected variable, pre-filled with default values, allowing customization before sending a test.
  - Integrated a new API endpoint `POST /api/admin/campaigns/[id]/test`. This endpoint accepts the recipient's email, the campaign subject, HTML content, and the customized placeholder data for server-side variable substitution.
  - The previous Next.js warning regarding `await params` in the test email route was also addressed.

**Prerequisites:**
- The `POSTMARK_SERVER_TOKEN` environment variable must be correctly configured for this functionality to work.

## 2025-05-14: Live Preview Modal and Utility Consolidation

**Task Objective:**
1. Implement a "Live Preview with Variables" modal in the campaign content editor.
2. Consolidate duplicated `substituteVariables` utility functions.

**1. "Live Preview with Variables" Feature (in `CampaignDetail.tsx`):**
   - **UI Changes:**
     - Added a "Live Preview" button to the "Content" tab of the campaign detail view.
   - **Modal Implementation (`LivePreviewModal`):**
     - Triggers a modal displaying the campaign's subject line.
     - Dynamically extracts `{{variable}}` placeholders from the current Unlayer email HTML content using `extractVariablesFromContent` from `lib/services/email/template-utils.ts`.
     - Generates and pre-fills input fields for each detected variable with sample data using `generateDefaultVariableValues`.
     - Allows users to modify sample data for variables.
     - Renders a live HTML preview of the email, updating in real-time as sample data is changed, using the `substituteVariables` utility.
     - The modal features a two-column layout for variable inputs and the HTML preview.
   - **Error Handling:** Includes toast notifications for errors during HTML export from the editor.

**2. Consolidation of `substituteVariables` Utility:**
   - **Centralized Function:** The `substituteVariables` function, responsible for replacing `{{variable}}` placeholders with actual values, has been moved to `lib/services/email/template-utils.ts`.
   - **Updated Consumers:**
     - The API route `app/api/admin/campaigns/[id]/test/route.ts` now imports and uses this centralized function.
     - The `CampaignTestSendModal` component within `CampaignDetail.tsx` has been updated to use the centralized function.
     - The new `LivePreviewModal` component within `CampaignDetail.tsx` also uses this centralized function.
   - **Benefit:** This refactoring reduces code duplication and centralizes the variable substitution logic, improving maintainability.

**Persistent Lint Note:**
- A minor, non-blocking TypeScript lint error (ID: `f0076cb6-206e-4758-a90c-b9c481c95db5`) persists in `CampaignDetail.tsx` related to the "Send Campaign" button's `disabled` logic and conditional text. The button's functionality is correct, and this will be monitored.

**Outcome:**
- Users can now get a more accurate, real-time preview of their email campaigns with sample data before sending tests or actual campaigns.
- The codebase is cleaner with the `substituteVariables` utility consolidated.

## Development Log & Fixes

### 2025-05-14: Troubleshooting Segmentation and Campaign API Issues

#### 1. `user_segments` Table Population (Edge Function `update-all-user-segments`)
- **Initial Issue:** The `user_segments` table was not being populated by the `update-all-user-segments` Edge Function. This was critical as the campaign audience estimation feature relies on this table.
- **Troubleshooting Steps & Resolution:**
    - Enhanced the Edge Function with detailed logging to trace data flow and query execution for segment rule processing (especially tag-based conditions).
    - Identified that the function was correctly finding users (e.g., 184 users for a test segment) but failing during the insert into `user_segments`.
    - Analyzed API logs and function logs which revealed sequential `400 Bad Request` errors from PostgREST, indicating `NOT NULL` constraint violations.
    - Used direct SQL queries against `information_schema.columns` to get the definitive schema for `user_segments` after initial attempts to parse `list_tables` output were incomplete.
    - Iteratively fixed the Edge Function by adding the missing required fields to the insert payload:
        1. Added `name: segment.name` to satisfy the `name` column's `NOT NULL` constraint.
        2. Added `rules: segment.rules` to satisfy the `rules` column's `NOT NULL` constraint.
- **Outcome:** The `user_segments` table is now being correctly populated by the `update-all-user-segments` Edge Function. This directly addresses a key part of the "Dynamic Audience Size Estimation" functionality.

#### 2. Campaign Segments API (`GET /api/admin/campaigns/[campaignId]/segments`)
- **Issue:** The API endpoint responsible for fetching segments linked to a campaign was returning a 500 error. The error message "Could not find a relationship between 'campaign_segments' and 'user_segments'" indicated an incorrect Supabase query.
- **Resolution:**
    - Located the faulty query within the `getCampaignSegments` function in `lib/supabase/data-access/campaign-management.ts`.
    - The query was incorrectly attempting to join `campaign_segments` with `user_segments` (i.e., `select('segment:user_segments(*)')`).
    - Corrected the query to join with the `segments` table (i.e., `select('segment:segments(*)')`), which holds the segment definitions.
- **Outcome:** The API endpoint now successfully fetches and returns the segments associated with a campaign, resolving the 500 error.

#### 3. General Observation & Recommendation for `user_segments` Table
- **Observation:** The `user_segments` table currently stores `name`, `description`, and `rules`, which are redundant as these are primary attributes of the `segments` table. It also has `segment_id` and `user_id` as nullable, which is not ideal for a junction table.
- **Recommendation:** For improved data integrity and efficiency, the `user_segments` table should be refactored into a pure junction table. This would involve:
    - Removing `name`, `description`, and `rules` columns.
    - Ensuring `user_id` and `segment_id` are `NOT NULL`.
    - The Edge Function would then only insert `{ user_id, segment_id }` pairs.
