# Affiliate Dashboard UI - Phase 1: Implementation

## Task Objective
Develop a comprehensive, responsive, and user-friendly affiliate dashboard interface that provides affiliates with tools to track performance, generate referral links, and monitor payouts for the Graceful Homeschooling single-product affiliate program.

## Current State Assessment
- Basic placeholder affiliate dashboard UI exists at `/app/affiliate-portal/page.tsx` with sections for stats, referral links, and payouts
- Authentication context (`auth-context.tsx`) is fully implemented and in use
- Middleware.ts already includes route protection for `/affiliate-portal/*` routes with role-based access control
- Affiliate database schema is properly set up with tables for `affiliates`, `affiliate_clicks`, `affiliate_conversions`, and `fraud_flags`
- The `unified_profiles` table contains `is_affiliate` flag for authorization
- AffiliateHeader component exists in components/affiliate/affiliate-header.tsx
- Conversion tracking logic has been implemented in the Xendit webhook handler
- Affiliate status types defined as custom enum: `pending`, `active`, `flagged`, `inactive`
- Conversion status types defined as custom enum: `pending`, `cleared`, `paid`, `flagged`

## Future State Goal
A fully functional affiliate dashboard that:
1. Leverages existing route protection to ensure authorized access
2. Displays comprehensive, real-time metrics and visualizations
3. Provides tools for generating and managing referral links with QR codes
4. Shows payout history and estimated future payouts
5. Delivers a responsive, accessible, and performant user experience (p95 ≤ 1s on 3G)
6. Meets all requirements specified in Task 8 and its subtasks

## Implementation Plan

### 1. Enhance Authentication and Access Controls
- [ ] Verify existing middleware implementation is properly configured for affiliate routes
  - [ ] Test affiliate-specific route protection with various user roles
  - [ ] Add specific affiliate status checking (ensure only `active` affiliates can access portal)
  - [ ] Create appropriate error messages for inactive or pending affiliates
  - [ ] Document the authentication flow in the affiliate dashboard context

### 2. Main Dashboard Layout and Navigation
- [ ] Enhance the existing placeholder layout at `/app/affiliate-portal/page.tsx`
  - [ ] Design responsive grid system for dashboard widgets
  - [ ] Create consistent styling and theming, matching the existing AffiliateHeader component
  - [ ] Implement tabbed navigation for different dashboard sections
  - [ ] Add loading states and error boundaries
  - [ ] Ensure WCAG 2.1 AA compliance for all interface elements
  - [ ] Optimize for mobile viewing with appropriate responsive breakpoints

### 3. Referral Link Generation and Management
- [ ] Build referral link generator component
  - [ ] Enhance existing copy-to-clipboard functionality for the affiliate slug link
  - [ ] Create personalized link with affiliate slug (leveraging the 'a' URL parameter already used by AffiliateTracker)
  - [ ] Add custom parameter support for tracking campaigns (potentially via UTM params that are already extracted in existing tracking service)
  - [ ] Generate QR codes for each referral link
  - [ ] Add UTM parameter customization with preset options
  - [ ] Enable social sharing options with pre-populated messages
  - [ ] Create link performance tracking visualization by campaign/parameter
  - [ ] Build shareable link templates for social media platforms
  - [ ] Include analytics tracking parameters in generated links

### 4. Analytics Dashboard Widgets
- [ ] Develop interactive metrics visualization components
  - [ ] Implement summary cards for key performance indicators:
    - Total earnings (pending/cleared/paid)
    - Click count and CTR
    - Conversion rate
    - Average commission per conversion
  - [ ] Design time-series charts for clicks and conversions
  - [ ] Add conversion funnel visualization
  - [ ] Create geographic heat maps for click distribution (using IP data from affiliate_clicks)
  - [ ] Build payout history and projection tables based on conversion status types
  - [ ] Implement interactive filters for date ranges
  - [ ] Add downloadable reports functionality (CSV/PDF)
  - [ ] Create real-time notifications for new conversions

### 5. API Endpoints for Dashboard Data
- [ ] Develop backend API endpoints for affiliate statistics
  - [ ] Create `/api/affiliate/stats` endpoint with proper authentication
    - [ ] Implement functionality to query data from Supabase tables:
      - `affiliates` - Basic affiliate information (slug, status, commission_rate, is_member)
      - `affiliate_clicks` - Click tracking data and trends
      - `affiliate_conversions` - Conversion data (gmv, commission_amount, status)
      - `fraud_flags` - Any flags affecting affiliate status
  - [ ] Design aggregation queries to calculate:
    - Total clicks, unique visitors, and geographic distribution
    - Conversion rates and trends over time (daily/weekly/monthly views)
    - Commission breakdowns by status (`pending`, `cleared`, `paid`)
    - Earnings projections and upcoming payouts (based on commission calculation logic)
  - [ ] Add caching for improved performance
  - [ ] Build pagination support for large datasets
  - [ ] Implement proper error handling and loading states
  - [ ] Set up data refresh mechanism (real-time or periodic)
  - [ ] Follow pattern established in existing affiliate API routes for consistency

