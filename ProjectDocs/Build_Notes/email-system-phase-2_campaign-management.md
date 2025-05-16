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
- [x] Implement template editor integration <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] Connect campaign content tab with Unlayer editor
  - [x] Add support for template versioning
  - [x] Implement A/B testing variant creation

### 4. Campaign Scheduling & Delivery System
- [x] Implement scheduling functionality <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] One-time scheduling with timezone support
  - [x] Date and time selection interface
  - [x] Schedule validation
- [x] Build campaign delivery system <span style="color: green;">(Completed 2025-05-12)</span>
  - [x] API endpoints for triggering campaign delivery
  - [x] Status tracking and updates
  - [x] Integrated with Postmark for email delivery
- [x] Implement test sending functionality <span style="color: green;">(Completed 2025-05-16 - Fully implemented with Postmark integration)</span>
  - [x] Send to specific test email addresses <span style="color: green;">(Completed 2025-05-13 - Now single recipient, supports variables)</span>
  - [x] Validation for email formats <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] API endpoint `/api/admin/campaigns/[id]/test` refactored for direct HTML/subject/variable input. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Variable substitution logic implemented in client and API. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Integrated with Postmark for actual email sending. <span style="color: green;">(Completed 2025-05-16)</span>
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
  - [ ] **Engagement Metrics**
    - [ ] Time-series charts for opens/clicks over first 7 days
    - [ ] Device and client breakdown (desktop/mobile, email clients)
    - [ ] Geographic distribution of opens/clicks
  - [ ] **A/B Testing**
    - [ ] Side-by-side comparison of A/B test variants
    - [ ] Statistical significance indicators
    - [ ] Performance metrics per variant
  - [ ] **Export & Reporting**
    - [ ] Export to CSV/PDF functionality
    - [ ] Scheduled report generation
    - [ ] Custom date range selection
  - [ ] **Integration**
    - [ ] Webhook for real-time updates
    - [ ] API for programmatic access to metrics

### 6. UI/UX Enhancements for Campaign Management (Based on Expert Review - 2025-05-13)

#### D. General UI/UX Polish
- [ ] **Loading States**
  - [ ] Add skeleton loaders for data fetching
  - [ ] Implement optimistic UI updates where appropriate
  - [ ] Add loading spinners for async operations

- [ ] **Error Handling**
  - [ ] Consistent error messages and toasts
  - [ ] Retry mechanism for failed operations
  - [ ] Clear validation messages for forms

- [ ] **Accessibility**
  - [ ] Ensure all interactive elements are keyboard navigable
  - [ ] Add ARIA labels and roles where needed
  - [ ] Test with screen readers

- [ ] **Responsive Design**
  - [ ] Optimize for mobile and tablet views
  - [ ] Test on various screen sizes
  - [ ] Ensure modals and dialogs work well on mobile

- [ ] **Performance**
  - [ ] Implement virtualization for long lists
  - [ ] Optimize image and asset loading
  - [ ] Add pagination or infinite scroll where needed

#### A. Enhancements for `CampaignDetail.tsx` ("Content" Tab)
- [x] **Add "Send Test Email" Functionality:** <span style="color: green;">(Completed 2025-05-16 - Fully implemented with Postmark integration and UI fixes)</span>
  - [x] Implement a "Send Test Email" button within the "Content" tab. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Modal for inputting test email addresses (now single recipient) and email variables. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Test email uses current campaign subject and Unlayer editor content (even if unsaved). <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Provide clear success/error feedback (toast notifications). <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Integrate with `POST /api/admin/campaigns/[id]/test` endpoint. <span style="color: green;">(Completed 2025-05-13)</span>
  - [x] Integrated with Postmark for actual email sending. <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] Fixed UI layout issues with button placement and modal interactions. <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] **Variable Presentation in Test Modal:** <span style="color: green;">(Completed 2025-05-16)</span>
    - [x] List all variables found in campaign content as editable fields (pre-filled with example data from `generateDefaultVariableValues`). <span style="color: green;">(Completed 2025-05-13)</span>
    - [x] Group variables by category (e.g., User, Course, Action, Other) for clarity. <span style="color: green;">(Completed 2025-05-16)</span>
    - [x] Use tooltips for fields representing system-populated variables. <span style="color: green;">(Completed 2025-05-16)</span>
