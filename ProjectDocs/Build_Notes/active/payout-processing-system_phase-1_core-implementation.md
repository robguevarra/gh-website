# Payout Processing System - Phase 1: Core Implementation

## Task Objective
Implement a comprehensive admin-triggered payout system that processes affiliate commissions and integrates with Xendit's Disbursement API, ensuring timely and accurate payments to affiliates while maintaining proper financial records and audit trails. The system will prioritize manual admin verification and control over the payout process rather than automated processing.

## Current State Assessment

### Existing Admin Affiliate Management System
- A comprehensive admin console for affiliate management is already implemented at `/app/admin/affiliates/`
- Admin sidebar navigation exists in `components/admin/admin-sidebar.tsx` with Affiliate section
- Affiliate sub-navigation tabs are implemented in `AffiliateNavTabs.tsx` with tabs for List, Analytics, Settings, and Fraud Flags
- Affiliate details are displayed in `components/admin/affiliates/affiliate-detail-view.tsx` with multiple tabs including:
  - Overview tab - Basic profile information
  - Conversions tab - Conversion history
  - Clicks tab - Click tracking data
  - Payouts tab - Payout history table (lines ~850-950)
  - Settings tab - Affiliate-specific settings
- Admin console integrates with an audit logging system via `logAdminActivity` in `lib/actions/activity-log-actions.ts`

### Existing Database Schema
- Database schema has established tables for affiliate program management:
  - `affiliates`: Core affiliate data with status and membership tier associations
  - `affiliate_clicks`: Click tracking data
  - `affiliate_conversions`: Conversion tracking with status field (`pending`, `cleared`, `paid`, `flagged`)
  - `fraud_flags`: System for flagging suspicious activity
  - `affiliate_payouts`: Existing table for tracking payouts with basic fields:
    - `id` (UUID, primary key)
    - `affiliate_id` (foreign key to affiliates)
    - `amount` (numeric)
    - `payout_method` (enum: `bank_transfer`, `xendit`, `manual`)
    - `reference` (string, nullable)
    - `status` (enum: `pending`, `processing`, `completed`, `failed`)
    - `created_at` (timestamp)
    - `transaction_date` (timestamp, nullable)
  - `admin_activity_log`: Table for tracking admin actions

### Existing Server Actions and Components
- `getAffiliatePayouts` server action in `lib/actions/admin/affiliate.actions.ts` fetches paginated payout records
- `PayoutMethodType` and payout status enums are defined in `types/admin/affiliate.ts`
- `AffiliatePayout` type is defined in `types/admin/affiliate.ts`
- Payouts are displayed in `AffiliateDetailView` using the `AffiliatePayoutsTab` component with filtering by method and reference
- Conversion status update functionality exists in `lib/services/affiliate/status-service/conversion-status.ts`
- Validation schemas for payout transactions exist in `lib/validation/affiliate/payout-schema.ts`
- A client component (`components/affiliate/dashboard/payouts-card.tsx`) displays payout information for affiliates

### Missing Components
- No dedicated admin UI exists specifically for payout management and processing
- No admin verification workflow exists for approving conversions or payouts
- No payout preview system exists to review conversions before creating payouts
- No integration with Xendit's Disbursement API for executing affiliate payments
- No detailed reporting or export functionality for payout reconciliation
- Current `affiliate_payouts` table lacks fields for tracking fees, admin verification, and payment details

### Xendit Integration
- Xendit payment integration exists for customer checkout (`components/checkout/xendit-payment.tsx`)
- No dedicated Xendit API service exists for disbursement operations

## Future State Goal
Extend the existing affiliate management console with a comprehensive, secure, and admin-controlled payout processing system that:

### 1. Enhanced Admin Interface Integration
- Extend the existing admin affiliate management UI with a new "Payouts" tab in the affiliate sub-navigation
- Create `/app/admin/affiliates/payouts/page.tsx` as the main payout management dashboard
- Add `/app/admin/affiliates/payouts/preview/page.tsx` for the payout preview and verification interface
- Implement `/app/admin/affiliates/payouts/[payoutId]/page.tsx` for detailed payout viewing
- Maintain design consistency with existing admin UI components and patterns
- Integrate with existing audit logging system via `logAdminActivity`

### 2. Admin Verification Workflow
- Replace the automatic 3-day aging process for conversions with admin-triggered verification
- Add a conversions review interface at `/app/admin/affiliates/conversions/page.tsx`
- Allow admins to review and verify conversions before they become eligible for payouts
- Implement batch verification capabilities to efficiently process multiple conversions
- Record admin_id and verification notes for all verification actions

