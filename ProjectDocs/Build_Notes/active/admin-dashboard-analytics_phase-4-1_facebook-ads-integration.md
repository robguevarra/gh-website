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

- [x] **Design `ad_campaigns` Table:**
    - Fields: `id` (UUID, PK), `fb_campaign_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `objective` (TEXT), `status` (TEXT), `effective_status` (TEXT), `start_time` (TIMESTAMPTZ), `stop_time` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Index: `fb_campaign_id`.
- [x] **Design `ad_adsets` Table:**
    - Fields: `id` (UUID, PK), `campaign_id` (UUID, FK to `ad_campaigns.id`), `fb_adset_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `status` (TEXT), `effective_status` (TEXT), `daily_budget` (NUMERIC), `lifetime_budget` (NUMERIC), `targeting_summary` (TEXT), `start_time` (TIMESTAMPTZ), `stop_time` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Indexes: `fb_adset_id`, `campaign_id`.
- [x] **Design `ad_ads` Table:**
    - Fields: `id` (UUID, PK), `adset_id` (UUID, FK to `ad_adsets.id`), `fb_ad_id` (TEXT, UNIQUE, NOT NULL), `name` (TEXT), `status` (TEXT), `effective_status` (TEXT), `creative_id` (TEXT), `creative_summary` (TEXT), `created_at` (TIMESTAMPTZ, default now()), `updated_at` (TIMESTAMPTZ, default now()).
    - Indexes: `fb_ad_id`, `adset_id`.
- [x] **Design `ad_spend` Table:**
    - Fields: `id` (UUID, PK), `date` (DATE, NOT NULL), `campaign_id` (UUID, FK to `ad_campaigns.id`), `adset_id` (UUID, FK to `ad_adsets.id`), `ad_id` (UUID, FK to `ad_ads.id`), `spend` (NUMERIC, NOT NULL), `impressions` (INTEGER), `clicks` (INTEGER), `currency` (TEXT), `created_at` (TIMESTAMPTZ, default now()).
    - Composite Index: `(date, ad_id)` or relevant granularity based on API data.
    - Note: This table stores aggregated daily spend/metrics fetched from the Marketing API.
- [x] **Design `ad_attributions` Table:**
    - Fields: `id` (UUID, PK), `user_id` (UUID, FK to `unified_profiles.id`, NULLABLE), `transaction_id` (UUID, FK to `transactions.id`, UNIQUE), `campaign_id` (UUID, FK to `ad_campaigns.id`), `adset_id` (UUID, FK to `ad_adsets.id`), `ad_id` (UUID, FK to `ad_ads.id`), `conversion_event` (TEXT, NOT NULL), `event_time` (TIMESTAMPTZ, NOT NULL), `conversion_value` (NUMERIC), `currency` (TEXT), `source_platform` (TEXT, default 'facebook'), `fb_click_id` (TEXT, NULLABLE), `created_at` (TIMESTAMPTZ, default now()).
    - Indexes: `transaction_id`, `user_id`, `campaign_id`, `adset_id`, `ad_id`, `event_time`.
    - Note: Links a specific transaction (our source of truth for purchase) back to the ad components.
- [x] **Implement Migrations:** Create versioned SQL migration scripts (e.g., using Supabase CLI `migration new`) to create these tables, constraints, and indexes.

### 2. Facebook Conversion API (CAPI) Setup
*Goal: Reliably send server-side events from our website to Facebook for matching and attribution.*
*Best Practice: Prioritize CAPI over Pixel for accuracy and privacy. Send hashed PII (Personally Identifiable Information) securely.*
*Environment Variables: Use `FB_CAPI_ACCESS_TOKEN` for the CAPI Access Token and `FB_PIXEL_ID` for the Facebook Pixel ID.*

