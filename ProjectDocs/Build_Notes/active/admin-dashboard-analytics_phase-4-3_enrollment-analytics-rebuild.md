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
3.  **Simplified Funnel Visualization:** A visual representation of the enrollment funnel using currently available data points. This includes potential leads (based on tags/source hints), transaction initiation (`transactions`), transaction completion (`transactions`), and final P2P enrollment (`enrollments`). *Note: Direct linking to specific Facebook Ad campaigns via `ad_attributions` is deferred until Phase 4-1 Step 4 (Attribution Logic) is completed.* Ability to segment the funnel by basic acquisition source (e.g., Organic/Tag vs. potentially inferred sources).
4.  **Basic Acquisition Insights:** Analysis comparing the volume of P2P enrollments originating from different identifiable sources (primarily Organic/Tags until ad attribution is available).
5.  **Informed Segmentation:** Basic user segmentation charts for P2P enrollees, utilizing data from `unified_profiles` combined with available acquisition source data (e.g., tags).
6.  **Detailed Enrollment View:** A filterable and searchable table listing individual P2P enrollments, potentially showing the attributed basic acquisition source (e.g., tag).
7.  **Admin Enrollment Check Tool:** A utility for administrators to quickly check if an email is enrolled in P2P and view the associated payment date.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification & Schema Phases (3-0, 3-1) - Defines core tables (`unified_profiles`, `transactions`, `enrollments`).
> 2.  Dashboard Core Architecture (Phase 3-3) - Defines reusable UI components and state patterns.
> 3.  Overview Section Implementation (Phase 3-4) - Provides context for existing dashboard elements.
> 4.  Facebook Ads Integration (Phase 4-1) - Defines `ad_` tables. *Crucially, Step 4 (Attribution Logic) is currently PAUSED, meaning `ad_attributions` is not yet populated.*
> 5.  Shopify Integration (Phase 4-2) - Defines `shopify_` tables. *Note: Shopify is used post-enrollment for P2P users, not as a primary acquisition source.*
> 6.  Project Context (`ProjectContext.md`)
> 7.  Design Context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Integration Phases (4-1, 4-2)
Phase 4-1 provides the schema for ad metadata and spend. However, the `ad_attributions` table linking transactions to specific ads is **not yet populated** (Phase 4-1 Step 4 is paused). Phase 4-2 provides Shopify data, but this is primarily relevant *after* P2P enrollment, not as a direct acquisition source for it.

### Core Data Model (3-0, 3-1)
Enrollments in the `enrollments` table are primarily generated for completed P2P `transactions`. This table is the source for core enrollment counts and trends. `unified_profiles` contains user information and potentially tags indicating an initial source.

## Implementation Plan

### 1. Backend API Development
*Goal: Create endpoints to serve aggregated and detailed enrollment data, incorporating integrated sources.* 
*Best Practice: Optimize queries, ensure security, provide clear API contracts.* 

- [x] **Refine/Create `/enrollments/summary` Endpoint:**
    - Fetch total P2P enrollments (`COUNT` from `enrollments`).
    - Calculate trends (e.g., vs. previous period) based on `enrollments.enrolled_at`.
    - Support date range filtering.
- [x] **Refine/Create `/enrollments/trends` Endpoint:**
    - Provide time-series data (daily/weekly/monthly counts) of P2P enrollments based on `enrollments.enrolled_at`.
    - Support date range filtering and granularity options.
- [x] **Refine/Create `/enrollments/funnel` Endpoint:**
    - Aggregate data for simplified funnel stages:
        - Potential Leads/Visitors (Count distinct users from `unified_profiles` with relevant tags OR based on basic source info within date range).
        - Transaction Initiated (Count relevant `transactions` with `pending` status within date range).
        - Transaction Completed (Count relevant `transactions` with `completed` status within date range).
        - P2P Enrollment (Count relevant `enrollments` within date range).
    - Allow segmentation by basic source available (e.g., query parameter `?source=organic_tag`).
    - *Deferred:* Joining to `ad_attributions` for Facebook Ad source linking is deferred until Phase 4-1 Step 4 completion.
- [x] **Refine/Create `/enrollments/details` Endpoint:**
    - Fetch paginated list of P2P `enrollments`.
    - Join with `unified_profiles` for user details.
    - Optionally display basic acquisition source (e.g., tags from `unified_profiles`) if available. *Deferred:* Joining to `ad_attributions` or `shopify_orders` for detailed source attribution is deferred or not applicable.
    - Support filtering (date range) and searching (user email/name).
- [x] **(New) `/enrollments/segmentation` Endpoint:**
    - Provide aggregated P2P enrollment counts grouped by:
        - Basic Acquisition source available (e.g., Organic/Tag). *Deferred:* Facebook Campaign segmentation requires `ad_attributions`.
        - User profile attributes (e.g., `unified_profiles.tags` if relevant, demographics if available).
    - Support date range filtering.
- [x] **(New) `/admin/enrollments/check-status` Endpoint:**
    - Accepts an `email` query parameter.
    - Finds the corresponding `user_id` from `unified_profiles`.
    - Checks for a P2P `enrollment` associated with that `user_id`.
    - If enrolled, finds the associated `transaction` (specifically the one marking completion/payment).
    - Returns `{ isEnrolled: boolean, paymentDate: string | null }`.
    - Ensure endpoint requires appropriate admin authentication/authorization.

### 2. Frontend UI Implementation
*Goal: Build the Enrollment Analytics section using reusable components and fetched data.* 
*Best Practice: Follow design context, ensure responsiveness, handle loading/error states.* 

