### Dashboard API Call Optimization Strategy (Zustand)

**Goal:** Prevent redundant API calls when switching between dashboard tabs or when components remount, while still ensuring data updates when relevant filters change.

**Approach:** Leverage Zustand stores to manage both UI state (filters) and server state (fetched data), implementing caching logic within the store's fetch actions.

**Implementation Steps:**

1.  **Centralize Filters (if applicable):** For filters shared across multiple sections (like `dateRange`), use a dedicated shared Zustand store (e.g., `sharedDashboardFiltersStore`). Section-specific filters (like `granularity` in Enrollments) remain in their respective section stores.
2.  **Create Section-Specific Stores:** Each major dashboard section (Overview, Enrollments, Revenue, etc.) should have its own Zustand store (e.g., `useDashboardOverviewStore`, `useEnrollmentAnalyticsStore`).
3.  **Store Data and Status:** Each store holds the data fetched from APIs (`summaryData`, `trendsData`, etc.), corresponding loading flags (`isLoadingSummary`, `isLoadingTrends`, etc.), and error states.
4.  **Store Last Fetched Filters:**
    *   Add state variables to each store to track the *specific filter values* used for the *last successful fetch* of each data slice (e.g., `lastFetchedTrendsFilters: { dateRange, granularity } | null`).
    *   Initialize these filter states to `null`.
5.  **Implement Smart Fetch Actions in Store:**
    *   Define `fetch...` actions within the store for each data slice (e.g., `fetchTrends`).
    *   Inside each action:
        *   Check if already loading that specific slice (`isLoadingTrends`) and return if true.
        *   Construct a `currentFilters` object using the current filter values (reading from the shared date store and its own state as needed).
        *   Compare `currentFilters` with the corresponding `lastFetched...Filters` state using a deep equality check (e.g., `lodash.isEqual`).
        *   If filters match, log a message and return (skip API call).
        *   Check for required filter values (e.g., `dateRange.from`) before proceeding.
        *   Set the specific `isLoading...` flag to `true`.
        *   Perform the API call using `currentFilters`.
        *   On success: Update the data state, set `isLoading...` to `false`, clear the error state, and **update `lastFetched...Filters` with `currentFilters`**.
        *   On error: Log the error, update the error state, set `isLoading...` to `false`, and **reset `lastFetched...Filters` to `null`** (to allow retries).
6.  **Simplify Component `useEffect`:**
    *   The component responsible for displaying the data (e.g., `EnrollmentAnalytics`) uses the store hook to get necessary data, loading/error states, and fetch actions.
    *   Implement **one primary `useEffect`** hook.
    *   Its dependency array should include all relevant filter state variables (both shared like `sharedDateRange` and local like `granularity`). Include the necessary `fetch...` actions from the store in the dependency array as well.
    *   Inside the effect, simply call the relevant `fetch...` actions from the store (e.g., `fetchSummary()`, `fetchTrends()`). The store actions now contain the logic to decide if an actual API call runs.
    *   Remove separate `useEffect` hooks that were previously used to trigger fetches based on individual filter changes if they are now covered by the main effect's dependencies.
    *   For actions triggered by direct user interaction (like pagination or search), the event handler can directly call the specific store action (e.g., `setDetailsPage` which then calls `fetchDetails`).

**Benefits:**

*   Reduces unnecessary API load.
*   Improves perceived performance by loading cached data instantly when switching tabs.
*   Centralizes caching logic within the relevant data stores.
*   Component effects become simpler, mainly signaling intent based on dependency changes.