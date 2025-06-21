# Student Dashboard Store Refactor - Phase 1: Actions Analysis & Refinement

## Task Objective
Analyze and refactor the actions within the `useStudentDashboardStore` (specifically in `lib/stores/student-dashboard/actions.ts`) to improve code clarity, maintainability, type safety, and potentially optimize data fetching patterns.

## Current State Assessment
The `actions.ts` file contains several complex actions, notably:
- `loadUserProgress`: Fetches multiple data types (lesson progress, courses with modules/lessons, DB course progress), performs calculations, and updates several state slices. It's long and hard to follow.
- `loadContinueLearningLesson`: Performs a complex query with joins to find the most recent lesson.
- `updateLessonProgress`: Handles upserting lesson progress and includes logic to potentially reload all progress data, which might be inefficient.
- **Type Issues:** Linter errors indicate potential mismatches between Supabase query return types and the TypeScript types used in the actions (e.g., `profiles.full_name`, enrollment/course mapping, nullability issues).
- **Query Efficiency:** Some actions perform multiple separate `select` statements that might potentially be combined or optimized.

## Future State Goal
- **Improved Readability:** Actions broken down into smaller, single-responsibility functions.
- **Enhanced Type Safety:** Reduced reliance on `any` type, better handling of potentially null/undefined values from Supabase, alignment with actual DB schema (e.g., using `first_name`, `last_name` for profiles).
- **Optimized Data Fetching:** More efficient Supabase queries where possible (e.g., combining selects, using appropriate joins).
- **Clearer Logic:** Simplified control flow within actions, making them easier to understand and debug.
- **Maintainability:** Easier to modify or extend actions in the future.

## Implementation Plan

### 1. Analyze `loadUserProgress`
- [x] **Map out the current data flow:**
    - Fetches `user_progress` for the user.
    - Fetches **all** `courses` with full module/lesson structure.
    - Calculates initial `courseProgressMap` and `moduleProgressMap` based on lesson counts derived from the fetched course structure and `user_progress`.
    - Fetches `course_progress` for the user.
    - Reconciles the calculated `courseProgressMap` with the fetched `course_progress` data, overwriting calculated values with DB values if present.
    - Updates `lessonProgress`, `moduleProgress`, `courseProgress` state slices.
    - Calls `loadContinueLearningLesson`.
- [x] **Identify opportunities to extract logic:** Yes, potential helpers:
    - `fetchLessonProgressData(supabase, userId)`
    - `fetchCourseStructureData(supabase)`
    - `fetchDbCourseProgressData(supabase, userId)`
    - `calculateInitialProgressMaps(courses, lessonProgressMap)`
    - `reconcileDbProgress(courseProgressMap, dbCourseProgress, courses)`
- [x] **Review the Supabase queries:**
    - Fetching all courses seems **inefficient**. Should likely only fetch enrolled courses or fetch structure on demand.
    - Fetching full course structure just to count lessons is wasteful if `course_progress`/`module_progress` tables are reliable.
    - Fetching `courses` then `course_progress` could potentially be optimized (fetch `course_progress` then join `courses`?).
- [x] **Analyze type usage:**
    - Relies heavily on Supabase inferred types, leading to potential mismatches/lint errors.
    - Reconciliation logic increases type complexity.

### 2. Refactor `loadUserProgress`
- [x] Implement extracted helper functions (conceptually integrated into the main function for now).
- [x] Update the main `loadUserProgress` action to orchestrate calls:
    - Fetch enrollments + structure.
    - Fetch `user_progress` and `course_progress`.
    - Map data to state, trusting `course_progress` percentage.
- [ ] Improve type handling based on analysis (e.g., use correct profile name fields, handle nulls). *(Partially addressed, further improvements possible)*
- [x] Optimize Supabase queries identified in the analysis step (changed from fetching all courses to enrolled courses).

### 3. Analyze `loadContinueLearningLesson`
- [x] **Review the current complex join query:** Uses nested selects (`lesson:lessons(module:modules(course:courses()))`).
- [x] **Verify the query logic:** Correctly uses `order('updated_at', { ascending: false }).limit(1)` to find the most recently updated `user_progress` record.
- [x] **Check type handling:** Uses optional chaining (`?.`) and nullish coalescing (`||`) appropriately for safe access to nested data.

### 4. Refactor `loadContinueLearningLesson`
- [ ] Simplify the query if possible, ensuring correctness.
- [ ] Improve type safety when accessing nested data (e.g., `recentLesson.lesson.module.course_id`).
*Decision: No significant refactoring deemed necessary for this action based on analysis. Query is standard, and type handling is adequate.*

### 5. Analyze `updateLessonProgress`
- [x] **Review the `upsert` logic:** Correctly uses `upsert` with `onConflict`. Data mapping seems appropriate.
- [x] **Review the subsequent `loadUserProgress(userId)` call:**
    - Currently reloads *all* user progress data after updating a single lesson.
    - **Reasoning:** Done to ensure consistency after DB triggers (`update_module_progress_trigger`, `update_course_progress_trigger`) update parent module/course progress.
    - **Evaluation:** Safest approach given the triggers, but potentially inefficient. Duplicating trigger logic on the client is complex and risky.
- [x] **Evaluate if reloading is necessary:** Yes, currently seems the most reliable way to reflect server-side trigger updates.

### 6. Refactor `updateLessonProgress`
- [x] **Refine logic:** Keep the `upsert` then `loadUserProgress` pattern for reliability due to DB triggers.
- [x] **Ensure correct type handling for `upsert`:** Address linter errors related to the `progressRecord` type passed to `upsert`.
- [x] **Add error handling:** Implement rollback for the optimistic local state update if the Supabase `upsert` fails.

### 7. Address General Type Safety & Minor Issues
- [ ] Review other actions (`initializeAuthenticatedUser`, `loadUserProgress`) for type mismatches (e.g., `profile.full_name` vs `first_name`/`last_name`).
- [x] Fix straightforward type errors identified by the linter where the solution is clear and aligns with the DB schema.
    - **Completed (loadUserEnrollments):**
        - Identified and resolved conflict where `UserEnrollment` type expected `course.coverImage` but the DB `courses` table lacked this column.
        - Removed `coverImage` from the `UserEnrollment` type definition in `lib/stores/student-dashboard/types/index.ts`.
        - Removed `coverImage` from the Supabase query and mapping logic within `loadUserEnrollments` in `lib/stores/student-dashboard/actions.ts`.
        - Corrected Supabase query syntax errors (removed comments within the template literal).
        - Handled potential `null` value for `course.description` in mapping using `?? ''`.
        - Corrected Supabase client import to use `getBrowserClient`.
        - Ensured correct type casting for `status` field (`as UserEnrollment['status']`).
        - Handled potential `null` database values for `enrolledAt`, `createdAt`, `updatedAt` using `?? ''`.
        - Adjusted error handling to use existing `hasEnrollmentError` flag (noted that `errorEnrollments` state needs manual addition to store definition).

## Technical Considerations
- **DB Triggers:** Be mindful of the existing database triggers that automatically calculate module and course progress when `user_progress` is updated. Refactoring `updateLessonProgress` must account for whether the client should wait/refetch or trust the triggers implicitly.
- **Type Generation:** Supabase type generation might be out of sync (`profiles.full_name` error). Rely on the `get_table_schema` output for column names.
- **Query Optimization:** Balance query optimization with code readability. Sometimes slightly less optimized but clearer queries are preferable. 