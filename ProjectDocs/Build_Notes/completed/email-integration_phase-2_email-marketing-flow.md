# Email Integration - Phase 2: Email Marketing Flow with Amazon SES

## Task Objective
Implement a robust email delivery system using Amazon SES that will enable transactional emails, marketing campaigns, and automated sequences. The implementation needs to support:
- Reliable delivery of transactional emails (welcome, password reset, receipts, etc.)
- Marketing campaign creation and management for promotional content
- Automated email sequences triggered by user actions (course enrollment, completion, etc.)
- Email analytics and reporting
- User subscription management and preference controls
- Template-based email creation with variable substitution

## Current State Assessment
- The database schema includes tables for `email_templates`, `email_campaigns`, `campaign_recipients`, `email_automations`, and `user_email_preferences` as defined in `db/migrations/04_email_marketing_tables.sql`
- Architecture planning for email marketing exists in `ProjectDocs/Architecture/email-marketing.md`
- The platform currently lacks an email delivery system implementation
- No integration with any email service provider is currently in place
- User email preferences and subscription management functionality is not implemented
- The platform needs a way to track email analytics (opens, clicks, etc.)

## Future State Goal
A fully functional email marketing system integrated with Amazon SES, featuring:

- **Email Delivery System**
  - Reliable transactional email delivery with proper error handling and retry logic
  - Batch processing for bulk emails with rate limiting to adhere to AWS SES sending quotas
  - Secure handling of email templates with variable substitution

- **Administration Interface**
  - Email template management (creation, editing, testing, archiving)
  - Campaign creation and scheduling
  - Automation workflow creation with visual builder
  - Email analytics dashboard

- **User-Facing Features**
  - Subscription preference management
  - Email click/open tracking
  - Personalized content delivery

- **Integration Points**
  - Seamless integration with payment and enrollment flows
  - Course progress triggers for educational emails
  - User segmentation based on activities and preferences

## Implementation Plan

### 1. Amazon SES Setup and Configuration
- [ ] **AWS SES Setup**
  - Set up an AWS account if not already established
  - Create and verify domain ownership for email sending
  - Configure DKIM and SPF records for improved deliverability
  - Set up proper IAM roles and policies for secure SES access
  - Apply for production access to move out of the SES sandbox

- [ ] **Environment Configuration**
  - Create secure environment variables for AWS credentials
  - Configure AWS SDK in the application
  - Implement logging for SES operations
  - Set up proper error handling and notification system

### 2. Email Service Layer Implementation
- [ ] **Core Email Service**
  - Create `lib/services/email/ses-client.ts` for AWS SES configuration
  - Implement `lib/services/email/email-service.ts` with core sending functionality
  - Add retry logic and error handling for failed deliveries
  - Implement rate limiting to respect AWS SES quotas
  - Add email logging to database for tracking

- [ ] **Template Processing System**
  - Create template rendering engine with Handlebars or similar
  - Implement variable substitution in email templates
  - Add MJML processing for responsive email creation
  - Create preview generation functionality

- [ ] **Transactional Email Implementation**
  - Create helper functions for common transactional emails
    - Welcome emails
    - Password reset
    - Receipt/invoice emails
    - Course enrollment confirmation
    - Course completion congratulations

### 3. API Routes and Server Actions

- [ ] **Admin Email Template API Endpoints**
  - Create `app/api/admin/email/templates/route.ts`
    ```typescript
    // GET /api/admin/email/templates
    // List all templates with pagination and filtering
    // Query params: page, limit, search, category
    // Returns: { templates: Template[], totalCount: number }
    
    // POST /api/admin/email/templates
    // Create a new template
    // Body: { name, description, subject, htmlContent, textContent, variables, category }
    // Returns: { id, name, ... }
    
    // GET /api/admin/email/templates/[id]
    // Get template details
    // Returns: { id, name, description, subject, htmlContent, textContent, variables, ... }
    
    // PUT /api/admin/email/templates/[id]
    // Update template
    // Body: { name, description, subject, htmlContent, textContent, variables, category }
    // Returns: { id, name, ... }
    
    // DELETE /api/admin/email/templates/[id]
    // Delete template
    // Returns: { success: true }
    
    // POST /api/admin/email/templates/[id]/preview
    // Generate preview with test data
    // Body: { testData }
    // Returns: { subject, htmlContent, textContent }
    
    // POST /api/admin/email/templates/[id]/test
    // Send test email
    // Body: { testEmail, testData }
    // Returns: { success: true, messageId }
    ```

