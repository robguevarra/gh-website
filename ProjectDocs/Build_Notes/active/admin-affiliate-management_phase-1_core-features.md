# Admin Console Extension - Phase 1: Affiliate Management

## Task Objective
Extend the existing admin console with comprehensive affiliate management capabilities, including affiliate approval workflows, performance monitoring, fraud detection, and program settings management.

## Current State Assessment

### Existing Admin Console Structure
- Admin console is implemented at `/app/admin/` with a sidebar navigation (`components/admin/admin-sidebar.tsx`)
- Current navigation includes: Dashboard, Users, Courses, Membership Tiers, Reports, Email Campaigns, Shop Integration, Security, and Settings
- Admin layout (`app/admin/layout.tsx`) handles authentication, admin validation, and page structure
- Route protection is implemented via middleware and `validateAdminStatus` function

### Affiliate System Implementation
- Affiliate database schema is complete with tables for:
  - `affiliates`: Core affiliate data with status and commission rates
  - `affiliate_clicks`: Click tracking
  - `affiliate_conversions`: Conversion and commission tracking
  - `fraud_flags`: Fraud detection and management
- Affiliate dashboard UI (/affiliate-portal) is fully implemented with:
  - Performance metrics and visual analytics
  - Referral link generation and management
  - Payout tracking and request capabilities
  - Mobile-responsive design and proper layout

### Missing Components
- No dedicated admin interface exists for affiliate management
- Affiliate approval workflow is not implemented
- No fraud review system in place
- No program-wide affiliate analytics for administrators
- No configuration interface for affiliate program settings

## Future State Goal
Create a comprehensive, secure, and intuitive admin interface for managing all aspects of the affiliate program, including:

1. A central affiliate management dashboard with key metrics
2. Tools for reviewing and approving/rejecting affiliate applications
3. A fraud detection and review system
4. Program-wide analytics with filtering and export capabilities
5. Configuration interface for program settings
6. Audit logging for all admin actions

## Implementation Plan

### 1. Create Affiliate Management Section in Admin Console
- [ ] Create base route structure:
  - [ ] Add `/app/admin/affiliates/page.tsx` main page
  - [x] Create `/app/admin/affiliates/[affiliateId]/page.tsx` for individual affiliate details
    - [x] Display comprehensive affiliate information (name, email, slug, status, commission rate, joined date)
      - [x] Implemented fetching and display of real performance metrics (total clicks, conversions, earnings)
    - [x] Display fraud flags associated with the affiliate (reason, date, status, details view)
    - [ ] Implement management of fraud flags (resolution options) in detail view or dedicated page
    - [x] Implemented sub-navigation tabs (List, Analytics, Settings, Fraud Flags) in `/app/admin/affiliates/layout.tsx`
    - [x] Created `AffiliateNavTabs.tsx` client component for dynamic tab highlighting
    - [x] Corrected active state logic for affiliate sub-navigation tabs
      - [X] Refactored `EditAffiliateForm.tsx` for editing status and membership tier.
      - [X] Integrated `updateAffiliateStatus` server action for status updates.
      - [X] Ensured `updateAffiliateMembershipLevel` is used for tier updates.
      - [X] Utilized `getMembershipLevels` to populate tier selection.
      - [X] Restricted `updateAdminAffiliateDetails` server action to slug updates only (admin editing of slug discouraged).
      - [X] Removed legacy `commission_rate` and `is_member` handling from `EditAffiliateForm.tsx`, `AffiliateDetailView.tsx`, `AdminAffiliateListItem` type, and relevant server actions.
      - [X] Fixed runtime error in `EditAffiliateForm.tsx` (`Select.Item` value prop).
      - [X] Maintained `sonner` toast notifications for success/error feedback.
      - [X] Ensured `revalidatePath` is used for data refresh after updates.
      - [Note] Direct editing of `commission_rate` via form removed in favor of tier-based rates.
  - [ ] Add `/app/admin/affiliates/flags/page.tsx` for fraud management
  - [x] Add `/app/admin/affiliates/analytics/page.tsx` for program analytics
    - [x] Implemented server action `getAffiliateProgramAnalytics` to fetch real data from Supabase
    - [x] Refactored `/app/admin/affiliates/analytics/page.tsx` to use real data
    - [x] Debugged and corrected column names (`gmv`, `commission_amount`) in `affiliate_conversions` and table name (`affiliates`) for analytics queries
  - [x] Add `/app/admin/affiliates/settings/page.tsx` for program settings
    - [x] Implement settings for cookie duration, payout terms (commission rates are now managed exclusively via Membership Tiers)
      - [x] Implemented server actions `getAffiliateProgramSettings` and `updateAffiliateProgramSettings` (updated to remove default commission rate logic)
      - [x] Refactored `/app/admin/affiliates/settings/page.tsx` to use server actions, real data, and link to Membership Tiers for commission management.
      - [x] Refactored commission rate management to be exclusively tier-based, removing global default commission rate from UI, server actions, and types.
      - [x] Applied database migration (`drop_default_commission_rate_from_affiliate_config`) to remove `default_commission_rate` column from `affiliate_program_config` table.
- [x] Update `components/admin/admin-sidebar.tsx` to include Affiliate section with appropriate icon
- [ ] Create a layout component for affiliate management section with consistent navigation
- [ ] Design and implement shared UI components for affiliate management

### 1. Core Affiliate Listing and Viewing
- [x] Design and implement `AffiliateList` component (`components/admin/affiliates/affiliate-list.tsx`)
  - [x] Display key affiliate data: Name, Email, Slug, Status, Commission Rate, Joined Date
  - [x] Implement client-side filtering by status (Pending, Active, Flagged, Inactive)
  - [x] Implement client-side search by name, email, or slug
  - [x] Implement client-side pagination
  - [x] Add action dropdown menu for each row (View, Edit, Approve, Reject, Flag, Deactivate)
  - [x] Resolved JSX syntax errors and build issues in `AffiliateList`.
