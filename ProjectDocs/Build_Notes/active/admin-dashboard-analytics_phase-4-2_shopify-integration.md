# Shopify Integration - Phase 4-2: Data Pipeline and Schema

## Task Objective
Establish the foundational database schema and a reliable data ingestion pipeline required to capture Shopify data (customers, products, orders). This phase focuses solely on getting the necessary data structures and pipelines in place to provide a complete view of revenue and customer interactions, enabling accurate analysis in subsequent phases (Phase 4-4, 4-5).

## Current State Assessment
- The platform utilizes a unified data model (Phases 3-0 to 3-2) with `unified_profiles`, `transactions` (currently from Xendit), and `enrollments`.
- Phase 4-1 is focused on integrating Facebook Ads data, creating parallel infrastructure for advertising analytics.
- Sales and customer data originating from a potential Shopify store are currently not captured or integrated into the unified database schema.
- Existing Revenue and Enrollment analytics would be incomplete without incorporating Shopify data.

## Future State Goal
1.  **Database Schema:** A dedicated set of normalized tables (`shopify_products`, `shopify_customers`, `shopify_orders`, `shopify_order_items`) exist in the Supabase PostgreSQL database, designed according to best practices and ready to store core Shopify data.
2.  **Data Pipeline (Webhooks):** Shopify webhooks are configured and reliable server-side handlers (e.g., Supabase Edge Functions) are implemented to process near real-time events for orders, customers, and products.
3.  **Data Pipeline (API Polling):** An automated process exists (e.g., scheduled function) to periodically fetch or reconcile data from the Shopify Admin API, useful for backfills, fetching product catalogs, or handling missed webhooks.
4.  **User Linking:** Logic is implemented to reliably match and link `shopify_customers` to existing `unified_profiles` based on email or other identifiers.
5.  **Data Consistency:** Shopify data (orders, customers) is consistently transformed, normalized (timestamps, currency, status), and stored in the local database, linked appropriately to the unified user profile.
6.  **Foundation Ready:** The database contains foundational Shopify product, customer, and order data, ready to be incorporated into Revenue (Phase 4-4) and potentially Marketing/Enrollment (Phase 4-3, 4-5) analytics.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification Strategy (Phase 3-0) - Outlined the initial plan for Shopify integration and defined `unified_profiles`.
> 2.  Database Schema Enhancement (Phase 3-1) - Details the structure of `unified_profiles` that `shopify_customers` will link to.
> 3.  Facebook Ads Integration (Phase 4-1) - Provides context on the parallel data integration effort and potentially shared infrastructure (e.g., Supabase functions for pipelines).
> 4.  Project Context (`ProjectContext.md`) - Defines tech stack and goals.
> 5.  Design Context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy (Phase 3-0)
This phase anticipated the need for future Shopify integration to capture a complete view of customer interactions and revenue streams, planning for schema extensions.

### Strategic Shift to Phase 4
This phase (4-2) is part of the prioritized effort in Phase 4 to integrate key external data sources (Facebook Ads, Shopify) before building detailed analytics dashboards.

## Implementation Plan

### 1. Database Schema Design & Implementation
*Goal: Create necessary tables to store core Shopify entities.* 
*Best Practice: Normalize data, use specific types, clear naming, FKs, and indexing.* 

- [ ] **Design `shopify_products` Table:**
    - Fields: `id` (UUID, PK), `shopify_product_id` (BIGINT, UNIQUE, NOT NULL), `title` (TEXT), `handle` (TEXT), `product_type` (TEXT), `status` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ), `published_at` (TIMESTAMPTZ), `vendor` (TEXT), `tags` (TEXT[]).
    - Index: `shopify_product_id`, `handle`.
    - Note: Stores core product catalog information.
- [ ] **Design `shopify_product_variants` Table:**
    - Fields: `id` (UUID, PK), `shopify_variant_id` (BIGINT, UNIQUE, NOT NULL), `product_id` (UUID, FK to `shopify_products.id`), `title` (TEXT), `sku` (TEXT), `price` (NUMERIC), `compare_at_price` (NUMERIC), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
    - Index: `shopify_variant_id`, `product_id`, `sku`.
- [ ] **Design `shopify_customers` Table:**
    - Fields: `id` (UUID, PK), `unified_profile_id` (UUID, FK to `unified_profiles.id`, NULLABLE), `shopify_customer_id` (BIGINT, UNIQUE, NOT NULL), `email` (TEXT), `first_name` (TEXT), `last_name` (TEXT), `phone` (TEXT), `accepts_marketing` (BOOLEAN), `orders_count` (INTEGER), `total_spent` (NUMERIC), `state` (TEXT), `tags` (TEXT[]), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
    - Indexes: `shopify_customer_id`, `unified_profile_id`, `email`.
    - Note: Links Shopify customer data to our central user profile.
