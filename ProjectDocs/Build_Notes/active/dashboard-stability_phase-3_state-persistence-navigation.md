# Dashboard Stability - Phase 3: State Persistence & Navigation

## Task Objective
Resolve critical state management issues affecting the student dashboard, including inconsistent logout functionality and persistent state issues between page navigations that impact content loading.

## Current State Assessment
The dashboard currently experiences two key issues:
1. **Inconsistent Logout Function**: The logout functionality (`handleLogout` in `student-header.tsx`) uses a fixed `setTimeout` before redirecting, which doesn't guarantee proper state cleanup and can lead to race conditions with Supabase auth state propagation.
2. **State Persistence Problems**: Course progress data fails to reload consistently when navigating away and back to the dashboard. The current refresh logic (`useEffect` with `progressRefreshedRef` in `app/dashboard/page.tsx` and complex fallbacks/verifications) is unreliable and overly complex.

These issues stem from a lack of proper sequencing in the logout flow and decentralized, inconsistent state refresh mechanisms.

## Future State Goal
A robust dashboard with:
1. **Reliable Auth Transitions**: Consistent, error-free logout functionality with proper state cleanup (clearing Zustand store before Supabase signout) and immediate navigation handling (no `setTimeout`).
2. **Centralized & Reliable State Refresh**: State refresh logic managed centrally within Zustand store actions, using timestamp-based staleness checks and focus listeners in components to trigger refreshes appropriately.
3. **Simplified Component Logic**: UI components (`app/dashboard/page.tsx`, `components/dashboard/course-progress-section.tsx`) relying solely on the store as the source of truth, removing complex local refresh/fallback logic.
4. **Enhanced User Experience**: Smooth transitions between pages with appropriate loading states and no UI inconsistencies.

## Relevant Context

> **Important**: This build note builds upon previous work and requires understanding of:
> 1. Our state management patterns established in Phase 2 (course-editor-enhancement_phase-2_state-optimization.md)
> 2. The core project architecture (ProjectContext.md)
> 3. The established dashboard design patterns (designContext.md)

### From Course Editor Enhancement Phase 2
Previously, we optimized state management for the course editor by:
- Eliminating redundant API calls
- Consolidating state transformations
- Implementing proper error handling
- Fixing infinite update loops

These same principles must be applied to the dashboard state management to ensure consistency.

### From Our Auth Implementation
Our authentication system uses:
- Supabase Auth for user authentication (`@supabase/ssr`)
- React Context (`useAuth`) for providing auth state
- Local storage for persisting *some* UI state via Zustand middleware
- Zustand store (`useStudentDashboardStore`) for dashboard data, dependent on auth state.

### From Dashboard Architecture
The dashboard uses a combination of:
- Server and client components
- Zustand store (`useStudentDashboardStore`) for state management
- React Hooks for accessing and updating state
- Supabase for data fetching (via store actions).

## Implementation Plan (Option B: Store-Centric Refresh Logic)

### 1. Fix Logout Sequence
- [x] **Create `clearUserState` Action:** Add a new action to `lib/stores/student-dashboard/actions.ts` that resets user-specific state (`userId`, `userProfile`, `enrollments`, `courseProgress`, `lessonProgress`, etc.) to initial values.
- [x] **Modify `handleLogout` in `components/dashboard/student-header.tsx`:**
    -   Set `isLoggingOut` state to `true`.
    -   Call the new `clearUserState()` store action (or dispatch individual reset actions).
    -   Call `await logout()` from `useAuth` context.
    -   Check for errors.
    -   If no error, call `router.push('/auth/signin')` **immediately** (remove `setTimeout`).
    -   Handle errors appropriately, ensuring `isLoggingOut` is set to `false`.

### 2. Centralize Data Refresh Logic in Store Actions
- [x] **Modify Loading Actions in `lib/stores/student-dashboard/actions.ts`** (e.g., `loadUserProgress`, `loadUserEnrollments`, `loadUserDashboardData`, `loadContinueLearningLesson`):
    -   Add an optional `force?: boolean` parameter to bypass staleness checks.
    -   Define a staleness threshold (e.g., 5 minutes).
    -   Implement a staleness check at the beginning of each action using the corresponding `lastLoadTime` state (e.g., `lastProgressLoadTime`). If data is present and not stale (`Date.now() - lastLoadTime < threshold`) and `force` is not true, return early.
    -   **Important Refinement (Learned from Store Filtering Bug):** While the store handles staleness, components triggering fetches due to *parameter changes* (like filters) must explicitly pass `force: true` to ensure the action runs, even if the timestamp suggests data is fresh. The timestamp check alone is insufficient when parameters change.
    -   If fetching proceeds, update the corresponding `lastLoadTime` state variable with `Date.now()` upon successful data fetch and state update.
    -   Simplify `loadUserDashboardData` to orchestrate calls and pass `force` down.

