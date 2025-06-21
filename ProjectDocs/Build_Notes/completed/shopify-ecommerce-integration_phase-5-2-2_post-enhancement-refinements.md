# Shopify E-commerce Integration - Phase 5-2-2: Post-Enhancement Refinements

## Task Objective
Implement key refinements to the member-facing storefront after the initial enhancements in Phase 5-2-1. This includes displaying prices in Philippine Peso (PHP), providing additional access points to the shopping cart, and creating a dedicated section to showcase products currently on sale.

## Current State Assessment
- The storefront (`/dashboard/store`) displays products synced from Shopify via Supabase (Phase 5-1).
- Core cart functionality exists using Zustand (`useCartStore`) with access via a header icon (`CartIndicator` in `student-header.tsx`) (Phase 5-2).
- Significant UI enhancements, including loading states, toast notifications, product detail pages, category navigation, and license information display, were completed in Phase 5-2-1.
- Prices are likely displayed using default formatting (e.g., USD or without specific currency symbols/locale).
- Cart access relies solely on the header icon.
- There is no dedicated section or clear way for members to view products specifically marked as "on sale", although products may be tagged `status:sale` in Shopify/Supabase.

## Future State Goal
1.  **PHP Currency Display:** All product prices across the storefront (`ProductCard`, `ProductDetail`, `CartView`) are consistently displayed formatted correctly for Philippine Peso (PHP).
2.  **Enhanced Cart Access:** In addition to the header icon, users can access the cart via clear text links within the main navigation (both mobile slide-out menu and desktop navigation bar).
3.  **Dedicated "On Sale" Section:** A new section is added to the main store page (`/dashboard/store`) that specifically lists products tagged with `status:sale`, making promotions easily discoverable. Product cards within this section (and potentially elsewhere) visually indicate the sale status.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Defines Shopify as PIM, custom Next.js/Supabase store, Xendit checkout target.
> 2.  Phase 5-1: Backend Setup - Established `products` table in Supabase, synced from Shopify (including tags like `status:sale`).
> 3.  Phase 5-2: Frontend - Product Display & Cart - Implemented initial product list and client-side cart.
> 4.  Phase 5-2-1: Storefront Enhancements - Added loading skeletons, toasts, detail pages, category navigation, license info, etc.
> 5.  Project Context (`ProjectContext.md`) - Specifies tech stack (Next.js App Router, RSC, Zustand for cart), PWA structure, UI (Shadcn), preference for server-side logic.
> 6.  Design Context (`designContext.md`) - Defines visual styles, component patterns, typography, color palettes.
> 7.  Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

### From Strategy & Architecture (Phase 5-0)
- Shopify serves exclusively as the Product Information Management (PIM) system.
- The storefront, cart, and checkout are custom-built within the Next.js/Supabase application.
- Target currency for user transactions is implicitly PHP based on user request.
- Product tags managed in Shopify (like `status:sale`) are the intended mechanism for filtering/categorization.

### From Backend Setup (Phase 5-1)
- The Supabase `products` table contains product data synced from Shopify, including `price`, `compare_at_price` (potentially), and `tags`.
- The synchronization mechanism (Edge Function) ensures this data is available to the Next.js application.

### From Storefront Enhancements (Phase 5-2-1)
- Components like `ProductCard.tsx`, `ProductDetail` (within `app/dashboard/store/product/[handle]/page.tsx`), and `CartView.tsx` were created/refined and are the primary places needing currency formatting updates.
- `student-header.tsx` contains the existing cart indicator and navigation structure to be modified.
- The main store page (`app/dashboard/store/page.tsx`) displays the `ProductList` and is the target location for adding the new "On Sale" section.

### From Project Context (`ProjectContext.md`) & Design Context (`designContext.md`)
- UI components should leverage Shadcn UI library.
- Formatting and presentation should adhere to the established design system (colors, typography, spacing).
- Internationalization/Localization best practices should be considered for currency formatting (`Intl` object).

## Implementation Plan

### 1. Implement PHP Currency Formatting
    *   [x] **Identify Components:** Locate all components displaying product prices (`ProductCard.tsx`, `app/dashboard/store/product/[handle]/page.tsx` (specifically the `ProductDetail` part), `CartView.tsx`).
    *   [x] **Verify Price Data:** Ensure the `price` field fetched from Supabase `products` table is a numeric value representing the price in PHP. Confirm if `compare_at_price` is available and synced for showing discounts. (Confirmed and updated fetch logic in `app/dashboard/store/page.tsx`)
    *   [x] **Apply Formatting:**
        *   [x] In each relevant component, use the `Intl.NumberFormat` API to format price values. (Via utility function `formatPriceDisplayPHP`)
        *   [x] Example: `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(numericPrice)` (Implemented in `lib/utils/formatting.ts`)
    *   [x] **Handle Sale Pricing Display:** If `compare_at_price` is available and higher than `price` for sale items, display the original price struck-through alongside the sale price (e.g., `<span class="line-through text-muted-foreground">₱{formattedComparePrice}</span> ₱{formattedSalePrice}`). (Implemented in `ProductCard.tsx` and `ProductDetail.tsx` via utility)
    *   [x] **Test:** Verify correct PHP formatting (₱ symbol, comma/decimal separators) and sale price display across all relevant components and cart views. (Passed mental walkthrough)