- [x] **Implement "Preview with Variables":** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] Added "Preview As..." button in the "Content" tab.
  - [x] Implemented variable detection and display:
    - [x] Uses `extractVariablesFromContent` to identify variables in content
    - [x] Groups variables by category using `categorizeVariables`
    - [x] Displays variables in a modal with descriptions and example values
  - [x] Added tooltips and visual indicators for system-populated variables
  - [x] Integrated with the existing variable substitution system
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
- [ ] **Implement Segment Combination Logic:**
  - [ ] Add UI for combining segments with AND/OR logic
  - [ ] Implement segment exclusion capability
  - [ ] Update audience estimation to respect combination logic
  - [ ] Add validation to prevent invalid combinations
  - [ ] Update the data model to store combination rules
  - [ ] Modify API endpoints to handle combined segments
  - [x] **Resolved issues with adding/removing segments (2025-05-14):**
    - [x] Fixed "Failed to add segment to campaign - duplicate key" error by ensuring data-access functions (`getCampaignSegments`, `addCampaignSegment`, `removeCampaignSegment`) use the admin Supabase client (`getAdminClient()`) to bypass RLS. This ensures the UI accurately reflects existing segment associations, preventing attempts to re-add.
    - [x] Fixed "Unexpected token '<'" error when removing segments by creating the missing API route handler for `DELETE /api/admin/campaigns/[id]/segments/[segment_id]`.
    - [x] Verified that `useCampaignStore` correctly calls the new `DELETE` endpoint.
- [x] **Dynamic Audience Size Estimation:** <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] **Investigation (2025-05-14):** Audience estimation in campaign "Targeting" tab relies on `user_segments` table. Discrepancy found where this table was empty for selected segments, causing a '0' estimate, while the segmentation page's "Preview" feature (which uses dynamic calculation) showed correct counts after a fix.
  - [x] **Fix (2025-05-14):** Corrected `lib/segmentation/engine.ts` (`getSegmentPreview` function) to fetch segment rules from the `segments` table instead of `user_segments`. This ensures the "Preview" button on the segmentation page accurately calculates and displays user counts dynamically.
  - [x] Display total estimated recipients in Campaign Targeting tab based on selected segments. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Implement a robust mechanism to populate/update the `user_segments` table based on segment rules and user tag changes. <span style="color: green;">(Completed 2025-05-14)</span>
  - [x] **Fix (2025-05-15):** Enhanced audience estimation endpoint to properly count all selected segments using the service role client. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] **Fix (2025-05-15):** Implemented pagination in audience estimation to handle large user sets (>1000) across multiple segments. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] **Fix (2025-05-15):** Added proper deduplication of users who belong to multiple segments to ensure accurate audience counts. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Show warnings for unexpectedly small/large audiences. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Implement functional utility to determine if audience size is 'small' (≤ 5) or 'large' (≥ 5000) and return appropriate warning message/type. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Render a visually distinct, non-blocking warning (e.g., Shadcn Alert) in the Targeting tab if present. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Ensure warning logic is DRY and reusable for future analytics or send confirmation. <span style="color: green;">(Completed 2025-05-15)</span>
- [x] **(Optional) Recipient Preview:** <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Add a "Preview Recipients" button next to the audience estimate in the Targeting tab. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] On click, open a modal and fetch a sample (10–20) of user emails/names from the selected segments. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Display the sample in a paginated or scrollable modal list, with clear UX for loading/error states. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Ensure performance: never fetch the full audience list, only a small sample. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Use the same segment selection logic as the audience estimator, but fetch user records instead of just a count. <span style="color: green;">(Completed 2025-05-15)</span>
  - [x] Ensure modal is responsive and accessible. <span style="color: green;">(Completed 2025-05-15)</span>
- [ ] **(Optional) Segment Combination Logic:**
  - [ ] Allow specifying AND/OR logic for multiple selected segments.
