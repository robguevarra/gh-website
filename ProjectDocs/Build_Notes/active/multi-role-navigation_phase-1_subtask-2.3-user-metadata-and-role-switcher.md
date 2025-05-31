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

### Part 3: Next Steps (Verification & Frontend Integration)

*   Verify lint errors are resolved.
*   Thoroughly test the `/api/user/context` endpoint with different user roles.
*   Integrate `fetchUserContext` into appropriate places in the application (e.g., on dashboard load, after login).
*   Develop the UI Role Switcher component that consumes this context.

### Part 4: Frontend UI (Dashboard Switcher)

1.  **Integrate `fetchUserContext` Call:**
    *   Task: Determine the best place to call `fetchUserContext` (e.g., in a main layout component, on initial app load after authentication). Ensure it's called such that `userContext` is populated before the Dashboard Switcher or other role-dependent UI elements need it. Consider calling it when user session is restored or on route changes if roles can change dynamically during a session (less common but possible).
    *   Status: Done (Integrated into `app/dashboard/layout.tsx`).

2.  **Design and Implement Dashboard Switcher Component:**
    *   Task: Create a new React component (e.g., `DashboardSwitcher`).
    *   Status: Done (`components/navigation/dashboard-switcher.tsx` created).
    *   Task: **Visibility Logic:** Component should only render if the user has more than one of the following roles active: `is_student = true`, `is_affiliate = true`, `is_admin = true`.
    *   Status: Done.
    *   Task: **Content & Links:**
        *   If `is_student` is true, display an option like "Student Dashboard" linking to `/dashboard`.
        *   If `is_affiliate` is true, display an option like "Affiliate Portal" linking to `/affiliate-portal`.
    *   Status: Done.
    *   Task: **Styling:** Ensure it's intuitive and clearly indicates the current context (e.g., highlighting the active dashboard link).
    *   Status: Done (Basic styling implemented, active link highlighting via `pathname.startsWith`).
    *   Task: Integrate the component into the main application layout (e.g., Navbar, User Menu).
    *   Status: Done (Integrated into `StudentHeader` dropdown).

3.  **Admin Panel Link:**
    *   Task: Ensure a link to the Admin Panel (e.g., `/admin`) is displayed if `is_admin` is true.
    *   Status: Done (Integrated into `DashboardSwitcher` component).

4.  **Default Dashboard/Redirect Logic (Post-Login):**
    *   Task: Review and potentially update post-login redirect logic.
        *   If an authenticated user attempts to access an auth page (e.g., `/auth/signin`), redirect them based on role priority: Admin (`/admin`) > Affiliate (`/affiliate-portal`) > Student (`/dashboard`).
    *   Status: Done (Implemented in `middleware.ts`).
    *   Task: Ensure specific auth flows (e.g., magic link verification, OAuth callbacks) perform role-based redirection to the highest priority dashboard upon successful authentication and session creation.
        *   Magic Link Verification (`/api/auth/magic-link/verify/[token]` POST): Updated to fetch user roles and return a `redirectPath` based on role priority (Admin > Affiliate > Student) to the frontend.
    *   Status: Done for Magic Link.
    *   Review OAuth callback handlers for similar role-based redirection logic.
    *   Status: N/A (No OAuth handlers currently implemented).
        *   If user has only one primary role (student or affiliate), redirect to their specific dashboard.
        *   If multiple roles, redirect to the highest priority dashboard (Admin > Affiliate > Student).

### Part 5: Testing & Refinement

*   [ ] Test role flag synchronization thoroughly for all scenarios (new student, student removed, affiliate approved, affiliate deactivated).
*   [ ] Test `/api/user/context` endpoint for correctness and security.
*   [ ] Test Dashboard Switcher UI with various role combinations.
*   [ ] Verify navigation and default redirect logic.

### Future Considerations (Post-MVP for this Subtask)

*   Full integration and utilization of `roles` and `user_roles` tables for RBAC.
*   More sophisticated permission checks beyond simple role flags.
*   Automated synchronization for `unified_profiles.is_admin` from `auth.users.raw_user_meta_data`.
