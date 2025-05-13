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
- [x] Implement test sending functionality <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] Send to specific test email addresses
  - [x] Validation for email formats
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

## Completion Status

> **Status Update (2025-05-12):**
> - Core campaign management infrastructure is now implemented.
> - Database schema, data access layer, and API endpoints are complete.
> - Basic UI components for campaign creation, listing, detail view, and scheduling are implemented.
> - The system follows the project's functional programming principles, mobile-first approach, and keeps files under 150 lines.
> - Fixed build error related to admin client imports and type definitions by removing redundant admin-client.ts file and using the existing admin.ts functionality.
> - Fixed Next.js dynamic API warnings by properly awaiting params in API routes.
> - Implemented server/client component split architecture for campaign detail page to properly handle dynamic parameters.
> - Updated all campaign management data access functions to use the admin client to bypass RLS policies.
> - Added missing getCampaignAnalytics function to properly fetch campaign analytics data.
> - Improved error handling in analytics functions to gracefully handle missing tables or data.
> - Replaced unsupported Supabase query methods (like .group()) with compatible alternatives.
> - Added defensive programming with fallback values and proper error logging throughout the codebase.
> - Added proper TypeScript interfaces for campaign-related types to ensure type safety.
> - Ensured proper integration with existing admin functionality.
> - Implemented Zustand store for campaign state management with comprehensive actions for all CRUD operations.
> - Remaining work focuses on template editor integration with the existing Unlayer editor, enhanced segment targeting UI, and advanced analytics features.

> **Status Update (2025-05-13): Campaign Creation Flow Debugging & Schema Alignment**
> - **Objective:** Resolve critical errors preventing the creation of new email campaigns via the `POST /api/admin/campaigns` API endpoint.
> - **Initial Problem:** The campaign creation process was failing due to misalignments between the application code (TypeScript interfaces, data access functions) and the actual Supabase database schema for the `email_templates` and `email_campaigns` tables.
> - **Debugging Journey & Key Issues Identified:**
>   - **Lint Errors & Type Mismatches:** Initial investigations, guided by TypeScript lint errors, pointed towards discrepancies in expected properties for email templates (e.g., `design_json`, `is_public`, `user_id`, `thumbnail_url`) within `lib/supabase/data-access/templates.ts`.
>   - **Runtime Error - `email_templates` Schema:** A persistent runtime error, `column email_templates.is_public does not exist` (and similar for `user_id`, `thumbnail_url`), confirmed that our data access layer was attempting to select columns that were not present in the `email_templates` table. It also highlighted that the template's design data was stored in a column named `design`, not `design_json`.
>   - **Runtime Error - `email_campaigns` Schema:** After resolving template fetching, a subsequent error `Could not find the 'subject' column of 'email_campaigns' in the schema cache` (PostgREST error PGRST204) indicated that the `email_campaigns` table did not, in fact, have a `subject` column, contrary to earlier assumptions.
> - **Solutions & Fixes Implemented:**
>   - **Corrected `email_templates` Data Access (`lib/supabase/data-access/templates.ts`):**
>     - Modified the `EmailTemplateDetail` interface to accurately reflect the `email_templates` schema:
>       - Removed non-existent fields: `is_public`, `user_id` (template owner), `thumbnail_url`.
>       - Ensured the application logic maps the database's `design` column to an expected `design_json` field for use with Unlayer.
>     - Updated the `getEmailTemplateById` function's `select` statement to:
>       - Fetch only existing columns from `email_templates`.
>       - Use the correct column name `design` for fetching template layout data.
>   - **Corrected `email_campaigns` Data Access & API (`lib/supabase/data-access/campaign-management.ts`, `app/api/admin/campaigns/route.ts`):**
>     - Removed the `subject` field from the `EmailCampaign` interface and its associated `EmailCampaignInsert` and `EmailCampaignUpdate` types in `campaign-management.ts`, as this column does not exist in the database. The campaign subject is to be derived from the linked template at the point of use (e.g., sending, display).
>     - Removed the `subject` property from the payload passed to the `createCampaign` function within the `POST /api/admin/campaigns` API route.
>     - Ensured that the `createCampaign` call in the API route correctly provides default `null` values for other nullable fields expected by `EmailCampaignInsert` (e.g., `scheduled_at`, `completed_at`, `ab_test_variant_count`).
> - **Outcome:** The campaign creation functionality (`POST /api/admin/campaigns`) is now operating correctly, successfully creating new campaigns by fetching necessary details from the selected email template and aligning with the true database schema.