- [ ] **Admin Email Campaign API Endpoints**
  - Create `app/api/admin/email/campaigns/route.ts`
    ```typescript
    // GET /api/admin/email/campaigns
    // List all campaigns with pagination and filtering
    // Query params: page, limit, search, status
    // Returns: { campaigns: Campaign[], totalCount: number }
    
    // POST /api/admin/email/campaigns
    // Create a new campaign
    // Body: { name, description, templateId, senderEmail, senderName, segmentId }
    // Returns: { id, name, ... }
    
    // GET /api/admin/email/campaigns/[id]
    // Get campaign details
    // Returns: { id, name, description, templateId, senderEmail, senderName, status, ... }
    
    // PUT /api/admin/email/campaigns/[id]
    // Update campaign
    // Body: { name, description, templateId, senderEmail, senderName, segmentId }
    // Returns: { id, name, ... }
    
    // DELETE /api/admin/email/campaigns/[id]
    // Delete campaign
    // Returns: { success: true }
    
    // POST /api/admin/email/campaigns/[id]/schedule
    // Schedule campaign
    // Body: { scheduledAt }
    // Returns: { id, status: 'scheduled', scheduledAt }
    
    // POST /api/admin/email/campaigns/[id]/send
    // Send campaign immediately
    // Returns: { id, status: 'sending' }
    
    // POST /api/admin/email/campaigns/[id]/cancel
    // Cancel scheduled campaign
    // Returns: { id, status: 'cancelled' }
    
    // GET /api/admin/email/campaigns/[id]/analytics
    // Get campaign analytics
    // Returns: { sent, delivered, opened, clicked, bounced, complained, unsubscribed }
    
    // GET /api/admin/email/campaigns/[id]/recipients
    // Get campaign recipients with status
    // Query params: page, limit, status
    // Returns: { recipients: Recipient[], totalCount: number }
    ```

- [ ] **Admin Email Automation API Endpoints**
  - Create `app/api/admin/email/automations/route.ts`
    ```typescript
    // GET /api/admin/email/automations
    // List all automations with pagination and filtering
    // Query params: page, limit, search, status
    // Returns: { automations: Automation[], totalCount: number }
    
    // POST /api/admin/email/automations
    // Create a new automation
    // Body: { name, triggerType, triggerCondition, status, workflowSteps }
    // Returns: { id, name, ... }
    
    // GET /api/admin/email/automations/[id]
    // Get automation details
    // Returns: { id, name, triggerType, triggerCondition, status, workflowSteps, ... }
    
    // PUT /api/admin/email/automations/[id]
    // Update automation
    // Body: { name, triggerType, triggerCondition, status, workflowSteps }
    // Returns: { id, name, ... }
    
    // DELETE /api/admin/email/automations/[id]
    // Delete automation
    // Returns: { success: true }
    
    // POST /api/admin/email/automations/[id]/activate
    // Activate automation
    // Returns: { id, status: 'active' }
    
    // POST /api/admin/email/automations/[id]/deactivate
    // Deactivate automation
    // Returns: { id, status: 'inactive' }
    
    // GET /api/admin/email/automations/[id]/analytics
    // Get automation analytics
    // Returns: { triggered, completed, ... }
    ```

- [ ] **Admin Email Analytics API Endpoints**
  - Create `app/api/admin/email/analytics/route.ts`
    ```typescript
    // GET /api/admin/email/analytics/overview
    // Get overall email analytics
    // Query params: startDate, endDate
    // Returns: { delivered, opened, clicked, bounced, complained, unsubscribed, ... }
    
    // GET /api/admin/email/analytics/campaigns
    // Get campaign performance comparison
    // Query params: startDate, endDate, limit
    // Returns: { campaigns: [{ id, name, sent, opened, clicked, ... }] }
    
    // GET /api/admin/email/analytics/automations
    // Get automation performance
    // Query params: startDate, endDate, limit
    // Returns: { automations: [{ id, name, triggered, completed, ... }] }
    ```

- [ ] **User Email Preference API Endpoints**
  - Create `app/api/user/email-preferences/route.ts`
    ```typescript
    // GET /api/user/email-preferences
    // Get current user's email preferences
    // Returns: { marketingEmails, transactionalEmails, newsletter, courseUpdates, ... }
    
    // PUT /api/user/email-preferences
    // Update current user's email preferences
    // Body: { marketingEmails, transactionalEmails, newsletter, courseUpdates, ... }
    // Returns: { marketingEmails, transactionalEmails, newsletter, courseUpdates, ... }
    
    // GET /api/user/email-preferences/unsubscribe/[token]
    // Unsubscribe using secure token (public endpoint)
    // Returns: { success: true, preferences: { ... } }
    ```

- [ ] **Email Tracking API Endpoints**
  - Create `app/api/email/track/open/route.ts`
    ```typescript
    // GET /api/email/track/open/[trackingId]
    // Track email opening via 1x1 transparent pixel
    // Returns: 1x1 transparent GIF
    ```
  
  - Create `app/api/email/track/click/route.ts`
    ```typescript
    // GET /api/email/track/click/[trackingId]
    // Track email link clicks and redirect
    // Query params: url (target URL to redirect to)
    // Action: Record click and redirect to target URL
    ```

