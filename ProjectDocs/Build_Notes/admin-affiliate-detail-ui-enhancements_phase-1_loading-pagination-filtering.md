## Admin Affiliate Detail UI Enhancements - Phase 1: Loading, Pagination, Filtering

**Task Objective:**
Enhance the Admin Affiliate Detail UI by implementing loading states, pagination, and filtering for the Click History, Conversions, and Payouts tables to improve user experience and data management, initially using mock data.

**Current State Assessment (Pre-Task):**
The Affiliate Detail UI previously displayed static mock data in tables for clicks, conversions, and payouts without loading indicators, pagination, or filtering capabilities. This limited usability, especially with larger datasets.

**Future State Goal (Post-Task):**
The Affiliate Detail UI now features:
- Visual loading indicators (skeleton screens) while data is (simulated to be) fetched for each table.
- Client-side pagination controls (Previous/Next buttons, page numbers) for all three tables.
- Client-side text-based filtering for all three tables:
    - Clicks: by source or landing page.
    - Conversions: by order ID or status.
    - Payouts: by method or reference.
- These enhancements utilize mock data and prepare the component structure for subsequent real data integration.

**Implementation Plan & Status:**
1.  [x] **Click History Table UI Enhancements:**
    *   [x] Implement loading state with skeleton UI.
    *   [x] Implement pagination controls and logic.
    *   [x] Implement filtering by source or landing page.
2.  [x] **Conversions Table UI Enhancements:**
    *   [x] Implement loading state with skeleton UI.
    *   [x] Implement pagination controls and logic.
    *   [x] Implement filtering by Order ID or status.
3.  [x] **Payouts Table UI Enhancements:**
    *   [x] Implement loading state with skeleton UI.
    *   [x] Implement pagination controls and logic.
    *   [x] Implement filtering by method or reference.
4.  [x] **Code Refinements:**
    *   [x] Ensured `useEffect` hooks correctly manage pagination resets on filter changes.
    *   [x] Standardized pagination and filter control placement.

**Next Steps:**
- Integrate real data fetching from backend APIs or server actions to replace mock data for clicks, conversions, and payouts.
- Implement server-side pagination, filtering, and sorting.
