# Shopify E-commerce Integration - Phase 5-3: Checkout & Payment Integration

## Task Objective
Implement the checkout process, integrate with Xendit for payment processing, and handle post-payment success actions including creating order records in Supabase and granting access to purchased Google Drive resources.

## Current State Assessment
-   Phase 5-1 prepared the backend: `shopify_products` enhanced (images, Drive ID column added), `ecommerce_orders` & `ecommerce_order_items` tables created.
-   Phase 5-2 built the frontend: Product display (`ProductList`, `ProductCard`), members-only filtering, and Zustand-based shopping cart (`stores/cartStore.ts`, `CartView`) are implemented within the dashboard.
-   The `CartView` component has a "Proceed to Checkout" button, but it currently lacks functionality.
-   The `shopify_products` table has a `google_drive_file_id` column, but it might not be populated yet (mapping is a separate prerequisite task).
-   Xendit integration exists for the `papers-to-profits` flow (`/app/papers-to-profits/page.tsx`, potentially API routes like `/app/api/charge-card/route.ts`, `/app/api/payment-webhooks/create-account/route.ts`, `/app/api/payments/webhook/route.ts`), which can be referenced for patterns.
-   Google Drive utilities (`lib/google-drive/driveApiUtils.ts`) exist for fetching content, but likely lack functions for *granting permissions*.

## Future State Goal
1.  **Checkout Page/UI:** A dedicated checkout page/component (`/dashboard/checkout` or similar) displays the cart summary and prompts the user for any necessary checkout information (though for digital goods for logged-in members, this might be minimal).
2.  **Xendit Payment Initiation:** Backend logic (Server Action preferred, or API Route) exists to:
    *   Receive cart details from the client.
    *   Verify product availability and pricing against the database.
    *   Calculate the final total.
    *   Create a payment invoice/charge request with Xendit using the user's details and the calculated amount.
    *   Return necessary information (e.g., payment URL or checkout details) to the client.
3.  **Client-Side Payment Handling:** The client redirects the user to the Xendit payment page or uses a Xendit JS integration to handle the payment flow.
4.  **Xendit Webhook Handler:** A dedicated API route (`/api/webhooks/xendit/ecommerce` or similar) is implemented to securely receive and process webhook notifications from Xendit upon payment completion/failure.
5.  **Order Creation:** Upon successful payment confirmation via webhook, the handler creates records in:
    *   `ecommerce_orders` table.
    *   `ecommerce_order_items` table (linking to `shopify_products`).
    *   `transactions` table (unified transactions log from Phase 3).
6.  **Google Drive Access Granting:** The webhook handler retrieves the `google_drive_file_id` for each purchased `product_id` from `shopify_products` and uses the Google Drive API to grant the purchasing user (via their email associated with `auth.users`) appropriate permissions (e.g., 'reader') to that file/folder.
7.  **Post-Checkout Redirect:** The user is redirected to a success or failure page within the dashboard after the payment attempt.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Defines custom Xendit checkout, data flow.
> 2.  Phase 5-1: Backend Setup - Defines the `ecommerce_orders`/`items` and `transactions` tables to be populated, and the `google_drive_file_id` column.
> 3.  Phase 5-2: Frontend Display & Cart - Provides the cart data to initiate checkout.
> 4.  Existing Xendit/Payment Flows (`papers-to-profits`, API routes) - Provide patterns for Xendit API calls and webhook handling.
> 5.  Google Drive Integration (Phase 2/3 Build Notes) - Shows existing Drive API utils (`lib/google-drive/`) that need extending for permission management.
> 6.  Project Context (`ProjectContext.md`), Design Context (`designContext.md`), Build Notes Guidelines (`build-notes-guidelines.md`).
>
> This ensures consistency and alignment with project goals and standards.

## Implementation Plan (Phase 5-3)

