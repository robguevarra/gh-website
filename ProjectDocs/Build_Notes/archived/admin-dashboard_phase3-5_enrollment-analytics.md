# Admin Dashboard - Phase 3-5: Enrollment Analytics Section

## Task Objective
Implement an Enrollment Analytics section for the admin dashboard focused on the "Papers to Profits" (P2P) course. Provide insights into P2P enrollment patterns, basic user acquisition (based on current tags), and the enrollment funnel, while laying the groundwork for future advertising performance analysis.

## Current State Assessment
The Overview dashboard section provides high-level metrics. However, we need a dedicated section to analyze P2P enrollment trends, track the basic enrollment funnel using existing data (Systemeio tags), and view enrollment details. Functionality like cohort analysis or multi-course comparison is not currently relevant or feasible.

## Future State Goal
A focused Enrollment Analytics dashboard section providing:
1.  Key P2P enrollment metrics (total, active, time-based trends)
2.  Visualization of P2P enrollment trends over time
3.  Basic enrollment funnel visualization (Landing Page Tag -> Transaction -> Enrollment) using current data
4.  User segmentation analysis for P2P enrollees based on available profile data
5.  Filterable, sortable table detailing P2P enrollments
6.  (Future Enhancement) Integration point for advertising performance metrics (e.g., from Facebook Ads)

This section will enable administrators to understand P2P enrollment patterns and optimize the initial stages of the enrollment journey based on available data.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification Strategy (Phases 3-0 to 3-2) - Defines `unified_profiles`, `transactions`, `enrollments` tables, and tag/status normalization.
> 2.  Dashboard Core Architecture (Phase 3-3) - Defines reusable components and state patterns.
> 3.  Overview Section Implementation (Phase 3-4) - Provides context on existing dashboard elements.
> 4.  Project context (`ProjectContext.md`)
> 5.  Design context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy
We now have unified data including:
- `enrollments` table primarily tracking 'active' P2P course enrollments derived from 'completed' `transactions`. P2P enrollments do not expire.
- `transactions` table tracking both P2P and 'Canva' ebook purchases.
- `unified_profiles` table containing user details and `tags` (e.g., "squeeze", "Canva") indicating initial acquisition source.

### From Dashboard Core Architecture
The implementation should leverage:
- Reusable chart container components
- Metric card components with consistent styling
- Zustand store patterns for state management
- Date range selector for consistent time filtering

## Implementation Plan

### 1. P2P Enrollment Metrics Summary
- [ ] Implement P2P enrollment status breakdown
    - Create cards for Total P2P Enrollments and Active P2P Enrollments (likely the same if no inactivation logic exists).
    - Add trend indicators compared to previous period.
- [ ] Add time-based P2P enrollment analysis
    - Implement daily/weekly/monthly P2P enrollment counts.
    - Show seasonality patterns if detectable.
    - Include year-over-year comparison.
- [ ] (Optional) Add metrics for 'Canva' Ebook Sales
    - Display total 'Canva' ebook units sold (from `transactions` table).
    - Show sales trends over time.

### 2. P2P Enrollment Trends Visualization
- [ ] Create P2P enrollment time series chart
    - Implement line chart showing P2P enrollments over time.
    - Include adjustable time granularity (daily/weekly/monthly).
- [ ] (Optional) Implement enrollment distribution chart based on Acquisition Tag
    - Create pie/donut chart showing P2P enrollment distribution by `unified_profiles.acquisition_source` or relevant tag.
- [ ] (Optional) Develop enrollment heatmap visualization
    - Show P2P enrollment patterns by day of week/time.
    - Identify peak enrollment periods.

### 3. Enrollment Funnel Analysis (Basic)
- [ ] Implement funnel visualization using existing data
    - Create stage breakdown: Acquisition Source Tag (`unified_profiles.tags`) -> Transaction Initiated (`transactions.status = 'pending'`) -> Transaction Completed (`transactions.status = 'completed'`) -> P2P Enrollment Created (`enrollments` record).
    - Add percentage calculations for conversion between stages.
    - Note: This provides a basic view; future ad integration will enhance this significantly.
- [ ] Add source attribution analysis (based on tags)
    - Show conversion rates through the funnel based on acquisition tag (e.g., 'squeeze').
    - Highlight differences if multiple tags are relevant.
- [ ] Create funnel optimization insights (basic)
    - Identify largest drop-off points in the current basic funnel.

### 4. P2P Enrollment Details Table
- [ ] Design P2P enrollment table
    - Create columns for user (email/name), enrollment date, status ('Active').
    - Add sorting capability.
    - Implement pagination.
- [ ] Add filtering and search capabilities
    - Create filters for date range.
    - Implement free text search for user information.
- [ ] Implement data export functionality
    - Add CSV export for filtered P2P enrollment data.

### 5. User Segmentation Analysis (Basic)
- [ ] Create segmentation charts for P2P Enrollees
    - Implement breakdown by available `unified_profiles` attributes (e.g., acquisition tag, demographics if available).
    - Compare conversion rates or transaction values by segment if meaningful data exists.
- [ ] Focus on understanding 'Who enrolls in P2P?' based on current data.

### 6. Data Fetching and State Integration
- [ ] Adapt/Create API endpoints for P2P enrollment data
    - Review/Implement `/api/admin/dashboard/enrollments/summary` for P2P metrics.
    - Review/Implement `/api/admin/dashboard/enrollments/trends` for P2P time series.
    - Review/Implement `/api/admin/dashboard/enrollments/details` for P2P enrollment records.
    - Review/Implement `/api/admin/dashboard/enrollments/funnel` for basic funnel data.
- [ ] Implement state management for enrollment data
    - Adapt enrollment analytics slice in store for P2P focus.
    - Add/Adapt actions for fetching relevant data types.
    - Implement selectors for component access.
- [ ] Add filter state management (primarily date range).

## Technical Considerations

### Data Analysis Approach
1.  **Aggregation Strategy**:
    - Use server-side aggregation for performance, focusing queries on `enrollments` (for P2P) and `transactions` tables.
    - Implement caching for common P2P summary queries.
    - Consider views optimized for P2P reporting.

### Visualization Optimization
1.  **Chart Performance**:
    - Optimize queries for P2P time series data.
    - Use canvas-based rendering if visualizations become complex.
2.  **Interactive Features**:
    - Ensure cross-filtering (e.g., date range) applies consistently.
    - Create consistent tooltips and hover states for P2P metrics.

### User Experience Enhancements
1.  **Insight Highlighting**:
    - Focus on highlighting significant trends in P2P enrollments.
2.  **Educational Elements**:
    - Add context explanations for funnel stages based on current data limitations.

## Completion Status

This phase is currently **not started**.

Challenges anticipated:
- Ensuring clear distinction between P2P enrollments and Canva ebook sales in metrics.
- Communicating the limitations of the basic funnel analysis based only on tag data.
- Designing visualizations that are meaningful with a single primary course.

## Next Steps After Completion
After implementing this focused Enrollment Analytics section, we will move to Phase 3-6: Revenue Analysis Section. A separate, future phase (e.g., Phase 3-9) should be planned for integrating and visualizing advertising performance data (e.g., from Facebook Ads).

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 3-0 to 3-4).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency.