- [ ] **Design `shopify_orders` Table:**
    - Fields: `id` (UUID, PK), `customer_id` (UUID, FK to `shopify_customers.id`, NULLABLE), `shopify_order_id` (BIGINT, UNIQUE, NOT NULL), `order_number` (TEXT), `email` (TEXT), `phone` (TEXT), `total_price` (NUMERIC), `subtotal_price` (NUMERIC), `total_tax` (NUMERIC), `total_discounts` (NUMERIC), `currency` (TEXT), `financial_status` (TEXT), `fulfillment_status` (TEXT, NULLABLE), `landing_site` (TEXT), `referring_site` (TEXT), `source_name` (TEXT), `tags` (TEXT[]), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ), `processed_at` (TIMESTAMPTZ), `closed_at` (TIMESTAMPTZ, NULLABLE), `cancelled_at` (TIMESTAMPTZ, NULLABLE).
    - Indexes: `shopify_order_id`, `customer_id`, `email`, `financial_status`, `created_at`.
- [ ] **Design `shopify_order_items` Table:**
    - Fields: `id` (UUID, PK), `order_id` (UUID, FK to `shopify_orders.id`), `shopify_line_item_id` (BIGINT, UNIQUE, NOT NULL), `product_id` (UUID, FK to `shopify_products.id`, NULLABLE), `variant_id` (UUID, FK to `shopify_product_variants.id`, NULLABLE), `shopify_product_id` (BIGINT), `shopify_variant_id` (BIGINT), `title` (TEXT), `variant_title` (TEXT), `sku` (TEXT), `quantity` (INTEGER), `price` (NUMERIC), `total_discount` (NUMERIC), `vendor` (TEXT).
    - Indexes: `shopify_line_item_id`, `order_id`, `product_id`, `variant_id`.
- [ ] **Implement Migrations:** Create versioned SQL migration scripts to create these tables, constraints, and indexes.

### 2. Shopify App & API Configuration
*Goal: Securely connect to the Shopify store to receive webhooks and make API calls.* 
*Best Practice: Use a private app, grant minimal necessary permissions, store credentials securely.* 

- [ ] **Create Private Shopify App:** In the Shopify Admin, create a private app for this integration.
- [ ] **Configure API Scopes:** Grant necessary permissions (e.g., `read_orders`, `read_customers`, `read_products`, potentially `write_webhooks`). Follow the principle of least privilege.
- [ ] **Obtain Credentials:** Securely copy the API Key, API Secret Key, and Admin API Access Token.
- [ ] **Store Credentials Securely:** Store these credentials in Supabase Vault or environment variables, accessible only by the backend functions/services.

### 3. Shopify Webhook Implementation
*Goal: Process key Shopify events in near real-time.* 
*Best Practice: Use secure webhook handlers, process events asynchronously, handle retries.* 

- [ ] **Register Webhooks:** Programmatically (via API) or manually register webhooks for essential topics:
    - `orders/create`, `orders/updated`, `orders/paid`, `orders/cancelled`
    - `customers/create`, `customers/update`
    - `products/create`, `products/update` (if needed for near real-time catalog sync)
- [ ] **Develop Webhook Handler Function(s):**
    - Create Supabase Edge Function(s) or other serverless functions to receive webhook POST requests.
    - **Verify Webhook:** Implement Shopify webhook verification using the shared secret to ensure requests are genuinely from Shopify.
    - **Parse Payload:** Parse the incoming JSON payload for the specific event.
    - **Process Asynchronously (Recommended):** Queue the payload for background processing (e.g., using Supabase pg_net or a dedicated queue service) to avoid timing out the webhook response and handle potential processing failures gracefully.
    - **Data Upsert Logic:** Implement logic within the handler (or background processor) to:
        - Extract relevant data from the payload.
        - Normalize data (e.g., timestamps to UTC).
        - Match/Link `shopify_customers` to `unified_profiles` via email.
        - `UPSERT` data into the corresponding `shopify_` tables based on Shopify IDs.
- [ ] **Error Handling & Logging:** Log successful processing and any errors encountered during verification, parsing, or database operations.
- [ ] **Idempotency:** Ensure processing logic is idempotent (handling duplicate webhooks gracefully).

