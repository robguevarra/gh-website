# Email System Phase 2: Advanced Features & User Management

## Task Objective
Build out advanced email capabilities for the Graceful Homeschooling platform by implementing user segmentation, campaign management, comprehensive webhook processing, analytics dashboard, and user preference management systems.

## Current State Assessment
Currently, the platform has a functional email infrastructure with Postmark integration and Unlayer email template editing capabilities. The core email template management system is implemented and working well, allowing administrators to create, edit, and test email templates with a user-friendly interface. However, we lack advanced features such as user segmentation, campaign management, comprehensive analytics, and user preference controls.

## Future State Goal
A robust, feature-complete email marketing and transactional system that enables:
- Fine-grained user segmentation based on tags, behaviors, and attributes
- Comprehensive campaign creation, scheduling, and automation
- Real-time email analytics with detailed reporting and visualization
- Full user preference management with compliance features
- Webhook processing for comprehensive event tracking

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed email system Phase 1 implementation
> 2. Project context (`ProjectContext.md`)
> 3. Email template manager documentation
>
> This ensures consistency and alignment with project goals and standards.

### From Previously Completed Email System Phase 1
- Postmark account is set up and configured
- Unlayer editor is fully integrated with template management
- Basic template creation, editing, and testing functionality is working
- Initial set of email templates has been created
- Basic sending functionality is implemented

### From Email Template Manager Documentation
- Email templates are stored in Supabase with version history
- Proper variable system is implemented for template personalization
- Templates are organized by categories and subcategories
- Test sending functionality is implemented

## Implementation Plan

> **Status Note (2025-05-12):**
> - Webhook endpoint architecture and event normalization/storage are complete and in production.
> - Advanced analytics API and documentation are implemented (see `/api/email/analytics`).
> - Dashboard analytics integration is now split into two parallel efforts:
>   1. **Admin Dashboard Email Analytics:** ~~Create a new section in the admin dashboard dedicated to email analytics~~
>   - ~~Fetch data from `/api/email/analytics` endpoint~~
>   - ~~Display metric cards showing key email performance indicators~~
>   - ~~Implement trend charts to visualize email metrics over time~~
>   - ~~Add a table showing top email bounces and delivery issues~~
>   **Completed:**
>   - Platform-wide Email Analytics dashboard tab is now live in the admin dashboard.
>   - Features: metric cards, trend chart (Recharts), date/event filters, and top bounces table.
>   - Built as a modular Next.js client component with Shadcn UI, mobile-first, and DRY principles.
>   - Data is fetched from `/api/email/analytics` using client-side hooks for a responsive UX.
>   2. **Per-User Email Event Stats:** ~~Implement per-user email event history and engagement stats (API + UI) in the user detail view (`/api/admin/users/[id]/email-events`)~~

   **Completed:**
   - Per-user email analytics tab is now live in the admin user detail view.
   - API endpoint: `/api/admin/users/[id]/email-events` returns all user-specific email events with filtering.
   - UI: Metric cards, filters, and event table are implemented using modular, mobile-first components.
   - Data is fetched client-side for a responsive admin experience.
>   3. **User Segmentation System:** ~~Implement user segmentation based on tags and other criteria~~

   **Completed:**
   - User segmentation system is fully implemented and integrated with the email admin interface.
   - Database: `user_segments` table with proper schema, RLS policies, and indexes.
   - API: Complete RESTful endpoints for segment CRUD operations and user preview.
   - Engine: Recursive query builder for complex logical operations (AND/OR/NOT) on tags.
   - UI: Integrated into email admin interface at `/admin/email/segmentation`.
   - Features: Create/edit segments with tag selection, preview matching users, and manage saved segments.

> - Redundant tasks have been cleaned up in Task Master. See tasks.json for the authoritative list.
> - Remaining work (in progress): campaign management (which will leverage the segmentation system), advanced analytics dashboard UI, and user preference management.
> - This phase is actively underway. See tasks.json for subtask status.

### 1. Webhook Processing Infrastructure

#### Completion Summary (Per-User Email Analytics)
- The per-user email analytics feature is fully implemented and integrated into the admin user detail view.
- All work is traceable to Task Master task #39 and related subtasks.
- This completes the analytics requirements for both platform-wide and per-user scopes.

- [x] Design secure webhook endpoint architecture
  - Created authenticated REST endpoint to receive Postmark events (`/api/webhooks/postmark`).
  - Implemented request validation and robust error handling/logging.
  - Designed for idempotency using event IDs and deduplication (via message ID and record type).
- [x] Develop event normalization and storage system
  - Implemented adapter pattern for Postmark event types.
  - Created unified schema for email events in Supabase (`postmark_events` table).
  - Storage is efficient and indexed by event type and timestamp.
- [x] Create real-time processing pipeline
  - Implemented a Postgres trigger on postmark_events for real-time normalization into email_events
  - Added payload JSONB column to email_events for full event context
  - All new webhook events are now processed and available for analytics instantly
  - ETL script retained for backfill and legacy events
  - Includes idempotency, error handling, and industry-standard event warehousing patterns

### 2. User Tagging and Segmentation System
- [x] Design and implement user tagging data model <span style="color: green;">(Core hierarchical structure and metadata support implemented and UI-enabled)</span>
  - [x] Create flexible schema for hierarchical tags
  - [x] Add support for tag metadata
  - [x] Implement efficient querying mechanisms (base queries for hierarchy and type filtering established)

