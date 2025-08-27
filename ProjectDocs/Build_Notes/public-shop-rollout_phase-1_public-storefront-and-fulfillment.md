# Public Shop Rollout — Phase 1: Public Storefront and Fulfillment

## Task Objective
Create a public-facing shop (no login required) that lists selected Shopify products, enables a simple checkout (lead capture → Xendit invoice), and delivers purchased files by email using Google Drive links. Reuse our existing student-store infrastructure where practical while keeping the public flow lightweight, SEO-friendly, and standards-compliant.

## Current State Assessment
- Shopify sync: A cron job already syncs Shopify products to our `shopify_products` tables every 5 minutes. Tags and product metadata are available.
- Student-only store: The dashboard store uses Zustand, user context, and server actions; it has robust components (e.g., `CategoryNavigation`, product cards).
- Payment flows: We use Xendit invoice creation via `createPaymentIntent` (course/ebook) and `createPublicSalePaymentIntent` (public sale).
- Lead capture: `/api/leads/capture` records pre-payment leads with UTM support.
- Fulfillment: Xendit webhook sends transactional emails and Drive links; we have `public-sale-handler.ts` and student store email logic already working.
- Data model: Store data lives in `shopify_ecom`/`shopify_products` and related variant/collection tables.

## Future State Goal
- A public storefront at `/shop` (SSR) listing only products tagged for public visibility.
- Product detail pages `/shop/product/[handle]` (SSR) with a simple checkout form (name, email, phone).
- Checkout: lead capture + invoice creation → redirect to Xendit.
- Fulfillment: webhook-driven email delivery with Google Drive link per product.
- Reuse existing visual components, add small UX touches (trust indicators, skeletons, SEO/meta) with industry-standard optimizations.

## Implementation Plan

1) Visibility & Data Readiness
   - [ ] Define and standardize a Shopify tag for public visibility (e.g., `public-store`).
   - [ ] Confirm cron sync persists Shopify tags into `shopify_products.tags` and product status (published/active) fields.
   - [ ] Ensure each public product has a valid `google_drive_file_id` (folder) in `shopify_products`.
   - [ ] Use `updateProductDriveId` flow to backfill any missing Drive IDs.
   - [ ] Decide on `productType` for lead capture: use `SHOPIFY_ECOM` (preferred) to align with existing tables and flows.
   - [ ] If needed, extend `/api/leads/capture` validation to accept `SHOPIFY_ECOM` consistently.

2) Handler Strategy (Webhook Fulfillment)
   - [ ] Recommendation: Extend `public-sale-handler.ts` to be product-agnostic and handle `SHOPIFY_ECOM` gracefully, instead of creating a separate handler. This avoids fragmentation and reuses proven code paths.
   - [ ] Internally route by metadata/product type: look up product by `product_code` (handle/sku) → fetch `shopify_products.google_drive_file_id` → send a generic "Digital Product Delivery" email (or product-specific template if configured).
   - [ ] Keep idempotency and error handling consistent with current webhook.
   - [ ] Fallback behavior: if Drive ID is missing, send a helpful support email and log a warning for follow-up.

3) Public Storefront (SSR-first)
   - [ ] `app/shop/page.tsx` (convert from Coming Soon):
        - [ ] Server fetch products with tag `public-store` only, plus optional filters `q`, `collection`.
        - [ ] Reuse `CategoryNavigation` and card/grid components where they don’t assume auth/wishlist.
        - [ ] Add SEO meta (title/description, OG tags), image optimization, and caching (e.g., revalidate ~60s).
        - [ ] Client interactivity limited to search/filter controls; defer heavy client state.
   - [ ] `app/shop/product/[handle]/page.tsx` (new):
        - [ ] SSR details page: images, price (first variant price), description, features.
        - [ ] Reuse visuals (badges, buttons), add trust indicators (payment provider, email delivery note).
        - [ ] CTA opens a minimal client form for checkout.