- [x] **Configure Facebook Assets:** Obtain `FB_PIXEL_ID` and generate `FB_CAPI_ACCESS_TOKEN`. Stored in environment variables.
- [x] **Server-Side Event Implementation:**
    - **Technology Choice:** Implement using Supabase Edge Functions for server-side execution, triggered by relevant backend actions or page loads. Use standard `fetch` API for HTTP requests.
    - **Targeted Events & Triggers:** Based on the current user flow (Facebook Ad -> Messenger/ManyChat -> Website), we will implement the following standard CAPI events triggered by specific *website* actions:
        - **`ViewContent`**: Trigger when the primary landing page (`/papers-to-profits`) is loaded server-side. This indicates significant content engagement after arriving from an external source (like ManyChat).
        - **`InitiateCheckout`**: Trigger when the user successfully navigates to the first step of the website's checkout form/page (where they typically enter contact/shipping info). This marks a clear intent to purchase.
        - **`Purchase`**: Trigger *after* the backend successfully confirms a completed payment transaction (e.g., via webhook from Xendit/Canva or callback confirmation) and the corresponding record is updated in our `transactions` table. This is the core conversion event.
    - **Deferred Events & Rationale:**
        - **`Lead` / `LeadSubmitted`:** Implementation is **deferred**. The primary "lead" generation (initial user inquiry) occurs off-website within ManyChat. There is currently no distinct *website* form submission (like a newsletter signup or contact form) that clearly maps to this event. Attempting to trigger it based on website arrival alone would be inaccurate. Parameters like `messaging_channel` and `page_id` seen in setup likely relate to the off-site ManyChat interaction and would require a complex (future state) integration to pass through.
        - **`CompleteRegistration`:** Implementation is **deferred**. There doesn't appear to be a separate user account registration process distinct from the checkout flow. Triggering this during checkout would overlap confusingly with `InitiateCheckout` or `Purchase`.
    - **Required Parameters for All Events:**
        - `event_name`: The standard CAPI event name (e.g., 'ViewContent', 'Purchase').
        - `event_time`: Unix timestamp (seconds) of when the event occurred on the server.
        - `event_source_url`: The full URL of the page where the event was triggered.
        - `event_id`: A unique identifier for this specific event instance (e.g., UUID) to enable Facebook's deduplication.
        - `action_source`: Hardcoded as `'website'`.
    - **User Data Parameters (`user_data` object):**
        - **Hashed PII (SHA-256):** Send when available, *especially* for `Purchase` and potentially `InitiateCheckout`. Requires obtaining user input (e.g., from checkout form).
            - `em`: Hashed email address.
            - `ph`: Hashed phone number.
            - `fn`: Hashed first name.
            - `ln`: Hashed last name.
            - *(Include others like city, state, zip, country if reliably collected)*
        - **Do Not Hash (Send as-is):**
            - `client_ip_address`: User's IP address (obtain from request headers in Edge Function).
            - `client_user_agent`: User's browser user agent string (obtain from request headers).
            - `fbp`: Facebook Browser ID cookie (`_fbp`). Pass from client request to server/Edge Function if available.
            - `fbc`: Facebook Click ID cookie (`_fbc`). Pass from client request to server/Edge Function if available (especially important for click-through attribution).
    - **Custom Data Parameters (`custom_data` object):**
        - **`Purchase` Event:** Must include `currency` (e.g., 'USD') and `value` (e.g., 99.99).
        - *(Potentially add custom parameters if needed, e.g., product SKU)*.
- [x] **Security:** Store `FB_CAPI_ACCESS_TOKEN` securely using Supabase Vault in production (environment variables acceptable for local development). Ensure the Edge Function handling CAPI calls is properly secured.
- [x] **Validation:** Use Facebook's Events Manager -> Test Events tool *during development* to send test events from the Edge Function and verify they are received correctly by Facebook, checking parameter matching and hashing.
- [x] **Error Handling & Logging:** Implement robust logging within the Edge Function. Log successful event sends (with `event_id`) and detailed error messages (including Facebook API response if available) for failed requests. Consider retries for transient network errors.

#### 2.1 Facebook CAPI Edge Function Deployment (2024-04-20)