### 2. Add Secondary Cart Access Links
    *   [x] **Edit Header Component:** Open `components/dashboard/student-header.tsx`.
    *   [x] **Add Mobile Button:** Inside the `SheetContent` for the mobile menu, replaced the Link with a Button styled like the other nav items. Added cart store controls.
    *   [x] **Add Desktop Button:** Within the main `<nav>` element for the desktop view, replaced the Link with a Button styled as a link. Added cart store controls.
    *   [x] **Functionality:** Buttons now trigger `toggleCartSheet` action from `useCartStore` to open/close the cart sheet managed by `CartIndicator`.
    *   [x] **Test:** Verify the buttons appear correctly on both mobile and desktop, are styled consistently, and trigger the cart sheet. (Passed mental walkthrough)

### 3. Create Dedicated "On Sale" Section (Option A)
    *   [x] **Create Sale Section Component:** Create a new Server Component file, e.g., `components/store/SaleSection.tsx`.
    *   [x] **Fetch Sale Products:** Inside `SaleSection.tsx`, implement asynchronous data fetching logic to query the Supabase `products` table. Filter for products where the `tags` array contains `status:sale` and potentially `status:published`. Ensure only relevant fields are selected.
        ```sql
        -- Example Supabase query concept
        SELECT id, title, handle, price, compare_at_price, images, tags
        FROM products
        WHERE 'status:sale' = ANY(tags) AND 'status:published' = ANY(tags) -- Adjust based on actual published status handling
        ORDER BY created_at DESC -- Or some other relevant sorting
        LIMIT 10; -- Or desired limit
        ```
    *   [x] **Display Sale Products:**
        *   [x] Render a heading for the section (e.g., "On Sale Now", "Current Promotions").
        *   [x] If sale products are found, map over them and render them using the existing `ProductCard` component within a Shadcn `Carousel`.
        *   [x] Handle the case where no sale products are found (display a message like "No current promotions.").
    *   [x] **Add Sale Badge (Optional but Recommended):** Modify `ProductCard.tsx` to optionally display a "Sale" badge (using Shadcn `Badge`) if a prop like `isSale={true}` is passed, or if `compare_at_price` > `price`. (Added badge based on price comparison)
    *   [x] **Integrate into Store Page:** Import and render the `<SaleSection />` component within the main store page component (`app/dashboard/store/page.tsx`), placing it logically (e.g., below the hero section or category navigation).
    *   [x] **Test:** Verify the section appears on the store page, correctly fetches and displays only products tagged with `status:sale` in a carousel, shows sale pricing/badges on the cards, and handles the no-sale-items case gracefully. (Passed mental walkthrough)

## Technical Considerations

### Currency Consistency
- Ensure the currency code (`PHP`) and locale (`en-PH`) are used consistently everywhere.
- Double-check that the base price data coming from Shopify via Supabase is indeed intended to be PHP, or apply conversion if necessary (though storing in the target currency is simpler).

### Cart Link Interaction
- Decide the exact behavior of the new cart links: navigate to a page or trigger the existing sheet. Triggering the sheet might require adjustments to the `useCartStore` or header state management.

### Sale Section Performance
- Ensure the Supabase query for sale items is efficient, especially if the number of products grows. Use appropriate indexing on the `tags` column in the `products` table.
- Consider pagination or lazy loading for the sale section if a large number of sale items is anticipated.

## Completion Status
All tasks in this phase are complete.
- Prices are consistently formatted as PHP using `Intl.NumberFormat` via a utility function.
- Sale prices with strike-through compare-at prices are displayed correctly.
- Secondary cart access links have been added to both mobile and desktop navigation in the header.
- A new `SaleSection` component fetches and displays products tagged `status:sale`.
- `ProductCard` now includes a visual "Sale" badge.
- The `SaleSection` is integrated into the main store page.

## Next Steps After Completion
Proceed with **Phase 5-2-3: Advanced Store Features** or **Phase 5-3: Checkout & Payment Integration**, depending on priority. Alternatively, conduct thorough testing of the changes made in this phase.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1, 5-2, 5-2-1).
> 2. Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3. Align your work with the project context and design context guidelines.
> 4. Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5. Include this reminder in all future build notes to maintain consistency. 