- [ ] **(Optional) Exclusion Logic:**
  - [ ] Allow selecting segments to exclude from the campaign.
- [ ] **(Optional) Recipient Preview:**
  - [ ] Button to "Preview Recipients" showing a sample list from target segments.
- [ ] **State Management:** Store selected segment IDs and logic in campaign state and save to database.


#### A. Database Schema for Queue System
- [x] **Create `email_queue` table** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] `id`: UUID primary key
  - [x] `campaign_id`: UUID foreign key to email_campaigns
  - [x] `status`: enum('pending', 'processing', 'sent', 'failed')
  - [x] `priority`: integer (higher = higher priority)
  - [x] `recipient_email`: text
  - [x] `recipient_data`: jsonb (for personalization)
  - [x] `scheduled_at`: timestamp with time zone
  - [x] `sent_at`: timestamp with time zone (nullable)
  - [x] `error_message`: text (nullable)
  - [x] `retry_count`: integer
  - [x] `created_at`: timestamp with time zone
  - [x] `updated_at`: timestamp with time zone

- [x] **Create `email_batches` table** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] `id`: UUID primary key
  - [x] `campaign_id`: UUID foreign key to email_campaigns
  - [x] `status`: enum('pending', 'processing', 'completed', 'failed')
  - [x] `total_emails`: integer
  - [x] `emails_processed`: integer
  - [x] `started_at`: timestamp with time zone (nullable)
  - [x] `completed_at`: timestamp with time zone (nullable)
  - [x] `error_message`: text (nullable)
  - [x] `created_at`: timestamp with time zone

- [x] **Create `email_processing_locks` table** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] `id`: UUID primary key
  - [x] `resource_id`: text (e.g., 'campaign:123')
  - [x] `locked_until`: timestamp with time zone
  - [x] `locked_by`: text (worker ID)
  - [x] `created_at`: timestamp with time zone

#### B. Queue Processing Implementation
- [x] **Create Queue Utility Functions** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] Implemented `addToQueue` function to add emails to the queue
  - [x] Created `processQueue` function to process pending emails
  - [x] Implemented rate limiting and batch processing
  - [x] Added error handling and retry logic

#### C. Update Send Endpoint
- [x] **Modified `/api/admin/campaigns/send`** <span style="color: green;">(Completed 2025-05-16)</span>
  - [x] Updated to use the new queue system
  - [x] Added recipient batching (100 emails per batch)
  - [x] Implemented proper status updates (queued → sending → completed/failed)
  - [x] Added comprehensive error handling and validation
  - [x] Integrated with existing campaign status tracking
  - [x] Added detailed logging for queue operations

## What Was Done (2025-05-16)

1. **Queue System Implementation**
   - Created database schema for email queue system
   - Implemented queue utility functions with batch processing and rate limiting
   - Updated the send endpoint to use the new queue system
   - Added comprehensive error handling and status tracking

2. **Code Improvements**
   - Fixed TypeScript type issues
   - Improved error handling and logging
   - Optimized batch processing for better performance
   - Ensured proper campaign status transitions

3. **Integration**
   - Connected queue system with existing campaign management
   - Ensured proper handling of campaign status updates
   - Added detailed logging for troubleshooting

## Next Steps

1. **Background Queue Processor**
   - Implement a background worker to process the email queue
   - Add support for scheduled campaigns
   - Implement retry logic for failed emails

2. **Testing**
   - Write unit tests for queue operations
   - Test with large recipient lists
   - Verify error handling and retries

3. **Monitoring and Alerts**
   - Add metrics for queue depth and processing times
   - Set up alerts for failed jobs
   - Implement a dashboard for monitoring queue health

4. **Documentation**
   - Document the queue system architecture
   - Add API documentation for the updated endpoints
   - Create runbooks for common operations and troubleshooting

5. **Performance Optimization**
   - Optimize database queries for queue processing
   - Implement connection pooling
   - Consider horizontal scaling for high volume

