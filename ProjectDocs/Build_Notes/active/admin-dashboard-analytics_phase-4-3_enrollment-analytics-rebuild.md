# Enrollment Analytics Dashboard - Phase 4-3: Rebuild with Integrated Data

## Task Objective
Develop and implement the Enrollment Analytics dashboard section, focusing primarily on the "Papers to Profits" (P2P) course. This phase leverages the unified data model and the newly established data pipelines (Facebook Ads, Shopify) to provide richer insights into P2P enrollment trends, enhance acquisition source analysis, visualize a more complete enrollment funnel, and enable basic user segmentation based on integrated data.

## Current State Assessment
- Foundational data integration phases are assumed complete:
    - Phase 4-1: Facebook Ads data pipeline and schema (`ad_campaigns`, `ad_attributions`, etc.) are established.
    - Phase 4-2: Shopify data pipeline and schema (`shopify_orders`, `shopify_customers`, etc.) are established.
- Core platform data is unified (`unified_profiles`, `transactions`, `enrollments` via Phases 3-0 to 3-2).
- Core dashboard architecture (reusable components, state management) is in place (Phase 3-3).
- An Overview dashboard section exists (Phase 3-4).
- Previous detailed plans for enrollment analytics (Phase 3-5) were deferred and archived; this phase rebuilds the section with the new integrated data context.
- Currently, no dedicated Enrollment Analytics UI section exists beyond the high-level metrics in the Overview.

## Future State Goal
1.  **Functional UI Section:** A dedicated "Enrollment Analytics" tab/section within the admin dashboard.
2.  **Core P2P Metrics:** Clear display of key P2P enrollment metrics (Total, Active status, trends over time) using data from the `enrollments` table.
3.  **Enhanced Funnel Visualization:** A visual representation of the enrollment funnel, starting from potential ad interactions (using `ad_attributions`) or landing page visits (using tags or Shopify source data), through transaction completion (`transactions`) to final P2P enrollment (`enrollments`). Ability to segment the funnel by acquisition source (e.g., Facebook Ad Campaign vs. Organic Tag vs. Shopify).
4.  **Richer Acquisition Insights:** Analysis comparing the volume and potentially conversion rates of P2P enrollments originating from different sources (Facebook Ads, Shopify, Organic/Tags).
5.  **Informed Segmentation:** Basic user segmentation charts for P2P enrollees, utilizing data from `unified_profiles` combined with acquisition source data from `ad_attributions` or `shopify_orders`.
6.  **Detailed Enrollment View:** A filterable and searchable table listing individual P2P enrollments, potentially showing the attributed acquisition source.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification & Schema Phases (3-0, 3-1) - Defines core tables (`unified_profiles`, `transactions`, `enrollments`).
> 2.  Dashboard Core Architecture (Phase 3-3) - Defines reusable UI components and state patterns.
> 3.  Overview Section Implementation (Phase 3-4) - Provides context for existing dashboard elements.
> 4.  Facebook Ads Integration (Phase 4-1) - Defines `ad_` tables and attribution data structure.
> 5.  Shopify Integration (Phase 4-2) - Defines `shopify_` tables and customer/order data structure.
> 6.  Project Context (`ProjectContext.md`)
> 7.  Design Context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Integration Phases (4-1, 4-2)
These phases provide the schema and data for actual acquisition sources beyond simple tags. `ad_attributions` links `transactions` to specific Facebook ads/campaigns. `shopify_orders` provides source information for Shopify purchases and links to `shopify_customers`, which in turn link to `unified_profiles`.

### Core Data Model (3-0, 3-1)
Enrollments in the `enrollments` table are primarily generated for completed P2P `transactions`. This table is the source for core enrollment counts and trends.

## Implementation Plan

### 1. Backend API Development
*Goal: Create endpoints to serve aggregated and detailed enrollment data, incorporating integrated sources.* 
*Best Practice: Optimize queries, ensure security, provide clear API contracts.* 

- [ ] **Refine/Create `/enrollments/summary` Endpoint:**
    - Fetch total P2P enrollments (`COUNT` from `enrollments`).
    - Calculate trends (e.g., vs. previous period) based on `enrollments.enrolled_at`.
    - Support date range filtering.
- [ ] **Refine/Create `/enrollments/trends` Endpoint:**
    - Provide time-series data (daily/weekly/monthly counts) of P2P enrollments based on `enrollments.enrolled_at`.
    - Support date range filtering and granularity options.
- [ ] **Refine/Create `/enrollments/funnel` Endpoint:**
    - Aggregate data for funnel stages:
        - (Optional Top Stage) Ad Interactions (Count distinct users/transactions from `ad_attributions` within date range).
        - Landing Page/Source (Count distinct users from `shopify_orders` or `unified_profiles` with specific tags within date range).
        - Transaction Initiated (Count relevant `transactions` with `pending` status).
        - Transaction Completed (Count relevant `transactions` with `completed` status).
        - P2P Enrollment (Count relevant `enrollments`).
    - Allow segmentation by source (e.g., query parameter `?source=facebook`, `?source=shopify`, `?source=organic`).
    - Join `enrollments` -> `transactions` -> `ad_attributions` / `shopify_orders` / `unified_profiles` (for tags) to attribute final enrollments back to initial sources.