### 3. Payout Processing and Xendit Integration
- Create a payout preview system showing eligible conversions grouped by affiliate
- Implement a verification step with checkboxes and admin notes before payout creation
- Integrate with Xendit's Disbursement API using a new `lib/services/xendit/disbursement-service.ts`
- Calculate and track fees, net amounts, and gross amounts for all payouts
- Support multiple payout methods (bank transfer as primary) with appropriate fee structures
- Create webhook handler for processing Xendit disbursement status updates
- Update payout and conversion statuses based on Xendit's responses

### 4. Reporting and Data Export
- Generate comprehensive payout reports in multiple formats (CSV, Excel, PDF)
- Include detailed transaction information with admin verification metadata
- Create financial summaries grouped by time periods, affiliates, and verification status
- Implement filtering capabilities for custom date ranges and specific affiliates
- Design reconciliation tools for accounting and financial auditing

### 5. Security and Error Handling
- Implement proper authentication and authorization checks for all payout operations
- Create detailed audit trails capturing admin interactions with timestamps and admin IDs
- Develop robust error handling with detailed error logs and recovery mechanisms
- Add admin notification system for critical errors requiring immediate attention
- Implement idempotency for all financial operations to prevent duplicate transactions

## Implementation Plan

### 1. Database Schema Updates
- [ ] Extend the existing `affiliate_payouts` table with additional fields:
  - `fees` (Decimal)
  - `net_amount` (Decimal)
  - `payment_details` (JSONB) - For storing Xendit-specific data
  - `xendit_batch_id` (Text)
  - `notes` (Text)
  - `updated_at` (Timestamp)
  - `processed_at` (Timestamp)
  - `admin_id` (UUID) - Admin who approved the payout
  - `verification_notes` (Text) - Notes from admin verification process
- [ ] Create `payout_items` table to track individual conversions included in a payout:
  - `id` (UUID, primary key)
  - `payout_id` (UUID, foreign key to affiliate_payouts)
  - `conversion_id` (UUID, foreign key to affiliate_conversions)
  - `amount` (Decimal)
  - `created_at` (Timestamp)
- [ ] Ensure payout status enum includes all needed states: 'pending', 'verified', 'processing', 'completed', 'failed'
- [ ] Create indexes for performance optimization
- [ ] Ensure proper RLS policies are in place for the updated schema

### 2. Create Admin Payout Management UI
- [ ] Create admin payout management interface under `/app/admin/affiliates/payouts/page.tsx`
  - Implement authorization checks for admin access
  - Add filters for payout period, status, and affiliate
  - Create UI for displaying pending, processing, and completed payouts
  - Include total amounts and counts for quick overview
- [ ] Develop a payout preview module in `/app/admin/affiliates/payouts/preview/page.tsx`:
  - UI for reviewing eligible conversions before creating payout records
  - Tables showing conversions grouped by affiliate
  - Display calculated amounts, fees, and totals
  - Include verification checkboxes and notes fields
  - Add confirmation step before processing
- [ ] Add payout detail view in `/app/admin/affiliates/payouts/[payoutId]/page.tsx`
  - Display comprehensive information about a specific payout
  - List individual conversions included in the payout
  - Show processing history and timestamps
  - Include admin verification notes
- [ ] Create reporting and export functionality:
  - Generate CSV/Excel reports of payout data
  - Include filters for customizing report contents
  - Provide historical payout report generation
  - Implement batch export for reconciliation purposes

### 3. Implement Server Actions for Payout Management
- [ ] Develop core server actions in `lib/actions/admin/payout-actions.ts`:
  - `getEligiblePayouts` - Fetch conversions ready for payout (status = 'cleared')
  - `previewPayoutBatch` - Group eligible conversions by affiliate with calculated amounts
  - `verifyPayoutBatch` - Mark reviewed payouts as verified by admin
  - `processPayoutBatch` - Trigger actual processing of verified payouts via Xendit
  - `getPayoutHistory` - Retrieve historical payout records with filtering
  - `getPayoutDetails` - Get detailed information about a specific payout
  - `exportPayoutData` - Generate downloadable report files
- [ ] Implement proper validation for all actions using Zod schemas
- [ ] Add comprehensive error handling and logging
- [ ] Ensure all actions require admin authorization

### 4. Implement Manual Conversion Status Management
- [ ] Create interface for admins to review pending conversions in `/app/admin/affiliates/conversions/page.tsx`
  - Display conversions that need verification
  - Allow filtering by age, amount, affiliate
  - Provide batch actions for status transitions
- [ ] Implement `verifyConversions` server action to transition conversions from 'pending' to 'cleared'
  - Support batch operations for efficiency
  - Add verification notes and admin ID
  - Add detailed logging for audit trail
  - Include fraud check validation before clearing
- [ ] Update `updateConversionStatus` function to record admin who made the change
- [ ] Add notifications to affiliates when conversions are cleared and eligible for payout

### 5. Integrate Xendit Disbursement API
- [ ] Create `lib/services/xendit/disbursement-service.ts`:
  - Implement authentication with Xendit API
  - Create functions for batch disbursement creation
  - Add webhook handling for disbursement status updates
  - Include response parsing and error handling