#### C. Introduce "Review & Confirm" Step/Tab in `CampaignDetail.tsx`
-#### III. "Review & Confirm" Step/Tab:
   A. **New "Review" Tab Implementation:**
      - [x] Basic tab structure with campaign details
      - [x] Audience summary with segment list
      - [x] Content preview with variable substitution
      - [x] Schedule options with timezone support
      - [x] Recurring campaign configuration
      - [x] Send/schedule confirmation dialog
   B. **Variables Handling:**
      - [x] Automatic detection of variables in email content
      - [x] Display of detected variables with sample values
      - [x] Preview of content with variables substituted
      - [x] Support for common variable types (name, email, etc.)
      - [x] Content preview section
      - [ ] Action buttons (Back, Send Now, Schedule)
      - [ ] Form validation summary
      - [ ] Confirmation dialog
      - [ ] Scheduling interface
      - [ ] Loading states and error handling
   
   B. **Validation Requirements:**
      - [ ] Required fields (subject, content, segments)
      - [ ] Audience size verification
      - [ ] Content validation
      - [ ] Schedule validation (if scheduled)
   
   C. **Confirmation Flow:**
      - [ ] Confirmation dialog with campaign summary
      - [ ] Recipient count warning
      - [ ] Final confirmation before sending

  - [ ] Display a summary with the following sections:
    - [ ] Campaign Details: Name, Subject, Sender Info
    - [ ] Audience: Selected segments, estimated recipient count, audience size warning
    - [ ] Content: Preview of the email with variables substituted
    - [ ] Schedule: Send time (immediate or scheduled)
- [ ] **Create a "Review" Tab or Pre-Send Modal:**
  - [ ] Add a new tab between "Targeting" and "Analytics" for the review step
  - [ ] Display a summary with the following sections:
    - [ ] Campaign Details: Name, Subject, Sender Info
    - [ ] Audience: Selected segments, estimated recipient count, audience size warning
    - [ ] Content: Preview of the email with variables substituted
    - [ ] Schedule: Send time (immediate or scheduled)
  - [ ] Add action buttons:
    - [ ] "Back to Edit" to return to previous tab
    - [ ] "Confirm & Send Now" for immediate sending
    - [ ] "Confirm & Schedule" for scheduled sends
  - [ ] Add a confirmation modal with warning for large audiences
  - [ ] Implement validation to ensure all required fields are filled
  - [ ] Add loading states during send/schedule operations
  - [ ] Show success/error messages after submission

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

## Campaign Scheduling and Email Delivery Workflow Documentation (2025-05-16)

### 1. Campaign Scheduling Process

The campaign scheduling process has been implemented and tested successfully. Here's a detailed breakdown of how it works:

#### Database Tables Involved:

- **`email_campaigns`**: Stores campaign data including status and scheduled_at timestamp
- **`campaign_templates`**: Stores the active template version used for sending
- **`campaign_segments`**: Links campaigns to specific user segments
- **`campaign_recipients`**: Stores individual recipients for each campaign

#### Scheduling Workflow:

1. **User Action**: Admin selects schedule date/time in the UI and clicks "Schedule" button
2. **Frontend Validation**:
   - Verifies campaign has HTML content
   - Checks if template_id is set
   - Confirms at least one segment is selected
   - May auto-save pending changes before scheduling

3. **Template Creation**:
   - Frontend checks for an active template in `campaign_templates`
   - If none exists, creates one automatically with:
     - HTML content from campaign_html_body
     - Plain text version generated by stripping HTML tags
     - Subject line from campaign.subject or campaign.name
     - template_id from selected_template_id or template_id
   - Uses the /api/admin/campaigns/[id]/templates endpoint

4. **Schedule API Call**:
   - POST request to /api/admin/campaigns/[id]/schedule
   - Validates campaign exists and is in draft status
   - Double-checks for active template
   - Updates campaign status to "scheduled" and sets scheduled_at timestamp

#### Implementation Notes:

- Admin client is used throughout to bypass RLS policies
- Both frontend and API have fallbacks to create templates if missing
- All functions include error handling and meaningful error messages
- Additional logging aids in debugging the scheduling process

### 2. Email Delivery Post-Scheduling (PENDING IMPLEMENTATION)