- [x] **Define Segment Data Model & API Endpoints** <span style="color: green;">(Completed)</span>
  - [x] Define data model for storing user segments in Supabase (e.g., `user_segments` table with `id`, `name`, `description`, `rules` (JSONB for criteria), `created_at`, `updated_at`).
    - Created `user_segments` table with appropriate schema and RLS policies
    - Added comments and indexes for better maintainability and performance
  - [x] Develop API endpoints for segment CRUD operations (e.g., under `/api/admin/segments`):
    - [x] `POST /api/admin/segments`: Create a new segment (accepts name, description, rules).
    - [x] `GET /api/admin/segments`: List all saved segments.
    - [x] `GET /api/admin/segments/[segmentId]`: Fetch details of a specific segment.
    - [x] `PATCH /api/admin/segments/[segmentId]`: Update an existing segment.
    - [x] `DELETE /api/admin/segments/[segmentId]`: Delete a segment.
    - [x] `GET /api/admin/segments/[segmentId]/preview`: Get a preview of users matching segment rules (count and sample of users).

- [x] Build user segmentation engine <span style="color: green;">(Completed)</span>
  - [x] Develop query builder module (`lib/segmentation/engine.ts`) to parse segment `rules` (e.g., tags with AND/OR/NOT logic) and translate them into Supabase queries against `user_tags` and `users` tables.
    - Implemented recursive query building for complex nested conditions
    - Added support for AND, OR, and NOT operators
  - [x] Integrate query builder with `GET /api/admin/segments/[segmentId]/preview` endpoint.
  - [x] Implement caching for segment preview results (simple in-memory cache with 5-minute TTL).
  - [x] Create extensible system for new segmentation criteria (foundation laid with tag usage counts).

- [x] Create user segmentation UI components <span style="color: green;">(Completed)</span>
  - [x] Build intuitive interface for tag management (includes text search, hierarchy navigation, CRUD for tags & types).
  - [x] Implement UI components for creating and editing segments within a new `/admin/segmentation` page:
    - [x] Form for segment `name` and `description` with validation.
    - [x] Interface for defining segment `rules` (tag selection with AND/OR operators).
    - [x] Display segment preview (user count, sample users) by calling the preview API endpoint.
    - [x] Interface to list, view, edit, and delete saved segments.
  - [x] Add segment preview with audience size estimation (both for individual tags and full segments).
  - [x] Create segment saving and sharing capabilities (full CRUD operations via the UI).

### 3. Campaign Management System
- [ ] Design campaign data model and architecture <span style="color: orange;">(in progress)</span>
  - Create models for campaigns, templates, content versions
  - Implement scheduling and approval workflows
  - Add audit logging for all changes
- [ ] Develop campaign creation and editing workflow <span style="color: orange;">(in progress)</span>
  - Build draft/publish workflow
  - Implement version control for campaign content
  - Create template selection and personalization options
  - Add content validation and preview functionality
- [ ] Implement campaign scheduling and delivery system <span style="color: orange;">(in progress)</span>
  - Build scheduling with timezone support
  - Add recurring campaign capabilities
  - Implement delivery throttling and batch processing
  - Create monitoring for delivery progress
- [ ] Build campaign targeting functionality <span style="color: orange;">(in progress)</span>
  - Integrate segmentation engine with campaign system
  - Implement recipient preview with pagination
  - Add delivery metrics and audience size validation

### 4. Email Analytics System
- [ ] Design email analytics data warehouse <span style="color: orange;">(in progress)</span>
  - Create dimensional model for email analytics
  - Implement ETL processes for data aggregation
  - Optimize for analytical queries
- [ ] Build analytics dashboard UI <span style="color: orange;">(in progress)</span>
  - Implement dashboard with real-time and historical views
  - Create drill-down capabilities
  - Add customizable date ranges and filters
  - Create exportable reports
  - Implement visualizations for key metrics (opens, clicks, etc.)

### 5. User Preference Management
- [ ] Design user preference data model
  - Create schema for granular preference management
  - Implement audit logging for preference changes
  - Add proper validation for preference updates
- [ ] Develop user preference management UI
  - Build intuitive preference center interface
  - Implement one-click unsubscribe functionality
  - Create confirmation workflows for preference changes
  - Ensure mobile-friendly design
- [ ] Implement ESP preference synchronization
  - Develop bidirectional sync with Postmark
  - Handle webhook-initiated preference changes
  - Add retry logic and conflict resolution

## Technical Considerations

### Security
- All webhook endpoints must implement signature verification
- Preference management must include proper authentication
- Campaign targeting should respect user privacy settings
- Analytics system must anonymize data where appropriate

### Performance
- Event processing must scale to handle high volumes
- Segmentation queries should optimize for performance
- Analytics data should leverage appropriate indexes
- Campaign delivery should implement queueing and throttling

### Compliance
- Implement unsubscribe tracking and enforcement
- Maintain audit logs for all preference changes
- Ensure all marketing emails include required compliance elements
- Support data retention policies

### User Experience
- Admin interfaces should provide clear feedback
- Analytics should be intuitive and actionable
- Campaign creation should include validation and previews
- Preference management should be simple and clear for end users

## Completion Status

This phase is currently pending implementation.

## Next Steps After Completion

After establishing the advanced email features in Phase 2, we will move on to Phase 3: Optimize, Finalize, and Document. This will include performance optimizations, comprehensive testing, user training, and documentation.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
