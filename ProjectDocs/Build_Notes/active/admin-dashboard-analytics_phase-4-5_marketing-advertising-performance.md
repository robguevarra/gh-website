# Marketing & Advertising Performance Dashboard - Phase 4-5: Unified Reporting

## Task Objective
Develop and implement a unified Marketing & Advertising Performance dashboard section. This phase synthesizes data from Facebook Ads (spend, attribution), Shopify (source, revenue), Xendit (revenue, transactions), and internal user data (`unified_profiles`, tags) to provide a holistic view of marketing channel effectiveness, calculate key performance indicators like ROAS and CPA, and visualize the customer journey from initial touchpoint (ad/landing page) to conversion.

## Current State Assessment
- Foundational data integration phases are assumed complete:
    - Phase 4-1: Facebook Ads data (schema: `ad_campaigns`, `ad_spend`, `ad_attributions`, etc.) is being ingested.
    - Phase 4-2: Shopify data (schema: `shopify_orders`, `shopify_customers`, etc.) is being ingested.
- Core platform data (`unified_profiles`, `transactions`, `enrollments`) is unified (Phases 3-0 to 3-2).
- Enrollment Analytics (Phase 4-3) and Revenue Analytics (Phase 4-4) dashboards are implemented, providing views specific to those areas.
- Core dashboard architecture (Phase 3-3) and Overview (Phase 3-4) are in place.
- Previous specific plans for Marketing Insights (3-7) and Advertising Performance (3-9) were deferred/archived; this phase combines and builds upon their goals using the newly integrated data.
- Currently, there is no dedicated dashboard section that correlates advertising spend and multi-channel acquisition sources directly with revenue and enrollment outcomes.

## Future State Goal
1.  **Functional UI Section:** A dedicated "Marketing Performance" (or similar) tab/section within the admin dashboard.
2.  **Unified Acquisition View:** Metrics and visualizations showing user acquisition and conversions (transactions/enrollments) attributed across *all* known channels (Facebook Ads, Shopify sources, Organic/Tags).
3.  **Key Advertising KPIs:** Clear display of critical advertising metrics calculated using integrated data: ROAS (Return On Ad Spend), CPA (Cost Per Acquisition - likely for P2P enrollments), Total Ad Spend, Ad-Attributed Revenue, Ad-Attributed Enrollments.
4.  **Channel Comparison:** Side-by-side comparison of different marketing channels (e.g., Facebook Campaign A vs. Shopify Referral B vs. Organic Tag C) based on volume, conversion rate, revenue generated, and ROI.
5.  **Detailed Ad Reporting:** Ability to drill down into Facebook Ads performance by Campaign, Ad Set, and Ad, showing spend, attributed revenue, ROAS, CPA, etc.
6.  **Enhanced Funnel Correlation:** Visualization potentially linking ad spend/impressions/clicks at the top of the funnel (from `ad_spend` and `ad_attributions`) to the enrollment and revenue outcomes analyzed in Phases 4-3 and 4-4.

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
- Ad attributions (`ad_attributions` from 4-1)
- Transaction/Revenue data (`transactions` from 3-0, `shopify_orders` from 4-2)
- Enrollment data (`enrollments` from 3-1)
- User data (`unified_profiles` from 3-0)

## Implementation Plan

### 1. Data Modeling & Views (Optional Enhancement)
*Goal: Simplify querying across advertising, transaction, and user data.* 
*Best Practice: Create views to pre-join and aggregate key marketing performance metrics.* 

- [ ] **(Optional) Design `marketing_performance_view`:**
    - Create a PostgreSQL VIEW joining `ad_attributions` with `ad_spend`, `ad_campaigns`/`adsets`/`ads`, `transactions` (or `unified_transactions_view` from 4-4), and potentially `enrollments`.
    - Pre-calculate attributed revenue, costs (spend), and identify conversion types (P2P enrollment vs. other purchases).
    - Include flags for acquisition channel (facebook, shopify, organic).
    - Aggregate by relevant dimensions (date, campaign, adset, ad, channel).

### 2. Backend API Development
*Goal: Create endpoints to serve unified marketing and advertising performance data.* 
*Best Practice: Leverage views if created, ensure calculations like ROAS/CPA are correct.* 

- [ ] **Create `/marketing/summary` Endpoint:**
    - Fetch overall KPIs: Total Ad Spend, Total Attributed Revenue (across all channels where possible), Overall ROAS, Average CPA (for P2P).
    - Support date range filtering.
- [ ] **Create `/marketing/by-channel` Endpoint:**
    - Provide key metrics (Spend, Attributed Revenue, ROAS, CPA, Conversion Count, Conversion Rate) grouped by marketing channel (Facebook Campaign, Shopify Source, Organic Tag, etc.).
    - Support date range filtering.
