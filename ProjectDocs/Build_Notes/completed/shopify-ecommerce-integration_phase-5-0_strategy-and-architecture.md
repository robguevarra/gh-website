# Shopify E-commerce Integration - Phase 5-0: Strategy and Architecture

## Task Objective
Define the overarching strategy, architecture, and initial planning for implementing a custom e-commerce experience within the Graceful Homeschooling platform. This phase leverages Shopify solely as a Product Information Management (PIM) system, while building the storefront, cart, custom checkout (using Xendit), and order management directly within the existing Next.js/Supabase stack. This plan also addresses the migration of the current password-gated store and the future implementation of a public store.

## Current State Assessment
- The platform (`gh-website`) is built on Next.js 15, Supabase, and TailwindCSS/Shadcn.
- A unified data model exists in Supabase (Phase 3), including `unified_profiles`, `transactions` (currently from Xendit for other products), `courses`, and `enrollments`.
- An analytics pipeline for Shopify data is planned (Phase 4-2) but is separate from this e-commerce build.
- A basic, password-protected Shopify store currently exists for members, using Shopify's native checkout.
- The platform lacks an integrated, custom e-commerce solution using Xendit that caters to both private members and the future public audience.
- The goal is to sell digital products (commercial licenses) requiring access control post-purchase but no physical shipping.

## Future State Goal
1.  **Shopify as PIM:** Shopify Admin UI is used exclusively for managing product details (title, description, price, images, tags like `access:public` or `access:members`).
2.  **Integrated Storefront:** The Graceful Homeschooling Next.js app displays product listings and detail pages using data synced from Shopify into the local Supabase database. The UI seamlessly matches the existing site design.
3.  **Custom Cart & Checkout:** A custom shopping cart and checkout flow are implemented within the Next.js app.
4.  **Xendit Payment:** Xendit is used as the exclusive payment processor, replacing Shopify's native checkout.
5.  **Unified Data:** Successful purchases result in records within the existing Supabase `transactions` table and new `orders` / `order_items` tables, linked to `unified_profiles` (or `auth.users`).
6.  **Access Granting:** Successful purchases automatically grant appropriate access (e.g., create `enrollments` or update user metadata).
7.  **Public & Private Stores:** The storefront logic supports displaying different products/prices based on user authentication status (public vs. logged-in member).
8.  **Migration:** The existing password-gated store functionality is replaced by this new integrated system.

## Relevant Context

> **Important**: When working on this build note and subsequent Phase 5 notes, always ensure proper context integration from:
> 1.  Data Unification Strategy (Phase 3-0) - Defined `unified_profiles` and `transactions`.
> 2.  Database Schema Enhancement (Phase 3-1) - Detailed core table structures.
> 3.  Admin Dashboard Analytics - Phase 4 Context (Phase 4-0) - Provides overall project direction.
> 4.  Shopify Analytics Integration Clarification (Phase 4-2) - Defines the scope of the *analytics* pipeline.
> 5.  Project Context (`ProjectContext.md`) - Defines tech stack, goals, PWA structure.
> 6.  Design Context (`designContext.md`) - Defines UI/UX standards.
> 7.  Build Notes Guidelines (`build-notes-guidelines.md`) - Defines documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context (`ProjectContext.md`)
- Tech Stack: Next.js 15 (App Router, RSC), Supabase, TypeScript, TailwindCSS, Shadcn UI, Zustand (if needed for cart state).
- Development Standards: Mobile-first, functional programming, server-side logic preferred, PWA structure.
- Goal: Create an award-winning platform with seamless user experiences.

### From Data Unification (Phase 3-0, 3-1)
- The target database tables (`unified_profiles`, `transactions`) already exist and should be leveraged.
- User identity is linked between `auth.users` and `unified_profiles`.
- Transactions must store payment details consistently.

### Architectural Decision (This Phase)
- **Shopify Role:** PIM only. Product data managed in Shopify Admin, synced to Supabase.
- **Data Flow:** Shopify Webhook -> Supabase Edge Function -> Supabase DB -> Next.js UI (Server Components) -> Client Cart -> Next.js Backend (Server Action/API) -> Xendit -> Xendit Webhook -> Next.js Backend -> Supabase DB (Transactions, Orders, Access).
- **Checkout:** Fully custom implementation using Xendit, bypassing Shopify checkout entirely.