- [ ] Implement secure storage and access of Xendit API credentials
- [ ] Set up Xendit webhook endpoint for status updates:
  - Create `/api/webhooks/xendit/disbursement` endpoint
  - Implement signature verification for security
  - Add logic to update payout statuses based on webhook data

### 6. Implement Fee Calculation and Status Updates
- [ ] Create fee calculation service:
  - Calculate Xendit disbursement fees based on their rate structure
  - Handle different payment methods with varying fee structures
  - Implement commission tier-based calculations
- [ ] Set up status update flow:
  - Update payout status based on Xendit responses
  - Update related conversion statuses when payout is completed
  - Maintain status history for auditing
  - Send notifications on status changes

### 7. Error Handling and Recovery Mechanisms
- [ ] Implement robust error handling:
  - Handle API timeouts and connection issues
  - Create specialized error types for different failure scenarios
  - Add detailed error logging with context information
- [ ] Create admin-accessible recovery interface:
  - Allow admins to retry failed payouts
  - Provide manual override options for edge cases
  - Include detailed error information to guide resolution
  - Record all retry attempts and manual interventions

### 8. Create Detailed Logging and Reporting
- [ ] Implement comprehensive admin-focused logging system:
  - Log all payout operations with unique correlation IDs
  - Track state transitions and admin verification actions
  - Record API requests and responses with timestamps
  - Create audit trails for all financial operations
  - Capture admin verification decisions and justifications
- [ ] Develop admin monitoring interface:
  - Dashboard for viewing payout status and history
  - Filtering by admin, verification status, and payment status
  - Advanced search capabilities across all payout data
  - Alert system for critical errors and pending verification tasks
  - Visual indicators for verification status and bottlenecks
- [ ] Implement robust reporting system:
  - Create report generation service with admin context
  - Support multiple export formats (CSV, Excel, PDF)
  - Include detailed transaction data with verification metadata
  - Provide summaries by time period, affiliate, admin, and status
  - Add financial reconciliation features with verification checkpoints
  - Create verification efficiency reports for process improvement

### 9. Security and Access Controls
- [ ] Implement fine-grained permission controls for payout management
  - Create specific roles for payout verification vs. processing
  - Require additional authentication for high-value payouts
  - Implement approval workflows for payouts above certain thresholds
  - Add IP restriction options for sensitive payout operations
- [ ] Add comprehensive activity logging for security purposes
  - Record all access attempts to payout management interfaces
  - Log all actions taken within the payout system
  - Implement suspicious activity detection
  - Create admin notification system for unusual patterns
- [ ] Secure all Xendit API integrations
  - Use environment variables for API credentials
  - Implement proper encryption for sensitive data
  - Add API rate limiting and monitoring
  - Create secure webhook handling with signature verification

## Technical Considerations

### Security
- [ ] All financial operations must have proper authentication and authorization
- [ ] Implement multi-factor authentication for payout verification and processing
- [ ] Xendit API credentials must be stored securely using environment variables
- [ ] Implement webhook signature verification to prevent spoofing
- [ ] Use HTTPS for all API communications
- [ ] Follow least-privilege principle for database operations
- [ ] Implement rate limiting to prevent abuse
- [ ] Create access logs for all payout-related activities

### Performance
- [ ] Optimize database queries for payout management interfaces
- [ ] Use batch operations for database updates when possible
- [ ] Implement proper indexing on frequently queried fields
- [ ] Use connection pooling for database operations
- [ ] Consider caching for frequently accessed reference data
- [ ] Monitor query performance and optimize as needed

### Reliability
- [ ] Implement idempotency for all financial operations
- [ ] Use database transactions to maintain data integrity
- [ ] Create robust error handling and admin notification systems
- [ ] Implement circuit breakers for external API calls
- [ ] Set up monitoring and alerting for critical processes
- [ ] Create detailed logs to aid in troubleshooting

### Compliance
- [ ] Maintain detailed audit trails for all financial transactions
  - Ensure all verification steps are documented
  - Record admin IDs for all approval actions
  - Maintain comprehensive transaction history
  - Implement data retention policies aligned with regulations
- [ ] Ensure all operations comply with financial regulations
  - Add disclaimers and compliance notices in the admin interface
  - Implement country-specific validation rules if needed
  - Create compliance reporting capabilities
  - Document compliance considerations in admin guides
- [ ] Implement proper data retention policies
- [ ] Handle sensitive financial information according to security best practices
- [ ] Follow Xendit's security requirements and API guidelines

## Completion Status

This phase is currently in the planning stage. Implementation will begin after the build note is reviewed and approved.

## Next Steps After Completion
After implementing the core payout processing system, we will proceed to Task 11 (Implement Email Notification System) which will enhance the affiliate experience by providing timely updates about payouts, status changes, and account notifications.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
