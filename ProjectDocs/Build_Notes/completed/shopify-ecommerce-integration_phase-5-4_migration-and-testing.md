# Shopify E-commerce Integration - Phase 5-4: Migration & Testing

## Task Objective
Conduct comprehensive end-to-end testing of the new members-only e-commerce flow, plan and execute the migration/cutover from the old password-protected Shopify store access method, and finalize any remaining configurations or visibility rules.

## Current State Assessment
-   Phase 5-1 (Backend Setup), 5-2 (Frontend Display/Cart), and 5-3 (Checkout/Payment/Access Granting) are assumed to be complete.
-   The new integrated storefront exists within the dashboard (`/dashboard/store`).
-   Members can browse products, add to cart, checkout using Xendit, and successful payments create orders (`ecommerce_orders`/`items`, `transactions`) and grant Google Drive access.
-   A legacy password-protected Shopify store page might still exist or be accessible.
-   The mapping between `shopify_products.google_drive_file_id` and actual Drive files is assumed to be complete (as a prerequisite for testing Phase 5-3).
-   The "Resources" section of the dashboard might not yet fully integrate displaying access based on the new `ecommerce_orders` table.

## Future State Goal
1.  **Tested Functionality:** The entire e-commerce flow (Product View -> Add to Cart -> Checkout -> Xendit Payment -> Order Creation -> Drive Access Granted) is thoroughly tested and confirmed working correctly in a staging/production-like environment.
2.  **Unified Resource Display:** The dashboard's "My Resources" or equivalent section correctly displays access to digital products based on *both* historical Shopify orders (`shopify_orders`, requiring a lookup mechanism) and new orders (`ecommerce_orders`), linking users to the correct Google Drive files.
3.  **Legacy System Decommissioned:** Access to the old password-protected Shopify store page/mechanism is disabled or removed.
4.  **Smooth Cutover:** A clear plan is defined and executed for switching users over to the new integrated system.
5.  **Finalized Configuration:** All necessary environment variables, webhook configurations, and access control rules are finalized and deployed.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Phase 5-0: Strategy & Architecture - Defines the migration goal.
> 2.  Phase 5-1, 5-2, 5-3: Implementation details of the system being tested.
> 3.  Phase 4-2: Shopify Integration - Details of the `shopify_orders` table (for historical access checks).
> 4.  Google Drive Integration Build Notes - Details of Drive access/viewing components.
> 5.  Project Context (`ProjectContext.md`), Design Context (`designContext.md`), Build Notes Guidelines (`build-notes-guidelines.md`).
>
> This ensures consistency and alignment with project goals and standards.

## Implementation Plan (Phase 5-4)

1.  [ ] **Define End-to-End Test Cases:**
    *   [ ] **Product Sync:** Verify new/updated products in Shopify appear correctly in the dashboard store (including images).
    *   [ ] **Product Display:** Verify only member-tagged products show. Verify all details (title, image, price) are correct.
    *   [ ] **Cart Functionality:** Add single/multiple items, verify cart indicator, view cart, remove items, check total price, verify persistence.
    *   [ ] **Checkout Initiation:** Proceed to checkout, verify order summary, initiate Xendit payment.
    *   [ ] **Xendit Payment (Test Mode):** Complete successful payment, complete failed payment.
    *   [ ] **Webhook Processing (Success):** Verify webhook received, signature verified, records created in `transactions`, `ecommerce_orders`, `ecommerce_order_items` with correct details (user ID, product ID, amounts).
    *   [ ] **Google Drive Access (Success):** Verify the correct user email receives 'reader' permission on the correct Google Drive file associated with the purchased product ID.
    *   [ ] **Webhook Processing (Failure):** Verify failed payment webhook doesn't create orders/grant access.
    *   [ ] **Idempotency:** Send duplicate success webhooks and verify no duplicate orders are created.
    *   [ ] **Post-Checkout Redirects:** Verify user lands on correct success/failure pages.
    *   [ ] **Resource Access Display (Post-Purchase):** Verify the newly purchased item appears correctly in the user's "My Resources" section, linking to the Drive file.
2.  [ ] **Implement Historical Purchase Access Logic:**
    *   [ ] Modify the data fetching logic for the "My Resources" section.
    *   [ ] In addition to checking `ecommerce_orders`, implement logic to check the *historical* `shopify_orders` table (from Phase 4-2).
    *   [ ] This requires linking `shopify_orders` -> `shopify_order_items` -> `shopify_products` (using `variant_id` or `product_id` from the item) -> `google_drive_file_id`.
    *   [ ] The query needs to effectively find all `google_drive_file_id`s associated with products purchased by the current user across *both* `ecommerce_orders` and historical `shopify_orders`.
    *   [ ] Ensure this combined list of accessible Drive files/folders is used to render the resource links.
3.  [ ] **Execute Test Plan:**
    *   [ ] Perform all defined E2E test cases in a suitable testing environment.
    *   [ ] Document results, track bugs, and perform necessary fixes.
    *   [ ] Pay special attention to edge cases (e.g., products without Drive mappings, user email mismatches, Xendit API errors).
4.  [ ] **Plan Cutover Strategy:**
    *   [ ] **Communication:** Plan how to inform members about the new store location within their dashboard.
    *   [ ] **Timing:** Choose a low-traffic period for the switch.
    *   [ ] **Steps:**
        *   Deploy all finalized code (Phases 5-1 to 5-4) to production.
        *   Verify production environment variables (Xendit keys, Drive credentials, Supabase keys) are correct.
        *   Verify production Xendit webhooks are configured and pointing to the correct production URL.
        *   Update any internal links/navigation pointing to the old Shopify store page.
        *   Disable access to the old password-protected Shopify store page (e.g., remove link, unpublish page, change password).
        *   Monitor the new system closely post-launch (logs, error tracking, user feedback).
5.  [ ] **Final Configuration Checks:**
    *   [ ] Review all related environment variables for accuracy.
    *   [ ] Confirm Xendit webhook configuration (URL, events, secret).
    *   [ ] Confirm Shopify webhook configuration (if used for product sync).
    *   [ ] Review Supabase RLS policies on new tables (`ecommerce_orders`, `ecommerce_order_items`).
6.  [ ] **Execute Cutover:**
    *   [ ] Perform the steps defined in the cutover strategy.
7.  [ ] **Post-Launch Monitoring:**
    *   [ ] Actively monitor application logs (especially webhook handlers, payment initiation, Drive API calls).
    *   [ ] Monitor error tracking services.
    *   [ ] Be prepared to address any immediate user-reported issues.

## Completion Status

This phase (5-4), and therefore Phase 5 overall, is complete when:
-   The new e-commerce flow is thoroughly tested and stable.
-   The "My Resources" section correctly reflects access from both historical and new purchases.
-   The cutover to the new system is complete, and the old mechanism is decommissioned.
-   The system is stable in production.

## Next Steps After Completion
-   Archive the Phase 5 build notes (`mv ProjectDocs/Build_Notes/active/shopify-ecommerce-integration_phase-5-* ProjectDocs/Build_Notes/completed/`).
-   Monitor performance and user feedback of the new e-commerce system.
-   Plan future enhancements (e.g., public-facing store, advanced features).

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 5-0, 5-1, 5-2, 5-3).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 