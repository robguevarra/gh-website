# Shopify E-commerce Integration - Phase 5-2-4: Collection-Based Filtering

## Task Objective
Replace the hardcoded category navigation in the member-facing storefront (`/dashboard/store`) with dynamic filtering based on actual Shopify Collections. This involves syncing product collection data to Supabase and updating the frontend to fetch, display, and filter by these collections.

## Current State Assessment
- The storefront uses a `CategoryNavigation.tsx` component with hardcoded categories (Planners, Journals, etc.). Clicking these currently updates local state but doesn't filter the product data fetched from Supabase.
- The Supabase `shopify_products` table, synced via the `shopify-sync` function, includes product details like title, handle, tags, images, and description, but lacks data on which Shopify Collections a product belongs to.
- Product filtering is currently implemented primarily via a search input (`StoreStickyBar.tsx` managing the `q` URL query parameter) handled server-side in `/dashboard/store/page.tsx`.
- Previous phases (5-0 to 5-2-3) established the core store structure, UI components (`ProductCard`, `ProductList`, `StoreResultsManager`), and data sync strategy.

## Future State Goal
1.  **Collection Data in Supabase:** The `shopify_products` table has a new column (e.g., `collection_handles TEXT[]`) storing an array of handles for the collections each product is part of.
2.  **Updated Sync Function:** The `shopify-sync` Edge Function fetches collection handles for each product from Shopify and populates the new column.
3.  **Dynamic Category Navigation:** `CategoryNavigation.tsx` dynamically displays buttons/tiles based on a distinct list of collection handles fetched from the products available in Supabase.
4.  **Collection Filtering:** Selecting a collection in `CategoryNavigation` updates the URL (e.g., `/dashboard/store?collection=summer-stickers`) and triggers a server-side refetch/filter of the product list, displaying only products belonging to that collection.
5.  **Integrated Filtering Logic:** The store page (`/dashboard/store/page.tsx`) handles filtering based on *either* the `collection` URL parameter *or* the `q` (search) URL parameter, ensuring clear user interaction.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Defines Shopify as PIM, custom store approach.
> 2.  Phase 5-1: Backend Setup - Initial product sync setup.
> 3.  Phase 5-2: Frontend Core - `ProductList`, `Cart` components.
> 4.  Phase 5-2-1 to 5-2-3: Storefront Enhancements - UI structure, existing filtering/search components (`StoreStickyBar`, `StoreResultsManager`), `CategoryNavigation` component.
> 5.  Project Context (`ProjectContext.md`) - Tech stack (Next.js App Router, Supabase, RSC), data models.
> 6.  Design Context (`designContext.md`) - UI patterns (Shadcn).
> 7.  Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

### Key Dependencies
- Requires modifications to the Supabase Edge Function (`shopify-sync`).
- Requires a Supabase database schema migration.
- Requires updates to server-side data fetching logic in Next.js (`/dashboard/store/page.tsx`).
- Requires updates to client-side components (`CategoryNavigation.tsx`, `StoreStickyBar.tsx`).

## Implementation Plan

### 1. Backend: Schema & Sync Update
    *   [x] **Migration:** Create a new Supabase migration file (`supabase/migrations/<timestamp>_add_collection_handles_to_products.sql`).
        *   Add SQL: `ALTER TABLE public.shopify_products ADD COLUMN collection_handles TEXT[] NULL;`
        *   Add SQL: `COMMENT ON COLUMN public.shopify_products.collection_handles IS 'Array of handles for Shopify collections this product belongs to.';`
        *   Add SQL (Optional but recommended): `CREATE INDEX idx_products_collection_handles ON public.shopify_products USING gin (collection_handles);`
        *   Apply migration (`supabase db push`). (Executed directly via MCP tool as per user instruction)
    *   [x] **Update Sync Function (`shopify-sync`):**
        *   Edit `supabase/functions/shopify-sync/index.ts`.
        *   Modify the `PRODUCTS_QUERY` GraphQL query to include `collections(first: 20) { edges { node { handle } } }` within the product node fields.
        *   Edit `supabase/functions/shopify-sync/utils.ts`.
        *   Update the `upsertProduct` function:
            *   Modify the type definition/inline object for `productData` to include `collection_handles?: string[] | null;`.
            *   Extract collection handles from `product.collections.edges` and map them to an array of strings.
            *   Assign this array to `collection_handles` in the data object being upserted.
    *   [x] **Deploy & Backfill:**
        *   Deploy the updated function (`supabase functions deploy shopify-sync --no-verify-jwt`).
        *   Trigger a backfill: Either manually update products in Shopify to trigger webhooks or run a script to re-sync all products. (Completed)