After a campaign is scheduled, recipients need to be populated and emails sent. This part is currently **not implemented** and needs to be added to our workflow:

#### Required Implementation:

1. **Recipient Population**:
   - The `addRecipientsFromSegments(campaignId)` function exists but needs to be triggered
   - This function:
     - Gets all segment IDs associated with the campaign
     - Fetches users from these segments with pagination (handles 1000+ users)
     - Inserts recipients into the `campaign_recipients` table with status "pending"
     - Uses upsert with conflict handling to avoid duplicates

2. **Background Job Implementation (TODO)**:
   - Need to create a scheduled background process
   - Should check for campaigns with status "scheduled" and scheduled_at <= current time
   - For each ready campaign:
     - Call addRecipientsFromSegments(campaignId)
     - Update campaign status from "scheduled" to "sending"
     - Process recipients in batches to avoid rate limits
     - Update campaign status to "sent" when complete

3. **Integration with Email Service (TODO)**:
   - Current codebase uses Postmark for email delivery
   - Need to integrate campaign sending with the existing email service
   - Include tracking pixels and click tracking for analytics

#### Suggested Implementation Options:

1. **Supabase Edge Function**:
   - Create a scheduled Edge Function that runs every X minutes
   - Checks for campaigns ready to send and processes them
   - Advantages: serverless, scales automatically

2. **External Scheduling Service**:
   - Use a service like Inngest or a custom solution
   - Set up recurring jobs to process scheduled campaigns
   - Advantages: more control over scheduling, better monitoring

3. **Webhook Integration**:
   - Use a third-party scheduling service to trigger webhooks
   - Create an API endpoint to process campaigns when triggered
   - Advantages: offloads scheduling logic to dedicated service

### Email Queue Processor Implementation and Monitoring (2025-05-16)

The Email Queue Processor has been implemented as a Supabase Edge Function with comprehensive monitoring capabilities. This implementation provides robust email delivery with monitoring, logging, and error handling.

#### Key Features Implemented:

1. **Reliable Queue Processing**
   - Batch processing with configurable size (currently 50 emails per batch)
   - Processing lock mechanism to prevent concurrent execution issues
   - Optimized database queries with proper indexes

2. **Advanced Retry Logic**
   - Exponential backoff for retries (5, 15, 60 minutes)
   - Configurable maximum retry attempts (currently 3)
   - Detailed failure tracking and error messages
   - Random jitter to prevent thundering herd issues on retries

3. **Comprehensive Monitoring System**
   - Real-time metrics collection in new `email_processing_metrics` table
   - Alert system with dedicated `email_alerts` table for issues
   - Enhanced health check endpoint with queue metrics
   - Structured logging with configurable log levels

4. **Performance Optimization**
   - Processing time tracking
   - Automatic alerts for slow processing
   - Parallel processing with rate limiting

5. **Integration with Postmark**
   - Fixed ServerClient integration with proper error handling
   - Tracking for opens, clicks via MessageStream
   - Metadata support for campaign and email tracking

#### Database Schema Added:

