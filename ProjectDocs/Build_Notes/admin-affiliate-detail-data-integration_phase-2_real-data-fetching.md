## Admin Affiliate Detail - Phase 2: Real Data Integration

**Task Objective:**
Replace mock data in the Admin Affiliate Detail UI (Clicks, Conversions, Payouts tables) with real data fetched from the backend. Implement server-side pagination and filtering for these tables.

**Current State Assessment (Pre-Task):**
The Affiliate Detail UI has loading states, pagination, and filtering implemented using client-side logic and mock data. The component structure is ready for real data integration.

**Future State Goal (Post-Task):**
The Affiliate Detail UI will:
- Fetch click, conversion, and payout data from the backend using server actions.
- Implement server-side pagination for efficient data handling.
- Implement server-side filtering based on user input.
- Display real-time, accurate affiliate data.

**Implementation Plan & Status:**
1.  [ ] **Click History Table - Real Data Integration:**
    *   [ ] Define/Review TypeScript types for fetched click data (if different from existing `AffiliateClick`).
    *   [ ] Create a server action (`getAffiliateClicks`) to fetch paginated and filtered click data for a specific affiliate.
        *   Parameters: `affiliateId`, `page`, `limit`, `filterSource`, `filterLandingPage`.
        *   Return: `{ data: AffiliateClick[], totalCount: number }`.
    *   [ ] Update `AffiliateDetailView` to call `getAffiliateClicks`.
    *   [ ] Adapt loading, pagination, and filtering states to work with server-fetched data.
2.  [ ] **Conversions Table - Real Data Integration:**
    *   [ ] Define/Review TypeScript types for fetched conversion data.
    *   [ ] Create a server action (`getAffiliateConversions`) to fetch paginated and filtered conversion data.
        *   Parameters: `affiliateId`, `page`, `limit`, `filterOrderId`, `filterStatus`.
        *   Return: `{ data: AffiliateConversion[], totalCount: number }`.
    *   [ ] Update `AffiliateDetailView` to call `getAffiliateConversions`.
    *   [ ] Adapt component states for server-fetched conversion data.
3.  [ ] **Payouts Table - Real Data Integration:**
    *   [ ] Define/Review TypeScript types for fetched payout data.
    *   [ ] Create a server action (`getAffiliatePayouts`) to fetch paginated and filtered payout data.
        *   Parameters: `affiliateId`, `page`, `limit`, `filterMethod`, `filterReference`.
        *   Return: `{ data: AffiliatePayout[], totalCount: number }`.
    *   [ ] Update `AffiliateDetailView` to call `getAffiliatePayouts`.
    *   [ ] Adapt component states for server-fetched payout data.
4.  [ ] **Error Handling & Edge Cases:**
    *   [ ] Implement robust error handling for data fetching operations.
    *   [ ] Ensure UI gracefully handles empty states or API errors.
5.  [ ] **Code Refinement & Testing:**
    *   [ ] Refactor code for clarity and maintainability.
    *   [ ] Test thoroughly with various affiliate data scenarios.

**Key Considerations:**
- Utilize `@supabase/ssr` for Supabase client creation in server actions.
- Ensure server actions correctly query the database based on pagination and filter parameters.
- Update client-side state management to reflect server-side data (e.g., `totalPages` will come from the server `totalCount`).