- [ ] **SES Webhook Handler**
  - Create `app/api/webhooks/ses/route.ts`
    ```typescript
    // POST /api/webhooks/ses
    // Handle SES event notifications
    // Body: AWS SNS notification for bounces, complaints, deliveries
    // Actions:
    //   - Record bounce/complaint in database
    //   - Update user preferences for hard bounces/complaints
    //   - Log delivery confirmation
    // Returns: { success: true }
    ```

### 4. Admin Interface Development

- [ ] **Email Template Management UI**
  - Create `app/dashboard/email/templates/page.tsx` for template listing
    ```tsx
    // Components needed:
    // - TemplateListView: Main component with search, filtering, and pagination
    // - TemplateCard: Display template summary with preview thumbnail
    // - TemplateFilters: Categories, date range, search field
    // - PaginationControls: Standard pagination component
    // - CreateTemplateButton: Action button with modal or page navigation
    ```
  
  - Create `app/dashboard/email/templates/[id]/page.tsx` for template editing
    ```tsx
    // Components needed:
    // - TemplateForm: Main form with multiple tabs/sections
    // - RichTextEditor: WYSIWYG editor for HTML content (using TipTap or similar)
    // - PlainTextEditor: For plain text alternative
    // - VariableManager: UI for managing template variables
    // - TemplateTester: Preview pane with sample data input
    // - ResponsivePreview: Toggle between desktop/mobile views
    // - TestEmailSender: Form to send test email to specified address
    ```

  - Create reusable components in `components/dashboard/email/templates/`
    ```tsx
    // - VariableSelector.tsx: UI for selecting and inserting variables
    // - PreviewFrame.tsx: Sandboxed iframe for email preview
    // - TemplateVersionHistory.tsx: View and restore previous versions
    // - TemplateDuplicator.tsx: Clone template functionality
    // - CategorySelector.tsx: Manage template categories
    ```

- [ ] **Campaign Management UI**
  - Create `app/dashboard/email/campaigns/page.tsx` for campaign listing
    ```tsx
    // Components needed:
    // - CampaignListView: Main component with status filtering and search
    // - CampaignStatusBadge: Visual indicator of campaign status
    // - CampaignStatsCard: Brief analytics overview of each campaign
    // - CampaignFilters: Status, date range, performance filters
    // - CreateCampaignButton: Action button with wizard or page navigation
    ```
  
  - Create `app/dashboard/email/campaigns/[id]/page.tsx` for campaign details/editing
    ```tsx
    // Components needed:
    // - CampaignForm: Main form with step-by-step interface
    // - RecipientSelector: Audience selection with count preview
    // - SegmentBuilder: Create/select recipient segments
    // - TemplateSelector: Choose and preview email template
    // - VariableMapper: Map segment data to template variables
    // - SchedulingInterface: Date/time picker with timezone selection
    // - SendTestButton: Send test campaign email
    ```
  
  - Create `app/dashboard/email/campaigns/[id]/analytics/page.tsx` for performance tracking
    ```tsx
    // Components needed:
    // - CampaignAnalyticsOverview: Summary metrics card
    // - DeliveryMetricsChart: Visualization of send/delivery rates
    // - EngagementMetricsChart: Open and click rate visualization
    // - LinkPerformanceTable: Breakdown of link clicks within email
    // - RecipientActivityTable: List of user interactions with filtering
    // - GeographicDistributionMap: Visual map of recipient locations
    // - DeviceBreakdownChart: Email client/device usage stats
    ```

- [ ] **Automation Management UI**
  - Create `app/dashboard/email/automations/page.tsx` for automation listing
    ```tsx
    // Components needed:
    // - AutomationListView: Main component with status filtering
    // - AutomationStatusToggle: Active/inactive toggle switch
    // - TriggerTypeBadge: Visual indicator of trigger type
    // - AutomationMetricsCard: Brief performance overview
    // - CreateAutomationButton: Action button to create new automation
    ```
  
  - Create `app/dashboard/email/automations/[id]/page.tsx` for workflow editing
    ```tsx
    // Components needed:
    // - AutomationForm: Basic metadata editor
    // - TriggerSelector: UI for selecting and configuring triggers
    // - WorkflowCanvas: Visual editor using ReactFlow or similar
    // - NodePalette: Draggable node types (email, delay, condition, etc.)
    // - NodeConfigPanel: Configuration sidebar for selected node
    // - ConnectionManager: Handle connections between nodes
    // - AutomationTester: Test trigger and workflow execution
    ```
  
  - Create `app/dashboard/email/automations/[id]/analytics/page.tsx` for performance tracking
    ```tsx
    // Components needed:
    // - AutomationAnalyticsOverview: Summary metrics card
    // - ConversionFunnelChart: Visualization of workflow progression
    // - NodePerformanceTable: Stats for each workflow step
    // - TimeToCompletionChart: Time analysis for workflow completion
    // - RecipientJourneyTable: Individual user progression through workflow
    // - A/BTestResultsView: If automation includes variants
    ```

