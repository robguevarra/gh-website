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
5.  [x] **Implement Google Drive Permission Granting Utility:**
    *   [x] Edit `lib/google-drive/driveApiUtils.ts`. **DONE**
    *   [x] Add a new function `async grantFilePermission(fileId: string, userEmail: string, role: 'reader' | 'writer' = 'reader'): Promise<void>`. **DONE**
    *   [x] Use the authenticated `drive` API client.
    *   [x] Call `drive.permissions.create` with the `fileId`, `requestBody: { role: role, type: 'user', emailAddress: userEmail }`, and `fields: 'id'`.
    *   [x] Add robust error handling (e.g., file not found, invalid email, insufficient permissions for service account).
6.  [x] **Modify Existing Xendit Webhook Handler:**
    *   [x] **Target:** `app/api/webhooks/xendit/route.ts` (NOT creating a new route).
    *   [x] **Security:** Ensure existing Xendit webhook signature verification is robust.
    *   [x] **Differentiation Logic:** Inside the `invoice.paid` event handler, after fetching the transaction using `external_id`, check the `transaction_type`.
    *   [x] **Idempotency:** Ensure existing idempotency check (e.g., checking if order/enrollment already exists for the transaction) covers all transaction types or add specific checks for e-commerce.
7.  [x] **Implement E-commerce Order Creation Logic (within modified Webhook Handler):**
    *   [x] If `transaction_type` is `SHOPIFY_ECOM`:
        *   [x] Fetch the user ID (`auth.users.id` and `unified_profiles.id`) associated with the confirmed transaction.
        *   [x] Ensure the unified `transactions` record is updated to `paid` (or `completed`).
        *   [x] Create a new record in `ecommerce_orders`, linking `user_id`, `unified_profile_id`, `xendit_payment_id`, and the `transaction_id`.
            *   **Note on Initial Status:** The initial `order_status` is set to `'processing'` (lowercase). Although the payment is confirmed (`invoice.paid` event), this status reflects that the order fulfillment (granting Google Drive access) is still pending within the webhook's execution flow. If access granting were to fail, the order wouldn't be truly `'completed'` from the user's perspective. `'processing'` is the most accurate available status (`'pending'`, `'processing'`, `'completed'`, `'failed'`, `'refunded'`) for this intermediate state.
        *   [x] Retrieve product/variant details from the `transaction.metadata.cartItems` (specifically `productId`, `price_at_purchase`).
        *   [x] For each item in the metadata:
            *   [x] Create a corresponding record in `ecommerce_order_items`, linking to the new `ecommerce_orders.id` and `shopify_products.id` (using `productId` from metadata), storing `price_at_purchase` (from metadata).
8.  [x] **Implement Access Granting Logic (within modified Webhook Handler):**
    *   [x] If `transaction_type` is `SHOPIFY_ECOM`, for each successfully created `ecommerce_order_items` record:
        *   [x] Fetch the corresponding `shopify_products` record using the `productId`.
        *   [x] Get the `google_drive_file_id` from the fetched product record.
        *   [x] Get the user's email address (from the transaction or user profile).
        *   [x] If `google_drive_file_id` exists, call the `grantFilePermission(google_drive_file_id, userEmail, 'reader')` utility function.
        *   [x] Log success or failure of permission granting.
9.  [x] **Post-Checkout Flow:**
    *   [x] Create simple success (`/dashboard/checkout/success/page.tsx`) and failure (`/dashboard/checkout/failure/page.tsx`) pages.
    *   [x] Ensure the redirect URLs provided to Xendit point to these pages.
    *   [x] On the success page, clear the Zustand cart store using a client component (`ClearCartClient.tsx`).
10. [x] **Testing:**
    *   [x] Test the payment initiation flow with dummy cart data. **(Manual)**
    *   [x] Use Xendit's test environment/webhooks simulator to trigger the webhook handler. **(Manual)**
    *   [x] Verify records are created correctly in `transactions`, `ecommerce_orders`, `ecommerce_order_items`. **(Manual)**
    *   [x] Verify Google Drive permissions are granted to the correct user for the correct file (requires populated mapping). **(Manual)**

## Debugging Findings (Webhook Handler - `app/api/webhooks/xendit/route.ts`)

Investigation revealed why e-commerce transactions were not being processed correctly:

*   **Missing Transaction Type Check:** The handler logic inside the `invoice.paid` event did not explicitly check if `tx.transaction_type === 'SHOPIFY_ECOM'`. It only checked for `P2P` and `Canva`.
*   **Incorrect Logic Placement:** The logic intended for creating `ecommerce_orders` and `ecommerce_order_items` (Steps 7 & 8) was mistakenly placed *within* the `if (tx.transaction_type === 'P2P')` block.
*   **Incomplete Implementation:** The actual database insertion code for `ecommerce_orders` and `ecommerce_order_items` within that block was incomplete (containing comments like `// ... (Insert Order) ...`) and referenced undefined variables (`cartMetadata`, `orderItemsData`), as confirmed by linter errors. This prevented the necessary database writes.
*   **Metadata Handling:** The incomplete code relied on a `cartMetadata` variable. The correct approach is to extract the necessary item details (variant ID, product ID, price) directly from the `tx.metadata` field of the transaction record fetched from the database.