1.  [ ] **(Prerequisite) Populate Google Drive Mappings:**
    *   [ ] Ensure the `google_drive_file_id` column in `shopify_products` is populated for all purchasable products. This might involve a manual update or a separate script (outside this build note's scope but essential for testing step 8).
2.  [ ] **Create Checkout UI:**
    *   [ ] Create the checkout page route (e.g., `app/dashboard/checkout/page.tsx`).
    *   [ ] Build the UI component (`components/checkout/CheckoutForm.tsx`? `use client`).
    *   [ ] Fetch cart summary from the Zustand store (`getCartItems`, `getCartTotalPrice`).
    *   [ ] Display order summary.
    *   [ ] Include a "Pay Now" button.
3.  [ ] **Implement Payment Initiation Logic (Server Action Recommended):**
    *   [ ] Create a Server Action (`app/actions/checkoutActions.ts` or similar).
    *   [ ] Define an action `createXenditPayment(cartItems: CartItem[])`.
    *   [ ] Inside the action:
        *   Get current user ID from Supabase auth.
        *   Fetch product details (price, status) from `shopify_products` based on `cartItems` product IDs to verify price and availability.
        *   Calculate the total amount securely on the server.
        *   Fetch user email from `auth.users` or `unified_profiles`.
        *   Construct the Xendit payment request payload (e.g., Invoice API) including amount, currency, user email, unique external ID (maybe link to a preliminary order record), success/failure redirect URLs.
        *   Call the Xendit API (using secure credentials) to create the payment/invoice.
        *   Return the Xendit invoice URL or necessary details to the client.
4.  [ ] **Connect Checkout UI to Server Action:**
    *   [ ] In the checkout UI component, add an `onSubmit` handler to the "Pay Now" button.
    *   [ ] Call the `createXenditPayment` server action, passing the cart items from the Zustand store.
    *   [ ] Handle the response: If successful, redirect the user to the Xendit invoice URL. Handle errors appropriately.
5.  [ ] **Implement Google Drive Permission Granting Utility:**
    *   [ ] Edit `lib/google-drive/driveApiUtils.ts`.
    *   [ ] Add a new function `async grantFilePermission(fileId: string, userEmail: string, role: 'reader' | 'writer' = 'reader'): Promise<void>`.
    *   [ ] Use the authenticated `drive` API client.
    *   [ ] Call `drive.permissions.create` with the `fileId`, `requestBody: { role: role, type: 'user', emailAddress: userEmail }`, and `fields: 'id'`.
    *   [ ] Add robust error handling (e.g., file not found, invalid email, insufficient permissions for service account).
6.  [ ] **Implement Xendit Webhook Handler:**
    *   [ ] Create a new API route (e.g., `app/api/webhooks/xendit/ecommerce/route.ts`).
    *   [ ] **Security:** Implement Xendit webhook signature verification using the callback verification token.
    *   [ ] Parse the incoming webhook payload (e.g., `invoice.paid` event).
    *   [ ] Extract relevant data: Xendit payment ID (`id`), external ID (linking back to the cart/user), amount, status, user email (if available).
    *   [ ] **Idempotency:** Check if an `ecommerce_orders` record with this `xendit_payment_id` already exists. If so, return success (200 OK) without processing again.
7.  [ ] **Implement Order Creation Logic (within Webhook Handler):**
    *   [ ] On successful payment verification:
        *   Fetch the user ID (`auth.users.id` and `unified_profiles.id`) based on the email or external ID passed during payment initiation.
        *   Create a new record in the unified `transactions` table.
        *   Create a new record in `ecommerce_orders`, linking the `user_id`, `unified_profile_id`, `xendit_payment_id`, and the new `transaction_id`.
        *   Retrieve the product IDs associated with the original payment (e.g., decode from `external_id` or fetch based on it).
        *   For each product ID:
            *   Fetch its current details (price, `google_drive_file_id`) from `shopify_products`.
            *   Create a corresponding record in `ecommerce_order_items`, linking to the new `ecommerce_orders.id` and `shopify_products.id`, storing `price_at_purchase`.
8.  [ ] **Implement Access Granting Logic (within Webhook Handler):**
    *   [ ] For each successfully created `ecommerce_order_items` record:
        *   Get the `google_drive_file_id` associated with the `product_id`.
        *   Get the user's email address.
        *   If `google_drive_file_id` exists, call the `grantFilePermission(google_drive_file_id, userEmail, 'reader')` utility function.
        *   Log success or failure of permission granting.
9.  [ ] **Post-Checkout Flow:**
    *   [ ] Create simple success (`/dashboard/checkout/success`) and failure (`/dashboard/checkout/failure`) pages.
    *   [ ] Ensure the redirect URLs provided to Xendit point to these pages.
    *   [ ] On the success page, consider clearing the Zustand cart store.
10. [ ] **Testing:**
    *   [ ] Test the payment initiation flow with dummy cart data.
    *   [ ] Use Xendit's test environment/webhooks simulator to trigger the webhook handler.
    *   [ ] Verify records are created correctly in `transactions`, `ecommerce_orders`, `ecommerce_order_items`.
    *   [ ] Verify Google Drive permissions are granted to the correct user for the correct file (requires populated mapping).

## Completion Status

This phase (5-3) is complete when:
-   Users can initiate payment via Xendit from the checkout page.
-   Successful Xendit payments trigger the webhook handler.
-   The webhook handler correctly creates records in all relevant Supabase tables.
-   The webhook handler successfully grants Google Drive access for purchased items.

## Next Steps After Completion
Proceed with **Phase 5-4: Migration & Testing**, focusing on end-to-end testing of the entire flow, planning the cutover from the old system, and finalizing any remaining rules or configurations.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1, 5-2, existing payment/Drive code).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 