### 4. Shopify Admin API Polling (Optional - for Backfill/Reconciliation)
*Goal: Periodically fetch data for initial backfill or to reconcile potential missed webhooks.* 
*Best Practice: Use scheduled tasks, respect API limits, fetch only necessary data.* 

- [ ] **Develop Fetching Script/Function (Optional):**
    - Create a scheduled task (e.g., Supabase Edge Function via `pg_cron`).
    - Implement logic to call Shopify Admin API endpoints (using stored credentials) to fetch:
        - Historical orders (e.g., `GET /admin/api/2023-10/orders.json`)
        - Full product catalog (`GET /admin/api/2023-10/products.json`)
    - **Filtering:** Use parameters like `created_at_min`, `updated_at_min` to fetch only new/updated records since the last run.
    - **Pagination:** Handle Shopify's cursor-based or page-based pagination.
    - **Rate Limiting:** Respect Shopify API call limits (implement delays if necessary).
- [ ] **Database Upsert Logic:** Implement `UPSERT` logic similar to the webhook handler to add/update data in the local database.

### 5. User Profile Linking Logic
*Goal: Connect Shopify customer records to the central `unified_profiles` table.* 
*Best Practice: Prioritize email matching, handle potential conflicts.* 

- [ ] **Implement Matching Function:** When processing a `shopify_customers` record (via webhook or API):
    - Attempt to find a matching `unified_profiles` record using the normalized `email`.
    - If a match is found, store the `unified_profiles.id` in `shopify_customers.unified_profile_id`.
    - If no match, the `unified_profile_id` remains NULL initially. Consider a separate process or flag for creating new `unified_profiles` based on Shopify data if desired (requires careful consideration of duplicate prevention with other sources like Xendit/Systemeio).
- [ ] **Conflict Handling:** Define strategy if a Shopify email matches multiple `unified_profiles` (shouldn't happen if `unified_profiles.email` is UNIQUE) or if merging data is needed.

### 6. Initial Data Backfill & Validation
*Goal: Populate historical data and verify the pipeline.* 

- [ ] **Run Backfill Script:** If implemented (Step 4), run the script to fetch historical Shopify orders, customers, and products for a defined period.
- [ ] **Test Webhooks:** Create/update test orders, customers, and products in Shopify and verify that the corresponding webhooks are received, processed, and data appears correctly in the Supabase tables.
- [ ] **Validate Data:** Run queries to check data integrity:
    - Row counts between Shopify (via API) and local tables.
    - Correct linking between `shopify_orders`, `shopify_order_items`, `shopify_customers`, `shopify_products`.
    - Successful linking of `shopify_customers` to `unified_profiles` where expected.
- [ ] **Check Foreign Keys:** Ensure all FK relationships are valid.

## Technical Considerations

### API Limits & Reliability
- **Shopify API Limits:** Be aware of and respect Shopify's Admin API rate limits (leaky bucket algorithm). Implement appropriate delays or use libraries that handle retries.
- **Webhook Reliability:** While generally reliable, webhooks can occasionally fail or be delayed. Consider implementing reconciliation logic (using API polling) if near-perfect data synchronicity is critical.
- **Webhook Security:** Always verify webhook signatures to prevent processing malicious requests.

### Data Consistency & Normalization
- **Timestamps:** Ensure all Shopify timestamps are consistently converted and stored in UTC (TIMESTAMPTZ) in the database.
- **Currency:** Store currency codes alongside monetary values. Handle multiple currencies if applicable.
- **Status Mapping:** Understand and potentially normalize Shopify status fields (e.g., `financial_status`, `fulfillment_status`) if needed for consistent reporting across different sources.

### Scalability
- **Asynchronous Processing:** Use background jobs/queues for webhook processing to handle bursts of events and prevent timeouts.
- **Database Performance:** Ensure efficient indexing on `shopify_` tables, especially on IDs used for lookups and foreign keys.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Handling Shopify API rate limits during backfills or high volume periods.
- Ensuring robust and secure webhook verification and processing.
- Reliably matching Shopify customers to existing unified profiles, especially if emails differ slightly.
- Managing potential data discrepancies between webhook events and API polling.

## Next Steps After Completion
With both Facebook Ads (Phase 4-1) and Shopify (Phase 4-2) data pipelines established, the subsequent phases will focus on building the analytics dashboards using this newly integrated data: Phase 4-3 (Enrollment Analytics), Phase 4-4 (Revenue Analytics), and Phase 4-5 (Marketing & Advertising Performance).

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4, Phase 4-1).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 