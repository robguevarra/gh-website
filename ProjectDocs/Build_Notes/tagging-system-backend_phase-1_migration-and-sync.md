# Build Notes: Tagging System Backend - Phase 1: Migration and Sync

**Date:** 2025-05-12
**Project:** GH Website
**Phase:** 1
**Task Group:** Tagging System Backend - Migration and Synchronization

## 1. Task Objective

To migrate existing text-based tags from the `unified_profiles.tags` column into the new structured tagging system (`tags`, `tag_types`, `user_tags`). Additionally, to implement an ongoing synchronization mechanism to keep the structured tags up-to-date with changes in `unified_profiles.tags`, integrated into the existing admin dashboard sync process.

## 2. Current State Assessment

- User profiles in `unified_profiles` have a `tags` column of type `text[]` containing various unnormalized tags (e.g., 'canva', 'Canva', 'paidp2p').
- A new structured tagging system exists with `tags`, `tag_types`, and `user_tags` tables.
- There is no automated process to link the old text tags to the new structured system.
- An admin dashboard sync endpoint (`/api/admin/dashboard/sync`) exists, which handles other data synchronization tasks.

## 3. Future State Goal

- All relevant existing text tags from `unified_profiles.tags` are represented as structured tags and correctly associated with users in the `user_tags` table.
- A robust, automated process is in place to synchronize these user-tag associations whenever the main admin dashboard sync is triggered. This includes handling additions and removals of tags from `unified_profiles.tags`.
- The new structured tagging data is reliable and can be used for advanced user segmentation and other features (e.g., email system).

## 4. Implementation Plan

### Phase 1.1: Preparation and Initial Migration (Completed)

- **Step 1: Define and Create Tag Types**
  - [x] Identified necessary Tag Types: `Systeme.io Import`, `Product Status`, `Communication Status`, `General`.
  - [x] Inserted these Tag Types into the `public.tag_types` table via SQL.

- **Step 2: Normalize and Create New Tags**
  - [x] Mapped old text tags (e.g., `canva`, `paidp2p`) to new normalized tag names (e.g., `Canva Interest`, `P2P Purchase`).
  - [x] Fetched `type_id`s for the created Tag Types.
  - [x] Inserted these normalized tags into the `public.tags` table, associated with their respective Tag Types, via SQL.

- **Step 3: Populate `user_tags` Table (Initial Migration)**
  - [x] Fetched `id`s for the newly created normalized tags.
  - [x] Developed and executed a SQL script to:
    - Read `user_id` and unnest `tags` from `unified_profiles`.
    - Map old text tags to new normalized tag UUIDs.
    - Insert `(user_id, new_tag_id)` pairs into `public.user_tags`.
    - Handled case variations and used `ON CONFLICT DO NOTHING`.

- **Step 4: Verification**
  - [x] Ran verification SQL queries to confirm data integrity (e.g., counts, sample user tag comparison).

### Phase 1.2: Ongoing Synchronization (Completed)

- **Step 1: Design Synchronization Strategy**
  - [x] Decided to create a PL/pgSQL stored procedure for robust, atomic sync logic.
  - [x] The strategy involves:
    - Calculating the desired state of user-tag associations in a temporary table.
    - Deleting associations from `user_tags` (for managed tags) that are no longer in the desired state.
    - Inserting new associations from the desired state.

- **Step 2: Create PL/pgSQL Stored Procedure**
  - [x] Developed `public.sync_all_user_tags_from_unified_profiles()` function.
  - [x] Wrote a Supabase migration file (`supabase/migrations/20250512131500_create_sync_user_tags_function.sql`) for this function.
  - [x] Applied the migration to create the function in the database.

- **Step 3: Create New API Endpoint for Tag Sync**
  - [x] Created a new Next.js API route: `/app/api/admin/dashboard/sync-user-tags/route.ts`.
  - [x] This `POST` endpoint calls the `sync_all_user_tags_from_unified_profiles()` PL/pgSQL function using `admin.rpc()`.
  - [x] Returns a JSON response with the summary from the stored procedure.

- **Step 4: Integrate into Main Dashboard Sync**
  - [x] Modified the existing `/app/api/admin/dashboard/sync/route.ts`.
  - [x] Added a call to the new `/api/admin/dashboard/sync-user-tags` endpoint within its sequence of operations.
  - [x] Included the tag sync result in the main sync endpoint's response.

## 5. Key Files Modified/Created

- `/Users/robguevarra/Documents/Coding Projects/GH Website/gh-website/supabase/migrations/20250512131500_create_sync_user_tags_function.sql` (Created)
- `/Users/robguevarra/Documents/Coding Projects/GH Website/gh-website/app/api/admin/dashboard/sync-user-tags/route.ts` (Created)
- `/Users/robguevarra/Documents/Coding Projects/GH Website/gh-website/app/api/admin/dashboard/sync/route.ts` (Modified)

## 6. Notes & Considerations

- The `unified_profiles.tags` column will be kept for now as it's part of an ongoing sync from external systems (pre-live phase).
- The implemented tag synchronization ensures that the structured `user_tags` table reflects changes from `unified_profiles.tags` for the managed set of tags.
- Manual application of the Supabase migration (`20250512131500_...sql`) is required in the deployment/CI process if not already automated.