- [x] Integrate `AffiliateList` into a new admin page at `/admin/affiliates` (Verified working)

### 2. Data Fetching and Integration
- [x] Create server action `getAdminAffiliates` in `lib/actions/affiliate-actions.ts`
  - [x] Fetch affiliate data from Supabase, joining with `unified_profiles` for name/email.
    - [x] Resolved Supabase embedding error by specifying foreign key: `unified_profiles!affiliates_user_id_fkey`.
  - [x] Implement basic error handling and logging.
  - [x] Ensure data is mapped correctly to `AdminAffiliateListItem`.
  - [x] Switched to using `getAdminClient()` to bypass RLS and resolve `"column user_metadata does not exist"` error.
- [x] Replace mock data in `AffiliateList` with real data from `getAdminAffiliates`.
- [x] Implement loading states and error handling in `AffiliateList`.

### 3. Implement Fraud Review System
- [x] Create components for fraud flag management:
  - [x] List view of flagged affiliates with risk scores (`FraudFlagList.tsx`)
  - [x] Detail view with evidence collection (View Details modal in `FraudFlagList.tsx`)
  - [x] Resolution workflow (Resolve modal and `resolveFraudFlag` server action in `FraudFlagList.tsx`)
- [ ] Implement API endpoints for fraud management:
  - **Note:** Functionality achieved via Next.js Server Actions (`getAllAdminFraudFlags` for listing, `resolveFraudFlag` for resolution).
  - [ ] `/api/admin/affiliates/flags` for listing
  - [ ] `/api/admin/affiliates/flags/[id]` for details and resolution
- [ ] Add real-time notification system for high-risk flags

### 4. Create Analytics Dashboard with KPI Charts
- [ ] Implement program-wide analytics components:
  - [ ] Revenue overview charts (daily, weekly, monthly)
  - [ ] Conversion rate analytics
  - [ ] Top performer insights
  - [ ] Geographic distribution maps
- [ ] Add date range filtering for all analytics
- [ ] Implement data export functionality
- [ ] Create benchmark comparison tools

### 5. Build Program Settings Editor
- [ ] Create interface for managing program-wide settings:
  - [ ] Commission rate structure
  - [ ] Cookie duration settings
  - [ ] Payout thresholds and schedules
  - [ ] Automatic flagging rules
- [ ] Implement validation and preview for settings changes
- [ ] Add confirmation workflow for critical changes
- [ ] Create audit logging for all settings modifications

### 6. Implement Security and Audit Features
- [ ] Enhance admin authorization checks for affiliate management
- [ ] Create detailed audit logging for all admin actions
- [ ] Implement user impersonation with proper security controls
- [ ] Add role-based access controls for different admin levels

### 7. Testing and Quality Assurance
- [ ] Develop comprehensive test cases for all affiliate management features
- [ ] Perform security testing focusing on admin privileges
- [ ] Conduct usability testing with admin users
- [ ] Optimize performance for large affiliate programs

## Technical Considerations

### State Management
- Use React Server Components where possible for improved performance
- Implement Zustand store for client-side affiliate management state
- Create specialized hooks for affiliate data access patterns

### Security Measures
- Ensure proper authorization checks before all admin actions
- Implement comprehensive audit logging
- Use row-level security in Supabase for data access control
- Add confirmation steps for critical actions

### Performance Optimization
- Implement pagination for large affiliate lists
- Use virtualized lists for better performance with large datasets
- Optimize database queries with proper indexing
- Consider caching strategies for frequently accessed data

## Completion Status

This phase is actively in progress. Key achievements in the current work session:

- **Affiliate Analytics & Settings Data Integration:**
  - Successfully connected the affiliate analytics page (`/admin/affiliates/analytics`) to fetch and display real KPIs using the `getAffiliateProgramAnalytics` server action. This involved debugging database schema mismatches for `affiliate_conversions` (correct columns: `gmv`, `commission_amount`) and `affiliates` table.
  - Integrated the affiliate program settings page (`/admin/affiliates/settings`) with `getAffiliateProgramSettings` and `updateAffiliateProgramSettings` server actions, allowing real-time configuration updates. The UI now uses tabs for different setting categories.

- **Affiliate Section Navigation:**
  - Implemented a tab-based sub-navigation (`AffiliateNavTabs.tsx`) within the `/admin/affiliates` layout. This connects the List, Analytics, Settings, and Fraud Flags pages, improving usability and discoverability within the affiliate management section. Active tab highlighting logic was also refined.

Challenges addressed & Design Decisions Refined:
- Resolved persistent "column does not exist" errors for `affiliate_conversions` by querying PostgreSQL system catalogs (`pg_attribute`) to identify the correct column names (`gmv`, `commission_amount`).
- Corrected table name usage from `affiliate_profiles` to `affiliates` for fetching affiliate counts.
- Refined active tab highlighting logic in the new sub-navigation component.
- **Commission Rate Management Overhaul:** Transitioned from a global default commission rate to an exclusively tier-based system. This involved UI changes on the settings page, updates to server actions and types, and a database migration to drop the redundant `default_commission_rate` column from `affiliate_program_config`. This ensures `membership_levels` is the single source of truth for commission rates.

Pending items from the overall phase plan are still numerous, but significant progress has been made on the analytics, settings foundations, and establishing a clear commission management strategy.

## Next Steps After Completion
Upon completing the admin affiliate management features, we will proceed to Task 10 (Implement Referral Tracking Front-End) to enhance the customer-facing aspects of the affiliate system with improved tracking and analytics.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