## Implementation Plan (Phase 5 Overview)

This build note (5-0) sets the strategy. Subsequent phases will implement the components:

-   **Phase 5-1: Backend Setup (Schema & Sync):**
    -   Define and implement Supabase schemas: `products` (synced from Shopify), `orders`, `order_items`.
    -   Develop and deploy the `shopify-product-sync` Supabase Edge Function (handling create/update/delete webhooks).
    -   Develop and execute the initial product data backfill script.
-   **Phase 5-2: Frontend - Product Display & Cart:**
    -   Build Next.js pages/components to display products fetched from Supabase `products`.
    -   Implement filtering logic for public vs. member-only products.
    -   Implement client-side shopping cart functionality (add/remove/view cart).
-   **Phase 5-3: Checkout & Payment Integration:**
    -   Build the checkout UI.
    -   Implement backend logic (Server Action/API Route) to calculate totals and initiate Xendit payment requests.
    -   Implement the Xendit webhook handler API route to process payment confirmations, create Supabase records (`transactions`, `orders`, `order_items`), and grant product access.
-   **Phase 5-4: Migration & Testing:**
    *   Plan and execute the cutover from the old password-gated Shopify store. (May involve manually recreating member discounts/access if not purely product-based).
    *   Conduct end-to-end testing: Product Sync -> Browse -> Cart -> Checkout -> Payment -> Access Granted -> Order History.
    *   Finalize public store visibility rules.

## Technical Considerations

### Product Sync Reliability
- Ensure the Supabase Edge Function handles Shopify webhook retries and potential duplicates gracefully (idempotency).
- Implement robust logging and monitoring for the sync function.
- Plan for potential delays between Shopify updates and Supabase sync.

### Cart Management
- Decide on cart persistence: LocalStorage (simple, lost on device switch), Zustand (client-side, non-persistent by default), or Supabase table (persistent for logged-in users, more complex). Recommend starting with Zustand for simplicity unless logged-in persistence is critical initially.

### Xendit Integration
- Securely store Xendit API keys (Supabase Vault or env variables).
- Implement robust Xendit webhook verification.
- Handle different Xendit payment statuses correctly (success, failure, pending).

### Migration Strategy
- **Existing Password-Gated Store:** Since checkout is moving away from Shopify, the password gate becomes irrelevant. The core task is ensuring the *products* previously available are correctly tagged (e.g., `access:members`) in Shopify so the new Next.js frontend can display them only to logged-in members. If there were member-specific *discounts* applied via Shopify, we'll need to replicate that logic in our custom checkout price calculation. Past order history from the old store won't migrate automatically unless we build a specific importer.
- **Data Backfill:** Need a one-time script to pull all existing products from Shopify Admin API into the Supabase `products` table.

### Public vs. Private Store Logic
- Use Next.js middleware or page-level checks to determine user authentication status.
- Filter Supabase product queries based on user status and product tags (e.g., `tags @> ARRAY['access:public']` or `tags @> ARRAY['access:members']`).
- Potentially adjust pricing logic during checkout based on user status if needed.

## Completion Status

This phase (5-0), Strategy and Architecture Definition, is considered **Complete** upon approval of this plan.

## Next Steps After Completion
Proceed with **Phase 5-1: Backend Setup (Schema & Sync)**, focusing on creating the necessary Supabase tables and the product synchronization mechanism.

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1.  Review previously completed build notes for context and established patterns (esp. Phase 3 Data Unification, Phase 4 Analytics Context).
> 2.  Consult the implementation strategy and architecture planning documents (`ProjectContext.md`, `designContext.md`).
> 3.  Align your work with the project context and design context guidelines.
> 4.  Follow the established folder structure, naming conventions, and coding standards (`build-notes-guidelines.md`).
> 5.  Include this reminder in all future build notes to maintain consistency. 