### 2. Frontend: Fetch & Display Collections
    *   [x] **Fetch Distinct Collections (`/dashboard/store/page.tsx`):**
        *   Create a server-side utility function or directly query Supabase within the page component.
        *   Query: `SELECT DISTINCT unnest(collection_handles) as handle FROM public.shopify_products WHERE collection_handles IS NOT NULL;` (Implemented via JS processing)
        *   This fetches a list of unique collection handles present in the database. Optionally, fetch titles if needed later.
    *   [x] **Update `CategoryNavigation.tsx`:**
        *   Modify props: Accept `collections: { handle: string }[]` (or include title if fetched) and `activeCollection: string | null`. Rename `activeCategory` and `onCategoryChange` props for clarity (e.g., `activeCollectionHandle`, `onCollectionSelect`).
        *   Remove the hardcoded `categories` array.
        *   Map over the `collections` prop to render navigation buttons/tiles. Use `handle` for the key and value passed to `onCollectionSelect`.
        *   Highlight the button/tile where `collection.handle === activeCollectionHandle`.

### 3. Frontend: Implement Filtering Logic
    *   [x] **Update Store Page (`/dashboard/store/page.tsx`):**
        *   Read both `q` and `collection` from `searchParams`.
        *   Modify the main product fetching logic:
            *   Prioritize `collection`: If `searchParams.collection` exists, add a Supabase filter: `.filter('collection_handles', 'cs', \`{"${searchParams.collection}"}\`)` (contains specific handle).
            *   Else if `searchParams.q` exists, use the existing `ilike` search logic.
            *   If neither exists, fetch all (or paginated) products.
        *   Pass the fetched distinct collection handles to `<CategoryNavigation />`.
        *   Pass the `searchParams.collection` value as `activeCollectionHandle` to `<CategoryNavigation />`.
        *   Pass the `searchParams.collection` value to `<StoreStickyBar />` to manage state. (Handled via reading searchParams in StickyBar)
    *   [x] **Update `StoreStickyBar.tsx`:**
        *   Receive `currentCollection: string | null` prop. (Handled via reading searchParams)
        *   Modify the `handleCategoryChange` (or similar logic triggered by `CategoryNavigation`) to:
            *   Get the selected collection handle.
            *   Update the URL query parameters using `router.push` or `usePathname`/`useRouter`. Set `?collection=<handle>` and remove `?q=`.
        *   Modify the search input's `onChange` or `onSubmit` handler to:
            *   Update the URL query parameters. Set `?q=<search_term>` and remove `?collection=`.
        *   The "Clear" button should remove both `q` and `collection` parameters.

## Technical Considerations

### Data Consistency
- Ensure the `shopify-sync` function correctly handles products belonging to multiple collections.
- Plan for how to handle collection deletion/renaming in Shopify (webhooks might be needed for collections themselves, or rely on product update webhooks).

### Performance
- Index the `collection_handles` column in Supabase (`GIN` index is suitable for array containment queries).
- The query for distinct collection handles should be efficient. If it becomes slow, consider caching or a separate table.

### User Experience
- Clearly indicate the active filter (collection or search term).
- Decide how search and collection filters should interact if combined filtering is desired in the future. The initial approach is mutually exclusive.
- Provide a way to easily clear the collection filter (e.g., an "All Designs" option in `CategoryNavigation` that clears the `collection` parameter).

## Completion Status
Not started.

## Next Steps After Completion
Proceed with implementation, starting with the backend schema and sync updates, followed by frontend integration. Thorough testing of sync, fetching, and filtering logic is crucial.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns (esp. Phase 5-0 through 5-2-3).
> 2. Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3. Align your work with the project context and design context guidelines.
> 4. Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5. Include this reminder in all future build notes to maintain consistency. 