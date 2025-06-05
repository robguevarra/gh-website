# Handoff Document: Admin Affiliate Fraud Management

**Date:** 2025-06-05
**Feature Area:** Admin Console - Affiliate Program Management
**Specific Focus:** Fraud Flag Review and Resolution System

## 1. Objective

The primary goal was to implement a system within the admin console to allow administrators to effectively review, manage, and resolve fraud flags associated with affiliates. This enhances the integrity of the affiliate program by providing tools to address suspicious activities.

## 2. Core Functionality Implemented

A dedicated page and associated components were developed to manage fraud flags:

*   **Fraud Flag Listing:**
    *   A table displays all fraud flags, showing key information such as affiliate name, email, reason for the flag, date flagged, and current status (Resolved/Unresolved).
    *   Resolved flags also display the date of resolution.
*   **Fraud Flag Resolution:**
    *   Unresolved flags have a "Resolve" button.
    *   Clicking "Resolve" opens a modal dialog where an admin can enter resolution notes.
    *   Submitting the modal calls a server action (`resolveFraudFlag`) that updates the flag's status to resolved, records the notes, and sets the resolution timestamp.
    *   The list of fraud flags automatically refreshes (via `revalidatePath`) after a successful resolution.
    *   Toast notifications provide feedback on the success or failure of the resolution attempt.
*   **View Fraud Flag Details:**
    *   A "View Details" button is available for flags that have associated JSONB data in their `details` field.
    *   Clicking this button opens a modal displaying the formatted JSON content, allowing admins to inspect raw data related to the flag.

## 3. Key Files & Components

*   **UI Components:**
    *   `components/admin/affiliates/fraud-flag-list.tsx`: The main client component responsible for displaying the list of fraud flags, handling user interactions, and managing modals for resolving flags and viewing details.
*   **Server Actions:**
    *   `lib/actions/affiliate-actions.ts`:
        *   `getAllAdminFraudFlags()`: Fetches all fraud flags with associated affiliate and user details from the Supabase database.
        *   `resolveFraudFlag(flagId: string, resolverNotes: string)`: Updates the specified fraud flag in the database as resolved, including resolver notes and timestamp.
*   **Page Route:**
    *   `app/admin/affiliates/flags/page.tsx`: The Next.js page that integrates the `FraudFlagList` component and fetches initial data using `getAllAdminFraudFlags`.
*   **Type Definitions:**
    *   `types/admin/affiliate.ts`: Contains relevant TypeScript types, particularly `AdminFraudFlagListItem` which defines the structure of fraud flag data used in the UI.
*   **Build Notes (for context on development process):**
    *   `ProjectDocs/Build_Notes/active/admin-affiliate-management_phase-1_core-features.md`

## 4. Current State

*   The fraud management page (`/admin/affiliates/flags`) is functional.
*   Administrators can view a comprehensive list of all fraud flags.
*   Unresolved fraud flags can be marked as resolved with accompanying notes.
*   Detailed JSONB data associated with a fraud flag can be viewed in a modal.
*   The system provides user feedback through toast notifications.

## 5. Technical Stack & Patterns

*   **Framework:** Next.js 15+ (App Router)
*   **Components:** React Server Components (for the page) and Client Components (for interactive UI like `FraudFlagList`).
*   **Data Fetching & Mutations:** Next.js Server Actions.
*   **Database:** Supabase (PostgreSQL).
*   **UI Library:** Shadcn UI.
*   **State Management (Client):** React `useState` for modal visibility and form inputs.
*   **Date Formatting:** `date-fns`.
*   **Notifications:** `sonner` (for toasts).
*   **Styling:** Tailwind CSS.

## 6. Potential Next Steps & Considerations

*   **Thorough Testing:** Conduct comprehensive testing of the fraud resolution and details viewing workflows, including edge cases and error handling.
*   **Scalability Enhancements:** For a large number of fraud flags, implement:
    *   Pagination for the fraud flag list.
    *   Filtering options (e.g., by status, date range, affiliate).
    *   Sorting capabilities for different columns.
*   **Admin Sidebar Integration:** Verify that a clear and accessible link to the "Fraud Management" page exists in the main admin sidebar navigation.
*   **Detailed Audit Logging:** While not explicitly implemented in this phase, consider adding more detailed audit logs for when flags are resolved and by whom (currently, `resolveFraudFlag` doesn't take `resolvedById`).
*   **Real-time Notifications:** As per the build notes, "Add real-time notification system for high-risk flags" could be a future enhancement.
*   **UI for `details` field:** If the `details` JSONB can be very complex, consider a more structured way to display it than raw JSON, perhaps a component that can render known schemas within the JSON.

This document should provide a good overview of the implemented Admin Affiliate Fraud Management features. Please review and let me know if any adjustments or further details are needed.