### 3. Simplify Component Data Fetching Logic
- [x] **Refactor `app/dashboard/page.tsx`:**
    -   Remove the `useEffect` hook using `progressRefreshedRef` (approx. lines 180-281).
    -   Simplify the initial data loading `useEffect` (approx. lines 140-171) to just call store actions (`loadUserEnrollments`, `loadUserProgress`).
    -   Remove complex `useMemo` fallback/verification logic (approx. lines 368-463) and direct database calls within the component.
    -   Add a new `useEffect` with a `window.addEventListener('focus', handleFocus)`.
    -   Implement `handleFocus` to call relevant store loading actions (e.g., `loadUserDashboardData(userId)` or specific ones like `loadUserProgress(userId)`) to trigger potential refreshes on tab focus.
    -   Include a cleanup function to remove the focus event listener.
- [x] **Refactor `components/dashboard/course-progress-section.tsx`:**
    -   Remove the `useEffect` hook performing direct database verification (`verifyFromDatabase`) (approx. lines 164-409).
    -   Ensure the component relies solely on data from the store (via props or hooks).

*Troubleshooting Note:* After completing Phase 3, the dashboard was stuck loading. Diagnosis revealed that initial `isLoading...` flags in the Zustand store (`index.ts`) were set to `true`, preventing the initial fetch actions from running due to their internal `if (state.isLoading...)` checks. **Fix Applied:** Corrected initial state for all `isLoading...` flags to `false`.

### 4. Implement Testing and Validation
- [ ] Create test cases for logout scenarios (successful, errors).
- [ ] Develop test procedures for navigation state retention (navigate away, tab away, come back).
- [ ] Implement thorough integration tests covering auth state, store state, and component rendering.
- [ ] Add telemetry/logging to track state transitions and fetch triggers (optional but recommended).

### 5. Additional Optimizations & Fixes (Discovered Post-Phase 3)
- [x] **Investigate & Optimize Page Loads for /store & /purchase-history:**
    - [x] Diagnose why these pages appear to reload data on navigation (likely due to being Server Components fetching data directly).
    - **Proposed Solution:** Convert `app/dashboard/store/page.tsx` and `app/dashboard/purchase-history/page.tsx` to Client Components.
    - [x] Convert `app/dashboard/store/page.tsx` to Client Component.
    - [x] Convert `app/dashboard/purchase-history/page.tsx` to Client Component.
        - **Issue:** Page was server-rendered, causing full reloads on navigation and no client state control.
        - **Implementation:** Added `"use client"`, replaced `createServerSupabaseClient` with `getBrowserClient`, moved fetch logic into `useEffect` with `loading`/`error` state management.
        - **Validation:** Verified data loads on mount without SSR, and UI state persists across navigations.
    - [x] Integrate their data requirements into `useStudentDashboardStore`, adding new state slices (e.g., `storeProducts`, `storeCollections`, `purchases`) and corresponding actions with staleness logic, mirroring the pattern used for `enrollments` and `progress`.
        - [x] Added state/actions for `storeProducts`.
        - [x] Added state/actions for `storeCollections`.
        - [x] Added state/actions for `saleProducts` (for SaleSection).
        - [x] **Plan for Purchases Integration**:
            - Extract `getPurchaseHistory` into `lib/services/purchaseHistory.ts` as `fetchPurchaseHistory(userId)`, isolating Supabase queries.
            - Define `loadPurchases(userId: string, force?: boolean)` in `student-dashboard/actions.ts` to call `fetchPurchaseHistory`, then invoke `setPurchases`, `setIsLoadingPurchases`, and `setHasPurchasesError`.
            - Update `StudentDashboardStore` types and initial state for `purchases`, `isLoadingPurchases`, and `hasPurchasesError` in `lib/stores/student-dashboard/index.ts`.
            - Refactor `/dashboard/purchase-history/page.tsx` to dispatch `loadPurchases` from store and select `purchases` via Zustand hook; remove local fetch logic.
            - Validate by navigating between dashboard pages and confirming purchase history persists without full reload.
        - [x] Add state/actions for `purchases`.
    - [x] Update `app/dashboard/store/page.tsx` to use Zustand store.
    - [x] Update `app/dashboard/purchase-history/page.tsx` to use Zustand store.