- [ ] **Analytics Dashboard UI**
  - Create `app/dashboard/email/analytics/page.tsx` for consolidated reporting
    ```tsx
    // Components needed:
    // - EmailAnalyticsOverview: Summary metrics cards
    // - DateRangeSelector: Time period selection
    // - DeliverabilityTrendsChart: Sending volume and success rates
    // - EngagementTrendsChart: Open/click trends over time
    // - TopPerformingEmailsTable: Best-performing templates and campaigns
    // - SubscriberGrowthChart: List size trends and churn rates
    // - ExportReportButton: Generate and download reports
    ```

### 5. User-Facing Components

- [ ] **Email Preference Management UI**
  - Create `app/account/email-preferences/page.tsx` for user subscription management
    ```tsx
    // Components needed:
    // - EmailPreferenceForm: Main form with preference toggles
    // - CategoryPreferenceGroup: Grouping of related preferences
    // - PreferenceToggle: Individual preference toggle with description
    // - CommunicationHistoryList: Recent emails received
    // - SavePreferencesButton: Submit button with success confirmation
    ```

  - Create unsubscribe page at `app/unsubscribe/[token]/page.tsx`
    ```tsx
    // Components needed:
    // - UnsubscribeConfirmation: Status confirmation with options
    // - CategoryUnsubscribeOptions: Fine-grained unsubscribe choices
    // - ResubscribeOption: Simple way to resubscribe if unsubscribed by mistake
    // - FeedbackForm: Optional feedback on why unsubscribing
    ```

  - Create notification preference components in `components/account/`
    ```tsx
    // - EmailDigestSelector.tsx: Frequency selection for digest emails
    // - NotificationScheduleSelector.tsx: Time of day preference for emails
    // - CategoryManager.tsx: Manage custom interest categories
    ```

- [ ] **Email Tracking Components**
  - Create tracking pixel component in `components/email/TrackingPixel.tsx`
    ```tsx
    // Component that renders a 1x1 transparent GIF with tracking URL
    // Used in all HTML email templates for open tracking
    // Includes user ID, campaign ID, and timestamp encoding
    ```

  - Create link tracking wrapper in `components/email/TrackedLink.tsx`
    ```tsx
    // Component that wraps links in emails with tracking URL
    // Handles redirecting through tracking endpoint
    // Includes link ID, user ID, campaign ID, and timestamp encoding
    ```

  - Add tracking utilities in `lib/utils/email-tracking.ts`
    ```typescript
    // Utilities for:
    // - Generating secure tracking tokens
    // - Creating tracking URLs
    // - Encoding/decoding tracking parameters
    // - Generating unique tracking IDs
    ```

- [ ] **Email Template Components**
  - Create base email layout in `components/email/BaseEmailLayout.tsx`
    ```tsx
    // Standard email layout with:
    // - Header with logo
    // - Content area
    // - Footer with unsubscribe links
    // - Legal compliance elements
    // - Responsive design elements
    ```

  - Create reusable email components in `components/email/`
    ```tsx
    // - ButtonComponent.tsx: Styled button for email CTAs
    // - HeaderComponent.tsx: Customizable email header
    // - FooterComponent.tsx: Standard footer with required elements
    // - ImageComponent.tsx: Responsive image handling
    // - DividerComponent.tsx: Styled separator
    // - SocialLinks.tsx: Social media icon links
    ```

  - Create email preview components in `components/email-preview/`
    ```tsx
    // - PreviewFrame.tsx: Safe iframe for email preview
    // - DevicePreview.tsx: Show email in desktop/tablet/mobile frames
    // - PreviewControls.tsx: Controls for testing different data scenarios
    ```

### 6. Integration with Existing Systems

- [ ] **Payment System Integration**
  - Update `payment-actions.ts` and related webhooks to trigger emails
    ```typescript
    // Update webhooks/xendit/route.ts to include email sending after payment confirmation
    // Add email triggers for:
    // - Purchase confirmation
    // - Receipt/invoice
    // - Welcome series initiation
    // - Failed payment notification
    ```
  
  - Create upsell/cross-sell email sequences in `lib/services/email/sequences/`
    ```typescript
    // - post-purchase-sequence.ts: Define timing and content for post-purchase emails
    // - cross-sell-sequence.ts: Logic for suggesting related products based on purchase
    // - renewal-reminder-sequence.ts: For subscription-based products
    ```
  
  - Add analytics tracking in `lib/services/analytics/purchase-attribution.ts`
    ```typescript
    // Track which emails lead to purchases
    // Connect email campaign IDs with transaction records
    // Calculate ROI and conversion rates for email campaigns
    ```

