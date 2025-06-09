# Admin Console - Phase 1: Affiliate Caching Optimization

## Task Objective
Optimize the affiliate management section of the admin console by implementing proper caching strategies and improving data fetching patterns to eliminate redundant API calls and enhance performance.

## Current State Assessment

### Performance Issues Identified
- Multiple redundant POST requests (8+ per page load) in the affiliate detail view.
- Each client component makes independent server action calls without caching.
- Duplicate data fetching occurs across parent and child components.
- Key pages affected:
  - `/admin/affiliates/[affiliateId]` (detail page)
  - `/admin/affiliates` (list page, to a lesser extent)

### Current Implementation Patterns
- Server actions in `lib/actions/affiliate-actions.ts` lack caching mechanisms.
- Client components like `AffiliateDetailView` make direct server action calls via multiple `useEffect` hooks.
- Separate data fetching for clicks, conversions, and other affiliate data despite related data.
- Some preliminary caching in `fraud-notification-actions-simplified.ts` but not comprehensive.

### Impact on User Experience
- Slower page loads due to waterfall of network requests.
- Increased server load from redundant database queries.
- Potential race conditions between completing data fetches.
- Unnecessary consumption of database resources.

## Future State Goal
Create a performant, efficient affiliate management system by:

1. Implementing comprehensive caching for all server actions
2. Consolidating data fetching to minimize duplicate requests
3. Moving data fetching logic to server components where possible
4. Creating a proper state management system for client components

## Implementation Plan

### Phase 1: Implement Server-Side Caching

**Step 1: Add Caching to Core Affiliate Actions**
- **Task 1.1:** Add `unstable_cache` wrapper to `getAdminAffiliateById` function.
- **Task 1.2:** Add caching to `getAdminAffiliates` for the list view.
- **Task 1.3:** Implement caching for `getAffiliateClicks`, `getAffiliateConversions`, and `getAffiliatePayouts`.
- **Task 1.4:** Add caching to `getFraudFlagsForAffiliate` and `getAffiliateLinks` functions.

**Step 2: Implement Proper Cache Invalidation**
- **Task 2.1:** Define a consistent cache tagging system (e.g., `affiliate-${id}`, `global-affiliate-data`).
- **Task 2.2:** Update all mutation functions (update/create/delete) to revalidate appropriate cache tags.
- **Task 2.3:** Ensure `revalidatePath()` calls respect cache tag relationships.

**Step 3: Consolidate Affiliate Data Fetching**
- **Task 3.1:** Create a new `getAffiliateDetailData` function that combines related data fetching.
- **Task 3.2:** Move membership level fetching to the server component where possible.
- **Task 3.3:** Update affiliate detail page to fetch consolidated data and pass it to client components.

### Phase 2: Optimize Client Component Architecture

**Step 4: Refactor AffiliateDetailView Component**
- **Task 4.1:** Update `AffiliateDetailView` to accept all necessary data as props rather than fetching directly.
- **Task 4.2:** Remove redundant `useEffect` hooks that trigger server actions.
- **Task 4.3:** Implement proper loading states for data that still needs client-side fetching.

**Step 5: Implement Client-Side Caching and State Management**
- **Task 5.1:** Add SWR or React Query for client components that must fetch data directly.
- **Task 5.2:** Create a context provider for shared affiliate data if needed.
- **Task 5.3:** Update `RiskAssessmentBadge` and `FraudFlagsList` to use shared data/context.

**Step 6: Performance Monitoring and Optimization**
- **Task 6.1:** Implement logging to track actual number of POST requests per page view.
- **Task 6.2:** Set up metrics to measure improvement in page load time.
- **Task 6.3:** Optimize database queries used in server actions to minimize response time.

### Phase 3: Testing and Refinements

**Step 7: Testing and Validation**
- **Task 7.1:** Verify correct data fetching and display with cached data.
- **Task 7.2:** Test cache invalidation when data is updated.
- **Task 7.3:** Confirm performance improvements across different network conditions.

**Step 8: Documentation and Knowledge Sharing**
- **Task 8.1:** Update handoff documents with new caching patterns.
- **Task 8.2:** Document the cache tagging system for future development.
- **Task 8.3:** Create guidelines for adding new features that use these caching patterns.

## Technical Considerations

### Caching Strategy
- Use `unstable_cache` with appropriate revalidation settings:
  ```typescript
  const getAffiliateDataCached = unstable_cache(
    async (affiliateId: string) => {
      // Existing function logic
    },
    ['affiliate-data'],
    { revalidate: 60, tags: [`affiliate-${affiliateId}`] }
  );
  ```
- Consider varying cache durations based on data volatility:
  - Static reference data: longer cache (24h+)
  - Dynamic affiliate data: moderate cache (1-5 minutes)
  - Real-time metrics: shorter cache (30-60 seconds)

### Data Flow Architecture
- Prefer server components for data fetching when possible
- Use props drilling for passing data to immediate children
- Leverage React Context only for deeply nested components that need shared data
- Consider implementing a lightweight state management solution instead of direct server action calls

### Performance Metrics
- Target reduction of POST requests from 8+ to a maximum of 3 per page load
- Aim for sub-1-second initial page load for affiliate details
- Establish a baseline for server resource utilization for comparison

## Next Steps After Completion
Upon completing the caching optimization, we will proceed to enhancing the affiliate analytics dashboard with more comprehensive metrics and visualization capabilities as outlined in the main affiliate management build note.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
