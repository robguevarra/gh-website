# Marketing & Advertising Performance Dashboard - Phase 4-5: Unified Reporting

## Task Objective
Develop and implement a unified Marketing & Advertising Performance dashboard section. This phase aims to synthesize data from Facebook Ads (spend, metadata), Shopify (source, revenue), Xendit (revenue, transactions), and internal user data (`unified_profiles`, tags) to provide a holistic view of marketing channel effectiveness, visualize the customer journey, and eventually calculate key performance indicators like ROAS and CPA.

**CRITICAL PREREQUISITE WARNING:** The calculation and display of Ad-Attributed Revenue, Return On Ad Spend (ROAS), and Cost Per Acquisition (CPA) are **dependent on the completion of Phase 4-1, Step 4 (Attribution Data Processing Logic)**, which populates the `ad_attributions` table. As this step is currently **paused**, this phase (4-5) will focus on implementing the dashboard structure, displaying available data (ad spend, metadata, impressions, clicks, overall revenue/enrollments), and preparing for the integration of attribution data once it becomes available.

## Current State Assessment
- Foundational data integration phases are assumed complete:
    - Phase 4-1: Facebook Ads data (schema: `ad_campaigns`, `ad_spend`, `ad_attributions`, etc.) is being ingested.
    - Phase 4-2: Shopify data (schema: `shopify_orders`, `shopify_customers`, etc.) is being ingested.
- Core platform data (`unified_profiles`, `transactions`, `enrollments`) is unified (Phases 3-0 to 3-2).
- Enrollment Analytics (Phase 4-3) and Revenue Analytics (Phase 4-4) dashboards are implemented, providing views specific to those areas.
- Core dashboard architecture (Phase 3-3) and Overview (Phase 3-4) are in place.
- Previous specific plans for Marketing Insights (3-7) and Advertising Performance (3-9) were deferred/archived; this phase combines and builds upon their goals using the newly integrated data.
- **Crucially, the `ad_attributions` table linking specific transactions/enrollments back to Facebook Ads is not yet populated (Phase 4-1, Step 4 is paused).**
- Shopify sales primarily originate from existing members who previously enrolled in P2P, not as a primary acquisition channel for new P2P members.
- Currently, there is no dedicated dashboard section that correlates advertising spend and multi-channel acquisition sources directly with revenue and enrollment outcomes *using verified attribution*.

## Future State Goal
1.  **Functional UI Section:** A dedicated "Marketing Performance" (or similar) tab/section within the admin dashboard.
2.  **Unified Acquisition & Revenue Overview:** Metrics and visualizations showing user acquisition sources (primarily Organic/Tags for now) and overall conversions (transactions/enrollments), alongside total ad spend and Shopify revenue (understanding Shopify revenue is primarily from existing members). **[Accurate cross-channel acquisition performance comparison blocked by Ad Attribution]**.
3.  **Key Advertising KPIs:** Clear display of critical advertising metrics *that are currently available*: Total Ad Spend, Impressions, Clicks. **[Display of Ad-Attributed Revenue, ROAS, CPA blocked by Ad Attribution]**.
4.  **Channel Comparison (Limited):** Side-by-side comparison of different marketing channels based on *available* metrics: Facebook (Spend, Clicks, Impressions), Shopify (Total Revenue from members), Organic/Tag (Enrollment Volume). **[ROI/ROAS/CPA comparison blocked by Ad Attribution]**.
5.  **Detailed Ad Reporting (Spend & Metadata):** Ability to drill down into Facebook Ads performance by Campaign, Ad Set, and Ad, showing spend, impressions, and clicks. **[Attributed Revenue, ROAS, CPA reporting blocked by Ad Attribution]**.
6.  **Enhanced Funnel Correlation:** **[Blocked by Ad Attribution]** Visualization potentially linking ad spend/impressions/clicks at the top of the funnel (from `ad_spend`) to the enrollment and revenue outcomes analyzed in Phases 4-3 and 4-4.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Facebook Ads Integration (Phase 4-1) - Provides the ad spend and attribution data.
> 2.  Shopify Integration (Phase 4-2) - Provides additional revenue stream and customer source data.
> 3.  Enrollment Analytics Dashboard (Phase 4-3) - Provides enrollment counts and basic funnel view.
> 4.  Revenue Analytics Dashboard (Phase 4-4) - Provides unified revenue data across platforms.
> 5.  Data Unification & Schema Phases (3-0, 3-1) - Defines core tables.
> 6.  Dashboard Core Architecture (Phase 3-3) - Defines reusable UI components.
> 7.  Project Context (`ProjectContext.md`)
> 8.  Design Context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### Synthesizing Integrated Data
This phase is critical as it ties together the previously disparate data streams. It requires joining:
- Ad spend/metadata (`ad_spend`, `ad_campaigns`, etc. from 4-1)
- **[PAUSED]** Ad attributions (`ad_attributions` from 4-1)
- Transaction/Revenue data (`transactions` from 3-0, `shopify_orders` from 4-2)
- Enrollment data (`enrollments` from 3-1)
- User data (`unified_profiles` from 3-0)

