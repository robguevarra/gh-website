# Build Notes: Multi-Role Navigation & User Metadata (Phase 1 - Subtask 2.3)

## 1. Task Objective

To enable users with multiple roles (Student, Affiliate, Admin) to easily navigate between their respective dashboards/portals using a clear UI switcher. This involves enhancing the user data model with explicit role flags in `unified_profiles` for immediate functionality, while acknowledging existing `roles` and `user_roles` tables for future, more granular RBAC.

## 2. Current State Assessment

-   **Student Role:** Implicitly, all users in `unified_profiles` can access the student dashboard (`/dashboard`). A user is defined as a student if they have an entry in the `enrollments` table (previously thought to be `enrollees`).
-   **Affiliate Role:** Managed via the `affiliates` table and its `status`. The `unified_profiles.affiliate_general_status` is synced from `affiliates.status`.
-   **Admin Role:** Determined by `auth.users.raw_user_meta_data` and checked server-side via functions like `checkAdminAccess`.
-   **Role Storage:** `roles` and `user_roles` tables exist but are not currently used for primary role determination due to past Supabase auth integration complexities.
-   **Navigation:** No dedicated UI exists for users with multiple roles to switch between different dashboard contexts (e.g., Student Dashboard vs. Affiliate Portal).
-   **`membership_levels`:** This table is confirmed to be for affiliate commission structures, not for defining student status.

## 3. Future State Goal

-   `unified_profiles` table will contain explicit boolean flags: `is_student`, `is_affiliate`, and `is_admin` for clear, readily accessible role identification.
-   These flags will be kept in sync with their respective sources of truth (e.g., `enrollments` table for students, `affiliates.status` for affiliates, `auth.users.raw_user_meta_data` for admins).
-   A new backend API endpoint (`/api/user/context`) will provide the frontend with the current user's role flags and basic profile information.
-   A frontend UI component (Dashboard Switcher) will allow users with multiple roles to switch contexts.

## 4. Implementation Plan

### Part 1: Database Modifications & Backfilling

1.  **Add Role Flags to `unified_profiles`:**
    *   Task: Add `is_student` (boolean), `is_affiliate` (boolean), `is_admin` (boolean) columns to `unified_profiles`.
    *   Status: Done.

2.  **Backfill `is_student` Flag:**
    *   Task: Set `is_student = true` for all existing users in `unified_profiles` as a baseline. (Further refined by trigger).
    *   Status: Done.

3.  **Backfill `is_affiliate` Flag:**
    *   Task: Set `is_affiliate = true` for users in `unified_profiles` where their corresponding `affiliates.status` is 'active'.
    *   Status: Done.

4.  **Backfill `is_admin` Flag:**
    *   Task: Set `is_admin = true` for users in `unified_profiles` if `auth.users.raw_user_meta_data.is_admin` is true.
    *   Status: Done.

### Part 2: Synchronization Logic & API Endpoint

1.  **Create/Update Trigger for `is_student`:**
    *   Task: Implement a trigger on the `enrollments` table to update `unified_profiles.is_student` based on active enrollments (e.g., `status = 'active'`).
    *   Status: Done (corrected to use `enrollments` table and `status='active'`).

2.  **Create/Update Trigger for `is_affiliate`:**
    *   Task: Modify the existing `sync_unified_profile_from_affiliate_changes` trigger on the `affiliates` table to also set `unified_profiles.is_affiliate` based on `affiliates.status = 'active'`.
    *   Status: Done.

3.  **Create API Endpoint `/api/user/context`:**
    *   Task: Develop a GET endpoint that returns the current authenticated user's `id`, `email`, `first_name`, `last_name`, `is_student`, `is_affiliate`, `is_admin`.
    *   Status: Done (corrected to use `@supabase/ssr`).

4.  **Update Zustand Store for User Context:**
    *   Task: Add state properties (`userContext`, `userContextLoading`, `userContextError`, `lastUserContextLoadTime`) and an action signature (`fetchUserContext`) to the student dashboard Zustand store (`lib/stores/student-dashboard/index.ts`).
    *   Status: Done.

5.  **Implement `fetchUserContext` Action:**
    *   Task: Implement the `fetchUserContext` action in `lib/stores/student-dashboard/actions.ts` to call the new API endpoint and update the store.
    *   Status: Done.

### Part 3: Frontend Implementation

1.  **Create `DashboardSwitcher` Component:**
    *   Task: Implement a UI component that displays available dashboards based on user roles.
    *   Status: Done (Created `components/navigation/dashboard-switcher.tsx`).
    *   Update (2025-05-31): Redesigned the dashboard switcher with a more elegant UI following design principles:
        * Added icons for each role type
        * Implemented subtle animations and improved visual hierarchy
        * Enhanced mobile responsiveness and accessibility

2.  **User Dashboard UI Switcher**:
    *   Task: Develop a UI component and logic that allows users with multiple roles (e.g., student and affiliate) to easily navigate and switch between the main student/member dashboard (e.g., `/dashboard`) and the dedicated affiliate portal (e.g., `/affiliate-portal`). Ensure the switcher is intuitive and clearly indicates the user's current portal context.
    *   Update (2025-05-31): Implemented a redesigned `DashboardSwitcher` component with enhanced UI and animations. Added proper integration in the `AffiliateHeader` component.
    *   Update (2025-05-31): Extended integration to include the Admin dashboard by adding the `DashboardSwitcher` component to the `AdminHeader` dropdown menu, ensuring consistent role switching across all portals.
    *   Status: Done (Integrated in Student Dashboard header, Affiliate Header, and Admin Header).

3.  **Admin Panel Link:**
    *   Task: Ensure a link to the Admin Panel (e.g., `/admin`) is displayed if `is_admin` is true.
    *   Status: Done (Integrated into `DashboardSwitcher` component).

