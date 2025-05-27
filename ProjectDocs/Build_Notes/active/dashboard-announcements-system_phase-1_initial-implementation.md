# Dashboard Announcements System - Phase 1: Initial Implementation

## Task Objective
To replace the mock data for "Live Classes" and "Announcements" on the user dashboard (`app/dashboard/page.tsx`) with a dynamic system. This system will allow administrators to create, manage, and publish announcements (including live class schedules, sales, and general updates) via the admin dashboard (`app/admin/page.tsx`).

## Current State Assessment
- The user dashboard currently uses hardcoded arrays for "Live Classes" and "Announcements."
- There is no backend or admin interface to manage this content dynamically.
- The admin dashboard has a tabbed structure suitable for adding new management sections.
- Admin access is controlled via the `checkAdminAccess` function, which verifies a `is_admin` flag in user metadata.
- The Supabase project ID is `cidenjydokpzpsnpywcf`.

## Future State Goal
- A new "Announcements" table in the Supabase database to store all types of announcements.
- CRUD API endpoints for managing announcements, secured for admin users.
- A new section in the admin dashboard (e.g., "Settings > Announcements" or a dedicated "Announcements Management" tab) for administrators to create, view, edit, and delete announcements.
- The user dashboard will fetch and display active, published announcements from the new API.
- The system will support different types of announcements (e.g., 'Live Class', 'Sale', 'General Update') with relevant fields for each.
- A dedicated public 'Announcements' page (e.g., `/announcements`) linked from the student dashboard header, displaying all published announcements in a user-friendly format.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Project context (`ProjectContext.md`)
> 2. Design context (`designContext.md`)
> 3. Existing UI patterns in `app/dashboard/page.tsx` and `app/admin/page.tsx`.
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context & User Request
- Unify "Live Classes" and "Sales Announcements" into a general "Announcements" system.
- Admin management should be via the existing admin dashboard.
- Admin access is managed by Supabase auth and the `checkAdminAccess` utility.

## Implementation Plan

### 1. Database Schema (Supabase)
- **Create `announcements` table:**
  - `id`: UUID, primary key (default: `uuid_generate_v4()`)
  - `created_at`: Timestamp with timezone (default: `now()`)
  - `updated_at`: Timestamp with timezone (default: `now()`)
  - `title`: Text, not null
  - `content`: Text, not null (Consider using Markdown or a format suitable for a rich text editor)
  - `type`: Text, not null (e.g., 'live_class', 'sale_promo', 'general_update', 'new_content') - Consider an enum if database supports it or app-level validation.
  - `status`: Text, not null (e.g., 'draft', 'published', 'archived') (default: 'draft')
  - `publish_date`: Timestamp with timezone (when the announcement should become visible)
  - `expiry_date`: Timestamp with timezone (optional, when the announcement should cease to be visible)
  - `link_url`: Text (optional, for Zoom links, sale pages, etc.)
  - `link_text`: Text (optional, e.g., "Join Live Class", "Shop Now")
  - `image_url`: Text (optional, for an accompanying image)
  - `host_name`: Text (optional, specific to 'live_class' type)
  - `host_avatar_url`: Text (optional, specific to 'live_class' type)
  - `target_audience`: Text (optional, e.g., 'all_users', 'enrolled_students:[course_id]', 'segment:[segment_id]') - For future segmentation.
  - `sort_order`: Integer (optional, for manual ordering of announcements)
- **Indexes:**
  - On `status` and `publish_date` for efficient querying on the user dashboard.
  - On `type`.
- **RLS Policies:**
  - Admins: Full CRUD access.
  - Authenticated users: Read access to `published` announcements where `publish_date` is past and `expiry_date` (if set) is in the future.
  - Anonymous users: Same as authenticated, or restrict as needed.

### 2. API Endpoints (Next.js API Routes)
-   **Admin Endpoints (e.g., `/api/admin/announcements`)**:
    -   `POST /`: Create a new announcement. (Requires admin access via `checkAdminAccess`)
        -   Request body: Announcement data.
        -   Response: Created announcement object.
    -   `GET /`: List all announcements (for admin panel, with pagination and filtering). (Requires admin access)
        -   Response: Array of announcement objects.
    -   `GET /[id]`: Get a single announcement by ID. (Requires admin access)
        -   Response: Announcement object.
    -   `PUT /[id]`: Update an existing announcement. (Requires admin access)
        -   Request body: Updated announcement data.
        -   Response: Updated announcement object.
    -   `DELETE /[id]`: Delete an announcement (consider soft delete by changing status to 'archived'). (Requires admin access)
        -   Response: Success message.
-   **Public Endpoint (e.g., `/api/announcements`)**:
    -   `GET /`: Fetch active, published announcements for the user dashboard.
        -   Filters: `status = 'published'`, `publish_date <= now()`, (`expiry_date >= now()` or `expiry_date IS NULL`).
        -   Ordering: `sort_order` (if available), then `publish_date` descending.
        -   Response: Array of announcement objects (subset of fields needed for display).
        -   Consider adding pagination support (e.g., `?page=1&limit=10`).