## Implementation Plan

### 1. Data Modeling & Views (Optional Enhancement)
*Goal: Simplify querying across advertising, transaction, and user data.*
*Best Practice: Create views to pre-join and aggregate key marketing performance metrics.*
*Note: The view can be created now but will lack attribution data until Phase 4-1 Step 4 is done.*

- [x] **(Optional) Design `marketing_performance_view`:**
    - Create a PostgreSQL VIEW joining `ad_spend` (or potentially `ad_attributions` *when available*) with `ad_campaigns`/`adsets`/`ads`, `transactions` (or `unified_transactions_view` from 4-4), and potentially `enrollments`.
    - Pre-calculate costs (spend). **[Pre-calculation of attributed revenue blocked by Ad Attribution]**.
    - Include flags for acquisition channel (facebook, shopify, organic).
    - Aggregate by relevant dimensions (date, campaign, adset, ad, channel).

### 2. Backend API Development
*Goal: Create endpoints to serve available marketing and advertising performance data.*
*Best Practice: Leverage views if created, clearly indicate unavailable metrics.*

- [x] **Create `/marketing/summary` Endpoint:**
    - Fetch overall KPIs: Total Ad Spend. **[Fetching Total Attributed Revenue, Overall ROAS, Average CPA blocked by Ad Attribution]**.
    - Support date range filtering.
- [x] **Create `/marketing/by-channel` Endpoint:**
    - Provide key *available* metrics (Spend, Clicks, Impressions for Facebook; Total Revenue for Shopify; Enrollment Volume for Tags) grouped by marketing channel. **[ROAS, CPA, Conversion Count/Rate calculation blocked by Ad Attribution]**.
    - Support date range filtering.
- [x] **Create `/marketing/facebook/details` Endpoint:**
    - Provide detailed Facebook Ads performance metrics *available*: Spend, Impressions, Clicks broken down by Campaign, Ad Set, and Ad. Query `ad_` tables. **[Fetching Attributed Revenue, ROAS, CPA blocked by Ad Attribution]**.
    - Support date range filtering, sorting, and pagination.
- [ ] **(Optional) `/marketing/funnel/performance` Endpoint:** **[Blocked by Ad Attribution]**.

### 3. Frontend UI Implementation
*Goal: Build the Marketing & Advertising Performance section, displaying available data clearly.*
*Best Practice: Clear hierarchy, comparative visualizations, indicate unavailable data.*

- [x] **Create Main Section Layout:** Set up the tab/page structure for "Marketing Performance" (`app/admin/marketing/page.tsx`) and components directory.
- [x] **Implement Summary KPI Cards:** Created placeholder `MarketingMetricCards.tsx`. Displays available spend, indicates blocked metrics.
- [x] **Implement Channel Comparison View:** Created placeholder `MarketingChannelComparison.tsx`. Displays available channel metrics (spend, impressions, clicks, shopify revenue, tagged enrollments) in a table, indicates blocked metrics.
- [x] **Implement Facebook Ads Detail Table:** Created placeholder `FacebookAdsDetailTable.tsx`. Displays available ad details (spend, impressions, clicks) in a table, indicates blocked metrics.
- [ ] **(Optional) Implement Enhanced Funnel View:** **[Blocked by Ad Attribution]**.
- [x] **Add Filters:** Created placeholder `MarketingFilters.tsx` with date range picker.

### 4. State Management Integration
*Goal: Manage state for available marketing data and filters, anticipating future attribution data.*
*Best Practice: Follow Zustand patterns from `admin-dashboard-state.md`.*

- [x] **Create Zustand Slice:** Defined state structure and actions in `lib/stores/admin/marketingAnalyticsStore.ts`. Includes placeholders for future data and commented-out caching logic (pending `lodash-es` install).
- [x] **Implement Fetch Actions:** Created async actions (`fetchMarketingSummary`, `fetchMarketingByChannel`, `fetchFacebookDetails`, `fetchAllMarketingData`) to call backend APIs.
- [x] **Implement Selectors:** Components access state via `useMarketingAnalyticsStore` hook.
- [x] **Connect Filters:** Page component (`app/admin/marketing/page.tsx`) connects filter components (`MarketingFilters.tsx`) to store actions (`setDateRange`) and uses store state (`dateRange`) to trigger data fetching via `useEffect`.

### 5. Testing & Validation
*Goal: Ensure accuracy of *available* marketing data display.*
*Status: Pending User Action*