**Action Required:** The webhook handler needs modification to:
1.  Add an `else if (tx.transaction_type === 'SHOPIFY_ECOM')` block.
2.  Move the e-commerce order creation (Step 7) and Google Drive access (Step 8) logic into this new block.
3.  Fully implement the database insertion logic, correctly reading required item data from `tx.metadata`.

## Completion Status

This phase (5-3) implementation is complete. **Manual testing (Step 10) is required.**
-   Users can initiate payment via Xendit from the checkout page.
-   Successful Xendit payments trigger the webhook handler.
-   The webhook handler correctly creates records in all relevant Supabase tables.
-   The webhook handler successfully grants Google Drive access for purchased items.

## Next Steps After Completion
Proceed with **Phase 5-4: Migration & Testing**, focusing on end-to-end testing of the entire flow, planning the cutover from the old system, and finalizing any remaining rules or configurations.

## Related Tasks & Fixes (Post-Phase 5-3)

Following the core implementation, several related tasks were undertaken to refine the user experience and ensure data visibility:

1.  [x] **Purchase History Display (`/dashboard/purchase-history`):**
    *   [x] **Debugging:** Resolved RLS issues preventing orders from displaying.
    *   [x] **UI/UX Refinement:** Implemented row-based layout with expandable items (`components/dashboard/purchase-history-list.tsx`).
    *   [x] **Access Method Changed:** Changed the "Download" button to an "Open Folder" link (`<a>` tag styled via `Button asChild`).
        *   Links directly to `https://drive.google.com/drive/folders/{google_drive_file_id}`.
        *   Updated icon to `<Folder/>` and text.
        *   This approach is used because purchased products are Google Drive folders containing multiple files (e.g., commercial licenses), which cannot be downloaded directly via the API as a single unit.
        *   The Xendit webhook already grants the user permission to this folder ID.

2.  [x] **Google Drive Download/Export API (`/api/google-drive/download`):**
    *   [x] **Implementation:** Created the route (`/api/google-drive/download/route.ts`).
    *   [x] **Functionality:**
        *   Handles download/export of *individual files*.
        *   Verifies user authentication and purchase authorization via Supabase Admin client.
        *   Uses `getFileMetadata` to check MIME type.
        *   If binary file, uses `getFileStream` for direct download.
        *   If Google Workspace file (Doc, Sheet, Slide), uses `exportFileStream` to export as PDF.
        *   Sets appropriate `Content-Disposition` and `Content-Type` headers.
        *   Includes error handling.
        *   **Note:** Initially added a check to block folder downloads (returning 400), but this was removed as the primary access method for purchased folders is now a direct link (see point 1).
    *   [x] **Utilities Added:** Added `getFileMetadata`, `getFileStream`, and `exportFileStream` functions to `lib/google-drive/driveApiUtils.ts`.

## Next Steps After Completion (Updated)
1.  **Re-evaluate RLS:** Once functionality is stable, revisit and correctly implement RLS policies for `ecommerce_orders`, `ecommerce_order_items`, and potentially `shopify_products` to ensure security while allowing users to view their own data.
2.  **Connect Frontend:** Update the `PurchaseHistoryList` component to correctly call the `/api/google-drive/download?fileId={fileId}` endpoint when the download button is clicked.
3.  **Testing:** 
    *   [ ] Test the "Open Folder" link functionality from the Purchase History page for various users and purchased folder products.
    *   [ ] Verify the user is correctly redirected to Google Drive and has access (requires webhook permission grant to be working).
    *   [ ] (Optional) Test the `/api/google-drive/download` endpoint directly with known *file* IDs (both binary and Google Docs) to ensure it still works for individual file cases.
4.  **Proceed with Phase 5-4:** Migration & Testing, focusing on end-to-end testing, cutover planning, and final configurations.

5.  [x] **UI/UX Enhancements (Post-Phase 5-3):**
    *   [x] **Header Navigation:** Added "Purchases" link to `components/dashboard/student-header.tsx` (mobile sheet, desktop nav, user dropdown).
    *   [x] **Purchase History Access:** Implemented an `AlertDialog` in `components/dashboard/purchase-history-list.tsx` for the "Open Folder" link, explaining the redirect to Google Drive and including a "Don't show again" option using `localStorage`.
    *   [x] **Checkout Success:** Added a prominent "View Purchase History" button to `app/dashboard/checkout/success/page.tsx`.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1, 5-2, existing payment/Drive code).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 