# Handoff Document: Admin Affiliate Management Features

**Date:** 2025-06-05
**Author:** Cascade (AI) / User (Rob Guevarra)
**Project Area:** Admin Console - Affiliate Management

## 1. Context & Objective

This document summarizes the development progress, key decisions, and status of the Admin Affiliate Management features. The primary objective was to implement and connect server actions for affiliate analytics and program settings, refactor relevant pages to use real Supabase data, resolve data fetching errors, enhance navigation, and refine core logic like commission management.

## 2. Summary of Work Completed in This Session

*   **Affiliate Analytics Page (`/admin/affiliates/analytics`):**
    *   Successfully integrated `getAffiliateProgramAnalytics` server action to fetch and display real Key Performance Indicators (KPIs).
    *   Resolved critical data fetching errors by identifying and correcting database column names in `affiliate_conversions` (now using `gmv` and `commission_amount`) and confirming the correct table (`affiliates`) for affiliate counts.
*   **Affiliate Settings Page (`/admin/affiliates/settings`):**
    *   Integrated `getAffiliateProgramSettings` and `updateAffiliateProgramSettings` server actions.
    *   Refactored the UI to use real data and allow updates to settings like cookie duration and payout thresholds.
    *   **Major Refactor - Commission Management:** Overhauled commission rate logic. Global default commission rate was removed in favor of an exclusively tier-based system managed via `membership_levels`.
*   **Affiliate Section Sub-Navigation:**
    *   Implemented a new tab-based sub-navigation component (`AffiliateNavTabs.tsx`) within the `/admin/affiliates/layout.tsx`.
    *   This provides seamless navigation between Affiliate List, Analytics, Settings, and Fraud Flags pages, with correct active tab highlighting.
*   **Database Schema Corrections & Migrations:**
    *   Identified correct column names (`gmv`, `commission_amount`) for the `public.affiliate_conversions` table via direct PostgreSQL system catalog queries.
    *   Applied a database migration (`drop_default_commission_rate_from_affiliate_config`) to remove the `default_commission_rate` column from the `public.affiliate_program_config` table, solidifying tier-based commissions.

## 3. Key Design Decisions & Architectural Changes

*   **Single Source of Truth for Commission Rates:** Commission rates are now exclusively managed through the `commission_rate` column in the `membership_levels` table. The concept of a global `default_commission_rate` in `affiliate_program_config` has been deprecated and removed from the UI, server actions, type definitions, and the database schema.
*   **Accurate Database Schema Usage:**
    *   Confirmed `affiliate_conversions` table uses `gmv` (for gross merchandise value) and `commission_amount` (for earned commissions).
    *   Affiliate counts (active, pending) are derived from the `affiliates` table, not `affiliate_profiles`.
*   **Enhanced Navigation:** Introduced tab-based sub-navigation for the admin affiliate section to improve user experience and page discoverability.
*   **Server Actions for Data Operations:** Continued use of Next.js Server Actions for all backend data fetching and mutations related to affiliate management.

## 4. Key Files Modified/Created

*   **Core Logic & Server Actions:**
    *   `lib/actions/affiliate-actions.ts`: Heavily modified `getAffiliateProgramAnalytics`, `getAffiliateProgramSettings`, `updateAffiliateProgramSettings`. Updated `UpdateAffiliateProgramSettingsArgs` interface.
*   **Page Components:**
    *   `app/admin/affiliates/analytics/page.tsx`: Refactored to use real data from server actions.
    *   `app/admin/affiliates/settings/page.tsx`: Refactored for real data, server actions, and updated commission management logic (removed default rate input, added link to tier management).
*   **Navigation Components:**
    *   `components/admin/affiliates/affiliate-nav-tabs.tsx`: New client component for sub-navigation.
    *   `app/admin/affiliates/layout.tsx`: Integrated `AffiliateNavTabs`.
*   **Type Definitions:**
    *   `types/admin/affiliate.ts`: Updated `AffiliateProgramConfigData` interface (removed `default_commission_rate`).

## 5. Database Changes

*   **Migration Applied:** `drop_default_commission_rate_from_affiliate_config`
    *   **Action:** `ALTER TABLE public.affiliate_program_config DROP COLUMN IF EXISTS default_commission_rate;`
    *   **Reason:** To enforce tier-based commission management as the single source of truth.

## 6. Potential Blockers / Known Issues / Points to Verify

*   **Commission Calculation Logic:** While the settings page and related actions are updated, ensure all other parts of the codebase that calculate or display affiliate commissions now correctly and exclusively reference the `commission_rate` from an affiliate's assigned `membership_levels` record.
*   **Affiliates Without Tiers:** Confirm the desired business logic for affiliates who might not have a membership tier assigned. Currently, they would effectively have a 0% commission unless a "default" or "basic" tier with a specific rate is assigned to them.

## 7. Suggested Next Steps

*   **Thorough Testing:**
    *   Test the Affiliate Settings page functionality comprehensively.
    *   Verify commission calculations across the platform reflect the tier-based logic.
*   **Continue Phase 1 Features (from Build Notes):**
    *   **Analytics Dashboard with KPI Charts:** Implement visual components for revenue overview, conversion rates, top performers, etc. (`/app/admin/affiliates/analytics/page.tsx`).
    *   **Fraud Review System Enhancements:** Consider real-time notifications for high-risk flags if planned.
    *   **Security and Audit Features:** Implement enhanced admin authorization, audit logging, etc.
*   **Review Build Notes:** Refer to `ProjectDocs/Build_Notes/active/admin-affiliate-management_phase-1_core_features.md` for the full list of pending tasks for this phase.

## 8. Build Notes Reference

*   Primary Build Note: `ProjectDocs/Build_Notes/active/admin-affiliate-management_phase-1_core-features.md`
