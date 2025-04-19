# Facebook Ads Integration - Phase 4-1: Data Pipeline and Schema

## Task Objective
Establish the foundational database schema and a reliable data ingestion pipeline required to capture Facebook advertising data (campaign/ad metadata, spend, and conversion attributions). This phase focuses solely on getting the necessary data structures and pipelines in place to enable accurate advertising performance analysis in a subsequent phase (Phase 4-5).

## Current State Assessment
- The platform utilizes a unified data model (from Phases 3-0 to 3-2) with tables like `unified_profiles`, `transactions`, and `enrollments`.
- Current user acquisition attribution relies on basic tags (e.g., 'squeeze', 'Canva') captured during data unification, offering limited insight into marketing channel effectiveness.
- There is currently no database schema or automated pipeline to ingest or store data from Facebook Ads.
- Previous plans for dashboard sections related to marketing/advertising (Phase 3-7, 3-9) were deferred in favor of prioritizing this foundational data integration first.

## Future State Goal
1.  **Database Schema:** A dedicated set of normalized tables (`ad_campaigns`, `ad_adsets`, `ad_ads`, `ad_spend`, `ad_attributions`) exist in the Supabase PostgreSQL database, designed according to best practices and ready to store Facebook Ads data.
2.  **Data Pipeline (CAPI):** Facebook Conversion API (CAPI) is implemented server-side to reliably send key user conversion events (PageView, Lead, Purchase) with appropriate user parameters to Facebook for matching and attribution.
3.  **Data Pipeline (Marketing API):** An automated process exists (e.g., scheduled function) to periodically fetch campaign/ad set/ad metadata and spend/performance data from the Facebook Marketing API and store it in the corresponding database tables.
4.  **Attribution Linkage:** A mechanism exists to process CAPI results or leverage Facebook's matching to populate the `ad_attributions` table, linking platform conversions (`transactions`) back to the specific Facebook ad/adset/campaign responsible.
5.  **Foundation Ready:** The database contains foundational ad metadata, spend, and attributed conversion data, ready for analysis and visualization in Phase 4-5.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1.  Data Unification Strategy (Phase 3-0) - Outlined the initial, high-level plan for FB Ads integration and defined the core `unified_profiles`, `transactions` tables.
> 2.  Database Schema Enhancement (Phase 3-1) - Provides details on the structure of tables that `ad_attributions` will link to.
> 3.  Project Context (`ProjectContext.md`) - Defines the overall tech stack (Supabase, Next.js, PostgreSQL) and project goals.
> 4.  Design Context (`designContext.md`) - May be relevant if any admin UI is needed for managing credentials (though unlikely in this phase).
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy (Phase 3-0)
This phase established the core user and transaction tables (`unified_profiles`, `transactions`) that the `ad_attributions` table will reference. It also highlighted the need for future integration points for advertising platforms like Facebook, anticipating schema extensions.

### Strategic Shift to Phase 4
Following the completion of Phase 3-4 (Overview Dashboard), a strategic decision was made to prioritize foundational data integration (Facebook Ads, Shopify) in Phase 4 before building detailed analytics dashboards. This Phase 4-1 directly addresses the Facebook Ads integration component.

## Implementation Plan

### 1. Database Schema Design & Implementation
*Goal: Create the necessary tables to store ad hierarchy, spend, and attribution data.* 
*Best Practice: Use specific data types, clear naming, foreign keys for integrity, and appropriate indexing for performance.* 

- [ ] **Design `ad_campaigns` Table:**
    - Fields: `id` (UUID, PK), `fb_campaign_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `objective` (TEXT), `status` (TEXT), `effective_status` (TEXT), `start_time` (TIMESTAMPTZ), `stop_time` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Index: `fb_campaign_id`.
- [ ] **Design `ad_adsets` Table:**
    - Fields: `id` (UUID, PK), `campaign_id` (UUID, FK to `ad_campaigns.id`), `fb_adset_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `status` (TEXT), `effective_status` (TEXT), `daily_budget` (NUMERIC), `lifetime_budget` (NUMERIC), `targeting_summary` (TEXT), `start_time` (TIMESTAMPTZ), `stop_time` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Indexes: `fb_adset_id`, `campaign_id`.
