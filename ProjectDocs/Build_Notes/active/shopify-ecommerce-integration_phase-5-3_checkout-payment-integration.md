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

1.  [x] **(Prerequisite) Populate Google Drive Mappings:**
    *   [x] Ensure the `google_drive_file_id` column in `shopify_products` is populated for all purchasable products. **Decision:** Deferred creation of Admin UI. Mappings must be done manually/scripted for testing this phase. **Action:** Google Drive scope in `driveApiUtils.ts` updated to allow permission changes (`drive.readonly` -> `drive`).
2.  [x] **Create Checkout UI:**
    *   [x] Create the checkout page route (`app/dashboard/checkout/page.tsx`).
    *   [x] Build the UI component (`components/checkout/CheckoutForm.tsx` - `use client`).
    *   [x] Fetch cart summary from the Zustand store (`useCartStore`).
    *   [x] Display order summary.
    *   [x] Include a "Proceed to Payment" button.
3.  [x] **Implement Payment Initiation Logic (Server Action):**
    *   [x] Create a Server Action (`app/actions/checkoutActions.ts`).
    *   [x] Define an action `createXenditEcommercePayment(cartItems: CartItem[])`.
    *   [x] Inside the action:
        *   [x] Get current user ID from Supabase auth.
        *   [x] Fetch product variant details (price) from `shopify_product_variants` based on `cartItems` (`productId` assumed to be variant UUID). Verify existence.
        *   [x] Calculate the total amount securely on the server.
        *   [x] Fetch user email from `auth.users`.
        *   [x] Create a local helper `logEcommercePendingTransaction` to log `pending` transaction in `transactions` table with `SHOPIFY_ECOM` type, `external_id`, and metadata (avoiding modification of shared `payment-utils.ts`).
        *   [x] Construct the Xendit payment request payload (Invoice API) including amount, currency, user email, unique `external_id`, success/failure redirect URLs, items list.
        *   [x] Call the Xendit API using `fetch` and Basic Auth (following existing patterns).
        *   [x] Return the Xendit `invoice_url` to the client.
4.  [x] **Connect Checkout UI to Server Action:**
    *   [x] In the checkout UI component (`CheckoutForm.tsx`), add `handlePayment` handler to the "Proceed to Payment" button.
    *   [x] Call the `createXenditEcommercePayment` server action, passing the cart items.
    *   [x] Handle loading state (`useTransition`) and errors (`useState`).
    *   [x] Redirect the user to the Xendit invoice URL on success.
5.  [ ] **Implement Google Drive Permission Granting Utility:**
    *   [x] Edit `lib/google-drive/driveApiUtils.ts`. **DONE**
    *   [ ] Add a new function `async grantFilePermission(fileId: string, userEmail: string, role: 'reader' | 'writer' = 'reader'): Promise<void>`. **DONE**
    *   [ ] Use the authenticated `drive` API client.
    *   [ ] Call `drive.permissions.create` with the `fileId`, `requestBody: { role: role, type: 'user', emailAddress: userEmail }`, and `fields: 'id'`.
    *   [ ] Add robust error handling (e.g., file not found, invalid email, insufficient permissions for service account).
6.  [ ] **Modify Existing Xendit Webhook Handler:**
    *   [ ] **Target:** `app/api/webhooks/xendit/route.ts` (NOT creating a new route).
    *   [ ] **Security:** Ensure existing Xendit webhook signature verification is robust.
    *   [ ] **Differentiation Logic:** Inside the `invoice.paid` event handler, after fetching the transaction using `external_id`, check the `transaction_type`.
    *   [ ] **Idempotency:** Ensure existing idempotency check (e.g., checking if order/enrollment already exists for the transaction) covers all transaction types or add specific checks for e-commerce.
7.  [ ] **Implement E-commerce Order Creation Logic (within modified Webhook Handler):**
    *   [ ] If `transaction_type` is `SHOPIFY_ECOM`:
        *   Fetch the user ID (`auth.users.id` and `unified_profiles.id`) associated with the confirmed transaction.
        *   Ensure the unified `transactions` record is updated to `paid` (or `completed`).
        *   Create a new record in `ecommerce_orders`, linking `user_id`, `unified_profile_id`, `xendit_payment_id`, and the `transaction_id`.
        *   Retrieve product/variant details from the `transaction.metadata` (specifically `variantId` and `productId`).
        *   For each item in the metadata:
            *   Create a corresponding record in `ecommerce_order_items`, linking to the new `ecommerce_orders.id` and `shopify_products.id` (using `productId` from metadata), storing `price_at_purchase` (from metadata) and `variant_id` (from metadata).
8.  [ ] **Implement Access Granting Logic (within modified Webhook Handler):**
    *   [ ] If `transaction_type` is `SHOPIFY_ECOM`, for each successfully created `ecommerce_order_items` record:
        *   Fetch the corresponding `shopify_products` record using the `productId`.
        *   Get the `google_drive_file_id` from the fetched product record.
        *   Get the user's email address (from the transaction or user profile).
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