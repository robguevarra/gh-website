# Hook Migration Plan

This document outlines the strategy for consolidating and standardizing hook implementations across the Graceful Homeschooling platform.

## Current State

We currently have multiple implementations of similar hooks, which has led to:
- Excessive re-renders
- Circular dependencies
- Inconsistent patterns
- Maintenance challenges

### User Profile Hooks

We have three different implementations of user profile hooks:

1. **`useUserProfileData` in `use-dashboard-store.ts`**
   - Basic implementation with inline selectors
   - Uses performance monitoring with `logRender`
   - Returns raw actions without memoization
   - Uses `useMemo` for the return value

2. **`useUserProfile` in `use-user-profile.ts`**
   - Optimized implementation with stable selectors defined outside the hook
   - Returns memoized action functions
   - Does not use `useMemo` for the return value
   - No performance monitoring

3. **`useUserProfile` in `use-student-dashboard.ts`**
   - Data fetching implementation using Supabase
   - Updates the store with fetched data
   - Includes additional functionality like date formatting
   - Combines data fetching and state access

## Target State

We will standardize on the following hook patterns:

1. **State Access Hooks**: `use[Entity]`
   - Located in `lib/hooks/state/`
   - Example: `useUserProfile`
   - Purpose: Access and manipulate state from a store

2. **Data Fetching Hooks**: `useFetch[Entity]`
   - Located in `lib/hooks/data/`
   - Example: `useFetchUserProfile`
   - Purpose: Fetch data from an API or database

3. **Combined Hooks**: `use[Entity]WithData`
   - Located in `lib/hooks/combined/`
   - Example: `useUserProfileWithData`
   - Purpose: Access state and fetch related data

4. **UI State Hooks**: `use[Feature]UI`
   - Located in `lib/hooks/ui/`
   - Example: `useDashboardUI`
   - Purpose: Manage component-specific UI state

5. **Utility Hooks**: `use[Utility]`
   - Located in `lib/hooks/utils/`
   - Example: `useDebounce`
   - Purpose: Provide utility functionality

## Migration Strategy

### Phase 1: Consolidate User Profile Hooks

1. **Create New Optimized Hooks**
   - Create `useUserProfile` in `lib/hooks/state/use-user-profile.ts`
   - Create `useFetchUserProfile` in `lib/hooks/data/use-fetch-user-profile.ts`
   - Create `useUserProfileWithData` in `lib/hooks/combined/use-user-profile-with-data.ts`

2. **Update Components**
   - For components that only need state access: Use `useUserProfile`
   - For components that need data fetching: Use `useFetchUserProfile`
   - For components that need both: Use `useUserProfileWithData`

3. **Deprecate Old Hooks**
   - Add deprecation notices to old hooks
   - Gradually remove usage of old hooks
   - Eventually remove old hook files

### Phase 2: Consolidate Other Dashboard Hooks

1. **Enrollments Hooks**
   - Create `useEnrollments` in `lib/hooks/state/use-enrollments.ts`
   - Create `useFetchEnrollments` in `lib/hooks/data/use-fetch-enrollments.ts`

2. **Course Progress Hooks**
   - Create `useCourseProgress` in `lib/hooks/state/use-course-progress.ts`
   - Create `useFetchCourseProgress` in `lib/hooks/data/use-fetch-course-progress.ts`

3. **Templates Hooks**
   - Create `useTemplates` in `lib/hooks/state/use-templates.ts`
   - Create `useFetchTemplates` in `lib/hooks/data/use-fetch-templates.ts`

4. **UI State Hooks**
   - Create `useDashboardUI` in `lib/hooks/ui/use-dashboard-ui.ts`

### Phase 3: Implement Utility Hooks

1. **Performance Utilities**
   - Create `useDebounce` in `lib/hooks/utils/use-debounce.ts`
   - Create `useThrottle` in `lib/hooks/utils/use-throttle.ts`

2. **UI Utilities**
   - Create `useMediaQuery` in `lib/hooks/utils/use-media-query.ts`
   - Create `useLocalStorage` in `lib/hooks/utils/use-local-storage.ts`

## Implementation Timeline

| Phase | Task | Priority | Status |
|-------|------|----------|--------|
| 1 | Create `useUserProfile` | High | Not Started |
| 1 | Create `useFetchUserProfile` | High | Not Started |
| 1 | Create `useUserProfileWithData` | High | Not Started |
| 1 | Update components to use new hooks | High | Not Started |
| 2 | Create enrollment hooks | Medium | Not Started |
| 2 | Create course progress hooks | Medium | Not Started |
| 2 | Create templates hooks | Medium | Not Started |
| 2 | Create UI state hooks | Medium | Not Started |
| 3 | Create utility hooks | Low | Not Started |

## Testing Strategy

Each new hook implementation will include:

1. **Unit Tests**
   - Test hook behavior in isolation
   - Test with various input parameters
   - Test error handling

2. **Integration Tests**
   - Test hooks in the context of components
   - Test interactions between hooks

3. **Performance Tests**
   - Measure render counts
   - Compare performance with previous implementations

## Documentation

All new hooks will be documented with:

1. **JSDoc Comments**
   - Purpose and usage
   - Parameters and return values
   - Examples

2. **README Files**
   - One README per hook category
   - Detailed usage examples
   - Best practices

## Monitoring and Validation

We will validate the success of the migration by:

1. **Performance Metrics**
   - Measure render counts before and after
   - Track component render times
   - Monitor overall application performance

2. **Code Quality Metrics**
   - Reduced duplication
   - Improved maintainability
   - Better test coverage

---

This migration plan will be updated as implementation progresses and new insights are gained.