- [ ] **Course System Integration**
  - Update course progress tracking to trigger emails
    ```typescript
    // In lib/stores/course/actions/lesson.ts:
    // - Add email trigger hooks at key progress points
    // - Track milestone achievements for congratulatory emails
    // - Implement inactivity detection for re-engagement emails
    ```
  
  - Create course-specific email templates and handlers
    ```typescript
    // In lib/services/email/templates/course/:
    // - welcome-to-course.ts: First access to a course
    // - module-completed.ts: Completion celebration
    // - new-content-available.ts: When course is updated
    // - inactivity-reminder.ts: When user hasn't accessed in X days
    // - course-completion.ts: Congratulations on finishing
    ```
  
  - Add scheduled reminders and drip content emails
    ```typescript
    // In lib/services/email/schedulers/:
    // - lesson-reminder.ts: Remind about upcoming or incomplete lessons
    // - content-drip.ts: Gradually release course content on schedule
    // - study-schedule.ts: Help users stay on track with their goals
    ```

- [ ] **User Profile Integration**
  - Create profile synchronization service in `lib/services/users/profile-sync.ts`
    ```typescript
    // - Ensure email preferences are in sync with user profiles
    // - Update email subscriptions when profile data changes
    // - Consolidate contact information across systems
    ```
  
  - Add email interaction history to user profiles
    ```typescript
    // In lib/services/users/engagement-tracking.ts:
    // - Track which emails the user opens and clicks
    // - Record email preferences and opt-out history
    // - Calculate engagement score based on email interaction
    ```
  
  - Create personalization service in `lib/services/users/personalization.ts`
    ```typescript
    // - Select content based on user behavior and preferences
    // - Customize email sending times based on open patterns
    // - Adjust email frequency based on engagement level
    ```

### 7. Data Models and Schema Extensions

- [ ] **Core Email Types**
  - Create TypeScript types in `lib/types/email.ts`
    ```typescript
    // Define core types
    export type EmailTemplate = {
      id: string;
      name: string;
      description?: string;
      subject: string;
      htmlContent: string;
      textContent: string;
      variables: EmailVariable[];
      category: string;
      createdAt: Date;
      updatedAt: Date;
    };
    
    export type EmailVariable = {
      name: string;
      description?: string;
      defaultValue?: string;
      required: boolean;
    };
    
    export type EmailCampaign = {
      id: string;
      name: string;
      description?: string;
      status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
      templateId: string;
      senderEmail: string;
      senderName: string;
      scheduledAt?: Date;
      completedAt?: Date;
      recipientCount?: number;
      segmentId?: string;
      createdAt: Date;
      updatedAt: Date;
    };
    
    export type CampaignRecipient = {
      id: string;
      campaignId: string;
      userId: string;
      email: string;
      sentAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      unsubscribedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    
    export type EmailAutomation = {
      id: string;
      name: string;
      triggerType: 'user_signup' | 'course_enrollment' | 'course_completion' | 'inactivity' | 'custom';
      triggerCondition: Record<string, any>;
      status: 'active' | 'inactive' | 'paused';
      workflowSteps: AutomationStep[];
      createdAt: Date;
      updatedAt: Date;
    };
    
    export type AutomationStep = EmailStep | DelayStep | ConditionalStep | ActionStep;
    
    export type EmailStep = {
      type: 'email';
      id: string;
      templateId: string;
      position: number;
    };
    
    export type DelayStep = {
      type: 'delay';
      id: string;
      duration: number; // in hours
      position: number;
    };
    
    export type ConditionalStep = {
      type: 'condition';
      id: string;
      condition: {
        field: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
        value: any;
      };
      positiveStepId: string;
      negativeStepId: string;
      position: number;
    };
    
    export type ActionStep = {
      type: 'action';
      id: string;
      actionType: 'tag' | 'untag' | 'update_profile' | 'webhook';
      config: Record<string, any>;
      position: number;
    };
    
    export type UserEmailPreferences = {
      id: string;
      userId: string;
      marketingEmails: boolean;
      transactionalEmails: boolean;
      newsletter: boolean;
      courseUpdates: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    ```

- [ ] **API Request/Response Types**
  - Create API type definitions in `lib/types/api/email.ts`
    ```typescript
    // Template API types
    export type CreateTemplateRequest = {
      name: string;
      description?: string;
      subject: string;
      htmlContent: string;
      textContent: string;
      variables: EmailVariable[];
      category: string;
    };
    
    export type UpdateTemplateRequest = Partial<CreateTemplateRequest>;
    
    // Campaign API types
    export type CreateCampaignRequest = {
      name: string;
      description?: string;
      templateId: string;
      senderEmail: string;
      senderName: string;
      segmentId?: string;
    };
    
    export type ScheduleCampaignRequest = {
      scheduledAt: string; // ISO date string
    };
    
    // Automation API types
    export type CreateAutomationRequest = {
      name: string;
      triggerType: string;
      triggerCondition: Record<string, any>;
      status: string;
      workflowSteps: any[];
    };
    
    export type UpdateAutomationRequest = Partial<CreateAutomationRequest>;
    ```

