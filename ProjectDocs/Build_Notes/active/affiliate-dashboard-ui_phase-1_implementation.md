# Affiliate Dashboard UI - Phase 1: Implementation

## Task Objective
Develop a comprehensive, responsive, and user-friendly affiliate dashboard interface that provides affiliates with tools to track performance, generate referral links, and monitor payouts for the Graceful Homeschooling single-product affiliate program.

## Current State Assessment

### Existing UI and Components
- Basic placeholder affiliate dashboard UI exists at `/app/affiliate-portal/page.tsx` with sections for stats, referral links, and payouts
- The current page uses static mock data for affiliate metrics:
  ```tsx
  const affiliateData = {
    slug: 'your-unique-slug',
    clicks: 1250,
    conversions: 75,
    earnings: 1875.50,
    conversionRate: (75 / 1250) * 100,
    nextPayoutDate: '15/07/2024',
    minPayout: 100,
  };
  ```
- `AffiliateHeader` component exists in `components/affiliate/affiliate-header.tsx` and contains:
  - User display name and avatar
  - Dropdown menu for account settings, earnings, profile, and logout
  - Integration with `DashboardSwitcher` for multi-role navigation
- `GlobalAffiliateTracker` component in `components/affiliate/global-affiliate-tracker.tsx` tracks affiliate clicks by:
  - Reading affiliate slug (`a` parameter) from URL
  - Capturing UTM parameters for analytics
  - Sending tracking request to backend API
  - Setting tracking cookies for affiliate and visitor IDs

### Authentication and Route Protection
- Authentication context (`auth-context.tsx`) is fully implemented with Supabase
- Middleware (`middleware.ts`) already includes:
  - Route protection for `/affiliate-portal/*` routes 
  - Role-based access control via `unified_profiles` table
  - Session refresh and security headers
  - Cookie management for authentication

### Database Schema and Structure
- Supabase Project ID: `cidenjydokpzpsnpywcf` (required for API interactions)
- Custom Enum Types:
  - Affiliate statuses: `pending`, `active`, `flagged`, `inactive`
  - Conversion statuses: `pending`, `cleared`, `paid`, `flagged`
- Key Tables and Relationships:
  - `unified_profiles`: Central user table with `affiliate_id` (FK) and `affiliate_general_status` fields
  - `affiliates`: Core affiliate data with `user_id` (FK), `slug`, `commission_rate`, `is_member`, and `status`
  - `affiliate_clicks`: Tracks click events with `affiliate_id` (FK), `visitor_id`, `ip_address`, etc.
  - `affiliate_conversions`: Records successful conversions with `affiliate_id` (FK), `click_id` (FK), `commission_amount`, etc.
  - `fraud_flags`: Logs suspicious activity with `affiliate_id` (FK) and resolution status
  - `membership_levels`: Defines different tiers with `commission_rate` values

### API Endpoints and Services
- Click tracking API implemented in `/api/affiliate/click/route.ts`:
  - Validates affiliate slug
  - Records click data
  - Sets tracking cookies
- Service modules:
  - `tracking-service.ts`: Handles visitor ID generation, IP extraction, user-agent parsing
  - `conversion-service.ts`: Provides functions for recording conversions and creating network postbacks
  - `conversion-status.ts`: Manages status updates and tracks status history in JSONB

## Future State Goal
A fully functional affiliate dashboard that:

1. **Authentication & Authorization**
   - Leverages existing route protection via middleware.ts
   - Enforces affiliate role verification with proper status checking (`active` required)
   - Integrates with Supabase Auth and the unified_profiles/affiliates tables

2. **Dashboard Analytics**
   - Displays real-time performance metrics (clicks, conversions, earnings, conversion rate)
   - Provides time-series charts for trend analysis (daily, weekly, monthly views)
   - Shows geographic distribution of traffic with interactive heat maps
   - Visualizes conversion funnel from clicks to completed transactions
   - Tracks earnings over time with commission breakdown

3. **Referral Link Management**
   - Generates personalized referral links using the affiliate's unique slug
   - Creates customizable UTM parameters for campaign tracking
   - Produces high-quality QR codes for offline/print promotion
   - Supports one-click copy to clipboard with visual confirmation
   - Enables direct social sharing to major platforms
   - Provides link performance analytics per generated link

4. **Payout Dashboard**
   - Shows complete payout history with status indicators (pending, cleared, paid, flagged)
   - Displays estimated future payouts based on pending conversions
   - Provides minimum payout threshold information and progress indicators
   - Includes detailed transaction-level reporting for transparency
   - Implements status history tracking for each transaction