- [ ] **Create `/marketing/facebook/details` Endpoint:**
    - Provide detailed Facebook Ads performance metrics (Spend, Attributed Revenue, ROAS, CPA, Impressions, Clicks, Conversions) broken down by Campaign, Ad Set, and Ad.
    - Query `ad_` tables and `ad_attributions` joined with `transactions`.
    - Support date range filtering, sorting, and pagination.
- [ ] **(Optional) `/marketing/funnel/performance` Endpoint:**
    - Enhance the funnel view by incorporating spend/cost data at the top stages (e.g., Cost per Click, Cost per Landing Page view based on ad data) and ROI at the bottom (Revenue/Enrollments vs. Spend).

### 3. Frontend UI Implementation
*Goal: Build the Marketing & Advertising Performance section.* 
*Best Practice: Clear hierarchy, comparative visualizations, actionable insights.* 

- [ ] **Create Main Section Layout:** Set up the tab/page structure for "Marketing Performance".
- [ ] **Implement Summary KPI Cards:** Display overall ROAS, CPA, Spend, Attributed Revenue using data from `/marketing/summary`.
- [ ] **Implement Channel Comparison View:** Use charts (bar, scatter) or tables to compare performance across different channels (Facebook, Shopify, Organic) using data from `/marketing/by-channel`.
- [ ] **Implement Facebook Ads Detail Table:** Use a data table component to display the detailed breakdown of Facebook performance by Campaign/Ad Set/Ad from `/marketing/facebook/details`. Include filtering, sorting.
- [ ] **(Optional) Implement Enhanced Funnel View:** Adapt the funnel visualization to include cost/ROI metrics per stage using data from `/marketing/funnel/performance`.
- [ ] **Add Filters:** Implement date range selector and potentially filters for specific channels or campaigns.

### 4. State Management Integration
*Goal: Manage state for unified marketing data and filters.* 

- [ ] **Create Zustand Slice:** Define state structure for marketing summary, channel comparison, Facebook details, filters, loading states, errors.
- [ ] **Implement Fetch Actions:** Create async actions to call the backend API endpoints (Step 2).
- [ ] **Implement Selectors:** Create selectors for components to access the data.
- [ ] **Connect Filters:** Ensure filters update state and trigger refetching.

### 5. Testing & Validation
*Goal: Ensure accuracy of marketing KPIs and attribution.* 

- [ ] **API Endpoint Testing:** Test calculations for ROAS, CPA, and attribution logic with various filters.
- [ ] **Data Validation:**
    - Manually verify ROAS/CPA figures by cross-referencing spend data (`ad_spend`) with attributed revenue (`ad_attributions` -> `transactions`/`shopify_orders`).
    - Check consistency between channel summary data and detailed Facebook Ads data.
    - Compare dashboard figures against Facebook Ads Manager reporting (acknowledging potential model differences).
- [ ] **Frontend Testing:** Test UI components, filter interactions, and data display.

## Technical Considerations

### Attribution Modeling & Accuracy
- **Model Definition:** Clearly define and document the attribution model used for calculations within this dashboard (e.g., last Facebook click, considering a specific window). Ensure consistency in how revenue/enrollments are attributed to ad interactions.
- **Data Lag:** Be aware of potential delays in receiving attribution data or spend data from APIs. Indicate data freshness in the UI where appropriate.
- **Cross-Channel Attribution:** Acknowledge that simple last-touch attribution (linking a transaction to the *last* known ad interaction) might not capture the full customer journey. True multi-touch attribution is significantly more complex and likely out of scope for this phase.

### Calculation Logic
- **ROAS:** Calculation is typically `(Attributed Revenue / Ad Spend)`. Ensure both values cover the same period and attribution model.
- **CPA:** Calculation is typically `(Ad Spend / Attributed Conversions)`. Clearly define what constitutes a "Conversion" for this metric (e.g., only completed P2P enrollments).
- **Consistency:** Ensure calculations are performed consistently across summary views, channel comparisons, and detailed breakdowns.

### Performance
- **Complex Joins:** Queries joining ad spend, attribution, transactions, and user data will require significant optimization. Leverage the optional view (Step 1) or carefully crafted queries with appropriate indexing.
- **Data Volume:** As ad data and transaction history grow, ensure queries remain performant. Consider pre-aggregation or data warehousing techniques for longer-term scalability if needed.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Defining and implementing a consistent and understandable attribution logic across different data sources.
- Optimizing the complex database queries required to calculate unified marketing KPIs.
- Presenting potentially complex performance data in a clear, actionable way in the UI.
- Explaining potential discrepancies between dashboard metrics and external platform reports (like Facebook Ads Manager).

## Next Steps After Completion
With the core analytics dashboards (Enrollment, Revenue, Marketing/Advertising) implemented, the final step in this sequence is Phase 4-6: Final Dashboard Integration & Testing, ensuring all sections work cohesively and the overall admin dashboard is ready for use.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4, 4-1 to 4-4).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 