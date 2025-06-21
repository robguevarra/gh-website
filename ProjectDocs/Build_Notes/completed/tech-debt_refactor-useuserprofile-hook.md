# Technical Debt: Refactor useUserProfile Hook

## Task Objective
Refactor the `useUserProfile` hook located in `lib/supabase/hooks.ts` (and potentially related hooks like `use-user-profile-with-data`) to query the correct `public.unified_profiles` table instead of the incorrect/legacy `public.profiles` table. Ensure `unified_profiles` includes an `avatar_url` for feature parity.

## Current State Assessment
- The project's data unification strategy (Phase 3 build notes) designates `public.unified_profiles` as the central table for user profile data, linked to `auth.users`.
- The `unified_profiles` table currently **lacks** an `avatar_url` column.
- The `public.profiles` table (which is likely legacy) **has** an `avatar_url` column.
- The `useUserProfile` hook in `lib/supabase/hooks.ts`, used by `AuthContext`, currently queries `public.profiles`.
- Other features like product reviews currently fetch names from `unified_profiles` but cannot display avatars due to the missing column.

## Future State Goal
- The `unified_profiles` table includes a nullable `avatar_url` column.
- The `useUserProfile` hook and any dependent components/contexts correctly query `public.unified_profiles` for user profile information, including `avatar_url`.
- The `public.profiles` table is confirmed as unused and potentially dropped from the schema.
- User profile data access (including avatars) is consistent across the application and aligned with the defined data model.

## Implementation Plan

1.  **Add `avatar_url` to `unified_profiles`:**
    -   [ ] Create and run a database migration to add a nullable `avatar_url` (TEXT) column to the `public.unified_profiles` table.
    -   [ ] Determine and implement the population strategy (e.g., copy from `auth.users.raw_user_meta_data.avatar_url`? Allow user uploads? Default placeholder?).
2.  **Analyze `useUserProfile` (`lib/supabase/hooks.ts`):
    -   [ ] Confirm it's the primary hook used for fetching profile data in `AuthContext`.
    -   [ ] Update the Supabase query within the hook to target `from('unified_profiles')`.
    -   [ ] Adjust the `.select()` statement to fetch relevant columns including the new `avatar_url`.
    -   [ ] Update any associated TypeScript types or interfaces used by the hook.
3.  **Analyze Dependent Hooks/Components:**
    -   [ ] Identify other hooks (like `use-user-profile-with-data`) or components that might directly or indirectly use the profile data fetched by the hook.
    -   [ ] Update these dependents to utilize the `avatar_url` from `unified_profiles`.
4.  **Update `getProductReviews` (Optional but Recommended):**
    -   [ ] Modify `app/actions/store-actions.ts` again to select `avatar_url` from `unified_profiles` now that the column exists.
    -   [ ] Update the `ProductReviewWithProfile` type accordingly.
    -   [ ] Update the review display component (`app/dashboard/store/product/[handle]/page.tsx`?) to show the avatar.
5.  **Test Thoroughly:**
    -   [ ] Verify that user profile information and avatars display correctly in all relevant UI sections (user menu, reviews, profile pages, etc.).
    -   [ ] Test authentication flows and profile updates (especially if avatar uploads are implemented).
6.  **Investigate `public.profiles`:**
    -   [ ] Search the codebase for any other usages of the `profiles` table.
    -   [ ] If confirmed unused, plan for its removal from the database schema (requires another migration).

## Priority
Medium - This should be addressed to ensure data consistency and restore avatar functionality, but the application currently functions without it. 