### API Design
- Follow RESTful API design principles established in existing `/api/affiliate/` routes
- Follow existing pattern from affiliate/click/route.ts for error handling and response formats
- Utilize existing validation schemas or extend them from `@/lib/validation/affiliate/`
- Leverage existing authentication patterns from middleware.ts and createServiceRoleClient
- Implement rate limiting for security
- Use consistent error codes and response formats
- Implement data validation using Zod as established in existing code
- Structure API response data to minimize client-side processing

### 6. Payout Management Interface
- [ ] Implement payout history and projections interface
  - [ ] Create payout history table with filtering
  - [ ] Add payout status indicators (pending, processed)
  - [ ] Implement earnings breakdown by conversion
  - [ ] Build payout projections based on current earnings
  - [ ] Add payment method management

### 7. Performance Optimization and Accessibility
- [ ] Optimize dashboard performance and ensure accessibility
  - [ ] Implement code splitting for dashboard components
  - [ ] Add skeleton loaders for improved perceived performance
  - [ ] Implement lazy loading for non-critical components
  - [ ] Ensure WCAG 2.1 AA compliance for all dashboard elements
  - [ ] Optimize for p95 ≤ 1s load time on 3G networks
  - [ ] Add keyboard navigation support
  - [ ] Test with screen readers for accessibility

### Performance Optimization
- Implement client-side caching for frequently accessed data
- Optimize API response size with selective fields
- Use pagination for large datasets
- Implement lazy loading for dashboard widgets
- Optimize images and assets for fast loading
- Apply React Server Components pattern to minimize client bundle size
- Implement staggered loading of dashboard widgets for faster initial render
- Ensure p95 ≤ 1s on 3G connections through aggressive optimization
- Use Edge API Routes where applicable for reduced latency
- Implement proper cache control headers for static assets

### 8. Testing and Quality Assurance
- [ ] Implement comprehensive testing
  - [ ] Write unit tests for API endpoints and frontend components
  - [ ] Set up integration tests for data flow
  - [ ] Conduct cross-browser compatibility testing
  - [ ] Perform accessibility testing (WCAG 2.1 AA)
  - [ ] Test performance on various devices and connection speeds (focusing on 3G)
  - [ ] Conduct security testing for authentication and authorization
  - [ ] Test with various affiliate statuses (active, pending, flagged, inactive)

## Technical Considerations

### Database Integration
- Leverage the existing database schema for affiliates, including:
  - `affiliates` table for affiliate information (slug, commission_rate, is_member, status)
  - `affiliate_clicks` for tracking click data (visitor_id, referral_url, landing_page_url, utm_params)
  - `affiliate_conversions` for tracking conversions (gmv, commission_amount, status, level)
  - `unified_profiles` for user profile data (is_affiliate flag)
  - `fraud_flags` for suspicious activity monitoring
- Commission calculation is already handled by database triggers:
  - Level 1 conversions: 25% for members, 20% for non-members
  - Level 2 conversions: 10% flat rate

### Authentication and Security
- Use the existing `useAuth` hook from `context/auth-context.tsx` for authentication state
- Rely on the existing middleware.ts role checks (is_affiliate flag in unified_profiles)
- Add status verification (only active affiliates, not pending/flagged/inactive)
- Ensure sensitive financial data is properly secured and isolated
- Follow established patterns for API route protection

### State Management
- Use Zustand for client-side state management when necessary
- Leverage React Server Components for server-side operations where possible
- Implement proper data fetching patterns with SWR for automatic revalidation
- Minimize client-side JavaScript for improved performance
- Apply appropriate loading and error states for data operations

### Data Visualization
- Implement responsive and accessible charts using a lightweight visualization library
- Ensure all visualizations have proper ARIA attributes for accessibility
- Include appropriate loading states and error handling

### Responsive Design
- Follow mobile-first approach for all dashboard components
- Use Flexbox and CSS Grid for responsive layouts
- Ensure all interactive elements have appropriate touch targets on mobile

### Accessibility
- Meet WCAG 2.1 AA standards for all dashboard components
- Include keyboard navigation support for all interactive elements
- Provide appropriate text alternatives for visual elements
- Ensure sufficient color contrast for all text and UI elements

## Next Steps After Completion
Once the affiliate dashboard UI is fully implemented and tested, we will move on to Task 9 (Develop Admin Console) to provide administrative tools for managing affiliates, reviewing statistics, and processing payouts.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