### 3. Admin Dashboard UI (`app/admin/`)
-   **Create a new page/section for Announcement Management:**
    -   Path: e.g., `app/admin/settings/announcements/page.tsx` or integrate into existing settings if applicable.
    -   Add a link/tab in `app/admin/page.tsx` to navigate to this new section.
-   **List View:**
    -   Display announcements in a table: Title, Type, Status, Publish Date, Actions (Edit, Delete).
    -   Implement pagination and filtering (by status, type).
-   **Create/Edit Form:**
    -   Fields corresponding to the `announcements` table.
    -   Use appropriate input types (text, textarea, date picker, select for type/status).
    -   Consider a rich text editor for the `content` field.
    -   Client-side and server-side validation (e.g., using Zod).
    -   Image upload capability for `image_url` if desired.
    -   Clear "Save Draft" and "Publish" actions.

### 4. User-Facing UI (Dashboard & Announcements Page)

-   **Create Public Announcements Page (e.g., `app/announcements/page.tsx`):**
    -   Design and implement a new page to display all published announcements.
    -   Fetch data from the `/api/announcements` endpoint (ensure it supports pagination).
    -   Implement layout for displaying announcements (e.g., card list, chronological feed).
    -   Include filtering options (e.g., by type: All, Live Classes, Sales, Updates) and potentially a search bar.
    -   Ensure responsive design for various screen sizes.

-   **Update Student Header (`components/dashboard/student-header.tsx`):**
    -   Locate the existing 'Live Classes' link (likely associated with a `Calendar` icon or text).
    -   Change the link's destination to the new `/announcements` page.
    -   Update the link's text/icon if necessary to better reflect 'Announcements' (e.g., using `Bell` or `MessageSquare` icon).

-   **User Dashboard (`app/dashboard/page.tsx`):**
    -   **Data Fetching:**
        -   Use React Server Components (RSC) to fetch a *summary* of recent/important announcements from `/api/announcements` on the server (e.g., top 3-5).
        -   Alternatively, client-side fetching using `useEffect` and `fetch`, or a library like SWR/TanStack Query.
    -   **Display Logic:**
        -   Iterate over fetched announcements.
        -   Conditionally render elements based on `type` (e.g., "Live Classes" section might filter for `type = 'live_class'`, "General Announcements" for others).
        -   Display title, content, date, link, host information as applicable.
        -   Handle empty state (no announcements to display).
        -   Style according to existing dashboard design. Ensure responsiveness.

### 5. Authentication & Authorization
-   Secure all admin API endpoints using the `checkAdminAccess` utility.
-   Ensure RLS policies on Supabase tables are correctly implemented.

## Technical Considerations

### Database & API
-   **Data Validation**: Use Zod for validating API request bodies and potentially for database interactions.
-   **Error Handling**: Implement robust error handling in API routes and provide clear feedback to the client.
-   **Date/Time Management**: Be consistent with timezone handling (UTC preferred for storage).
-   **Performance**: Optimize database queries. Use pagination for admin lists. Cache public API responses if traffic is high.

### Frontend (Admin & User Dashboard)
-   **State Management (Admin)**: Use Zustand or React Context for managing form state and UI state in the admin panel if complex.
-   **Component Reusability**: Create reusable components for forms, tables, and display cards.
-   **UX**: Provide clear visual feedback for actions. Implement loading states. Ensure forms are user-friendly.
-   **Accessibility**: Follow accessibility best practices for forms and interactive elements.
-   **Styling**: Utilize existing Shadcn UI components and Tailwind CSS classes for consistency.

### General
-   **Code Quality**: Follow DRY principles, write clean, maintainable, and well-commented code. Adhere to project's linting and formatting rules.
-   **Testing**: Plan for unit/integration tests for API endpoints and critical UI components.

## Completion Status
This phase is **pending**.

Tasks:
- [ ] Design and agree on final database schema for `announcements`.
- [ ] Implement Supabase schema migrations and RLS policies.
- [ ] Develop Admin API endpoints (CRUD operations).
- [ ] Develop Public API endpoint for fetching announcements.
- [ ] Implement Admin Dashboard UI for managing announcements.
- [ ] Create Public Announcements Page.
- [ ] Update Student Header to link to the new Announcements page.
- [ ] Integrate announcement fetching and display into User Dashboard.
- [ ] Write tests for API endpoints.
- [ ] Conduct thorough testing of the entire feature.
- [ ] Document new API endpoints and admin panel usage.

## Next Steps After Completion
- Phase 2: Enhancements such as rich text editor for content, image uploads, advanced scheduling options, or audience targeting.
- Phase 2: User-specific announcements based on `target_audience`.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns.
> 2. Consult the implementation strategy and architecture planning documents.
> 3. Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`).
> 4. Follow the established folder structure, naming conventions, and coding standards.
> 5. Include this reminder in all future build notes to maintain consistency.
