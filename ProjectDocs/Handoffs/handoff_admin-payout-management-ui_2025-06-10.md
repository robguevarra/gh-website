# Handoff Document: Admin Payout Management UI Implementation

**Date:** 2025-06-10
**Feature Area:** Admin Console - Affiliate Program Management
**Specific Focus:** User Interface for Managing Affiliate Payouts
**Source Build Note:** `payout-processing-system_phase-1_core-implementation.md` (Section: ### 2. Create Admin Payout Management UI)

## 1. Objective

The primary goal is to develop a comprehensive set of user interfaces within the admin console to allow administrators to manage the affiliate payout process effectively. This includes viewing payout statuses, initiating payout previews, managing individual payout details, and generating reports.

## 2. Scope of Work (UI Development Tasks)

The following UI components and pages need to be developed:

1.  **Main Payout Management Interface (`/app/admin/affiliates/payouts/page.tsx`)**
    *   **Note:** A basic `page.tsx` file may already exist. This task involves fleshing it out.
    *   Implement robust authorization checks to ensure only authorized admins can access this page.
    *   Develop filtering capabilities for the payout list (e.g., by payout period, status, affiliate).
    *   Create a clear UI for displaying lists of pending, processing, and completed payouts.
    *   Include summary information such as total payout amounts and counts for a quick overview.

2.  **Individual Payout Detail Pages (`/app/admin/affiliates/payouts/[payoutId]/page.tsx`)**
    *   Define the structure and implement the UI for these dynamic pages.
    *   Display comprehensive information about a specific payout.
    *   List all individual conversions included in the selected payout.
    *   Show the processing history and relevant timestamps for the payout.
    *   Include any admin verification notes associated with the payout.

3.  **Payout Batch Processing Pages (`/app/admin/affiliates/payouts/batches/page.tsx`)**
    *   Define the initial structure for these pages. Detailed implementation might follow in a later phase, but the foundational page setup is part of this scope.

4.  **Payout Preview Module (`/app/admin/affiliates/payouts/preview/page.tsx`)**
    *   Develop a UI for admins to review eligible conversions *before* creating actual payout records.
    *   Display tables of conversions, potentially grouped by affiliate.
    *   Clearly show calculated amounts, applicable fees, and net totals for preview.
    *   Include UI elements for verification (e.g., checkboxes) and fields for admins to add notes during the preview stage.
    *   Implement a confirmation step before any action is taken based on the preview.

5.  **Reporting and Export Functionality (UI Elements)**
    *   Design and implement UI elements to trigger the generation of CSV/Excel reports for payout data.
    *   Include UI controls for filtering report contents (e.g., date range, status, affiliate).
    *   Provide options for generating historical payout reports.
    *   Implement UI for batch export functionality, useful for reconciliation purposes.

## 3. Key Files & Existing Structure

*   **Main Page File (to be developed):** `/app/admin/affiliates/payouts/page.tsx`
*   **Dynamic Detail Page (to be developed):** `/app/admin/affiliates/payouts/[payoutId]/page.tsx`
*   **Batch Page (structure to be defined):** `/app/admin/affiliates/payouts/batches/page.tsx`
*   **Preview Page (to be developed):** `/app/admin/affiliates/payouts/preview/page.tsx`
*   **Existing Navigation:** The "Payouts" tab has already been added to the `AffiliateNavTabs` component (`components/admin/affiliates/affiliate-nav-tabs.tsx`).
*   **Relevant Data Types:** Expect to define or use types related to payouts, likely in a new or existing file such as `types/admin/payout.ts` or `types/admin/affiliate.ts`.

## 4. Technical Stack & Patterns

*   **Framework:** Next.js 15+ (App Router)
*   **Components:** Primarily React Server Components (RSCs) for pages, Client Components for interactive UI elements (e.g., filters, modals, forms).
*   **Language:** TypeScript
*   **UI Library:** Shadcn UI (refer to existing admin components for consistent styling and usage).
*   **Styling:** Tailwind CSS.
*   **Data Fetching & Mutations:** UI will interact with Next.js Server Actions. While the actions themselves are a separate task (see "### 3. Implement Server Actions for Payout Management" in build notes), the UI must be built to call them.
*   **Validation:** Use Zod for any form validation on the client side before calling server actions.
*   **Design:** Adhere to mobile-first responsive design principles.
*   **Programming Style:** Follow functional and declarative programming paradigms.
*   **Conventions:**
    *   File and directory names: lowercase with dashes (e.g., `components/admin/payouts/payout-list.tsx`).
    *   Named exports for components.
    *   RORO (Receive an Object, Return an Object) for function parameters/returns where applicable.

## 5. Dependencies & Interactions

*   **Server Actions:** The UI will heavily depend on server actions to be developed under "### 3. Implement Server Actions for Payout Management" (e.g., `getEligiblePayouts`, `previewPayoutBatch`, `getPayoutHistory`, `getPayoutDetails`, `exportPayoutData`). The UI should be designed to integrate with these actions.
*   **Audit Logging:** User interactions that trigger significant state changes or financial operations should be logged via the existing `logAdminActivity` system.
*   **Existing Admin UI:** Leverage existing components and patterns from other admin sections (e.g., Affiliate Fraud Management, general affiliate list/detail views) for consistency.

## 6. Guidance for Developer

*   **Study Existing Admin Modules:** Review `app/admin/affiliates/fraud-flags/page.tsx` and its associated client component `components/admin/affiliates/fraud-flag-list.tsx` as a good example of page structure, data fetching with server actions, client component usage for interactivity (modals, tables), and Shadcn UI integration.
*   **Component Reusability:** Create reusable components for common UI elements (e.g., data tables, filter bars, status badges).
*   **State Management:** For client components, use React `useState` and `useReducer` for local component state. For more complex cross-component client state, consider Zustand if already used in similar admin sections (check project context).
*   **Error Handling:** Implement user-friendly error messages and feedback (e.g., using toasts via `sonner` if that's the project standard) when interacting with server actions.
*   **Loading States:** Provide clear loading indicators for data fetching and asynchronous operations.
*   **Incremental Development:** Tackle one page or major feature at a time. Start with the main payout listing page, then move to detail views, preview, etc.
*   **Collaboration:** Coordinate with the developer working on the server actions to ensure seamless integration.

## 7. Definition of Done (for this UI Task Group)

*   All UI pages and components listed in the "Scope of Work" are implemented.
*   UI is responsive and adheres to the project's design and UX standards.
*   Authorization checks are implemented for all payout-related admin pages.
*   The UI correctly fetches and displays data (can use placeholder data initially if server actions are not yet ready, but should be designed for integration).
*   Interactive elements (filters, buttons, forms) are functional and correctly trigger (or are ready to trigger) the relevant server actions.
*   Code is well-structured, follows project conventions, and is reasonably documented with comments where necessary.