> **Status Update (2025-05-13): Template Selection Modal Integration & Fixes**
> - **Objective:** Ensure the "Load from Template" functionality within the campaign creation/editing UI correctly fetches and utilizes real email template data.
> - **Initial Problem:** The `TemplateSelectionModal` component (`app/admin/email/campaigns/components/template-selection-modal.tsx`) was using mock data. When attempting to switch to real data, it initially showed "No templates available."
> - **Debugging Journey & Key Issues Identified:**
>   - **Mock Data Replacement:** The first step was to replace the mock data fetching logic in `TemplateSelectionModal` with an API call to `GET /api/admin/email/templates`.
>   - **API Returning Empty List:** Network inspection revealed the API endpoint `/api/admin/email/templates` was responding successfully (HTTP 200) but with an empty `templates` array: `{"templates":[],"total":0,...}`. This indicated the issue was with the API's ability to retrieve templates.
>   - **Incorrect Supabase Client:** The API route `app/api/admin/email/templates/route.ts` was using `createClient()` (the standard client-side/user-RLS-aware Supabase client). For an admin route needing to list all templates, this client might be restricted by RLS policies, leading to no templates being returned if none were publicly accessible or owned by the current (potentially anonymous or non-admin) user context of the client.
> - **Solutions & Fixes Implemented:**
>   - **Standardized API Response for Templates (`app/api/admin/email/templates/route.ts`):**
>     - Modified the `GET` handler to explicitly map the `design` column from the database to a `design_json` field in the returned template objects. This ensures consistency with `getEmailTemplateById` and simplifies client-side consumption.
>   - **Corrected Supabase Client in API Route (`app/api/admin/email/templates/route.ts`):**
>     - Replaced `createClient()` with `createServiceRoleClient()` (imported from `@/lib/supabase/server`). This ensures the API uses a Supabase client with service role privileges, bypassing RLS and allowing it to fetch all templates from the `email_templates` table.
>   - **Updated `TemplateSelectionModal` (`app/admin/email/campaigns/components/template-selection-modal.tsx`):**
>     - Implemented the API call to `GET /api/admin/email/templates`.
>     - Defined appropriate TypeScript interfaces (`ApiEmailTemplate`, `EmailTemplateSummary`) to handle the API response.
>     - Ensured the `onTemplateSelect` callback receives the `id`, `html_content` (as `htmlBody`), and `design_json` (as `designJson`) from the selected template.
> - **Outcome:** The "Load from Template" modal now correctly fetches and displays the list of available email templates from the database. Selecting a template in the modal successfully provides its details to the parent campaign component.

### Completed Components
- **Database Schema**: All required tables (`campaign_segments`, `campaign_templates`, `campaign_analytics`) and modifications to existing tables are complete.
- **Data Access Layer**: Full CRUD operations, scheduling, analytics, and segment/template management functions are implemented.
- **API Endpoints**: All required endpoints for campaign management, scheduling, testing, and delivery are implemented.
- **UI Components**: Campaign list, creation form, detail view, and scheduler components are implemented.

### Remaining Work
1. **Template Editor Integration**:
   - Connect the campaign content tab with the existing Unlayer editor (`/app/admin/email-templates/unlayer-email-editor.tsx`)
   - Implement the template selection UI in the campaign creation flow
   - Add support for template versioning and A/B testing variants in the campaign context
   - Implement content preview functionality using the existing `TemplatePreview` component
   - Ensure proper variable replacement for campaign-specific content

2. **Segment Targeting UI**:
   - Complete the UI for selecting and managing segments in campaigns using the existing segmentation system
   - Leverage the tagging system's core infrastructure that was completed on 2025-05-12
   - Implement recipient preview functionality to show a sample of users who will receive the campaign
   - Add audience size estimation to display the potential reach of the campaign
   - Create an intuitive interface for complex segment combinations (AND/OR/NOT operations)

3. **Enhanced Analytics**:
   - Implement the campaign analytics dashboard with real-time data
   - Add time-series charts for engagement metrics (opens, clicks, bounces over time)
   - Implement campaign comparison features to compare performance across campaigns
   - Create exportable reports for campaign performance analysis
   - Visualize A/B test results when applicable

4. **Background Processing**:
   - Implement proper queuing for scheduled campaigns using a reliable background job system
   - Add batch processing for large recipient lists to prevent timeouts and rate limiting
   - Create monitoring dashboard for delivery progress and real-time status updates
   - Implement retry mechanisms for failed deliveries
   - Add comprehensive logging for debugging and auditing purposes

## Next Steps After Completion

After completing the remaining work on the campaign management system, we will move on to implementing the User Preference Management system, which will allow users to control their email preferences and ensure compliance with email marketing regulations.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency

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
        *   The payload for saving now explicitly includes `status: 'draft'`.
        *   Added a loading state (`isSavingDraft`) and spinner to the "Save Draft" button for better UX.
    *   **`handleTemplateSelected` Updated:** This function was also modified to call `updateCampaign` (instead of `updateCampaignFields`) to ensure that selecting a template immediately saves its content to the backend as part of the current draft.
    *   **Type Import Added:** Imported `EmailCampaign` from `@/lib/supabase/data-access/campaign-management` to resolve the lint error.
*   **Zustand Store (`useCampaignStore`) Utilized:** Relied on the existing `updateCampaign` and `createCampaign` actions in the store which already handle API interactions.
*   **Unlayer Editor (`UnlayerEmailEditor`) Interaction:** Confirmed that the editor component exposes an `exportHtml` method via its `ref`, which is now being used.

**Outcome:** The "Save Draft" functionality should now correctly save all relevant campaign data, including the latest Unlayer editor content, to the database. Selecting a template also persists its content to the backend immediately.

**Next Steps:**

1.  Thorough testing of the "Save Draft" functionality.
2.  Testing of "Load from Template" to ensure it integrates with the save draft flow correctly.