- **Function Name:** `send-facebook-capi-event`
- **Location:** `supabase/functions/send-facebook-capi-event/index.ts`
- **Stack:** TypeScript, Deno (Supabase Edge Functions)
- **Purpose:** Handles all Facebook CAPI event types (`ViewContent`, `InitiateCheckout`, `Purchase`) for server-side event tracking.
- **Supported Events:**
  - `ViewContent` (landing page load)
  - `InitiateCheckout` (checkout start)
  - `Purchase` (successful transaction)
- **Input Payload Structure:**
  ```json
  {
    "eventName": "ViewContent", // or "InitiateCheckout", "Purchase"
    "eventSourceUrl": "https://yourdomain.com/papers-to-profits",
    "userData": {
      "email": "optional@email.com", // hashed if present
      "phone": "optional", // hashed if present
      "firstName": "optional", // hashed if present
      "lastName": "optional", // hashed if present
      "clientIpAddress": "user-ip",
      "clientUserAgent": "user-agent",
      "fbp": "fbp-cookie-value",
      "fbc": "fbc-cookie-value"
    },
    "customData": { /* e.g., currency, value for Purchase */ }
  }
  ```
- **Hashing:** All PII (email, phone, first/last name) is SHA-256 hashed using Deno's `crypto.subtle` API per Facebook requirements.
- **Security/Authentication:**
  - By default, Supabase Edge Functions require an `Authorization` header (Bearer token, e.g., anon key).
  - If missing, function returns a 401 error (`{"code":401,"message":"Missing authorization header"}`).
  - For public tracking endpoints, consider allowing unauthenticated access (see troubleshooting section).
- **Testing Instructions:**
  1. Deploy the function using `npx supabase functions deploy send-facebook-capi-event`.
  2. Obtain the function URL from Supabase dashboard or CLI.
  3. Send a POST request using curl or Postman:
     ```sh
     curl -X POST <FUNCTION_URL> \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
       -d '{
         "eventName": "ViewContent",
         "eventSourceUrl": "https://yourdomain.com/papers-to-profits",
         "userData": {
           "clientIpAddress": "1.2.3.4",
           "clientUserAgent": "Mozilla/5.0",
           "fbp": "fb.1.1234567890.1234567890",
           "fbc": "fb.1.1234567890.AbCdEfGhIj"
         }
       }'
     ```
  4. Check Facebook Events Manager (Test Events) for event receipt.
- **Next Steps:**
  - Decide whether to allow unauthenticated (public) access for this function (recommended for tracking endpoints).
  - Integrate function call into `/app/papers-to-profits/page.tsx` for real user tracking.
  - Troubleshoot any 401 or payload errors as needed.
- **Rationale:**
  - Public tracking endpoints are common for analytics and ad attribution, but must be implemented securely to avoid abuse.
  - Using server-side CAPI improves reliability and attribution accuracy compared to client-only pixel tracking.

#### 2.2 Facebook CAPI Edge Function Improvements (2024-04-20)

- **CORS Support:** Function now handles `OPTIONS` preflight requests and includes CORS headers on all responses, allowing browser-based POST requests from any origin.
- **Public Endpoint:** Uses the correct `.functions.supabase.co` public URL for frontend integration.
- **Validation:** Uses `zod` for strict payload validation, ensuring only valid event data is processed.
- **Error Handling:** Improved error handling, including:
  - Clear error messages for invalid JSON, unsupported methods, and invalid payloads.
  - Timeouts and up to 3 retries for Facebook API requests.
  - Logs errors and returns appropriate status codes for troubleshooting.
- **Security:** Credentials are loaded from environment variables and checked at function startup.
- **Browser Compatibility:** Function now works with browser-based POST requests from the `/papers-to-profits` landing page, and events are successfully received in Facebook Events Manager.
- **Tested:** End-to-end test confirmed: visiting the landing page triggers a `ViewContent` event that appears in Facebook Events Manager.

**Next Step:**
- Integrate the same CAPI function for `InitiateCheckout` (when user starts checkout) and `Purchase` (after payment success) events in the app. This will provide full-funnel tracking for Facebook Ads attribution.

