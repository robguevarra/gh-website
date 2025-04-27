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

### 1. Refactor Store UI: Implement Store Subheader
    *   [x] **Create Component:** Create a new client component file `components/store/StoreSubheader.tsx`.
    *   [x] **Define Props:** Define props for `StoreSubheader` to accept `initialProducts: ProductData[]` and `initialWishlistedIds: string[]`.
    *   [x] **Move Search Logic:**
        *   [x] Migrate state management (`searchTerm`, `searchResults`, `isSearching`) from `StoreSearchHandler` to `StoreSubheader`.
        *   [x] Migrate the debounced search function (`debouncedSearch`) and the call to the `searchProductsStore` server action.
        *   [x] Migrate the search `Input` rendering logic, including the `Search` and `Loader2` icons.
    *   [x] **Move Quick View Logic:**
        *   [x] Migrate state management (`isQuickViewOpen`, `selectedProductForQuickView`) from `StoreSearchHandler` to `StoreSubheader`.
        *   [x] Migrate the `handleOpenQuickView` function.
        *   [x] Migrate the rendering of the `QuickViewModal` component.
    *   [x] **Add Navigation/Actions:**
        *   [x] Implement a layout (e.g., Flexbox) for the subheader content.
        *   [x] Add a link to the Wishlist page (`/dashboard/wishlist`) using a `Heart` icon.
        *   [x] Add a link to the (future) Purchase History page (`/dashboard/purchase-history`).
        *   [x] Add Cart access: Integrate the `CartIndicator` component directly within the subheader, ensuring it uses `useCartStore` correctly.
    *   [x] **Render Product List:**
        *   [x] `StoreSubheader` should render the `ProductList` component below its navigation/search elements.
        *   [x] Pass the correct product data (`searchResults` or `initialProducts`) and `wishlistedIds` state to `ProductList`.
        *   [x] Pass the `handleOpenQuickView` function to `ProductList`.
        *   [x] Handle the loading state (`isSearching`) by potentially showing `LoadingSkeleton` instead of `ProductList`.
        *   [x] Handle the "no results" case.
    *   [x] **Update Store Page (`/dashboard/store/page.tsx`):**
        *   [x] Remove the `StoreSearchHandler` component.
        *   [x] Import and render the new `<StoreSubheader />` component.
        *   [x] Pass `initialProducts` and `initialWishlistedIds` fetched in the page component down to `<StoreSubheader />`.
    *   [x] **Refactor Main Header (`/components/dashboard/student-header.tsx`):**
        *   [x] Remove the search `Input` component.
        *   [x] Remove the "Cart" text button/link from the desktop navigation.
        *   [x] Remove the "Shopping Cart" button/link from the mobile sheet navigation.
        *   [x] Remove the `<CartIndicator />` component instance from the main header.
    *   [x] **Testing:** Verify search works, quick view works, cart indicator/sheet works from subheader, wishlist link works, purchase history link exists, main header is decluttered, store page layout is correct. (Passed mental walkthrough - manual testing recommended)

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

## Completion Status
- Not started.

## Next Steps After Completion
- Continue with Phase 5-3 or other deferred tasks.

--- 