- [x] **Fix `/dashboard/course` video embed issue:**
    - **Issue:** Private Vimeo embeds stored as full `<iframe>` snippet in `metadata.videoUrl` were being cleaned and replaced by generic iframes, stripping necessary auth parameters and causing embed failure.
    - **Diagnosis:** Our helper functions (`getLessonVideoId`/`getLessonVideoUrl`) extracted only the Vimeo ID and constructed a public embed URL, which did not support private embed tokens.
    - **Fix Implemented:** In `app/dashboard/course/page.tsx`, updated the video player logic to render the raw `metadata.videoUrl` snippet directly using `dangerouslySetInnerHTML`. Removed fallback iframe generation for private embeds to preserve original embed code.
    - **Testing:** Verified with a lesson having a private Vimeo embed; the video loads correctly and displays playback controls as expected.
- [x] **Implement Active Link Highlighting in `student-header.tsx`:**
    - [x] Used the `usePathname` hook from `next/navigation`.
    - [x] Compared the current pathname with each `Link`'s `href`.
    - [x] Applied dynamic classes (`text-brand-purple bg-brand-purple/10` for mobile, `text-brand-purple` for desktop) for active link styling.
    - **Implementation:** Imported `usePathname` and applied conditional class names in `student-header.tsx`.
    - **Validation:** Confirmed active link highlights correctly on both mobile sheet and desktop nav.

## Technical Considerations

### Logout Process Best Practices
1. **Proper Sequence of Operations**: Clear local/UI state -> Sign out from Auth Provider -> Navigate.
2. **State Clearing**: Ensure all relevant user-specific data in Zustand is reset to prevent stale data flashing on logout/login.
3. **Token Invalidation**: Rely on Supabase `signOut` to handle token invalidation server-side and clear relevant cookies/storage.

### State Management Between Routes (Store-Centric)
1. **Centralized Staleness Logic**: Store actions are responsible for deciding when to fetch data based on timestamps (`lastLoadTime`) and a defined threshold.
2. **Component Responsibility**: Components trigger data loading actions (on mount, on focus, **on parameter change**) but do not implement their own refresh or fallback logic.
3. **Forcing Fetches:** When a component triggers a fetch because its input parameters (like filters or search terms) have changed, it **must** pass `force: true` to the store action to bypass the timestamp-based staleness check. The store action cannot inherently know if the *parameters* for the last fetch match the current ones.
4. **Focus Listener**: Using `window.addEventListener('focus', ...)` is a simple way to trigger potential data refreshes when the user returns to the tab/application (typically *without* forcing, letting the store decide based on staleness).

### Browser Storage Considerations
1. **Zustand Persist**: The `persist` middleware primarily handles UI state persistence. Core data (`enrollments`, `progress`) is *not* persisted and must be fetched.
2. **Logout Cleanup**: The new `clearUserState` action ensures the non-persisted parts of the store are reset. Supabase handles its own auth storage cleanup.

## Proposed Solutions

### Chosen Approach: Option B - Store-Centric Refresh Logic
This approach modifies the existing auth flow for correctness and centralizes data refresh logic within the Zustand store actions. Components trigger loads, but the store determines if a fetch is needed based on data staleness, unless explicitly forced by the component due to parameter changes.

**Pros:**
- Addresses root causes of both logout and refresh issues.
- Simplifies component logic significantly.
- Creates a more robust and maintainable pattern for data loading/refreshing.
- Balances fixing immediate issues with architectural improvements.

**Cons:**
- Requires modifying store actions and potentially adding a new cleanup action.
- Needs careful implementation of staleness checks and coordination with component triggers.

--- 

*Previous Options (Not Chosen):*

*   *Option A (Targeted Fixes):* Fix logout sequence and add focus listener/simple refresh in component. Faster but less robust, keeps refresh logic decentralized.
*   *Option 2 (Comprehensive State Management Overhaul):* Full refactor of state management. Too complex and high-risk for the current scope.
*   *Option 3 (Hybrid Approach - Initial Recommendation):* Mix of immediate fixes and gradual pattern changes. Superseded by the more integrated Option B.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