- [ ] **Refine/Create `/enrollments/details` Endpoint:**
    - Fetch paginated list of P2P `enrollments`.
    - Join with `unified_profiles` for user details.
    - Optionally join with `transactions` -> `ad_attributions` / `shopify_orders` to display the attributed acquisition source.
    - Support filtering (date range) and searching (user email/name).
- [ ] **(New) `/enrollments/segmentation` Endpoint:**
    - Provide aggregated P2P enrollment counts grouped by:
        - Acquisition source (Facebook Campaign, Shopify, Organic/Tag).
        - User profile attributes (e.g., `unified_profiles.tags` if relevant, demographics if available).
    - Support date range filtering.

### 2. Frontend UI Implementation
*Goal: Build the Enrollment Analytics section using reusable components and fetched data.* 
*Best Practice: Follow design context, ensure responsiveness, handle loading/error states.* 

- [ ] **Create Main Section Layout:** Set up the tab/page structure for "Enrollment Analytics".
- [ ] **Implement Metric Cards:** Display summary P2P enrollment metrics (Total, Active, Trends) using data from `/enrollments/summary`.
- [ ] **Implement Time Series Chart:** Visualize P2P enrollment trends using data from `/enrollments/trends` (e.g., using Recharts or similar).
- [ ] **Implement Funnel Visualization:** Build a component (e.g., using a dedicated funnel chart library or custom SVG) to display data from `/enrollments/funnel`. Include controls to switch between viewing the funnel for different acquisition sources (All, Facebook, Shopify, Organic).
- [ ] **Implement Segmentation Charts:** Use bar charts or pie charts to display P2P enrollment breakdowns by acquisition source or user profile attributes, using data from `/enrollments/segmentation`.
- [ ] **Implement Details Table:** Use a data table component (e.g., TanStack Table) to display the paginated list of P2P enrollments from `/enrollments/details`. Include filtering, sorting, and search capabilities.

### 3. State Management Integration
*Goal: Manage data fetching, caching, and filtering state for the section.* 
*Best Practice: Use Zustand store, create specific selectors, handle async states.* 

- [ ] **Adapt/Create Zustand Slice:** Define state structure for enrollment summary, trends, funnel data, segmentation data, details list, filters (date range, source filter), loading states, and errors.
- [ ] **Implement Fetch Actions:** Create async actions to call the backend API endpoints (Step 1) and update the store state.
- [ ] **Implement Selectors:** Create selectors for components to efficiently access the required data from the store.
- [ ] **Connect Filters:** Ensure date range selectors and any source filters update the store state and trigger appropriate data refetching actions.

### 4. Testing & Validation
*Goal: Ensure the dashboard section displays accurate data and functions correctly.* 

- [ ] **API Endpoint Testing:** Test API endpoints with various parameters (date ranges, source filters) to ensure correct data aggregation and joins.
- [ ] **Frontend Component Testing:** Unit/integration tests for key UI components.
- [ ] **Data Validation:** Manually cross-reference dashboard metrics and visualizations against direct database queries using sample data to ensure accuracy.
- [ ] **Cross-Browser/Responsive Testing:** Verify the section displays correctly on different screen sizes and browsers.

## Technical Considerations

### Data Query Complexity
- Queries for funnel analysis and segmentation involving joins across `enrollments`, `transactions`, `unified_profiles`, `ad_attributions`, and `shopify_orders` can become complex. Prioritize performance through:
    - **Efficient Indexing:** Ensure indexes created in Phases 4-1 and 4-2 are leveraged.
    - **Query Optimization:** Analyze and optimize SQL queries (use `EXPLAIN ANALYZE`).
    - **Materialized Views (Optional):** Consider creating materialized views for complex, frequently accessed aggregations if performance is an issue.

### Handling Sparse Data
- Not all enrollments will have Facebook ad attribution or originate from Shopify. The UI and backend logic must handle cases where attribution data is missing, displaying sources as "Organic/Direct" or based on available tags.
- Funnel visualizations should clearly indicate stages where data might be incomplete (e.g., Ad Impression data might not be available for all users).

### UI/UX for Complex Data
- **Funnel Visualization:** Choose a clear and intuitive way to represent the multi-source funnel. Allow users to easily filter or compare different source paths.
- **Segmentation:** Ensure charts remain readable even with multiple segments. Provide clear labels and tooltips.
- **Loading/Error States:** Implement informative loading indicators and user-friendly error messages for API failures.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Optimizing complex SQL queries for the funnel and segmentation endpoints.
- Designing an intuitive UI to visualize the multi-source enrollment funnel.
- Accurately attributing enrollments back to the correct initial source across different platforms (Facebook, Shopify, Organic).

## Next Steps After Completion
Following the implementation of the Enrollment Analytics dashboard, the focus will shift to Phase 4-4: Revenue Analytics Dashboard, which will analyze the financial outcomes based on the integrated transaction data.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4, 4-1, 4-2).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 