- [ ] **Zod Validation Schemas**
  - Create validation schemas in `lib/validations/email-schemas.ts`
    ```typescript
    import { z } from 'zod';
    
    // Template validation
    export const emailVariableSchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      defaultValue: z.string().optional(),
      required: z.boolean().default(false),
    });
    
    export const createTemplateSchema = z.object({
      name: z.string().min(3).max(100),
      description: z.string().optional(),
      subject: z.string().min(1).max(100),
      htmlContent: z.string().min(1),
      textContent: z.string().min(1),
      variables: z.array(emailVariableSchema).default([]),
      category: z.string(),
    });
    
    // Campaign validation
    export const createCampaignSchema = z.object({
      name: z.string().min(3).max(100),
      description: z.string().optional(),
      templateId: z.string().uuid(),
      senderEmail: z.string().email(),
      senderName: z.string().min(1),
      segmentId: z.string().optional(),
    });
    
    // Email preferences validation
    export const updateEmailPreferencesSchema = z.object({
      marketingEmails: z.boolean(),
      transactionalEmails: z.boolean(),
      newsletter: z.boolean(),
      courseUpdates: z.boolean(),
    });
    ```

### 8. Testing and Validation

- [ ] **Email Delivery Testing**
  - Create testing framework in `tests/email/`
    ```typescript
    // tests/email/delivery.test.ts
    // - Test basic email delivery via SES
    // - Validate proper handling of SES responses
    // - Test error handling and retry logic
    // - Verify rate limiting functionality
    // - Validate event logging and monitoring
    ```
  
  - Test transactional email flows
    ```typescript
    // tests/email/transactional.test.ts
    // - Verify welcome email sends correctly
    // - Test password reset flow
    // - Validate purchase confirmation emails
    // - Test course enrollment confirmation
    // - Verify account notification emails
    ```
  
  - Test campaign batch sending
    ```typescript
    // tests/email/campaigns.test.ts
    // - Test segmentation and targeting
    // - Validate proper batching of larger campaigns
    // - Test scheduling and throttling
    // - Verify campaign status updates
    // - Test cancellation functionality
    ```

- [ ] **Email Rendering Testing**
  - Create email rendering test suite
    ```typescript
    // tests/email/rendering.test.ts
    // - Test template rendering with variables
    // - Validate HTML/CSS compatibility
    // - Check for common rendering issues
    // - Test responsive layouts at different widths
    ```
  
  - Set up email client testing matrix
    ```
    // Test matrix for manual verification:
    // - Gmail (web, Android, iOS)
    // - Outlook (desktop, web, mobile)
    // - Apple Mail (macOS, iOS)
    // - Yahoo Mail
    // - ProtonMail
    // - Dark mode variants
    ```
  
  - Implement accessibility checks
    ```typescript
    // tests/email/accessibility.test.ts
    // - Check color contrast in templates
    // - Verify alt text for images
    // - Test semantic structure
    // - Validate text alternatives
    ```

- [ ] **Integration Testing**
  - Create integration tests for payment triggers
    ```typescript
    // tests/integration/payment-email-integration.test.ts
    // - Test purchase confirmation email flow
    // - Validate receipt generation
    // - Test failed payment notifications
    // - Verify cross-sell email sequences
    ```
  
  - Test course system triggers
    ```typescript
    // tests/integration/course-email-integration.test.ts
    // - Test enrollment welcome sequence
    // - Validate lesson completion emails
    // - Test course completion certificate delivery
    // - Verify inactivity reminder triggers
    ```
  
  - Create end-to-end user journey tests
    ```typescript
    // tests/e2e/email-user-journey.test.ts
    // - Test full signup to purchase to course completion flow
    // - Validate all email touchpoints trigger correctly
    // - Test unsubscribe and preference management
    // - Verify analytics tracking across journey
    ```

### 9. Monitoring and Analytics

- [ ] **Email Performance Dashboard Implementation**
  - Create email analytics service in `lib/services/analytics/email-analytics.ts`
    ```typescript
    // Implement methods for:
    // - calculating delivery rates
    // - tracking open and click rates
    // - monitoring bounces and complaints
    // - analyzing engagement by time and segment
    // - generating email performance reports
    ```
  
  - Build real-time dashboard components
    ```tsx
    // In components/dashboard/analytics/email/:
    // - DeliveryRateCard.tsx: Real-time delivery status
    // - EngagementMetricsChart.tsx: Open/click visualization
    // - BounceMonitorCard.tsx: Track bounce rates and issues
    // - EmailPerformanceTable.tsx: Sortable metrics by campaign
    // - EmailVolumeChart.tsx: Track sending volume over time
    ```
  
  - Implement exportable reports
    ```typescript
    // In lib/services/reports/email-reports.ts:
    // - generateCampaignReport(): Create CSV/PDF of campaign performance
    // - generateEmailAnalyticsReport(): Overall email program metrics
    // - generateComplianceReport(): Bounces, complaints, unsubscribes
    ```