4) Public Checkout (Client Form)
   - [ ] Reuse the `canva-ebook`/`specialsale` pattern:
        - [ ] Validate fields (first name, last name, email, phone).
        - [ ] POST to `/api/leads/capture` with `productType: 'SHOPIFY_ECOM'`, UTM data, and metadata including `product_id`, `product_code` (handle), etc.
        - [ ] Call `createPublicSalePaymentIntent` with `amount`, `currency`, `productCode`, `productName`, and metadata.
        - [ ] Redirect to `invoice_url` on success.
   - [ ] Keep UI consistent with our brand, reuse Button/Card components.
   - [ ] Consider optional FB CAPI `InitiateCheckout` event parity with `p2p-order-client` (non-blocking).

5) Webhook Fulfillment & Email
   - [ ] In Xendit webhook, route public store payments to the unified handler.
   - [ ] Handler: retrieve product via `product_code` and send email using existing delivery system.
   - [ ] Default to a generic "Public Digital Delivery" template with variables: `first_name`, `product_name`, `download_link` (Drive folder), `order_number`, `support_email`.
   - [ ] For products with custom templates (e.g., `teacher_gift_set`), keep specific branches.
   - [ ] Ensure `payment-success` page displays items and Drive access button when applicable.

6) Observability, Performance, and Security
   - [ ] Add structured logs for: lead capture, invoice creation, webhook receipt, email send result.
   - [ ] Rate-limit `/api/leads/capture` and validate inputs (already exists; verify limits in place).
   - [ ] Cache SSR lists/detail with short revalidation windows (e.g., 60–300s) to balance freshness with performance.
   - [ ] Optimize images via Next/Image; defer non-critical scripts.
   - [ ] Confirm idempotency keys in webhook to avoid duplicate emails.

7) QA & Rollout
   - [ ] Pilot with 1–2 tagged public products.
   - [ ] Test flows end-to-end:
        - [ ] Product visible on `/shop` and detail page.
        - [ ] Lead captured with UTM params.
        - [ ] Xendit invoice created and redirect works.
        - [ ] Webhook transitions to PAID → email delivered with correct Drive link.
        - [ ] Success page displays purchased items and access buttons.
   - [ ] Validate SEO (title/meta/OG) and lighthouse performance.
   - [ ] Monitor logs for 24–48 hours; confirm no duplicate sends or missing links.

## Decisions & Rationale
- **Handler choice:** Extend `public-sale-handler.ts` into a unified delivery strategy rather than introducing a separate handler. This keeps the integration surface small, maximizes reuse of our proven logic, and still supports product-specific branching via metadata (e.g., `product_code`). If later we support additional providers/flows, we can extract internal strategy functions (e.g., `resolveDeliveryTemplate`, `resolveDownloadLink`) without changing the webhook entry point.
- **ProductType:** Use `SHOPIFY_ECOM` for public-store lead capture to align with our tables and analytics. We avoid proliferation of types and reduce maintenance overhead.
- **Data source:** SSR fetches directly from `shopify_products` (with tag filter) for public pages to avoid Zustand/auth coupling. Student dashboard store continues using Zustand.

## Testing Strategy
- Manual sandbox tests for Xendit invoice → webhook → email delivery.
- Verify email template rendering (desktop/mobile) and Drive link permission works across accounts.
- Validate UTM parameters present from lead → invoice metadata → webhook logs.
- Confirm idempotency by re-sending webhook events safely (no duplicate emails).

## Notes & Follow-ups
- Consider a small admin utility view to inspect `google_drive_file_id` completeness and fix missing IDs quickly.
- If Shopify tags/collections change frequently, add a server-side cache layer to stabilize public listings between sync cycles.
- Later phases can add wishlist/notify features for public shoppers (requires light auth or email-only subscribe).

---

### Progress Log (Append-only)
- 2025-08-15: Drafted Phase 1 plan. Pending decision confirmation on handler strategy and `SHOPIFY_ECOM` standardization.



