# Shopify E-commerce Integration - Phase 5-2: Frontend - Product Display & Cart

## Task Objective
Build the frontend components required to display products from the synced `shopify_products` table within the members' dashboard (`/dashboard`). Implement client-side shopping cart functionality allowing members to add, view, and remove products before proceeding to checkout.

## Current State Assessment
-   Phase 5-1 completed the backend setup: `shopify_products` table enhanced with image URLs and Google Drive mapping column, `ecommerce_orders`/`items` tables created, and the `shopify-sync` function updated to populate image URLs.
-   The member dashboard (`/dashboard`) exists but currently lacks a dedicated section or components for browsing and purchasing products.
-   There is no existing shopping cart functionality.
-   The project context (`ProjectContext.md`) recommends Zustand for client-side state management if needed.
-   The project uses Shadcn UI components.

## Future State Goal
1.  **Product Display Components:** Reusable React components (`ProductList`, `ProductCard`) are created to display product information fetched from the `shopify_products` table.
2.  **Dashboard Integration:** A new section or page within the member dashboard (`/dashboard/store` or similar route) integrates the `ProductList` component.
3.  **Data Fetching:** Logic is implemented (e.g., within a Server Component or using a client-side hook calling an API route/server action) to fetch product data specifically tagged for members (e.g., using `tags` column in `shopify_products`). Data should include title, description, price, and the `featured_image_url`.
4.  **Shopping Cart State:** Client-side state management (using Zustand) is implemented to manage the shopping cart (list of product IDs, quantities).
5.  **Cart Functionality:**
    *   "Add to Cart" buttons on `ProductCard` components update the Zustand cart state.
    *   A visual cart indicator (e.g., in the dashboard header) shows the number of items.
    *   A dedicated Cart component/modal/drawer (`CartView`) displays items in the cart, allows quantity adjustments (if applicable, though maybe just 1 for licenses), allows item removal, and shows the subtotal.
    *   Cart state persists across page navigation within the dashboard (Zustand with persistence middleware).
6.  **UI/UX:** Components adhere to the `designContext.md` and use Shadcn UI elements.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Defines the members-only scope and overall flow.
> 2.  Phase 5-1: Backend Setup - Defines the `shopify_products` table structure being consumed.
> 3.  Project Context (`ProjectContext.md`) - Specifies tech stack (Next.js App Router, RSC, Zustand), PWA structure, and UI (Shadcn).
> 4.  Design Context (`designContext.md`) - Defines visual styles, component patterns.
> 5.  Build Notes Guidelines (`build-notes-guidelines.md`) - Documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

## Implementation Plan (Phase 5-2)

1.  [ ] **Setup Routing:**
    *   [ ] Decide on the route for the store within the dashboard (e.g., `app/dashboard/store/page.tsx`).
    *   [ ] Create the necessary route file(s).
2.  [ ] **Create Data Fetching Logic:**
    *   [ ] Option A (Server Component Recommended): In `app/dashboard/store/page.tsx`, fetch product data directly.
        *   Use Supabase client (server-side) to query `shopify_products`.
        *   Filter products based on status (`active`) and potentially tags (e.g., `tags @> ARRAY['access:members']` or similar, confirm tag convention).
        *   Select necessary fields: `id`, `title`, `handle`, `featured_image_url`, `variants(price)` (assuming price is on the first variant or directly on the product if schema adjusted). Adapt query based on actual price location.
        *   Pass fetched data as props to client components.
    *   [ ] Option B (Client Component + API): If fetching needs to be dynamic on the client, create an API route (`app/api/store/products/route.ts`) or Server Action to fetch products and call it from a client component using hooks (e.g., `useSWR`, `useEffect`).
3.  [ ] **Build Product Display Components:**
    *   [ ] Create `components/store/ProductCard.tsx` (`use client` if it has interactive elements like Add to Cart).
        *   Accepts product data as props.
        *   Displays image (`featured_image_url`), title, price.
        *   Includes an "Add to Cart" button.
        *   Uses Shadcn `Card` component.
    *   [ ] Create `components/store/ProductList.tsx` (`use client`).
        *   Accepts an array of product data as props.
        *   Maps over the data, rendering a `ProductCard` for each.
        *   Uses a responsive grid layout.
4.  [ ] **Integrate Display Components:**
    *   [ ] In `app/dashboard/store/page.tsx` (or the client component if using Option B), render the `ProductList` component, passing the fetched product data.
5.  [ ] **Implement Zustand Cart Store:**
    *   [ ] Create `stores/cartStore.ts` (or similar path).
    *   [ ] Define the store state: `items: CartItem[]` (where `CartItem` has `productId`, `quantity`, potentially `title`, `price`, `imageUrl` for display).
    *   [ ] Define actions: `addItem`, `removeItem`, `updateQuantity` (if needed), `clearCart`.
    *   [ ] Implement Zustand persistence middleware (e.g., using `localStorage`) so the cart isn't lost on refresh.
    *   [ ] Define selectors: `getCartItems`, `getCartTotalQuantity`, `getCartTotalPrice`.
6.  [ ] **Connect "Add to Cart" Button:**
    *   [ ] In `ProductCard.tsx`, import the Zustand store's actions.
    *   [ ] Add an `onClick` handler to the button that calls the `addItem` action, passing necessary product details (id, price, title, image).
7.  [ ] **Create Cart View Component:**
    *   [ ] Create `components/store/CartView.tsx` (`use client`).
    *   [ ] Use Zustand store selectors (`getCartItems`, `getCartTotalPrice`) to get cart data.
    *   [ ] Display the list of items in the cart (image, title, price, quantity).
    *   [ ] Include buttons/icons to remove items (calling `removeItem` action).
    *   [ ] Display the total price.
    *   [ ] Include a "Proceed to Checkout" button (functionality added in Phase 5-3).
    *   [ ] Consider using a Shadcn `Sheet` (drawer) or `Dialog` (modal) to display the cart.
8.  [ ] **Add Cart Indicator:**
    *   [ ] Modify the main dashboard layout/header component (`components/dashboard/Header.tsx` or similar).
    *   [ ] Import the Zustand store and use the `getCartTotalQuantity` selector.
    *   [ ] Display a cart icon (e.g., from `lucide-react`) with a badge showing the total quantity.
    *   [ ] Make the cart icon clickable to open the `CartView` component (modal/drawer).
9.  [ ] **Styling and Refinement:**
    *   [ ] Ensure all components align with `designContext.md` and use Tailwind/Shadcn conventions.
    *   [ ] Test responsiveness.

## Completion Status

This phase (5-2) is complete when:
-   Members can view products available to them within the dashboard.
-   Members can add products to a shopping cart.
-   The cart state persists across navigation.
-   Members can view the contents of their cart and the total price.

## Next Steps After Completion
Proceed with **Phase 5-3: Checkout & Payment Integration**, focusing on building the checkout UI, integrating with Xendit for payment processing, and handling post-payment actions like order creation and access granting.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 