- [ ] **AWS CloudWatch Integration**
  - Set up CloudWatch alarms in infrastructure code
    ```typescript
    // In lib/services/aws/cloudwatch-alarms.ts:
    // - setupQuotaAlarms(): Alert when approaching SES sending limits
    // - setupBounceRateAlarm(): Alert on high bounce rates
    // - setupComplaintRateAlarm(): Alert on high complaint rates
    // - setupDeliveryDelayAlarm(): Alert on delivery delays
    ```
  
  - Create dashboard for SES metrics
    ```typescript
    // In lib/services/aws/ses-dashboard.ts:
    // - createSESDashboard(): Set up CloudWatch dashboard for SES
    // - monitorSendingQuota(): Track quota usage and limits
    // - monitorReputationMetrics(): Track sender reputation
    ```
  
  - Implement cost tracking
    ```typescript
    // In lib/services/aws/cost-tracking.ts:
    // - trackSESCosts(): Monitor email sending costs
    // - generateCostReport(): Create cost breakdown by campaign/email type
    // - setupBudgetAlerts(): Alert on unusual cost patterns
    ```

### 10. Deployment Strategy

- [ ] **SES Production Access**
  - Prepare and submit SES production access request
    ```markdown
    // Requirements for production access:
    // - Sender identity verification (domain and emails)
    // - Mail sending patterns documentation
    // - Content compliance verification
    // - Bounce handling implementation
    // - Complaint handling implementation
    // - Test results demonstrating <5% bounce rate
    ```
  
  - Implement staging to production migration plan
    ```typescript
    // In lib/services/email/environment-config.ts:
    // - configureSESEnvironment(): Set up environment-specific settings
    // - migrateFromSandboxToProduction(): Handle production transition
    // - implementProductionSafetyChecks(): Additional validations for production
    ```

- [ ] **DNS Configuration Management**
  - Create DNS configuration guide for operations team
    ```markdown
    // Required DNS Records:
    // - SPF records for sender authentication
    // - DKIM records for message signing
    // - DMARC policy records
    // - Custom return-path records
    // - Sending domain verification records
    ```
  
  - Implement verification checking utility
    ```typescript
    // In lib/utils/dns-verification.ts:
    // - checkDNSConfiguration(): Validate required records
    // - verifySESIdentity(): Check SES identity verification status
    // - validateDKIMSetup(): Verify DKIM configuration
    ```

### 11. Documentation and Training

- [ ] **Developer Documentation**
  - Create API and service documentation
    ```markdown
    // Contents:
    // - Email service architecture overview
    // - Template creation guidelines and best practices
    // - API endpoints reference with request/response examples
    // - Integration guide for connecting other systems
    // - Troubleshooting common issues
    ```
  
  - Document local development setup
    ```markdown
    // Contents:
    // - Local SES configuration with LocalStack
    // - Test email setup and sandbox usage
    // - Running email tests locally
    // - Debugging email rendering issues
    // - Working with email templates
    ```

- [ ] **Admin User Guides**
  - Create template management guide
    ```markdown
    // Contents:
    // - Creating effective email templates
    // - Using variables and personalization
    // - Testing templates across email clients
    // - Best practices for deliverability
    // - A/B testing templates
    ```
  
  - Create campaign management guide
    ```markdown
    // Contents:
    // - Planning effective email campaigns
    // - Segmentation strategies
    // - Scheduling for optimal engagement
    // - Analyzing campaign results
    // - Compliance requirements
    ```
  
  - Create automation workflow guide
    ```markdown
    // Contents:
    // - Designing effective automation workflows
    // - Setting up triggers and conditions
    // - Testing and monitoring automations
    // - Measuring automation performance
    // - Optimizing based on results
    ```

## Implementation Timeline

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | AWS SES Setup and Configuration | 1 week |
| 2 | Core Email Service Implementation | 2 weeks |
| 3 | API Routes and Server Actions | 2 weeks |
| 4 | Admin Interface Development | 3 weeks |
| 5 | User-Facing Components | 1 week |
| 6 | Integration with Existing Systems | 2 weeks |
| 7 | Testing and Validation | 2 weeks |
| 8 | Monitoring and Analytics | 1 week |
| 9 | Documentation and Training | 1 week |

**Total Estimated Timeline: 15 weeks**

## Completion Checklist
- [ ] AWS SES account is set up and verified
- [ ] Core email service is implemented and tested
- [ ] Transactional email functions are created
- [ ] Email templates can be managed through admin interface
- [ ] Email campaigns can be created and sent
- [ ] Automation workflows are functional
- [ ] User preferences can be managed
- [ ] Email tracking is implemented
- [ ] Integration with payment and course systems is complete
- [ ] Testing across different email clients is successful
- [ ] Analytics dashboard is functional
- [ ] Documentation is complete

---

> **Note to AI Developers:**
> - Review this build note before implementing any email functionality
> - Update this note as implementation progresses
> - Ensure compliance with email marketing regulations
> - Follow AWS best practices for SES implementation