- [x] **API Endpoint Testing:** Endpoints for summary, by-channel, and details created and return available data (spend, clicks, impressions).
- [ ] **Data Validation (User Action Required):**
    - **Deploy Fixed Function:** Deploy the updated `fetch-facebook-ads-data` function (with corrected `on_conflict` logic for `ad_spend`) to Supabase: `npx supabase functions deploy fetch-facebook-ads-data`.
    - **Verify Duplicates Fixed:** After deployment and one successful run of the function, check the `Facebook Ads Performance Details` table in the UI to ensure only one row appears per ad per day.
    - **Verify Spend Data:** Manually verify Total Ad Spend figures in the UI against Facebook Ads Manager reporting.
    - **Verify Channel/Details Data:** Check consistency between channel summary spend/clicks/impressions and detailed Facebook Ads data in the UI.
    - **[Validation of ROAS/CPA/Attribution blocked by Ad Attribution]**.
- [ ] **Frontend Testing (User Action Required):**
    - **Render Check:** Verify UI components (Cards, Tables, Filters) render correctly on the `/admin/marketing` tab.
    - **Currency Check:** Confirm all monetary values (Total Ad Spend, Spend in tables) are displayed in PHP (₱).
    - **Shopify Exclusion Check:** Confirm the "Performance by Acquisition Channel" table *does not* include Shopify data.
    - **Date Filter Test:** Test the Date Range filter and confirm data in all sections (Summary, Channel, Details) updates accordingly. Report back if filtering doesn't seem to work.
    - **Unavailable Metrics Check:** Confirm that placeholders/notes clearly indicate that ROAS, CPA, and Attributed Revenue are currently unavailable.
    - **Console/Error Check:** Check browser console and server logs for any errors.

## Technical Considerations

### Attribution Modeling & Accuracy
- **Current Limitation:** The primary challenge is the **lack of populated `ad_attributions` data**. All metrics relying on linking specific ad interactions to conversions (Revenue, Enrollments) cannot be calculated accurately at this time.
- **Model Definition:** **[Blocked by Ad Attribution]** When implemented, clearly define and document the attribution model.

### Calculation Logic
- **Available:** Spend, Impressions, Clicks can be displayed directly from `ad_spend`.
- **ROAS:** **[Blocked by Ad Attribution]** Requires Attributed Revenue / Ad Spend.
- **CPA:** **[Blocked by Ad Attribution]** Requires Ad Spend / Attributed Conversions.
- **Consistency:** Ensure calculations are performed consistently *when attribution data is available*.

### Performance
- **Complex Joins:** Queries joining ad spend, attribution, transactions, and user data will require significant optimization. Leverage the optional view (Step 1) or carefully crafted queries with appropriate indexing.
- **Data Volume:** As ad data and transaction history grow, ensure queries remain performant. Consider pre-aggregation or data warehousing techniques for longer-term scalability if needed.

## Completion Status

This phase is **In Progress**. UI, API, and State Management foundations are built for available data.

**Key items completed:**
- Optional `marketing_performance_view` created (excluding Shopify).
- Backend APIs created (`/summary`, `/by-channel`, `/facebook/details`) serving available metrics.
- Frontend UI placeholders created (`MarketingAnalyticsContent`, `MarketingMetricCards`, `MarketingChannelComparison`, `FacebookAdsDetailTable`, `MarketingFilters`).
- Zustand store (`marketingAnalyticsStore`) implemented for state management.
- Currency formatting fixed to PHP.
- Identified and fixed bug causing duplicate `ad_spend` entries (requires function deployment).

**Outstanding Issues / Blockers:**
- **[Primary Blocker] Ad Attribution:** The core functionality (ROAS, CPA, Ad-Attributed Revenue) remains blocked pending the completion of Phase 4-1, Step 4 (Attribution Data Processing Logic).
- **User Testing/Validation Required:** Steps outlined in section 5 need completion and confirmation by MASTER ROB.

Challenges anticipated:
- Building the UI and backend to gracefully handle the current lack of attribution data while being ready for its future integration.
- Clearly communicating to the user which metrics are available now versus which are pending the completion of Phase 4-1 Step 4.
- **[Primary Blocker]** Defining and implementing a consistent and understandable attribution logic across different data sources (Phase 4-1 Step 4).
- Optimizing the complex database queries required to calculate unified marketing KPIs *once attribution is available*.
- Explaining potential discrepancies between dashboard metrics and external platform reports (like Facebook Ads Manager) *once attribution is available*.

## Next Steps After Completion
Once **user testing confirms** the current implementation works as expected (displaying available data, correct currency, functioning filters, no duplicates after function deployment), this phase (displaying available data) can be marked complete. The immediate dependency remains the **completion of Phase 4-1 Step 4 (Attribution Data Processing Logic)**. After that, this dashboard section must be revisited to integrate and display the calculated KPIs (ROAS, CPA, Attributed Revenue). Subsequently, Phase 4-6 (Final Dashboard Integration & Testing) can proceed.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4, 4-1 to 4-4).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 