5. **Technical Requirements**
   - Achieves responsive design optimized for mobile, tablet, and desktop
   - Meets WCAG 2.1 AA accessibility standards
   - Maintains performance benchmark of p95 ≤ 1s on 3G connections
   - Implements proper loading states and error handling
   - Uses client-side caching with SWR for optimized data fetching

## Implementation Plan

### 1. State Management Setup
- [x] Create `affiliate-dashboard` Zustand store following the pattern in `student-dashboard`
  - [x] Define store with proper typing in `lib/stores/affiliate-dashboard/index.ts`
  - [x] Implement performance optimizations with equality checks and batch middleware
  - [x] Define affiliate-specific types for metrics, links, and payouts in `lib/stores/affiliate-dashboard/types.ts`
  - [x] Create action creators in `lib/stores/affiliate-dashboard/actions.ts`
- [x] Develop specialized hooks in `lib/hooks/use-affiliate-dashboard.ts`:
  - [x] `useAffiliateProfile`: Retrieves affiliate slug, status, and account details
  - [x] `useAffiliateMetrics`: Gets performance data with date range filtering
  - [x] `useReferralLinks`: Manages custom link generation and analytics
  - [x] `usePayoutData`: Handles payout history and projections
  - [x] Added `updateAffiliateProfile` method to properly handle profile updates with API integration

### 2. API Endpoint Development
- [x] Create RESTful API endpoints for affiliate data:
  - [x] `app/api/affiliate/profile/route.ts`: Affiliate account information
  - [x] `app/api/affiliate/metrics/route.ts`: Performance metrics with filtering options
  - [x] `app/api/affiliate/links/route.ts`: Referral link management and analytics
  - [x] `app/api/affiliate/qrcode/route.ts`: Dynamic QR code generation service
  - [x] `app/api/affiliate/payouts/route.ts`: Payout history and projections
- [x] Ensure proper authentication using Supabase middleware
  - [x] Verify affiliate status is `active` before data access
  - [x] Add caching headers for performance
  - [ ] Add rate limiting to prevent abuse (pending implementation)

### 2.1 Validation Schema Implementation
- [x] Create comprehensive Zod validation schemas for API data validation:
  - [x] `lib/validation/affiliate/profile-schema.ts`: Validates affiliate profile data, including fields like slug, status, commission rate, and membership flag.
  - [x] `lib/validation/affiliate/metrics-schema.ts`: Defines date range filters, grouping options, and metrics data points for affiliate metrics reporting.
  - [x] `lib/validation/affiliate/links-schema.ts`: Validates referral link data for creation, updating, and querying, including slug generation rules.
  - [x] `lib/validation/affiliate/payout-schema.ts`: Defines payout transaction and projection schema, including filtering and request validation.
  - [x] `lib/validation/affiliate/qrcode-schema.ts`: Validates QR code generation options including referral link ID, URL, size, and colors.
- [x] Implement proper typings with Zod inference for all schema objects
- [x] Add comprehensive validation error handling in API endpoints

### 2.2 Supabase Client Modernization
- [x] Update all affiliate API routes to use modern Supabase SSR client:
  - [x] Replaced deprecated imports from `@supabase/auth-helpers-nextjs` with modern `createRouteHandlerClient` from `@/lib/supabase/route-handler`
  - [x] Fixed API routes: `profile`, `metrics`, `links`, `payouts`, `qrcode`
  - [x] Updated client initialization in `verifyActiveAffiliate` functions to use `await createRouteHandlerClient()` pattern
  - [x] Fixed error handling calls to match updated function signatures (removed unnecessary parameters)
  - [x] Added proper type annotations to reducer functions and table references
  - [x] Verified no deprecated Supabase imports remain in frontend components and hooks
  - [x] Ensured consistency in error handling patterns across all affiliate API endpoints

### 3. Authorization and Access Controls
- [x] Enhance existing middleware implementation for affiliate routes
  - [x] Validate affiliate-specific route protection for various user roles
  - [x] Implement specific affiliate status checking (only `active` affiliates can access portal)
  - [x] Create appropriate error messages for inactive or pending affiliates
  - [x] Document the authentication flow in the affiliate dashboard context