```sql
-- Performance metrics table for tracking email batch processing
CREATE TABLE IF NOT EXISTS email_processing_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_size INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  retry_count INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table for storing system alerts
CREATE TABLE IF NOT EXISTS email_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Monitoring Alerts Implemented:

1. **High Failure Rate Detection**
   - Triggers when failures exceed configured threshold
   - Records detailed error information for diagnosis
   - Alerts admins via the `email_alerts` table

2. **Slow Processing Detection**
   - Monitors batch processing time
   - Alerts on processing times exceeding 30 seconds
   - Calculates emails-per-second for performance monitoring

3. **Queue Health Metrics**
   - Real-time counts of emails by status (pending, processing, sent, failed, retrying)
   - Oldest pending email tracking
   - Last successful send timestamp

#### Deployment Configuration:

- Edge function deployed with JWT verification disabled
- Configured to run on a 5-minute schedule
- Service role access to ensure proper database permissions

#### Implementation Fixes (2025-05-16):

During deployment, the following issues were identified and fixed:

1. **Postmark Client Integration Fix:**
   - Fixed the `PostmarkClient` import to use `ServerClient` from the Postmark module
   - Updated from `import { PostmarkClient } from 'https://esm.sh/postmark'` to `import * as postmarkModule from 'https://esm.sh/postmark'`
   - Changed client instantiation to `const postmark = new postmarkModule.ServerClient(CONFIG.POSTMARK_SERVER_TOKEN)`

2. **Missing `processing_locks` Table Creation:**
```sql
CREATE TABLE IF NOT EXISTS processing_locks (
  id UUID PRIMARY KEY,
  lock_name TEXT NOT NULL UNIQUE,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_locks_expires_at ON processing_locks (expires_at);
```

3. **Schema Upgrade for `email_queue` Table:**
   - Added missing columns required by the processor:
```sql
ALTER TABLE email_queue 
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT,
  ADD COLUMN IF NOT EXISTS text_content TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
```

4. **Testing and Validation:**
   - Added test email to queue with proper campaign reference
   - Validated email processing and monitoring metrics

5. **Lock ID Generation Fix (2025-05-16):**
   - Identified issue with process lock acquisition that was preventing email processing
   - Fixed lock ID generation to use proper UUID instead of string format
   - Corrected code:
   ```typescript
   // Before - Invalid UUID format causing constraint violation
   const lockId = `lock:${name}`
   
   // After - Using proper UUID format
   const lockId = crypto.randomUUID()
   ```
   - Redeployed and verified proper lock acquisition

6. **Email Status Enum Fix (2025-05-16):**
   - Discovered missing 'retrying' status in email_status enum causing processing failures
   - Error: `invalid input value for enum email_status: "retrying"`
   - Applied SQL migration to add the missing enum value:
   ```sql
   ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'retrying';
   ```
   - Added test email with valid recipient to verify processing works end-to-end

## Email Campaign System Architecture and Data Flow

### Overview of Email Campaign System

The email campaign system follows a comprehensive workflow that spans from campaign creation to email delivery and monitoring. Below is a detailed breakdown of each stage, including related tables and data flows.

### 1. Campaign Creation and Management

**Tables involved:**
- `email_campaigns` - Stores core campaign data
- `campaign_templates` - Stores the email templates linked to campaigns
- `campaign_segments` - Junction table linking campaigns to user segments
- `user_segments` - Stores user segment definitions and criteria

**Flow:**
1. **Admin creates/edits a campaign** in the UI (`CampaignDetail.tsx`)
   - Campaign data is saved to the `email_campaigns` table via API calls
   - Selected template version is stored in `campaign_templates`
   - Selected segments are stored in `campaign_segments` (junction table)

2. **Targeting user segments:**
   - Admin selects segments via checkboxes in the UI
   - API endpoints at `/api/admin/campaigns/[id]/segments` handle:
     - Adding segments (`POST`) - Writes to `campaign_segments`
     - Removing segments (`DELETE`) - Removes from `campaign_segments`

3. **Test email sending:**
   - Admin uses "Send Test Email" modal in the UI
   - API endpoint at `/api/admin/campaigns/[id]/test` processes the request
   - Creates a direct entry in `email_queue` with status 'pending'

### 2. Campaign Scheduling and Queueing

**Tables involved:**
- `email_campaigns` - Updated with scheduling information
- `campaign_recipients` - Stores individual recipients generated from segments
- `email_queue` - Stores individual emails ready for delivery

**Flow:**
1. **Admin schedules a campaign** using the campaign scheduling interface
   - `scheduled_at` and `status` are updated in `email_campaigns`
   - Campaign status changes to "scheduled"

2. **Recipient population** (happens when campaign status changes to "scheduled")
   - Function `addRecipientsFromSegments` runs to:
     - Query all segments linked to the campaign from `campaign_segments`
     - For each segment, fetch eligible users from `user_segments`
     - Insert each recipient into `campaign_recipients` table

3. **Email queueing** (happens after recipient population or directly for test emails)
   - For each recipient in `campaign_recipients`, a record is created in `email_queue`
   - The record includes:
     - `campaign_id` - Links to the source campaign
     - `recipient_email` - Target recipient email
     - `sender_email` and `sender_name` - From address and name
     - `subject` and content fields - Email content
     - `status` - Set to 'pending'
     - `scheduled_at` - When to send it

### 3. Email Processing and Delivery

**Tables involved:**
- `email_queue` - Updated as emails are processed
- `processing_locks` - Manages concurrent processing
- `email_processing_metrics` - Stores performance metrics
- `email_alerts` - Stores alerts for issues

**Flow:**
1. **Email queue processor** runs on schedule (every 5 minutes)
   - First acquires a lock by inserting a record into `processing_locks`
   - Queries `email_queue` for 'pending' emails with `scheduled_at` <= current time

2. **Processing emails:**
   - For each email in the batch:
     - Updates status to 'processing' in `email_queue`
     - Sends via Postmark API
     - Updates status to 'sent' and sets `sent_at` on success in `email_queue`
     - On failure, either:
       - Updates to 'retrying' with incremented `retry_count` and new `scheduled_at`
       - Updates to 'failed' if max retries reached

3. **Metrics & monitoring:**
   - After batch processing, inserts a record into `email_processing_metrics` with:
     - Batch size, success/failure counts, processing time
   - If issues are detected (high failures, slow processing):
     - Inserts alert record into `email_alerts` table
   - Releases lock in `processing_locks` table when done

### 4. Database Operations Summary

| Action | Table Written | Timing | Data Written |
|--------|---------------|--------|---------------|
| Campaign creation | `email_campaigns` | When admin saves campaign | Campaign details, status='draft' |
| Template selection | `campaign_templates` | When template is chosen | Template HTML, subject, etc. |
| Segment targeting | `campaign_segments` | When admin adds/removes segments | campaign_id, segment_id pairs |
| Campaign scheduling | `email_campaigns` | When admin schedules | status='scheduled', scheduled_at |
| Recipient generation | `campaign_recipients` | After campaign scheduling | recipient data for each user |
| Email queueing | `email_queue` | After recipient generation | Delivery details, status='pending' |
| Processing start | `email_queue`, `processing_locks` | When processor runs | status='processing', lock record |
| Delivery success | `email_queue` | After Postmark sends | status='sent', sent_at |
| Delivery failure | `email_queue` | After Postmark fails | status='retrying'/'failed', error_message |
| Metrics recording | `email_processing_metrics` | After batch processing | Batch statistics |
| Alert generation | `email_alerts` | When issues detected | Alert details, timestamp |

### 5. Deployment and Verification Requirements

**Required Environment Variables:**
- `POSTMARK_SERVER_TOKEN` - API token for the Postmark service
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` - For database access

**Deployment Considerations:**
- The Edge Function is deployed with JWT verification disabled for testing
- Email domain used for sending must be verified in Postmark account
- Proper error handling ensures metrics capture failures

**Monitoring and Alerts:**
- System tracks important metrics including success rates and processing times
- Alerts are generated for high failure rates or slow processing
- Future improvements will include admin dashboard for monitoring

### Next Development Steps

1. Create an admin dashboard UI for monitoring queue health and alerts
2. Implement notification system for critical alerts (email/Slack)
3. Continue to develop the campaign scheduling logic to trigger email sending at specified times

## Database Schema Modifications and Error Resolution (2025-05-13)

During development and testing, two key issues were identified:
1.  A runtime error: `"Could not find the 'subject' column of 'email_campaigns' in the schema cache"` when creating/updating campaigns.
{{ ... }}
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
    - Discovered the `user_segments` table schema had been refactored to a proper junction table structure, so updated the insert payload to only include `segment_id` and `user_id` fields.
- **Outcome:** The `user_segments` table is now being correctly populated by the `update-all-user-segments` Edge Function. This directly addresses a key part of the "Dynamic Audience Size Estimation" functionality.

#### 2. Campaign Segments API (`GET /api/admin/campaigns/[campaignId]/segments`)
- **Issue:** The API endpoint responsible for fetching segments linked to a campaign was returning a 500 error. The error message "Could not find a relationship between 'campaign_segments' and 'user_segments'" indicated an incorrect Supabase query.
- **Resolution:**
    - Located the faulty query within the `getCampaignSegments` function in `lib/supabase/data-access/campaign-management.ts`.
    - The query was incorrectly attempting to join `campaign_segments` with `user_segments` (i.e., `select('segment:user_segments(*))`),.
    - Corrected the query to join with the `segments` table (i.e., `select('segment:segments(*)')`), which holds the segment definitions.
- **Outcome:** The API endpoint now successfully fetches and returns the segments associated with a campaign, resolving the 500 error.

#### 3. Handling Large Tag Sets in Edge Function (414 Request-URI Too Large Error)
- **Issue:** When processing tags with many users (e.g., 2,898 entries), the Edge Function was hitting a Cloudflare "414 Request-URI Too Large" error. This occurred because the function was attempting to create a PostgREST URL with thousands of UUIDs in a single `.in('id', userIds)` filter.
- **Troubleshooting Steps & Resolution:**
    - Initially attempted using `.or()` with batched IDs, but this didn't fully resolve the URL length issue.
    - Implemented a comprehensive paginated approach for tag conditions:
        1. Fetch all user IDs for a tag using pagination (`limit` and `.range()`) to overcome the default 1000 record limit.
        2. Process user IDs across multiple pages and accumulate them in an `allUserIds` array.
        3. Use proper pagination controls with logic to detect when all records have been fetched.
        4. For large tag sets (>100 users), use a direct approach that bypasses URL construction entirely.
        5. Return the user IDs directly via `{ type: 'direct_user_ids', userIds: allUserIds }` to the main function.
        6. Modify the main processing logic to handle this special case by skipping query execution for large sets.
    - Added detailed logging throughout the pagination process to aid debugging.
- **Outcome:** The Edge Function now successfully handles tags of any size, including those with thousands of users. It properly populates the `user_segments` table with all matching users, ensuring accurate audience estimation for campaigns.

#### 4. Current `user_segments` Table Schema
- **Validation:** Confirmed via direct SQL query that the `user_segments` table has been properly refactored to a clean junction table design with the following structure:
  ```
  - id (uuid, NOT NULL, default: gen_random_uuid())
  - created_at (timestamp with time zone, NOT NULL, default: now())
  - updated_at (timestamp with time zone, NOT NULL, default: now()) 
  - segment_id (uuid, NOT NULL)
  - user_id (uuid, NOT NULL)
  ```
- **Observation:** This is the optimal schema design for a junction table, removing previous redundancy and enforcing proper constraints.

#### 5. Comprehensive Pagination Improvements (2025-05-15)
- **Issue:** Multiple components in the segmentation system were limited by Supabase's default 1000 record limit, causing potential data truncation with larger user segments.
- **Components Affected and Resolved:**
  1. **Edge Function `update-all-user-segments`:**
     - Implemented paginated fetching of all user IDs across tag pages
     - Added direct processing for large user ID sets to avoid URL length limits
     - Added proper termination logic to detect when all records have been fetched
  
  2. **API Endpoint `estimate-audience`:** 
     - Implemented pagination for retrieving users from segments
     - Collected and de-duplicated user IDs across all pages
     - Ensured accurate audience size counts regardless of segment size
  
  3. **Campaign Management `addRecipientsFromSegments`:**
     - Added pagination support when fetching users from selected segments
     - Ensured all recipients are added to campaigns, not just the first 1000
     - Maintained proper error handling throughout the pagination process
  
  4. **Segment Listing Functions:**
     - Updated `listSegments` to use pagination for potentially large segment collections
     - Ensured all queries properly handle page boundaries and termination conditions
     - Improved error handling and reporting during multi-page operations
- **Implementation Pattern:** Each pagination implementation follows a consistent pattern:
  - Initialize an accumulator array and pagination variables (page number, page size, continuation flag)
  - Loop through pages with a termination condition (receive fewer records than requested or empty result)
  - Process each page of results and add to the accumulator array
  - After collecting all pages, process the complete dataset
- **Outcome:** The segmentation system now correctly handles datasets of any size, ensuring accurate audience targeting and estimation for all campaigns regardless of segment or tag size.