- [x] **Create Main Section Layout:** Set up the tab/page structure for "Enrollment Analytics".
- [x] **Implement Metric Cards:** Display summary P2P enrollment metrics (Total, Active, Trends) using data from `/enrollments/summary`.
- [x] **Implement Time Series Chart:** Visualize P2P enrollment trends using data from `/enrollments/trends` (e.g., using Recharts or similar).
- [x] **Implement Simplified Funnel Visualization:** Build a component (e.g., using a dedicated funnel chart library or custom SVG) to display data from the updated `/enrollments/funnel` endpoint. Include controls to switch between viewing the funnel for different *available* basic acquisition sources (e.g., All, Tagged). *Acknowledge that detailed ad source breakdown is deferred.*
- [x] **Implement Segmentation Charts:** Use bar charts or pie charts to display P2P enrollment breakdowns by available basic acquisition source or user profile attributes, using data from `/enrollments/segmentation`.
- [x] **Implement Details Table:** Use a data table component (e.g., TanStack Table) to display the paginated list of P2P enrollments from `/enrollments/details`. Include filtering, sorting, and search capabilities. Display basic source info (tags) if available.
- [x] **(New) Implement Enrollment Check UI:**
    - Add a simple component within the admin dashboard (location TBD - perhaps Users section or a dedicated 'Utilities' area).
    - Include an input field for email address and a 'Check Status' button.
    - On button click, call the `/api/admin/enrollments/check-status` endpoint.
    - Display the result clearly (e.g., "Enrolled (Paid on: [Date])" or "Not Enrolled").
    - Handle loading and error states for the API call.

### 3. State Management Integration
*Goal: Manage data fetching, caching, and filtering state for the section effectively.*
*Best Practice: Use Zustand store for complex state or shared logic, otherwise local state is acceptable. Follow patterns from `ProjectContext.md` and Phase 2 (`course-editor-enhancement_phase-2_state-optimization.md`).*

*Context:* Currently, `EnrollmentAnalytics` uses local `useState` and `useEffect` hooks to manage state for summary, trends, funnel, segmentation, details data (including loading/error states), and various filters (date range, granularity, source, search term, pagination).

*Decision Point:* Choose between:
    a) **Keeping Local State:** Maintain the current approach. Suitable if the component complexity doesn't increase significantly.
    b) **Refactoring to Zustand:** Create a dedicated Zustand slice (`enrollmentAnalyticsStore`) to centralize state and logic. Recommended if state needs sharing, becomes hard to manage locally, or requires more complex caching/selectors.

- [x] **Assess Current State Complexity:** Evaluated. Current local state is becoming complex; refactoring to Zustand is recommended.
- [x] **(If Refactoring to Zustand) Define Store Slice:** Created `lib/stores/admin/enrollmentAnalyticsStore.ts`.
    - Define state structure (data, loading states, errors, filters).
    - Define actions (async functions) for fetching data from each API endpoint (summary, trends, funnel, segmentation, details) and updating the store.
    - Define selectors for components to access specific parts of the state.
- [ ] **(If Refactoring to Zustand) Connect Component:** Modify `EnrollmentAnalytics` to use the Zustand store.
    - Remove local state management for fetched data and filters.
    - Call store actions to fetch data.
    - Use store selectors to get data and loading/error states for rendering.
- [ ] **(If Keeping Local State) Optimize Local State:** Review existing hooks for potential consolidation or custom hook extraction for better readability.
- [ ] **Implement Filters Connection:** Ensure date range, granularity, source filter, search term, and pagination controls correctly update the relevant state (local or Zustand) and trigger appropriate data refetching actions.

### 4. Testing & Validation
*Goal: Ensure the dashboard section displays accurate data and functions correctly.* 

- [ ] **API Endpoint Testing:** Test API endpoints with various parameters (date ranges, *basic* source filters, *email for check tool*) to ensure correct data aggregation and joins.
- [ ] **Frontend Component Testing:** Unit/integration tests for key UI components.
- [ ] **Data Validation:** Manually cross-reference dashboard metrics and visualizations against direct database queries using sample data to ensure accuracy.
- [ ] **Cross-Browser/Responsive Testing:** Verify the section displays correctly on different screen sizes and browsers.
- [ ] **(New) Enrollment Check Tool Testing:** Verify the tool correctly identifies enrolled/unenrolled users and displays the payment date accurately.

## Technical Considerations

### Data Query Complexity
- Queries for *simplified* funnel analysis and segmentation involving joins across `enrollments`, `transactions`, `unified_profiles` should be manageable but still require optimization.
    - **Efficient Indexing:** Ensure relevant indexes exist on `user_id`, `transaction_id`, `enrollment_id`, timestamps, and potentially `unified_profiles.tags`.

### Handling Sparse/Incomplete Data
- Not all enrollments will have clear source tags. The UI and backend logic must handle cases where source data is missing, displaying sources as "Unknown" or "Direct".
- Funnel visualizations should clearly represent the stages based on available data.

### UI/UX for Data Visualization
- **Funnel Visualization:** Choose a clear way to represent the simplified funnel.
- **Segmentation:** Ensure charts remain readable with available basic segments. Provide clear labels and tooltips.
- **Loading/Error States:** Implement informative loading indicators and user-friendly error messages.
- **Enrollment Check Tool:** Ensure the UI is simple and provides clear feedback.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Optimizing queries for the simplified funnel and segmentation endpoints based on available data.
- Designing an intuitive UI to visualize the enrollment funnel *with current data limitations*.
- Accurately identifying basic acquisition sources (e.g., from tags) if available.
- Integrating the Enrollment Check Tool seamlessly into the admin workflow.

## Next Steps After Completion
Following the implementation of the Enrollment Analytics dashboard, the focus will shift to Phase 4-4: Revenue Analytics Dashboard, which will analyze the financial outcomes based on the integrated transaction data.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4, 4-1, 4-2).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 