### 4. Main Dashboard Layout and Navigation
- [x] Design responsive grid layout for the affiliate dashboard
  - [x] Implement mobile-first approach using Flexbox and CSS Grid with standard breakpoints
  - [x] Create a responsive main layout in `/app/affiliate-portal/layout.tsx`
  - [x] Follow design system color palette: purple (#b08ba5), pink (#f1b5bc), blue (#9ac5d9)
  - [x] Use Inter font for UI elements and Playfair Display for headings
- [x] Create dashboard navigation with `components/affiliate/dashboard/dashboard-layout.tsx`
  - [x] Implement navigation for Overview, Performance, Links, and Payouts sections
  - [x] Use ShadcnUI components with custom styling for consistent UI
  - [x] Add mobile-friendly responsive navigation
- [x] Enhanced `AffiliateHeader` component with additional functionality
  - [x] Integrate with existing authentication context
  - [x] Include multi-role navigation support
  - [x] Optimize for mobile viewing with appropriate responsive breakpoints

### 5. Simplified Referral Link Management
- [ ] Simplify the `components/affiliate/dashboard/referral-links-card.tsx` component:
  - [ ] Remove custom link generation functionality (no need for multiple links)
  - [ ] Focus on a single product affiliate approach with one link per affiliate
  - [ ] Display the affiliate's unique link using their slug: `yourdomain.com/papers-to-profits?a=slug`
  - [ ] Keep QR code generation but simplify options (single product link only)
  - [ ] Implement copy to clipboard functionality with toast notifications
- [ ] Update API endpoints to support the simplified approach:
  - [ ] Modify `/api/affiliate/links/route.ts` to focus on retrieving/managing a single link per affiliate
  - [ ] Keep QR code generation endpoint for the single product link
  - [ ] Remove custom UTM parameter functionality
- [ ] Update the links page UI:
  - [ ] Simplify `/app/affiliate-portal/links/page.tsx` to focus on a single product approach
  - [ ] Remove the complex link creation dialog
  - [ ] Keep promotion tips and best practices for the single product
  - [ ] Enhance educational content about effective affiliate marketing for a single product

### 6. Analytics Dashboard Widgets
- [x] Develop key performance indicator (KPI) cards in `components/affiliate/dashboard/overview-card.tsx`
  - [x] Create summary cards using Shadcn UI Card component with custom styling
  - [x] Implement metrics for: total earnings, clicks, conversions, conversion rate
  - [x] Fix data format transformation between API (snake_case) and frontend (camelCase)
  - [x] Use skeleton loaders during data fetching for better UX
  - [x] Connect to `useAffiliateMetrics` hook with proper userId parameter passing
- [ ] Build time-series charts in `components/affiliate/performance-charts.tsx`
  - [ ] Integrate with `recharts` (lightweight React charting library)
  - [ ] Create daily/weekly/monthly toggle views with appropriate aggregation
  - [ ] Implement multi-series charts comparing different metrics
  - [ ] Add interactive tooltips with detailed information on hover
  - [ ] Ensure charts are responsive and maintain readability at all screen sizes
- [ ] Implement geographic visualization in `components/affiliate/geo-heatmap.tsx`
  - [ ] Use lightweight map library compatible with React Server Components
  - [ ] Color-code regions based on click or conversion density
  - [ ] Include country and region filters for detailed analysis
  - [ ] Add proper fallback for regions with no data
- [ ] Create conversion funnel component in `components/affiliate/conversion-funnel.tsx`
  - [ ] Visualize progression from clicks to conversions
  - [ ] Calculate and display drop-off rates between funnel stages
  - [ ] Use color coding to highlight problematic drop-off points
  - [ ] Include interactive elements to drill down into specific funnel stages

### 7. Payout Dashboard Components
- [ ] Create payout history component in `components/affiliate/payout-history.tsx`
  - [ ] Display detailed transaction table with filterable columns
  - [ ] Show transaction dates, amounts, status indicators, and reference IDs
  - [ ] Add status badges using the conversion status types (pending, cleared, paid, flagged)
  - [ ] Include pagination for large transaction histories
  - [ ] Integrate with `usePayoutData` hook for data fetching
- [ ] Build payout projection widget in `components/affiliate/payout-projection.tsx`
  - [ ] Calculate and display next estimated payout amount
  - [ ] Show progress bar toward minimum payout threshold
  - [ ] Add estimated payout date based on current trends
  - [ ] Implement tooltip explanations for commission calculations

### 8. API Endpoints for Dashboard Data
- [ ] Create affiliate profile API in `app/api/affiliate/profile/route.ts`
  - [ ] Return slug, status, commission rate, and other account details
  - [ ] Add validation for active status before returning sensitive data
  - [ ] Include proper error handling for unauthorized requests
- [x] Implement metrics API in `app/api/affiliate/metrics/route.ts`
  - [x] Add support for date range filtering with default presets
  - [x] Create aggregation functions for time-series data
  - [x] Fixed RLS issues using the admin client to bypass problematic policies
  - [x] Implement caching strategies for frequently accessed data
  - [x] Fixed column name references in queries to match the actual database schema
- [ ] Build referral link API in `app/api/affiliate/links/route.ts`
  - [ ] Support CRUD operations for saved custom links
  - [ ] Track performance metrics per link
  - [ ] Add filtering and sorting capabilities
- [ ] Develop QR code generator in `app/api/affiliate/qrcode/route.ts`
  - [ ] Generate QR codes with customizable parameters
  - [ ] Support various image formats and sizes
  - [ ] Add Graceful Homeschooling branding options
- [ ] Create payout API in `app/api/affiliate/payouts/route.ts`
  - [ ] Return transaction history with status information
  - [ ] Include projection data for pending payouts
  - [ ] Support filtering by date range and status
  - [ ] Design aggregation queries for performance metrics
  - [ ] Implement pagination for large datasets
- [ ] Follow API design best practices for all endpoints
  - [ ] Use RESTful principles established in existing `/api/affiliate/` routes
  - [ ] Match error handling and response formats from affiliate/click/route.ts
  - [ ] Utilize existing validation schemas from `@/lib/validation/affiliate/`
  - [ ] Implement rate limiting and appropriate security measures
  - [ ] Use Zod for data validation and consistent error codes

### 9. Testing & Optimization
- [ ] Implement comprehensive testing strategy
  - [ ] Create Jest unit tests for all utilities and hooks
  - [ ] Build component tests with React Testing Library
  - [ ] Add end-to-end tests with Cypress for critical user flows
  - [ ] Test all API endpoints with appropriate mocking
  - [ ] Test with various affiliate statuses (active, pending, flagged, inactive)
- [ ] Perform accessibility audit
  - [ ] Run automated tests with Axe or similar tool
  - [ ] Complete keyboard navigation testing
  - [ ] Verify screen reader compatibility
  - [ ] Check color contrast compliance with WCAG 2.1 AA standards
- [ ] Optimize performance
  - [ ] Implement code splitting for dashboard sections
  - [ ] Add proper loading states for all async operations
  - [ ] Use skeleton loaders for improved perceived performance
  - [ ] Monitor and optimize bundle size with webpack-bundle-analyzer
  - [ ] Audit Lighthouse scores and address performance issues
  - [ ] Optimize API response size with selective fields
  - [ ] Use Edge API Routes where applicable for reduced latency
  - [ ] Implement proper cache control headers for static assets
- [ ] Implement error handling strategy
  - [ ] Create error boundary components for dashboard sections
  - [ ] Add retry logic for failed API requests
  - [ ] Provide user-friendly error messages
  - [ ] Implement logging for client-side errors

## Technical Considerations

- [x] Add consistent spacing and layout across dashboard pages
- [x] Implement responsive grid layouts for metrics cards
- [ ] Add more interactive filtering options for analytics data
- [ ] Implement keyboard navigation and screen reader support
- [ ] Add proper focus management and ARIA attributes



## Progress Update (June 3, 2025)

### Completed Items
- Successfully integrated `PerformanceChart` and `LinkPerformanceComparison` components into the performance page
- Implemented interactive charts with Recharts for performance metrics including:
  - Line and bar chart options with proper data visualization
  - Interactive tooltips showing precise values for each data point
  - Custom styling with appropriate colors for different metrics
  - Time range filtering (7/30/90 days) with dynamic scale adjustment
- Fixed TypeScript errors related to parameter types and property access
- Implemented tab-based navigation for different metrics (clicks, conversions, earnings, link performance)
- Added responsive card grids and proper spacing between dashboard sections
- Fixed JSX structure issues in the performance page

### Current Focus
- Implement referral link generation with UTM parameters
- Develop QR code generation functionality for mobile sharing
- Create copy and sharing features with proper visual feedback
- Build link analytics component for detailed performance tracking

## Next Steps After Completion
Once the affiliate dashboard UI is fully implemented and tested, we will move on to Task 9 (Develop Admin Console) to provide administrative tools for managing affiliates, reviewing statistics, and processing payouts.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