#### 2.3 Facebook CAPI Edge Function: End-to-End Test & Production Readiness (2024-04-20)

- **App-Friendly Input:** The function now accepts a simple, flat payload from the app or Postman (with keys like `eventName`, `eventSourceUrl`, `userData`, etc.).
- **Validation & Transformation:** The function validates the input, hashes PII, builds the correct Facebook API payload, and sends it to Facebook CAPI.
- **Clear Output:** Returns a clear JSON response: `{ success: true, eventId, eventName, fbResponse }` on success, or a detailed error object on failure.
- **Tested:** A test event was sent from the app/Postman, received a success response, and appeared in Facebook Events Manager.
- **Hybrid Tracking:** Both Facebook Pixel (browser) and CAPI (server) are now running for maximum attribution accuracy.
- **Production-Ready:** The function is now production-ready for `ViewContent` events from the landing page.

**Next:**
- Integrate the same CAPI function for `InitiateCheckout` (when user starts checkout) and `Purchase` (after payment success) events in the app for full-funnel Facebook Ads tracking and attribution.

### 3. Facebook Marketing API Integration (Metadata & Spend)
*Goal: Periodically fetch campaign structure and spend data to enrich our database.* 
*Best Practice: Use scheduled tasks, handle pagination/rate limits, store credentials securely.* 

- [x] **Configure Facebook App:** Create a Facebook App, request necessary Marketing API permissions (e.g., `ads_read`). Generate a non-expiring System User Access Token or manage User Tokens. (Credentials added to .env)
- [x] **Develop Fetching Script/Function:**
    - **Technology Choice:** Create a scheduled **Supabase Edge Function** (e.g., `fetch-facebook-ads-data`) triggered via `pg_cron` (e.g., daily).
    - **API Interaction Method:** Use standard `fetch` calls to the Facebook Graph API endpoints. 
        - *Rationale:* While the official SDK (`facebook-nodejs-business-sdk`) is generally best practice, potential compatibility issues with the Deno runtime in Supabase Edge Functions make direct `fetch` calls a more reliable approach in this specific environment. We will manually handle endpoint calls, pagination, and rate limiting.
    - Implement logic to call Marketing API endpoints to fetch:
        - Active/paused Campaigns (`/act_{ad_account_id}/campaigns`)
        - Active/paused Ad Sets (`/act_{ad_account_id}/adsets`)
        - Active/paused Ads (`/act_{ad_account_id}/ads`)
        - Daily Spend/Performance Insights (`/act_{ad_account_id}/insights` with `level=ad`, `time_increment=1`, fields like `spend`, `impressions`, `clicks`, `campaign_id`, `adset_id`, `ad_id`).
    - **Pagination:** Handle paginated responses from the API.
    - **Rate Limiting:** Implement basic delays or checks to avoid hitting API rate limits.
    - **Error Handling:** Log API errors and implement retry logic if appropriate.
- [x] **Database Upsert Logic:**
    - For fetched campaigns, ad sets, ads: `UPSERT` into `ad_campaigns`, `ad_adsets`, `ad_ads` tables based on `fb_campaign_id`, `fb_adset_id`, `fb_ad_id`, updating names, statuses, etc.
    - For fetched insights: `UPSERT` into `ad_spend` table based on `date` and `ad_id` (or relevant granularity).
- [x] **Security:** Store Marketing API Access Token securely.

#### 3.1 Facebook Marketing API Edge Function Implementation (2024-06-04)