4.  **Default Dashboard/Redirect Logic (Post-Login and Direct Access):**
    *   Task: Review and potentially update post-login redirect logic.
        *   If an authenticated user attempts to access an auth page (e.g., `/auth/signin`), redirect them based on role priority: Admin (`/admin`) > Affiliate (`/affiliate-portal`) > Student (`/dashboard`).
    *   Status: Done (Implemented in `middleware.ts`).
    *   Update (2025-05-31): Enhanced middleware to provide comprehensive role-based access control:
        * Implemented server-side protection for all role-specific routes 
        * Added proper redirection logic based on user roles for direct route access
        * Removed client-side redirection workarounds for cleaner code and better UX
        * Prevented unauthorized users from accessing role-specific areas
    *   Update (2025-05-31): Added `UserContextFetcher` component to Admin layout to ensure consistent role information availability across all dashboards.
    *   Task: Ensure specific auth flows (e.g., magic link verification, OAuth callbacks) perform role-based redirection.
    *   Status: Done for Magic Link.
    *   Review OAuth callback handlers for similar role-based redirection logic.
    *   Status: N/A (No OAuth handlers currently implemented).

### Part 5: Testing & Refinement

*   [x] Test `/api/user/context` endpoint for correctness and security.
    * Verified on 2025-05-31: Endpoint correctly returns user role flags and profile information.
*   [x] Test Dashboard Switcher UI with various role combinations.
    * Verified on 2025-05-31: New elegantly designed switcher correctly displays based on available roles.
*   [x] Verify navigation and default redirect logic.
    * Verified on 2025-05-31: Enhanced middleware correctly enforces role-based access control.
*   [x] Create comprehensive test documentation.
    * Created on 2025-05-31: Added `/ProjectDocs/testing/multi-role-navigation-tests.md` with detailed test cases for UI, navigation, data flow, and edge cases.
*   [x] Fix TypeScript errors in admin layout.
    * Fixed on 2025-05-31: Resolved deep type instantiation error in admin layout by simplifying Supabase query chain and adding proper type handling for tables not yet defined in type definitions.
*   [x] Test role flag synchronization thoroughly for all scenarios (new student, student removed, affiliate approved, affiliate deactivated).
    * Verified on 2025-05-31: Role flags correctly update when user roles change in the database.
*   [x] Perform cross-browser and mobile testing of the Dashboard Switcher and affiliate portal header.
    * Verified on 2025-05-31: Components render and function correctly across Chrome, Firefox, Safari, and mobile devices.
*   [x] Test edge cases such as account status changes (e.g., affiliate status changing from active to flagged).
    * Verified on 2025-05-31: UI correctly updates to reflect status changes without requiring page refresh.

## 6. Implementation Summary

### Architecture Overview

The multi-role navigation system follows a clear architectural pattern:

```mermaid
erDiagram
    unified_profiles ||--o{ user_roles : "has many"
    unified_profiles {
        uuid id PK
        boolean is_student
        boolean is_affiliate
        boolean is_admin
    }
    
    API-Context ||--|| unified_profiles : "fetches"
    API-Context {
        endpoint /api/user/context
        returns role_flags
        returns profile_info
    }
    
    Frontend-Store ||--|| API-Context : "consumes"
    Frontend-Store {
        Zustand userContextStore
        caches role_flags
        provides UI_state
    }
    
    UI-Components ||--|| Frontend-Store : "subscribes to"
    UI-Components {
        DashboardSwitcher
        StudentHeader
        AffiliateHeader
        AdminHeader
    }
    
    Middleware ||--|| unified_profiles : "validates"
    Middleware {
        enforces role_access
        handles redirects
    }
```

### Key Components

1. **Database Layer**:
   - `unified_profiles` table with boolean flags: `is_student`, `is_affiliate`, `is_admin`
   - These flags are synced with their respective sources of truth

2. **API Layer**:
   - `/api/user/context` endpoint provides role flags and basic profile information
   - Proper error handling and authentication checks

3. **State Management**:
   - Zustand store (`studentDashboardStore`) manages user context data
   - `UserContextFetcher` component handles fetching and refreshing this data

4. **UI Components**:
   - `DashboardSwitcher` provides consistent UI for role switching
   - Integrated into all three dashboard headers (Student, Affiliate, Admin)

5. **Navigation & Access Control**:
   - Middleware handles server-side role-based access control
   - Default redirection logic based on role priority: Admin > Affiliate > Student

### File Locations

- **API**: `/app/api/user/context/route.ts`
- **Components**: 
  - `/components/navigation/dashboard-switcher.tsx` (Core component)
  - `/components/admin/admin-header.tsx` (Admin integration)
  - `/components/dashboard/student-header.tsx` (Student integration)
  - `/components/affiliate/affiliate-header.tsx` (Affiliate integration)
- **Middleware**: `/middleware.ts`
- **State**: `/lib/stores/student-dashboard/index.ts` and `/lib/hooks/state/use-user-profile.ts`
- **Providers**: `/lib/components/providers/user-context-fetcher.tsx`

### Testing & Quality Assurance

Comprehensive test documentation is available at `/ProjectDocs/testing/multi-role-navigation-tests.md`, covering:

- UI component testing
- Role-based navigation testing
- API and data flow testing
- Security and edge case testing

### Future Considerations (Post-MVP for this Subtask)

*   Full integration and utilization of `roles` and `user_roles` tables for RBAC.
*   More sophisticated permission checks beyond simple role flags.
*   Automated synchronization for `unified_profiles.is_admin` from `auth.users.raw_user_meta_data`.
*   Development of admin interface for managing user roles directly.
*   Enhanced analytics to track user behavior across different role contexts.
