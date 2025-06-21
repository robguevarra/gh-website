# Shopify E-commerce Integration - Phase 5-3-1: Prevent Duplicate Purchases

## Task Objective
Prevent users from purchasing the same one-time purchase product (e.g., commercial licenses) multiple times.

## Current State Assessment
-   Users can currently add any product to the cart and proceed to checkout, regardless of whether they have previously purchased it successfully.
-   There is no mechanism in the backend (payment initiation) or frontend (store UI, cart) to check for prior ownership of one-time purchase items.
-   The `shopify_products` table lacks a flag to distinguish one-time purchase items from potentially consumable ones.

## Future State Goal
1.  **Database Flag:** The `shopify_products` table has a boolean column `is_one_time_purchase` (or similar) to identify products that should only be bought once per user. All existing products (being commercial licenses) will have this flag set to `true`.
2.  **Backend Prevention:** The payment initiation server action (`app/actions/checkoutActions.ts::createXenditEcommercePayment`) checks if any `is_one_time_purchase` items in the cart have already been successfully purchased by the current user (based on `ecommerce_order_items` and `ecommerce_orders` status). If duplicates are found, the payment initiation is rejected with an error.
3.  **Frontend Indication:**
    *   Product display components (`ProductCard`, `/dashboard/store/product/[handle]`) disable the "Add to Cart" button and show an "Owned" or "Purchased" indicator for items the user already owns.
    *   The Cart (`CartView`, `useCartStore`) prevents adding already owned items or clearly marks them and potentially disables checkout if such items are present.
    *   The Checkout page (`/dashboard/checkout`) performs a final check and prevents payment if owned items are somehow included.

## Implementation Plan (Phase 5-3-1)

1.  [x] **Database Migration:**
    *   [x] Add `is_one_time_purchase` column (boolean, default `false`) to `shopify_products` table.
    *   [x] Update all existing rows in `shopify_products` to set `is_one_time_purchase = true`.
2.  [x] **Backend Check (Server Action):**
    *   [x] Modify `createXenditEcommercePayment` in `app/actions/checkoutActions.ts`.
    *   [x] Before calling Xendit, query `ecommerce_order_items` (joining `ecommerce_orders` and `shopify_products`) for the current user ID.
    *   [x] Filter the query for items where `shopify_products.is_one_time_purchase = true` and `ecommerce_orders.order_status` indicates successful purchase (e.g., 'completed', 'processing').
    *   [x] Compare the owned product IDs with the product IDs in the incoming `cartItems`.
    *   [x] If an overlap exists, return an error (e.g., `{ success: false, error: "Product '[Name]' already purchased." }`).
3.  [x] **Frontend UI Enhancements:**
    *   [x] Create a server action or modify existing data fetching to retrieve a list of product IDs owned by the current user (`app/actions/userActions.ts::getOwnedProductIds`).
    *   [x] Update `ProductCard` / product page: Fetch owned IDs (`app/dashboard/store/page.tsx`), pass down (`StoreResultsManager`, `ProductList`), conditionally disable "Add to Cart" and show "Purchased" badge (`ProductCard`).
    *   [x] Update `useCartStore` / `CartView`: Relied on disabled UI and server check instead of modifying store logic.
    *   [x] Update `CheckoutForm`: No changes needed; server check is sufficient.
4.  [ ] **Testing:**
    *   [ ] Test adding owned items to cart (should fail or be indicated).
    *   [ ] Test proceeding to checkout with owned items (should fail).
    *   [ ] Test direct payment initiation with owned items via server action (should fail).
    *   [ ] Test purchasing a new, non-owned item.

---
> **Note to AI Developers**: Ensure consistency with previous phases (5-0 to 5-3) and project contexts. 