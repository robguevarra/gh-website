# Shopify E-commerce Integration - Phase 5-1-1: Product Data Enhancement

## Task Objective
Enhance the Supabase `shopify_products` table schema and update the `shopify-sync` function to fetch and store multiple product images and the product description (body HTML) from Shopify. This provides the necessary backend data to support richer product detail displays in the frontend (Phase 5-2-1 and beyond).

## Current State Assessment
- Phase 5-1 established the `shopify_products` table and updated the `shopify-sync` function (`supabase/functions/shopify-sync/`) to fetch basic product data including a *single* `featured_image_url`.
- The `shopify-sync` function uses a hybrid approach: GraphQL for products, REST for customers/orders (Phase 4-2).
- The `shopify_products` table currently lacks columns to store multiple image URLs or the full product description/HTML.
- The frontend enhancement phase (5-2-1) plans to create a product detail page which would benefit from this richer data.

## Future State Goal
1.  **Enhanced `shopify_products` Schema:** The Supabase `shopify_products` table schema includes new columns: `image_urls` (JSONB, nullable, storing an array of image objects like `{url: string, altText: string | null}`) and `description_html` (TEXT, nullable).
2.  **Updated Product Sync Function:** The `shopify-sync` Edge Function (`supabase/functions/shopify-sync/`) is updated:
    *   The `PRODUCTS_QUERY` GraphQL query definition in `index.ts` is modified to fetch `images(first: 10) { edges { node { url altText } } }` (or similar, limit adjustable) and `descriptionHtml`.
    *   The `upsertProduct` function in `utils.ts` extracts this data from the GraphQL payload and stores it in the new `image_urls` and `description_html` columns.
3.  **Data Availability:** The backend is prepared to provide multiple images and descriptions for products, enabling richer frontend displays.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Overall e-commerce plan.
> 2.  Phase 5-1: Backend Setup - Initial product schema and sync setup.
> 3.  Phase 4-2: Shopify Integration (Analytics) - Details of the original `shopify-sync` function's hybrid approach.
> 4.  Phase 5-2-1: Storefront Enhancements - The frontend phase requiring this richer data.
> 5.  Project Context (`ProjectContext.md`) - Tech stack, goals.
> 6.  Design Context (`designContext.md`) - UI/UX standards.
> 7.  Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

## Implementation Plan (Phase 5-1-1)

1.  [x] **Enhance `shopify_products` Schema:**
    *   [x] Create a new Supabase migration file (e.g., `supabase/migrations/<timestamp>_add_images_description_to_products.sql`).
    *   [x] Add SQL `ALTER TABLE public.shopify_products ADD COLUMN description_html TEXT NULL;`
    *   [x] Add SQL `ALTER TABLE public.shopify_products ADD COLUMN image_urls JSONB NULL;`
    *   [x] Add SQL `COMMENT ON COLUMN public.shopify_products.description_html IS 'Product description HTML content from Shopify.';`
    *   [x] Add SQL `COMMENT ON COLUMN public.shopify_products.image_urls IS 'JSON array of product image objects, e.g., [{url, altText}].';`
    *   [x] Apply the migration (`supabase db push` or apply via dashboard).
2.  [x] **Update Shopify Sync GraphQL Query:**
    *   [x] Edit `supabase/functions/shopify-sync/index.ts`.
    *   [x] Locate the `PRODUCTS_QUERY` constant.
    *   [x] Modify the `node` fields within the query to include `descriptionHtml` and `images(first: 10) { edges { node { url altText } } }`. Adjust `first: 10` as needed.
3.  [x] **Update Shopify Sync Upsert Logic:**
    *   [x] Edit `supabase/functions/shopify-sync/utils.ts`.
    *   [x] Locate the `upsertProduct` function.
    *   [x] Modify the `ShopifyProductInsert` type definition (or inline object) to include `description_html?: string | null;` and `image_urls?: { url: string; altText: string | null }[] | null;`.
    *   [x] In the `productData` object assignment, extract `descriptionHtml` from the payload.
    *   [x] Extract the `images.edges` array, map it to the desired `{url, altText}` format, and assign it to `image_urls`. Handle potential nulls/empty arrays.
    *   [x] Ensure the `upsert` call correctly includes the new fields.
4.  [x] **Deploy Updated Sync Function:**
    *   [x] Deploy the modified `shopify-sync` function to Supabase Edge Functions (`supabase functions deploy shopify-sync --no-verify-jwt`).
5.  [x] **Test & Backfill:**
    *   [x] Manually invoke the updated `shopify-sync` function.
    *   [x] Verify that the `description_html` and `image_urls` columns are populated correctly for products that have descriptions and multiple images in Shopify. (Confirmed Working)
    *   [x] Decide if a full historical backfill (re-running the sync for all products) is necessary or if future syncs are sufficient. (Decision: Not required at this time)

## Completion Status

This phase (5-1-1) is complete when:
- [x] The `shopify_products` table has the new columns.
- [x] The `shopify-sync` function successfully fetches and stores product descriptions and multiple image URLs.
- [x] Data availability for richer product details is confirmed.

**Status: COMPLETE**

## Next Steps After Completion
Resume **Phase 5-2-1: Storefront Enhancements**, specifically implementing the product detail page to utilize the newly available data.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1, 4-2).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 