# Affiliate Program - Phase 1: Foundation and Integration

## Task Objective
Implement a native affiliate program for the Papers to Profits course that drives incremental revenue and new-user registrations while integrating seamlessly with existing systems.

## Current State Assessment
Currently, the platform has:
- Supabase Auth with unified_profiles table for user data
- Student dashboard at /dashboard
- Admin dashboard at /admin with various features
- Xendit payment integration
- Admin role checks via auth.user_metadata.is_admin

However, there's no affiliate tracking, commission system, or dedicated affiliate dashboard. The platform also lacks UTM parameter handling for affiliate attribution.

## Future State Goal
A comprehensive affiliate system that includes:
1. Seamless authentication integration with context-sensitive login
2. Affiliate dashboard with performance metrics
3. Click tracking and attribution via 30-day cookies
4. Commission calculations with multi-level structure
5. Fraud detection and prevention
6. Admin tools for program management
7. Automated payouts via Xendit

## Implementation Plan

### 1. Database Foundation
- [x] Design and implement affiliate tables extending unified_profiles (Schema documented in `/ProjectDocs/Database/affiliate_program_schema.md`)
- [x] Create proper indexes for performance optimization
- [x] Implement RLS policies for security
- [x] Add affiliate status to unified_profiles (Handled by `affiliate_general_status` and sync trigger, documented in schema)
- [x] Set up test data for development

### 2. Authentication and Access Control
- [ ] Implement affiliate signup flow with OTP verification
- [ ] Create context-sensitive login router
- [ ] Develop dashboard switcher for multi-role users
- [ ] Extend checkAdminAccess for affiliate management
- [ ] Implement role-based authorization for affiliate routes

### 3. Tracking and Attribution
- [ ] Create JS click pixel implementation
- [ ] Implement cookie management for 30-day attribution
- [ ] Add UTM parameter handling
- [ ] Extend Xendit webhook for conversion tracking
- [ ] Set up visitor tracking with fraud prevention

### 4. Dashboard Development
- [ ] Build affiliate dashboard UI
- [ ] Implement metrics and reporting components
- [ ] Create referral link generator with QR code option
- [ ] Develop payout history display
- [ ] Add creative library with Google Drive integration

### 5. Admin Features
- [ ] Extend admin dashboard with affiliate management
- [ ] Create fraud flag review interface
- [ ] Implement payout batch processing
- [ ] Add program settings administration
- [ ] Develop program analytics dashboard

### 6. Backend Systems
- [ ] Implement commission calculation engine
- [ ] Create fraud detection CRON job
- [ ] Develop payout processing system
- [ ] Set up email notification system
- [ ] Implement data retention policies

### 7. Testing and Deployment
- [~] Create comprehensive test suite
  - [x] Batch 1 (affiliates table, unified_profiles sync) tests passed after resolving `updated_at` timestamp issue with `clock_timestamp()`.
  - [x] Batch 2 (affiliate_clicks table) tests passed, including schema corrections (added `updated_at`, corrected `referral_url`) and trigger functionality.
  - [x] Batch 3 (affiliate_conversions table) tests passed. This included creating the `membership_levels` table, adding `membership_level_id` to `unified_profiles`, adding `updated_at` to `affiliate_conversions`, creating its trigger, and aligning tests with the actual `calculate_and_set_conversion_commission` trigger logic and `conversion_status_type` enum.
  - [x] Batch 4 (fraud_flags table and affiliate status update) tests passed. This involved:
    - Correcting the `fraud_flags` schema assumptions (it uses `affiliate_id` directly, not `conversion_id`, and has `details` instead of `evidence`).
    - Updating the `handle_fraud_flag_affiliate_suspension` trigger to use `NEW.affiliate_id` and set affiliate status to `flagged` (as `suspended` was not a valid `affiliate_status_type` enum value).
    - Ensuring `fraud_flags` has an `updated_at` column and an associated trigger.
- [ ] Perform security and penetration testing
- [ ] Conduct load testing for scalability
- [ ] Prepare deployment pipeline
- [ ] Create monitoring and analytics dashboard

## Technical Considerations

### Integration Points
- The affiliate system will leverage existing Supabase Auth but needs additional flows for affiliate signup
- Context-sensitive login requires careful implementation to avoid redirect loops
- Xendit webhook must be extended without disrupting existing payment processing
- Admin dashboard extension should maintain consistent UI/UX

### Performance Considerations
- Cookie management must be efficient and follow best practices
- Database queries should be optimized for affiliate reporting
- Click tracking should have minimal impact on page load performance

### Security Considerations
- Implement proper CSRF protection for all forms
- Ensure RLS policies correctly restrict access to affiliate data
- Prevent fraud through proper validation and monitoring
- Secure admin endpoints with proper authentication checks

## Next Steps
We'll begin by expanding the most complex tasks identified in our complexity analysis and implement the foundational database schema first, followed by authentication integration and click tracking.