- **Function Name:** `fetch-facebook-ads-data`
- **Location:** `supabase/functions/fetch-facebook-ads-data/index.ts`
- **Stack:** TypeScript, Deno (Supabase Edge Functions)
- **Purpose:** Fetches Facebook ad campaigns, ad sets, ads, and daily spend/insights from the Facebook Marketing API and upserts them into the normalized Supabase tables (`ad_campaigns`, `ad_adsets`, `ad_ads`, `ad_spend`).
- **Implementation Details:**
  - Reads credentials (`FB_ADS_TOKEN`, `FB_AD_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) from environment variables for secure access.
  - Fetches all entities (campaigns, ad sets, ads, insights) using the Facebook Graph API, handling pagination and errors robustly.
  - Upserts each entity into the appropriate Supabase table using the Supabase REST API, with clear mapping and merge-duplicate resolution.
  - Returns a summary of records fetched and upserted for each entity, plus any errors, for easy monitoring and debugging.
  - Modular, well-documented code with clear separation of fetch and upsert logic for maintainability.
- **Refinements & Troubleshooting (2024-06-04 / 2024-06-05):**
  - **Sequential Processing:** Refactored the main handler to process entities sequentially (Campaigns -> Ad Sets -> Ads -> Spend) instead of in parallel. This is crucial for correctly resolving foreign key UUIDs (e.g., linking `ad_adsets.campaign_id` to the correct `ad_campaigns.id`) during the upsert stage.
  - **Currency Field Limitation:** Removed the `currency` field from the `fetchInsights` API call (`level=ad`). The Facebook API does not support fetching currency at this level, resulting in a `400 Bad Request` error. The `ad_spend.currency` column will remain `NULL`.
  - **Unified Attribution Setting:** Added `use_unified_attribution_setting=true` parameter to the `/insights` API call based on Facebook documentation best practices to better align results with Ads Manager reporting.
  - **Upsert Header Fix:** Corrected the Supabase upsert calls by explicitly adding the `Prefer: resolution=merge-duplicates` header. This header was missing after refactoring, causing `duplicate key value` errors (code `23505`) instead of updating existing records. This fixed the upsert logic for campaigns, ad sets, and ads.
- **Testing Instructions:**
  1. Ensure all required environment variables are set in your Supabase project and local `.env` file.
  2. Deploy the function using `npx supabase functions deploy fetch-facebook-ads-data`.
  3. Trigger the function via the Supabase dashboard or CLI (or `curl -X POST <FUNCTION_URL>`).
  4. Check the returned summary (`{"success": true, "results": {...}}`) for fetched/upserted counts and ensure no errors are reported.
  5. Verify data in Supabase tables (`ad_campaigns`, `ad_adsets`, `ad_ads`, `ad_spend`), confirming foreign keys are populated and records are updated correctly.
  6. Review function logs (via Supabase dashboard) for detailed execution flow and troubleshooting if needed.
- **Rationale:**
  - This approach follows industry best practice for data pipeline modularity, security, and maintainability.
  - Using upserts ensures data freshness and avoids duplicates, and the modular structure allows for easy extension (e.g., resolving foreign keys, adding new metrics).

**Next Steps:**
- Monitor and validate data quality and completeness in the Supabase tables.
- Proceed to Step 4: Attribution Data Processing Logic, once data ingestion is validated.

### 4. Attribution Data Processing Logic **[PAUSED]**
*Goal: Link successful `Purchase` events (sent via CAPI) to the corresponding ad identifiers and store in `ad_attributions`.*
*Best Practice: Leverage automated tracking signals (Facebook Ad `ref` parameter passed through ManyChat) and store captured UTM parameters and click identifiers.*

*Note: Implementation of this step is paused. The plan below outlines the intended approach using the automated `ref` parameter strategy.* 

- [ ] **Configure Facebook Ad `ref` Parameter:**
    - In Facebook Ads Manager, for ads linking to Messenger, set the `ref` parameter dynamically using placeholders like `{{campaign.id}}` and `{{ad.id}}`. Example: `ref=cid_{{campaign.id}}__aid_{{ad.id}}`.
- [ ] **Configure ManyChat Flow:**
    - Capture the incoming `ref` parameter (e.g., into a Custom User Field `fb_ad_ref`).
    - Dynamically construct website links using this captured `ref`. Recommended approach: `https://.../?...&utm_ref={{fb_ad_ref}}`.
- [ ] **Enhance `ad_attributions` Table:**
    - Add columns via migration: `utm_source` (TEXT), `utm_medium` (TEXT), `utm_campaign` (TEXT), `utm_content` (TEXT), `utm_term` (TEXT), `utm_ref` (TEXT).
    - Ensure `fb_click_id` (TEXT) exists.
- [ ] **Implement Client-Side UTM/Ref Capture:**
    - On landing pages (e.g., `/papers-to-profits`), use JavaScript to capture all UTM parameters (including `utm_ref`) and `_fbc` cookie value from the URL/browser.
    - Store these values in user session storage (`sessionStorage`).
- [ ] **Pass Captured Data Backend:**
    - When initiating purchase/checkout, retrieve stored UTMs/ref/fbc from session storage.
    - Include this data in the payload sent to the backend endpoint responsible for confirming the purchase (e.g., payment webhook handler).
- [ ] **Implement Backend Processing Logic:**
    - **Trigger:** On successful transaction confirmation.
    - **Logic:** Retrieve transaction details (`transaction_id`, `user_id`, value, etc.) and the captured attribution data (UTMs, ref, fbc) passed from the frontend.
    - `INSERT` into `ad_attributions`: Populate `transaction_id`, `user_id`, `conversion_event`='Purchase', `event_time`, `conversion_value`, etc., along with all captured `utm_*`, `utm_ref`, and `fb_click_id` values.
    - Leave `campaign_id`, `adset_id`, `ad_id` as `NULL` (these would require a separate, complex offline matching process against the stored `utm_ref` or Facebook API reporting data).
- [ ] **Error Handling:** Log cases where attribution data (UTMs, ref, fbc) is missing or cannot be linked during the insert.

### 5. Initial Data Backfill & Validation
*Goal: Populate historical data where possible and verify the pipeline is working.* 

- [ ] **Backfill Metadata/Spend:** Run the Marketing API fetching script (Step 3) to populate `ad_` tables with historical data for a defined period (e.g., 90 days).
- [x] **Check Foreign Keys & Data:** Ensure all FK relationships populated by Step 3 (`ad_adsets.campaign_id`, `ad_ads.adset_id`, `ad_spend` FKs) are valid and data looks correct in `ad_campaigns`, `ad_adsets`, `ad_ads`, `ad_spend`. *(Validation confirmed post-function fix in Step 3.1)*.
- [ ] **Monitor CAPI Events:** Use Facebook Events Manager to confirm `PageView`, `InitiateCheckout`, `Purchase` events are being received and matched (relevant for CAPI health, even if Step 4 is paused).
- [ ] **Validate `ad_attributions`:** **[PAUSED]** This sub-step is paused as Step 4 (populating this table) is paused.

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

This phase is **In Progress**. CAPI events for ViewContent, InitiateCheckout, and Purchase are implemented and validated. The Marketing API data fetching function (`fetch-facebook-ads-data`) is implemented and validated.

**2024-06-05 Updates:**
- Frontend captures `_fbp`/`_fbc` and sends `InitiateCheckout` to CAPI Edge Function.
- Backend webhook sends `Purchase` event to CAPI Edge Function using stored metadata.
- Edge Function validates `_fbp`/`_fbc` format, resolving Facebook API errors.
- Marketing API function (`fetch-facebook-ads-data`) successfully fetches and upserts campaigns, ad sets, ads, and spend data sequentially, correctly populating foreign keys and handling API limitations (currency) and upsert logic (`Prefer` header).

## Next Steps

1.  **Develop Attribution Data Processing Logic** (Step 4 in Implementation Plan) to link CAPI events/transactions to ad campaigns/adsets/ads in the `ad_attributions` table.
2.  **Perform Initial Data Backfill & Validation** (Step 5 in Implementation Plan) for Marketing API data and verify the full pipeline.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phases 3-0 to 3-4).
> 2.  Consult the implementation strategy and architecture planning documents.
> 3.  Align your work with the project context (`ProjectContext.md`) and design context (`designContext.md`) guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards.
> 5.  Include this reminder in all future build notes to maintain consistency. 