## Technical Considerations

### Security Best Practices
- Store AWS credentials securely in environment variables
- Implement proper IAM roles with least privilege principle
- Use secure unsubscribe and preference tokens
- Sanitize all user input in email templates
- Implement CSRF protection for all email management endpoints

### Performance and Scalability
- Implement batch processing for large email campaigns
- Use proper queuing for high-volume scenarios
- Respect AWS SES sending quotas and implement appropriate rate limiting
- Consider dedicated IP addresses for high-volume sending

### Deliverability
- Implement proper bounce and complaint handling
- Set up DKIM and SPF records
- Monitor deliverability metrics
- Implement list hygiene protocols (removing bounces, respecting unsubscribes)

### Compliance
- Ensure all marketing emails have unsubscribe options
- Include physical address in marketing emails (CAN-SPAM requirement)
- Implement proper consent tracking
- Respect user preferences and privacy regulations

## Code Architecture - Key Components

```
lib/
  ├── services/
  │   └── email/
  │       ├── ses-client.ts            # AWS SES client configuration
  │       ├── email-service.ts         # Core email sending functionality
  │       ├── template-processor.ts    # Template rendering engine
  │       ├── transactional-emails.ts  # Functions for common emails
  │       └── email-tracking.ts        # Open and click tracking utilities
  ├── actions/
  │   └── email/
  │       ├── template-actions.ts      # Template CRUD operations
  │       ├── campaign-actions.ts      # Campaign management
  │       ├── automation-actions.ts    # Automation workflow operations
  │       └── preference-actions.ts    # User preference management
  └── types/
      └── email.ts                     # TypeScript types for email system

app/
  ├── api/
  │   ├── admin/email/
  │   │   ├── templates/route.ts       # Template management endpoints
  │   │   ├── campaigns/route.ts       # Campaign management endpoints
  │   │   ├── automations/route.ts     # Automation workflow endpoints
  │   │   └── analytics/route.ts       # Email metrics endpoints
  │   ├── user/
  │   │   └── email-preferences/route.ts # User preference endpoints
  │   ├── email/track/
  │   │   ├── open/route.ts            # Open tracking endpoint
  │   │   └── click/route.ts           # Click tracking endpoint
  │   └── webhooks/ses/route.ts        # SES notification webhook
  └── dashboard/
      └── email/
          ├── templates/page.tsx       # Template management interface
          ├── campaigns/page.tsx       # Campaign management interface
          └── automations/page.tsx     # Automation management interface
```

## Sample Implementation - Core Email Service

```typescript
// lib/services/email/ses-client.ts
import { SESClient } from '@aws-sdk/client-ses';
import { fromEnv } from '@aws-sdk/credential-providers';

// Create SES client singleton
let sesClient: SESClient | null = null;

export function getSESClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromEnv(),
    });
  }
  
  return sesClient;
}
```

```typescript
// lib/services/email/email-service.ts
import { 
  SendEmailCommand, 
  SendTemplatedEmailCommand, 
  SendBulkTemplatedEmailCommand 
} from '@aws-sdk/client-ses';
import { getSESClient } from './ses-client';
import { logEmailSent, logEmailError } from './email-logging';

export async function sendEmail({
  to,
  from = process.env.DEFAULT_FROM_EMAIL,
  subject,
  html,
  text,
  replyTo,
  tags = [],
}) {
  const sesClient = getSESClient();
  
  try {
    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Body: {
          Html: { Data: html },
          Text: { Data: text || html.replace(/<[^>]*>/g, '') },
        },
        Subject: { Data: subject },
      },
      Source: from,
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Tags: tags.map(tag => ({ Name: tag.name, Value: tag.value })),
    });
    
    const response = await sesClient.send(command);
    
    // Log successful email
    await logEmailSent({
      to,
      subject,
      messageId: response.MessageId,
      tags,
    });
    
    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log email error
    await logEmailError({
      to,
      subject,
      error: error.message,
      tags,
    });
    
    return {
      success: false,
      error: error.message,
    };
  }
}

// Additional functions for sendTemplatedEmail and sendBulkEmail would follow
```

## Completion Checklist
- [ ] AWS SES account is set up and verified
- [ ] Core email service is implemented and tested
- [ ] Transactional email functions are created
- [ ] Email templates can be managed through admin interface
- [ ] Email campaigns can be created and sent
- [ ] Automation workflows are functional
- [ ] User preferences can be managed
- [ ] Email tracking is implemented
- [ ] Integration with payment and course systems is complete
- [ ] Testing across different email clients is successful
- [ ] Analytics dashboard is functional
- [ ] Documentation is complete

---

> **Note to AI Developers:**
> - Review this build note before implementing any email functionality
> - Update this note as implementation progresses
> - Ensure compliance with email marketing regulations
> - Follow AWS best practices for SES implementation