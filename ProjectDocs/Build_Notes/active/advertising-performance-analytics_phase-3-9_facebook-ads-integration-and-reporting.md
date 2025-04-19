# Admin Dashboard - Phase 3-9: Advertising Performance Analytics

## Task Objective
Integrate Facebook advertising data into the platform to enable tracking of ad campaign performance. Implement a dedicated "Advertising Performance" section in the admin dashboard to display key metrics like Return On Ad Spend (ROAS), Cost Per Acquisition (CPA), and attribute enrollments/revenue back to specific Facebook campaigns, ad sets, and ads.

## Current State Assessment
The admin dashboard currently includes sections for Overview (Phase 3-4) and Enrollment Analytics (Phase 3-5), possibly Revenue Analysis (Phase 3-6). Enrollment and transaction data is unified (Phases 3-0 to 3-2). However, attribution relies solely on basic tags (e.g., 'squeeze') from Systemeio, providing no visibility into paid advertising effectiveness. The database schema lacks specific tables to store granular ad campaign metadata or attribution details.

## Future State Goal
1.  **Data Integration:** A robust mechanism (ideally via Facebook Conversion API, potentially supplemented by Marketing API) to capture ad interaction and conversion data, linking it to user profiles and transactions.
2.  **Database Schema:** New tables (`ad_campaigns`, `ad_attributions`, or similar) to store Facebook campaign/ad set/ad metadata and link attributed conversions (`transactions`, `enrollments`) back to specific ads.
3.  **Dashboard Section:** A new "Advertising Performance" section within the admin dashboard.
4.  **Key Metrics Displayed:** ROAS, CPA (for P2P enrollments), Total Ad Spend, Ad-Attributed Revenue, Ad-Attributed Enrollments.
5.  **Granular Reporting:** Ability to view performance metrics broken down by Facebook Campaign, Ad Set, and Ad.
6.  **Enhanced Funnel:** Potential to enhance the enrollment funnel view with ad impression/click data as the starting point.

This will provide administrators with clear insights into advertising ROI and help optimize ad spend decisions.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification Strategy (Phase 3-0) - Mentioned planning for FB Ads integration.
> 2.  Enrollment Analytics (Phase 3-5) - Established the need for better attribution and deferred ad analytics to a later phase.
> 3.  (Potentially) Revenue Analysis (Phase 3-6) - If completed, provides context on revenue metrics.
> 4.  Project context (`ProjectContext.md`)
> 5.  Design context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy (Phase 3-0)
The initial strategy included plans for future Facebook Ads integration, requiring schema extensions for `ad_campaigns` and `ad_attributions`.

### From Enrollment Analytics (Phase 3-5)
This phase focused enrollment analytics on existing data (tags) and explicitly recommended a separate phase for integrating and visualizing advertising performance data.

## Implementation Plan

### 1. Database Schema Enhancement
- [ ] Design `ad_campaigns` table (store campaign ID, name, objective, status, etc.)
- [ ] Design `ad_adsets` table (store ad set ID, name, targeting info, budget, status, link to campaign, etc.)
- [ ] Design `ad_ads` table (store ad ID, name, creative info, status, link to ad set, etc.)
- [ ] Design `ad_attributions` table (link `unified_profiles.id` or `transactions.id` to `ad_ads.id`, `ad_adsets.id`, `ad_campaigns.id`, store attribution timestamp, conversion type, value, potentially click ID/metadata).
- [ ] Implement migrations to create these tables with appropriate indexes and foreign keys.

### 2. Facebook Data Integration
- [ ] Set up Facebook Pixel and/or Conversion API (CAPI).
    - Implement server-side CAPI events for key actions (e.g., page view, lead, purchase/enrollment) sending user identifiers.
    - Ensure compliance with data privacy regulations.
- [ ] (Optional) Develop mechanism to fetch campaign/ad set/ad metadata and spend data from Facebook Marketing API.
    - Store fetched metadata in the new `ad_` tables.
    - Securely handle API credentials.
- [ ] Develop logic to process incoming attribution data (from CAPI or other sources) and populate the `ad_attributions` table.
    - Define the attribution model/window (e.g., last-click, 7-day click).
    - Handle matching of Facebook events to platform users/transactions.

### 3. Backend API Development
- [ ] Create API endpoint for Ad Performance Summary (e.g., `/api/admin/dashboard/ads/summary`)
    - Aggregate overall ROAS, CPA, Spend, Attributed Revenue/Enrollments based on `ad_attributions` and `transactions`/`enrollments` data.
    - Support date range filtering.
- [ ] Create API endpoint for Detailed Ad Performance (e.g., `/api/admin/dashboard/ads/details`)
    - Provide performance metrics broken down by Campaign, Ad Set, Ad.
    - Support filtering, sorting, and pagination.
- [ ] Ensure endpoints perform efficiently, potentially using pre-aggregated data or views.

### 4. Frontend Dashboard Section ("Advertising Performance")
- [ ] Design the UI for the new "Advertising Performance" section.
    - Include metric cards for key summary figures (ROAS, CPA, Spend, etc.).
    - Implement charts visualizing trends (e.g., Spend vs. Revenue over time, ROAS by campaign).
    - Create a detailed table showing performance by Campaign/Ad Set/Ad, with filtering and sorting.
- [ ] Build the React components for the new section.
- [ ] Integrate components with the backend API endpoints.

### 5. State Management
- [ ] Create a new Zustand store slice for advertising performance data.
- [ ] Implement actions for fetching summary and detailed ad performance data.
- [ ] Implement selectors for accessing data in frontend components.
- [ ] Manage loading and error states.

## Technical Considerations

### Data Integration & Attribution
- **API Choice:** Prioritize Facebook Conversion API (CAPI) for reliability and privacy-friendliness. Supplement with Marketing API if needed for spend/metadata not available via CAPI events.
- **Authentication:** Securely manage Facebook API keys/tokens.
- **Attribution Model:** Clearly define and document the attribution model used (e.g., last click, data-driven) and the lookback window. Be aware of limitations and potential discrepancies with Facebook's reporting.
- **Data Matching:** Robust logic needed to match Facebook events (using email, phone, click IDs etc.) to `unified_profiles`.
- **Data Privacy:** Ensure compliance with GDPR, CCPA, etc., regarding user data sent to Facebook.

### Performance
- **Database Queries:** Optimize queries joining `ad_attributions` with `transactions` and `enrollments`. Consider materialized views for complex aggregations if needed.
- **API Caching:** Implement caching strategies for ad performance API endpoints.
- **Facebook API Limits:** Be mindful of rate limits when fetching data from the Marketing API.

### User Experience
- **Clarity:** Clearly label metrics (e.g., specifying the attribution window used for ROAS/CPA).
- **Comparison:** Allow easy comparison between different campaigns/ad sets/ads.
- **Actionability:** Design the dashboard to highlight key insights that inform optimization decisions.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Complexity of setting up and debugging Facebook CAPI.
- Accurately matching Facebook events to platform users and transactions.
- Potential discrepancies between internal attribution and Facebook Ads Manager reporting.
- Handling Facebook API changes and requirements.

## Next Steps After Completion
Once advertising performance is integrated, future steps could include:
- Enhancing the enrollment funnel with ad impression/click data.
- Building more sophisticated segmentation based on ad interactions.
- Integrating data from other potential ad platforms (e.g., Google Ads).

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 3-0, 3-5, potentially 3-6).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 