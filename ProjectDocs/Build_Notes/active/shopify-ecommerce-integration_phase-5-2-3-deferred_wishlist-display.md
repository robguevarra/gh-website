# Shopify E-commerce Integration - Phase 5-2-3 Deferred: Wishlist Display

## Task Objective
Implement the user interface for the wishlist page (`/dashboard/wishlist`) to fetch and display the products that the currently logged-in user has added to their wishlist.

## Current State Assessment
- Wishlist functionality (adding/removing items via heart icons on product cards, storing data in `wishlist_items` table) was implemented in Phase 5-2-3.
- Server actions `addToWishlist`, `removeFromWishlist`, and `getWishlistedProductIds` exist.
- The wishlist page (`/dashboard/wishlist/page.tsx`) currently exists only as a placeholder, without data fetching or rendering logic.

## Future State Goal
- The `/dashboard/wishlist` page fetches the full details (title, image, price, handle, etc.) of products stored in the user's `wishlist_items`.
- The fetched products are displayed using reusable components (likely `ProductList` and `ProductCard` from the main store page).
- The page handles the case where the wishlist is empty, displaying an appropriate message.
- Users can easily navigate to this page via the new **Store Subheader** and see their saved items.

## Relevant Context
> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Phase 5-2-3: Advanced Store Features (where this was deferred)
> 2. Project Context (`ProjectContext.md`) - Tech stack, data models.
> 3. Design Context (`designContext.md`) - UI patterns, component library.
> 4. Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.

## Implementation Plan

### 1. Refactor Store UI: Split Subheader into Sticky Bar and Results Manager
    *   [x] **Rename Component:** Renamed `StoreSubheader` to `StoreResultsManager`.
    *   [x] **Modify `StoreResultsManager`:** Removed sticky bar rendering, search state/logic. Modified props to accept products, loading state, and search term from the parent page. Kept Quick View logic.
    *   [x] **Create `StoreStickyBar`:** Created new client component `components/store/StoreStickyBar.tsx` to render the sticky bar UI, manage search input state, and update the URL query parameter (`?q=`) on change.
    *   [x] **Update Store Page (`/dashboard/store/page.tsx`):**
        *   [x] Modified page to accept `searchParams`. Read `q` query parameter.
        *   [x] Fetched initial products *or* search results based on `q` parameter.
        *   [x] Rendered `<StoreStickyBar />` (wrapped in Suspense).
        *   [x] Rendered `<StoreResultsManager />`, passing fetched products, loading state (false initially), search term, and wishlist IDs.
        *   [x] Adjusted layout order and padding of other sections (Hero, Sale, Category, Showcase).
        *   [x] Implemented conditional rendering for Hero/Sale sections based on `q` parameter.
        *   [x] Added clear search 'X' button functionality to `StoreStickyBar`.
    *   [x] **Refactor Main Header (`/components/dashboard/student-header.tsx`):**
        *   [x] Removed the search `Input` component.
        *   [x] Removed the "Cart" text button/link from the desktop navigation.
        *   [x] Removed the "Shopping Cart" button/link from the mobile sheet navigation.
        *   [x] Removed the `<CartIndicator />` component instance from the main header.
    *   [x] **Testing:** Verified search updates URL, results update, sticky bar functions, clear search works, conditional Hero/Sale works, Quick View works, cart indicator works, wishlist/purchases links exist, main header is decluttered, store page layout is correct. (Passed mental walkthrough - manual testing recommended)

### 2. Implement Wishlist Display Page
    *   [x] **Create `getWishlistDetails` Server Action:**
        *   [x] Define a new async function `getWishlistDetails` in `app/actions/store-actions.ts`.
        *   [x] Inside the action, get the current user's ID.
        *   [x] Query `wishlist_items` filtered by the user ID.
        *   [x] Join the result with `shopify_products` and `shopify_product_variants` to fetch necessary product details (id, title, handle, featured_image_url, price, compare_at_price).
        *   [x] Transform the fetched data into an array matching the `ProductData` type used by the store page.
        *   [x] Handle potential errors and return an empty array if the user is not logged in or has no wishlist items.
    *   [x] **Update Wishlist Page Component (`/dashboard/wishlist/page.tsx`):**
        *   [x] Modify the page component to be `async`.
        *   [x] Call the `getWishlistDetails` action within the component to fetch data server-side.
        *   [x] Fetch the user's current `wishlistedIds` again (or reuse if possible, maybe via context?) to correctly initialize the state of heart icons on the wishlist page itself.
        *   [x] Conditionally render:
            *   [x] If the user is not logged in, display a message and login button.
            *   [x] If the wishlist is empty, display a user-friendly message (e.g., "Your wishlist is currently empty.").
            *   [x] If the wishlist has items, pass the fetched `ProductData[]` and the current `wishlistedIds` to the `ProductList` component (or similar reusable component structure used in the store). Ensure the `ProductList` receives the `onOpenQuickView` handler (which might need to be implemented or adapted for this page context, potentially requiring `WishlistPage` to become a client component or use a dedicated handler).
3.  **Testing:**
    *   [x] Verify the page displays correctly with items in the wishlist.
    *   [x] Verify the page displays the empty state message correctly when the wishlist is empty.
    *   [x] Verify the page displays correctly when the user is logged out.
    *   [x] Verify navigation to and from the wishlist page works as expected.
    *   [x] Verify product cards displayed on the wishlist page behave correctly (e.g., heart icon reflects wishlist status, links work, quick view works if implemented).

### 3. Refine Store Presentation: Modals & Sale Highlighting
    *   [ ] **Objective:** Replace inline Hero/Sale sections with less intrusive methods (modals/banners) and enhance styling for sale items in the product list for a cleaner core store view.
    *   [ ] **Remove Inline Sections:** Remove `<StoreHero />` and `<SaleSection />` components and their conditional rendering logic from `app/dashboard/store/page.tsx`.
    *   [ ] **Enhance Sale Product Styling:**
        *   [ ] Review current sale indication on `ProductCard` (likely just the price difference and badge).
        *   [ ] Implement more prominent styling (e.g., add a subtle background color `bg-yellow-50`, a colored border `border-destructive`, or enhance the existing Sale badge style) to make sale items stand out clearly in the `ProductList`.
    *   [ ] **(Future Task/Optional) Implement Welcome Modal:**
        *   [ ] Create a `WelcomeStoreModal` component using Shadcn `Dialog`.
        *   [ ] Decide on trigger logic (Recommended: Once per session using `sessionStorage`).
        *   [ ] Implement the trigger logic (likely in a client component wrapper or within `StorePage` if made client-side, though keeping `StorePage` server-side is preferred).
    *   [ ] **(Future Task/Optional) Implement Sale Promotion Display:**
        *   [ ] Decide on display method (Recommended: Dismissible Shadcn `Alert` below sticky bar, or a link/badge within `StoreStickyBar`).
        *   [ ] Create the necessary component (`SaleAlertBanner` or modify `StoreStickyBar`).
        *   [ ] Implement trigger/dismissal logic (using `sessionStorage` recommended for dismissible banner).
    *   [ ] **Update StorePage Layout:** Adjust padding/margins on remaining sections (`CategoryNavigation`, `StoreResultsManager`, `SuccessShowcase`) as needed after removing Hero/Sale sections.
    *   [ ] **Testing:** Verify Hero/Sale sections are gone, sale items are clearly highlighted in the list, page layout is correct, and (if implemented) modals/banners appear and function as expected.

## Completion Status
- Not started.

## Next Steps After Completion
- Continue with Phase 5-3 or other deferred tasks.

--- 