- [ ] **Design `ad_ads` Table:**
    - Fields: `id` (UUID, PK), `adset_id` (UUID, FK to `ad_adsets.id`), `fb_ad_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `status` (TEXT), `effective_status` (TEXT), `creative_id` (TEXT), `creative_summary` (TEXT), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Indexes: `fb_ad_id`, `adset_id`.
- [ ] **Design `ad_spend` Table:**
    - Fields: `id` (UUID, PK), `date` (DATE, NOT NULL), `campaign_id` (UUID, FK to `ad_campaigns.id`), `adset_id` (UUID, FK to `ad_adsets.id`), `ad_id` (UUID, FK to `ad_ads.id`), `spend` (NUMERIC, NOT NULL), `impressions` (INTEGER), `clicks` (INTEGER), `currency` (TEXT), `created_at` (TIMESTAMPTZ, default now()).
    - Composite Index: `(date, ad_id)` or relevant granularity based on API data.
    - Note: This table stores aggregated daily spend/metrics fetched from the Marketing API.
- [ ] **Design `ad_attributions` Table:**
    - Fields: `id` (UUID, PK), `user_id` (UUID, FK to `unified_profiles.id`, NULLABLE), `transaction_id` (UUID, FK to `transactions.id`, UNIQUE), `campaign_id` (UUID, FK to `ad_campaigns.id`), `adset_id` (UUID, FK to `ad_adsets.id`), `ad_id` (UUID, FK to `ad_ads.id`), `conversion_event` (TEXT, NOT NULL), `event_time` (TIMESTAMPTZ, NOT NULL), `conversion_value` (NUMERIC), `currency` (TEXT), `source_platform` (TEXT, default 'facebook'), `fb_click_id` (TEXT, NULLABLE), `created_at` (TIMESTAMPTZ, default now()).
    - Indexes: `transaction_id`, `user_id`, `campaign_id`, `adset_id`, `ad_id`, `event_time`.
    - Note: Links a specific transaction (our source of truth for purchase) back to the ad components.
- [ ] **Implement Migrations:** Create versioned SQL migration scripts (e.g., using Supabase CLI `migration new`) to create these tables, constraints, and indexes.

### 2. Facebook Conversion API (CAPI) Setup
*Goal: Reliably send server-side events to Facebook for matching and attribution.* 
*Best Practice: Prioritize CAPI over Pixel for accuracy and privacy. Send hashed user data securely.* 

- [ ] **Configure Facebook Assets:** Obtain Facebook Pixel ID and generate a CAPI System User Access Token.
- [ ] **Server-Side Event Implementation:**
    - Choose a suitable library/method for sending server-side HTTP requests (e.g., Node fetch, Python requests within a Supabase Edge Function or backend service).
    - Implement functions to send standard events:
        - `PageView`: Triggered on key page loads (e.g., course page, checkout).
        - `Lead`: (If applicable) Triggered on significant non-purchase conversions (e.g., ebook download form submission).
        - `InitiateCheckout`: Triggered when a user starts the Xendit/Shopify checkout process.
        - `Purchase`: Triggered *after* successful confirmation of a completed transaction in our `transactions` table (for both P2P and Canva).
    - **User Data Parameters:** Include as much *hashed* user data as possible for better matching (email, phone, first/last name, city, state, zip, country, IP address, User-Agent). Follow Facebook's hashing requirements (SHA-256).
    - **Event Parameters:** Include `event_name`, `event_time`, `event_source_url`, `event_id` (unique ID for deduplication), `currency`, `value` (for Purchase), `action_source` ('web').
    - **Cookies:** Include `fbp` (Facebook browser ID) and `fbc` (Facebook click ID) cookies if available on the server (may require passing from client).
- [ ] **Security:** Store CAPI Access Token securely (e.g., Supabase Vault, environment variables). NEVER expose it client-side.
- [ ] **Validation:** Use Facebook's Events Manager testing tool to verify events are received correctly.
- [ ] **Error Handling & Logging:** Implement robust logging for successful sends and detailed error logging for failed requests (e.g., invalid token, malformed data).

### 3. Facebook Marketing API Integration (Metadata & Spend)
*Goal: Periodically fetch campaign structure and spend data to enrich our database.* 
*Best Practice: Use scheduled tasks, handle pagination/rate limits, store credentials securely.* 

- [ ] **Configure Facebook App:** Create a Facebook App, request necessary Marketing API permissions (e.g., `ads_read`). Generate a non-expiring System User Access Token or manage User Tokens.
- [ ] **Develop Fetching Script/Function:**
    - Create a scheduled task (e.g., daily Supabase Edge Function via `pg_cron`, or external service).
    - Implement logic to call Marketing API endpoints to fetch:
        - Active/paused Campaigns (`/act_{ad_account_id}/campaigns`)
        - Active/paused Ad Sets (`/act_{ad_account_id}/adsets`)
        - Active/paused Ads (`/act_{ad_account_id}/ads`)
        - Daily Spend/Performance Insights (`/act_{ad_account_id}/insights` with `level=ad`, `time_increment=1`, fields like `spend`, `impressions`, `clicks`, `campaign_id`, `adset_id`, `ad_id`).
    - **Pagination:** Handle paginated responses from the API.
    - **Rate Limiting:** Implement basic delays or checks to avoid hitting API rate limits.
    - **Error Handling:** Log API errors and implement retry logic if appropriate.
- [ ] **Database Upsert Logic:**
    - For fetched campaigns, ad sets, ads: `UPSERT` into `ad_campaigns`, `ad_adsets`, `ad_ads` tables based on `fb_campaign_id`, `fb_adset_id`, `fb_ad_id`, updating names, statuses, etc.
    - For fetched insights: `UPSERT` into `ad_spend` table based on `date` and `ad_id` (or relevant granularity).
- [ ] **Security:** Store Marketing API Access Token securely.

### 4. Attribution Data Processing Logic
*Goal: Link successful `Purchase` events (sent via CAPI) to the corresponding ad identifiers and store in `ad_attributions`.* 
*Best Practice: Focus on reliable matching between CAPI events and internal transactions.* 

- [ ] **Identify Conversion Source:** Determine how to get the associated `campaign_id`, `adset_id`, `ad_id` for a conversion. This might involve:
    - Parsing the `fbc` (click ID) cookie passed with the CAPI event (requires complex parsing logic or potentially another API call).
    - Relying on Facebook's matching via the user parameters sent.
    - Potentially querying the Marketing API based on the user/time if click IDs aren't available (less reliable).
- [ ] **Develop Processing Logic:**
    - Trigger this logic after a `Purchase` event is successfully sent via CAPI *and* the corresponding `transactions` record is confirmed as `completed`.
    - Match the CAPI event (e.g., using `event_id` or user/time proximity) to the `transactions` record.
    - Extract or look up the relevant Facebook ad IDs (campaign, adset, ad).
    - Look up the internal UUIDs for these ads/adsets/campaigns in the `ad_` tables.
    - `INSERT` a new record into `ad_attributions`, linking `transaction_id` to the internal ad UUIDs, storing `event_time`, `conversion_event`='Purchase', `conversion_value`, `currency`.
- [ ] **Error Handling:** Log cases where attribution data cannot be found or linked.

### 5. Initial Data Backfill & Validation
*Goal: Populate historical data where possible and verify the pipeline is working.* 

- [ ] **Backfill Metadata/Spend:** Run the Marketing API fetching script (Step 3) to populate `ad_` tables with historical data for a defined period (e.g., 90 days).
- [ ] **Monitor CAPI Events:** Use Facebook Events Manager to confirm `PageView`, `InitiateCheckout`, `Purchase` events are being received and matched.
- [ ] **Validate `ad_attributions`:** After some conversions have occurred post-CAPI implementation, run queries to verify that records are being created in `ad_attributions` and correctly linked to `transactions` and the `ad_` hierarchy tables.
- [ ] **Check Foreign Keys:** Ensure all FK relationships in the `ad_` tables are valid.

## Technical Considerations

### Data Privacy & Compliance
- **Hashing:** Strictly adhere to Facebook's requirements for hashing PII sent via CAPI (SHA-256).
- **Consent:** Ensure user consent mechanisms are in place (e.g., cookie banner) before firing pixels/sending CAPI data.
- **Transparency:** Update privacy policy regarding data sharing with Facebook for advertising purposes.

### Authentication & Security
- **Token Management:** Use System User tokens where possible for longevity. Store all tokens securely using Supabase Vault or equivalent.
- **API Scopes:** Request only the minimum necessary API permissions.

### Attribution Model Nuances
- **Focus:** This phase focuses on *capturing* the data needed for attribution. The specific model (e.g., last click) applied during *reporting* will be defined in Phase 4-5.
- **Discrepancies:** Be prepared for potential discrepancies between data attributed in this system and Facebook Ads Manager reporting due to different models, windows, and cross-device tracking.

### Scalability & Performance
- **Indexing:** Ensure appropriate database indexes are created on FKs, timestamps, and IDs used in joins or WHERE clauses.
- **Batching:** Use batching for Marketing API fetches and database inserts/upserts where feasible.
- **Async Processing:** Consider asynchronous processing for CAPI event sending and attribution logic to avoid blocking user requests.

## Completion Status

This phase is **Not Started**.

Challenges anticipated:
- Technical complexity of correctly implementing server-side CAPI with user data hashing.
- Debugging event matching issues within Facebook Events Manager.
- Reliably extracting correct ad attribution identifiers (`fbc` parsing or API lookups).
- Handling Facebook API rate limits, errors, and potential changes.

## Next Steps After Completion
With the Facebook Ads data pipeline and schema established, the next logical step is Phase 4-2: Shopify Data Integration, focusing on bringing in sales and customer data from Shopify.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 