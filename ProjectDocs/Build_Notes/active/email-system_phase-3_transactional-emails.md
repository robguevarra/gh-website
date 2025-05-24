# Email System - Phase 3: Transactional Emails

## Task Objective
To design and implement a robust transactional email system that automatically sends timely and relevant emails to users based on specific actions or system events (e.g., user registration, password reset, payment confirmation), enhancing user experience and platform communication.

## Current State Assessment

### ✅ **Existing Infrastructure (Analyzed from Codebase)**

**Database Structure:**
- **`email_templates` table** exists with 10 templates:
  - "Fixed Welcome Email" (category: authentication, subcategory: onboarding)
  - "Fixed Password Reset" (category: system, subcategory: account) 
  - "Fixed Payment Confirmation" (category: system, subcategory: payment)
  - Other marketing templates (newsletters, course announcements, etc.)
  - Table schema: id, name, description, subject, html_content, text_content, variables (jsonb), design (jsonb for Unlayer), category, subcategory, version, active, metadata, tags

**Payment Infrastructure (Working Flows):**
- **Xendit webhook** (`app/api/webhooks/xendit/route.ts`) handles 3 transaction types:
  1. **P2P (Papers to Profits)**: Creates user account → enrolls in course → tags "P2P Purchase" & "P2P Enrolled"
  2. **Canva**: Stores contact in `ebook_contacts` → tags "Canva Purchase" 
  3. **SHOPIFY_ECOM**: Creates order in `ecommerce_orders` → grants Google Drive permissions → tags appropriately

**Tagging System:**
- Tags table with existing relevant tags: "P2P Purchase", "Canva Purchase", "P2P Enrolled"
- User tagging happens automatically in webhook but **NO EMAIL TRIGGERS**

**User Management:**
- `unified_profiles` table (3,074 users)
- `transactions` table (3,156 records) 
- `enrollments` table (2,709 records)
- `ebook_contacts` table (3 records)

### ❌ **Missing Components (Critical Gaps)**

1. **No centralized email sending service** - No `sendTransactionalEmail` function exists anywhere in codebase
2. **No email triggers in webhook** - Business logic completes but doesn't send emails
3. **Supabase Auth email integration** - Unknown how password reset emails are currently handled
4. **Template content customization** - Existing templates are generic, need personalization for each flow
5. **Email delivery for Canva ebook** - No mechanism to send Google Drive links
6. **Multi-item email support** - Shopify orders need to display multiple products
7. **🚨 CRITICAL: Lead capture for incomplete purchases** - Users who fill forms but don't complete payment are lost

### **💡 Lead Capture Opportunity (Industry Best Practice)**

**Current Problem:**
- **P2P Flow**: User fills `/papers-to-profits` form → redirected to Xendit → if payment fails/abandoned, contact info is lost
- **Canva Flow**: User fills `/canva-ebook` form → redirected to Xendit → if payment fails/abandoned, contact info is lost

**Industry Best Practice Solution:**
1. **Immediate Lead Capture**: Store contact info when form is submitted (BEFORE payment redirect)
2. **Funnel Tracking**: Track user status through payment journey
3. **Abandoned Cart Recovery**: Email sequences to recover incomplete purchases (industry standard 15-25% recovery rate)
4. **Lead Segmentation**: Different email treatment for leads vs paying customers
5. **GDPR Compliance**: Proper consent and data retention policies

**Proposed Lead Statuses:**
- `form_submitted` - Contact filled form, not yet redirected to payment
- `payment_initiated` - Redirected to Xendit payment page
- `payment_completed` - Successfully paid and became customer
- `payment_failed` - Payment attempt failed (retry opportunity)
- `payment_abandoned` - Initiated payment but didn't complete within 24-48 hours
- `lead_nurture` - In email nurture sequence for conversion

## Future State Goal
A fully operational transactional email system where:
- All key transactional emails are automatically triggered by existing business logic flows
- Email templates follow design context branding (Purple #b08ba5, Pink #f1b5bc, Blue #9ac5d9)
- Centralized email service handles template retrieval, variable substitution, and delivery
- Google Drive links are sent for Canva ebook purchases
- All emails are logged and errors handled gracefully

## Implementation Plan

### 1. ✅ Codebase Analysis and Current State Documentation
- [x] **Database Schema Analysis**: Confirmed `email_templates` table structure and existing templates
- [x] **Payment Flow Analysis**: Documented 3 working payment flows in Xendit webhook
- [x] **Tagging System Review**: Confirmed automatic tagging works but lacks email triggers
- [x] **Infrastructure Assessment**: Identified missing centralized email service

### 2. Lead Capture and Funnel Tracking Implementation

#### 2.1 Database Schema Updates
- [ ] **Create Lead Tracking Table** (via Supabase migration):
  ```sql
  CREATE TABLE purchase_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    product_type TEXT NOT NULL, -- 'P2P', 'Canva', 'SHOPIFY_ECOM'
    status TEXT NOT NULL DEFAULT 'form_submitted', -- form_submitted, payment_initiated, payment_completed, payment_failed, payment_abandoned, lead_nurture
    amount NUMERIC, -- Intended purchase amount
    currency TEXT DEFAULT 'PHP',
    xendit_external_id TEXT, -- Link to payment attempt
    source_page TEXT, -- e.g., '/papers-to-profits', '/canva-ebook'
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    metadata JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    converted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(email, product_type, submitted_at::date) -- Prevent duplicate leads same day
  );

  CREATE INDEX idx_purchase_leads_email ON purchase_leads(email);
  CREATE INDEX idx_purchase_leads_status ON purchase_leads(status);
  CREATE INDEX idx_purchase_leads_product_type ON purchase_leads(product_type);
  CREATE INDEX idx_purchase_leads_submitted_at ON purchase_leads(submitted_at);
  ```

#### 2.2 Form Submission Enhancement
- [ ] **P2P Form Update** (`/papers-to-profits` page):
  - [ ] Add lead capture API call BEFORE payment redirect
  - [ ] Store lead with status 'form_submitted' in `purchase_leads` table
  - [ ] Add UTM tracking to capture marketing source
  - [ ] Update payment action to reference lead record

- [ ] **Canva Form Update** (`/canva-ebook` page):
  - [ ] Add lead capture API call BEFORE payment redirect  
  - [ ] Store lead with status 'form_submitted' in `purchase_leads` table
  - [ ] Add UTM tracking to capture marketing source
  - [ ] Update payment action to reference lead record

#### 2.3 Payment Flow Integration
- [ ] **Lead Status Updates** in Xendit webhook:
  - [ ] When payment created: Update lead status to 'payment_initiated'
  - [ ] When payment succeeds: Update lead status to 'payment_completed', set converted_at
  - [ ] When payment fails: Update lead status to 'payment_failed'
  - [ ] Add lead_id reference to transaction records

### 3. Core Email Infrastructure Development
- [ ] **Create Centralized Email Service** (`lib/email/transactional-email-service.ts`):
  - [ ] `sendTransactionalEmail(templateName: string, recipientEmail: string, variables: Record<string, any>)` function
  - [ ] Template retrieval from `email_templates` table using Supabase client
  - [ ] **Variable substitution using snake_case format** (replace `{{variable_name}}` patterns, NOT camelCase)
  - [ ] **Postmark integration** (already configured in platform)
  - [ ] Email sending logging to new `email_send_log` table (id, template_id, recipient_email, variables, status, sent_at, error_message)
  - [ ] Error handling with retry logic for transient failures
  - [ ] Idempotency checking to prevent duplicate sends

- [ ] **Create Email Send Log Table** (via Supabase migration):
  ```sql
  CREATE TABLE email_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id),
    recipient_email TEXT NOT NULL,
    variables JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    lead_id UUID REFERENCES purchase_leads(id), -- Link to lead if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  ```

### 4. Template Design and Content Creation

#### 4.1 Review and Enhance Existing Templates  
- [ ] **"Fixed Welcome Email"** (authentication/onboarding):
  - [ ] Review current content in `email_templates` table
  - [ ] Enhance for dual use: general signup vs P2P enrollment welcome
  - [ ] **CORRECTED Variables (snake_case)**: `{{first_name}}`, `{{welcome_type}}`, `{{course_name}}` (optional), `{{access_link}}` (optional)
  - [ ] Apply design context branding: Purple primary actions, warm messaging

- [ ] **"Fixed Password Reset"** (system/account):
  - [ ] Review current Unlayer design and content 
  - [ ] **CORRECTED Variables (snake_case)**: `{{reset_link}}`, `{{first_name}}`, `{{expiration_time}}`
  - [ ] Test with Supabase Auth email templates configuration

- [ ] **"Fixed Payment Confirmation"** (system/payment):
  - [ ] Review current generic payment template
  - [ ] Determine if this should be split into specific templates per product type
  - [ ] **CORRECTED Variables (snake_case)**: `{{order_number}}`, `{{amount}}`, `{{currency}}`, `{{payment_method}}`, `{{product_name}}`

#### 4.2 Create New Transactional Templates (Using Unlayer Editor in `/admin/email-templates`)

**Purchase Confirmation Templates:**
- [ ] **P2P Course Enrollment Confirmation** (category: education, subcategory: enrollment):
  - [ ] Subject: "Welcome to Papers to Profits, {{first_name}}! Your Journey Starts Now"
  - [ ] **CORRECTED Variables (snake_case)**: `{{first_name}}`, `{{course_name}}`, `{{enrollment_date}}`, `{{access_link}}`, `{{course_description}}`
  - [ ] Content: Course welcome, access instructions, what to expect next
  - [ ] Branding: Primary purple for CTA buttons, warm welcoming tone
  - [ ] **Trigger**: After successful enrollment creation in webhook (line ~312 in xendit webhook)

- [ ] **Canva Ebook Delivery** (category: digital-product, subcategory: delivery):
  - [ ] Subject: "Your Canva Business Ebook is Ready for Download!"
  - [ ] **CORRECTED Variables (snake_case)**: `{{first_name}}`, `{{ebook_title}}`, `{{google_drive_link}}`, `{{support_email}}`
  - [ ] Content: Thank you message, download instructions, how to access Google Drive link
  - [ ] Branding: Pink secondary for highlights, blue accent for download button
  - [ ] **Trigger**: After successful `ebook_contacts` storage in webhook (line ~647 in xendit webhook)

- [ ] **Shopify Order Confirmation** (category: ecommerce, subcategory: confirmation):
  - [ ] Subject: "Order Confirmation #{{order_number}} - Your Digital Products Are Ready!"
  - [ ] **CORRECTED Variables (snake_case)**: `{{first_name}}`, `{{order_number}}`, `{{order_items}}` (array), `{{total_amount}}`, `{{currency}}`, `{{access_instructions}}`
  - [ ] Content: Multi-item order summary, individual Google Drive access per product, support information
  - [ ] Branding: Consistent with design context, clear order details layout
  - [ ] **Trigger**: After order completion in webhook (line ~585 in xendit webhook)

**Security Templates:**
- [ ] **Password Changed Confirmation** (category: security, subcategory: notification):
  - [ ] Subject: "Password Changed Successfully - Graceful Homeschooling"
  - [ ] **CORRECTED Variables (snake_case)**: `{{first_name}}`, `{{change_date}}`, `{{ip_address}}`, `{{support_email}}`
  - [ ] Content: Security confirmation, what to do if unauthorized, contact support
  - [ ] Branding: Professional security messaging with brand colors
  - [ ] **Trigger**: Supabase Auth hook integration (needs research)

#### 4.3 Abandoned Cart Recovery Email Sequence Templates

**🚨 NEW: Lead Nurture and Recovery Templates**
- [ ] **P2P Abandoned Cart - 1 Hour** (category: recovery, subcategory: cart-abandonment):
  - [ ] Subject: "{{first_name}}, complete your Papers to Profits enrollment (5 min left)"
  - [ ] **Variables (snake_case)**: `{{first_name}}`, `{{course_name}}`, `{{cart_amount}}`, `{{resume_payment_link}}`, `{{course_benefits}}`
  - [ ] Content: Gentle reminder, course benefits, easy completion CTA
  - [ ] Branding: Warm purple tones, urgency without pressure
  - [ ] **Trigger**: 1 hour after status 'payment_initiated' without completion

- [ ] **P2P Abandoned Cart - 24 Hours** (category: recovery, subcategory: cart-abandonment):
  - [ ] Subject: "Your homeschool business transformation awaits, {{first_name}}"
  - [ ] **Variables (snake_case)**: `{{first_name}}`, `{{course_name}}`, `{{success_stories}}`, `{{testimonial}}`, `{{resume_payment_link}}`
  - [ ] Content: Social proof, success stories, value reinforcement
  - [ ] Branding: Inspiring purple and pink, community focused
  - [ ] **Trigger**: 24 hours after status 'payment_initiated' without completion

- [ ] **Canva Abandoned Cart - 1 Hour** (category: recovery, subcategory: cart-abandonment):
  - [ ] Subject: "{{first_name}}, your Canva ebook is waiting (almost there!)"
  - [ ] **Variables (snake_case)**: `{{first_name}}`, `{{ebook_title}}`, `{{ebook_benefits}}`, `{{resume_payment_link}}`, `{{price}}`
  - [ ] Content: Quick completion reminder, value highlights, easy next step
  - [ ] Branding: Friendly pink tones, creative energy
  - [ ] **Trigger**: 1 hour after status 'payment_initiated' without completion

- [ ] **Canva Abandoned Cart - 24 Hours** (category: recovery, subcategory: cart-abandonment):
  - [ ] Subject: "Don't miss out on your creative business breakthrough, {{first_name}}"
  - [ ] **Variables (snake_case)**: `{{first_name}}`, `{{ebook_title}}`, `{{author_story}}`, `{{bonus_content}}`, `{{resume_payment_link}}`
  - [ ] Content: Author's personal story, bonus content preview, FOMO elements
  - [ ] Branding: Warm storytelling, pink and blue accents
  - [ ] **Trigger**: 24 hours after status 'payment_initiated' without completion

- [ ] **General Lead Nurture - 7 Days** (category: nurture, subcategory: lead-conversion):
  - [ ] Subject: "{{first_name}}, here's how other homeschool moms found success"
  - [ ] **Variables (snake_case)**: `{{first_name}}`, `{{interested_product}}`, `{{success_tips}}`, `{{community_link}}`, `{{special_offer}}`
  - [ ] Content: Educational value, community invitation, soft conversion opportunity
  - [ ] Branding: Educational purple theme, community warmth
  - [ ] **Trigger**: 7 days after status 'form_submitted' without conversion

#### 4.4 Template Creation Process
- [ ] **Access Unlayer Editor**: Use existing `/admin/email-templates` interface
- [ ] **Follow Design Context** (`ProjectDocs/contexts/designContext.md`):
  - Primary Purple (#b08ba5) for main CTAs and brand elements
  - Secondary Pink (#f1b5bc) for highlights and warmth
  - Accent Blue (#9ac5d9) for secondary actions
  - Inter font for body text, Playfair Display for headings
  - Consistent spacing and professional layout
- [ ] **⚠️ CRITICAL: Variable Placeholder Format**: Use `{{variable_name}}` snake_case format for dynamic content (NOT camelCase)
- [ ] **Save Template Variables**: Update `variables` JSONB field with expected variable list
- [ ] **Set Proper Categories**: Use category/subcategory for organization

### 5. Email Trigger Integration

#### 5.1 Automated Email Scheduling System
- [ ] **Create Email Automation Service** (`lib/email/email-automation.ts`):
  - [ ] Abandoned cart detection function
  - [ ] Email scheduling based on lead status and timestamps
  - [ ] Cron job or scheduled function for sending recovery emails
  - [ ] Lead status progression tracking

- [ ] **Create Supabase Edge Function** (`supabase/functions/process-abandoned-carts`):
  - [ ] Query `purchase_leads` table for abandoned statuses
  - [ ] Check timing for 1 hour, 24 hour, 7 day triggers
  - [ ] Send appropriate recovery email template
  - [ ] Update lead status to prevent duplicate sends
  - [ ] Schedule to run every 30 minutes

#### 5.2 Xendit Webhook Enhancement (`app/api/webhooks/xendit/route.ts`)
- [ ] **Import email service**: Add `import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'`
- [ ] **Lead Status Integration**: Add lead tracking to all payment flows

- [x] **P2P Flow Enhancement** (around line 312 after enrollment creation):
  ```typescript
  // ✅ COMPLETED: Email trigger integrated into Xendit webhook
  // Sends P2P Course Welcome email after successful enrollment
  // Updates lead status to 'payment_completed' if lead_id exists
  // Uses snake_case variables: first_name, course_name, enrollment_date, access_link
  ```

- [x] **Canva Flow Enhancement** (around line 647 after storeEbookContactInfo):
  ```typescript
  // ✅ COMPLETED: Email trigger integrated into Xendit webhook  
  // Sends Canva Ebook Delivery email after successful contact storage
  // Updates lead status to 'payment_completed' if lead_id exists
  // Uses snake_case variables: first_name, ebook_title, google_drive_link, support_email
  ```

- [x] **Shopify Flow Enhancement** (around line 585 after order completion):
  ```typescript
  // ✅ COMPLETED: Email trigger integrated into Xendit webhook
  // Sends Shopify Order Confirmation email after order status updated to 'completed'
  // Updates lead status to 'payment_completed' if lead_id exists  
  // Uses snake_case variables: first_name, order_number, order_items, total_amount, currency, access_instructions
  ```

#### 4.2 Supabase Auth Integration
- [ ] **Research Supabase Auth Email Templates**: 
  - Check Supabase Dashboard → Authentication → Email Templates
  - Determine if custom SMTP (Postmark) is configured for auth emails
  - Document current password reset flow configuration
- [ ] **Password Reset Email Integration**:
  - If using Supabase built-in: Ensure templates match brand design
  - If custom implementation needed: Create password reset API endpoint
  - Test password reset flow triggers email correctly
- [ ] **Password Changed Email Trigger**:
  - Research Supabase Auth hooks or database triggers for password changes
  - Implement trigger to send confirmation email after password update
  - Consider using Database Webhooks or Edge Functions

#### 4.3 Welcome Email Triggers
- [ ] **Account Creation Welcome**: 
  - Determine if triggered by Supabase Auth signup or custom registration
  - Ensure welcome email is sent for organic signups (not payment-driven)
  - Differentiate between general welcome vs course enrollment welcome

#### 5.3 Form Submission API Updates
- [ ] **Create Lead Capture API Endpoint** (`/api/leads/capture`):
  - [ ] Accept form data from P2P and Canva pages
  - [ ] Store immediately in `purchase_leads` table with status 'form_submitted'
  - [ ] Return lead_id for payment flow reference
  - [ ] Include UTM tracking and source page data

- [ ] **Update P2P Form** (`/papers-to-profits` page):
  - [ ] Call lead capture API before payment redirect
  - [ ] Pass lead_id to payment action for tracking
  - [ ] Add UTM parameter collection

- [ ] **Update Canva Form** (`/canva-ebook` page):
  - [ ] Call lead capture API before payment redirect
  - [ ] Pass lead_id to payment action for tracking
  - [ ] Add UTM parameter collection

### 6. Environment Variables and Configuration
- [ ] **Add Required Environment Variables**:
  ```
  CANVA_EBOOK_DRIVE_LINK=https://drive.google.com/file/d/xxx/view
  SUPPORT_EMAIL=support@gracefulhomeschooling.com
  NEXT_PUBLIC_SITE_URL=https://gracefulhomeschooling.com
  EMAIL_AUTOMATION_ENABLED=true
  ABANDONED_CART_EMAIL_ENABLED=true
  ```
- [ ] **Postmark Configuration**: Verify existing setup supports transactional emails
- [ ] **Email From Address**: Ensure consistent sender identity across all transactional emails
- [ ] **Supabase Cron Configuration**: Set up automated email processing schedule

### 7. Error Handling and Monitoring
- [ ] **Email Failure Handling**:
  - Log all email attempts to `email_send_log` table with lead_id reference
  - Implement retry logic for transient failures (rate limits, network issues)
  - Alert system for persistent email failures
  - Track abandoned cart email delivery success rates
- [ ] **Webhook Error Prevention**:
  - Ensure email failures don't break payment processing
  - Use try-catch blocks around all email sending calls
  - Continue business logic even if email fails
  - Log lead status updates even if emails fail
- [ ] **Email Delivery Monitoring**:
  - Track email open rates through Postmark by template type
  - Monitor bounce rates and handle bounced emails
  - Regular review of `email_send_log` for failure patterns
  - Measure abandoned cart recovery conversion rates
- [ ] **Lead Data Quality**:
  - Monitor duplicate lead prevention effectiveness
  - Track lead progression through funnel statuses
  - Identify and fix lead capture form abandonment points

### 8. Testing and Validation
- [ ] **Unit Tests**: Email service functions with mock templates and snake_case variables
- [ ] **Integration Tests**: End-to-end flow testing for each payment type including lead capture
- [ ] **Email Template Testing**: Preview templates with sample data in Unlayer using correct variable format
- [ ] **Supabase Auth Email Testing**: Password reset and signup email flows
- [ ] **Production Testing**: Use test Xendit webhooks to validate email triggers
- [ ] **Abandoned Cart Testing**: Test email sequence timing and delivery
- [ ] **Lead Capture Testing**: Verify form submission creates leads before payment

### 9. Documentation and Knowledge Transfer
- [ ] **Email Service Documentation**: API documentation for `sendTransactionalEmail` function
- [ ] **Template Management Guide**: How to create/edit templates in Unlayer editor with snake_case variables
- [ ] **Variable Reference**: Document all available snake_case variables for each template type
- [ ] **Lead Capture Documentation**: API documentation for lead tracking and status management
- [ ] **Abandoned Cart Setup Guide**: How to configure and monitor email automation
- [ ] **Troubleshooting Guide**: Common email delivery issues and solutions

## Technical Considerations

### Database Performance
- **Email Template Caching**: Cache frequently used templates in memory to reduce database queries
- **Batch Email Processing**: For high-volume scenarios, implement queue-based email sending
- **Index Optimization**: Add indexes on `email_send_log` table for status and created_at columns

### Supabase Auth Integration Challenges
- **Custom SMTP vs Built-in**: Determine best approach for consistent branding across auth and transactional emails
- **Auth Hooks**: Research Supabase Edge Functions or Database Webhooks for password change notifications
- **Email Template Synchronization**: Ensure auth templates match transactional template designs

### Email Deliverability
- **SPF/DKIM/DMARC**: Verify Postmark configuration includes proper authentication records
- **Email Content**: Avoid spam trigger words, maintain good text-to-image ratio
- **List Management**: Handle unsubscribes appropriately for transactional emails
- **Bounce Handling**: Implement bounce processing to maintain sender reputation

### Google Drive Link Management
- **Link Expiration**: Determine if Google Drive links should have time-based access controls
- **Link Tracking**: Consider adding UTM parameters or tracking for download analytics
- **Access Verification**: Ensure recipients can access shared Google Drive files

### Lead Capture and Funnel Management
- **Data Privacy**: Ensure GDPR compliance for storing lead information before payment completion
- **Duplicate Prevention**: Handle users who submit forms multiple times for same product
- **Lead Scoring**: Consider scoring leads based on engagement and behavior
- **Conversion Attribution**: Track which marketing sources generate highest converting leads
- **Retention Policy**: Define how long to keep non-converting lead data

### Email Automation Timing
- **Timezone Handling**: Consider user timezone for email delivery timing
- **Send Window Optimization**: Avoid sending recovery emails during low-engagement hours
- **Frequency Capping**: Prevent overwhelming users with too many emails
- **Template A/B Testing**: Test different subject lines and content for recovery emails

## Completion Status

### ✅ **Completed Phases:**
- [x] **Phase 1**: Comprehensive codebase analysis and current state documentation
  - [x] Database schema analysis (email_templates, transactions, enrollments, etc.)
  - [x] Payment flow analysis (3 working Xendit webhook flows documented)
  - [x] Variable format discovery (confirmed snake_case: {{first_name}}, not {{firstName}})
  - [x] Lead capture opportunity identification (industry best practice analysis)

- [x] **Phase 2**: Lead capture and funnel tracking implementation
  - [x] Created `purchase_leads` table with status tracking (via database migration)
  - [x] Updated P2P and Canva forms for immediate lead capture (forms now call `/api/leads/capture`)
  - [x] Integrated lead status updates in Xendit webhook (all 3 flows update lead status on completion)

- [x] **Phase 3**: Core email infrastructure development  
  - [x] Built centralized `sendTransactionalEmail` service with snake_case variables
  - [x] Created `email_send_log` table with lead_id references (via database migration)
  - [x] Implemented email triggers in all 3 payment flows (P2P, Canva, Shopify)

- [x] **Phase 5**: Email trigger integration ⭐ **MAJOR COMPLETION**
  - [x] Enhanced Xendit webhook with email triggers for all 3 flows
  - [x] P2P Course Welcome emails sent after successful enrollment
  - [x] Canva Ebook Delivery emails sent after contact storage  
  - [x] Shopify Order Confirmation emails sent after order completion
  - [x] Lead status updates integrated (`payment_completed` when payment succeeds)
  - [x] Error handling ensures email failures don't break payment processing

### 🔄 **Remaining Implementation Phases:**
- [ ] **Phase 4**: Template creation and customization
  - [ ] Review/enhance 3 existing templates with correct snake_case variable format
  - [ ] Create 3 new purchase confirmation templates (P2P, Canva, Shopify)
  - [ ] Create 5 new abandoned cart recovery email templates
  - [ ] Use Unlayer editor in `/admin/email-templates` for template creation
- [ ] **Phase 5B**: Email automation service for abandoned cart recovery
  - [ ] Create Supabase Edge Function for automated email scheduling
  - [ ] Implement abandoned cart detection and email sequences  
  - [ ] Set up cron job to process leads with status 'payment_initiated' after time thresholds
- [ ] **Phase 6**: Supabase Auth integration
  - [ ] Research and implement password reset email integration
  - [ ] Add password change confirmation triggers
- [ ] **Phase 7**: Testing and validation
  - [ ] Test all email flows with correct snake_case variables
  - [ ] Validate abandoned cart email timing and delivery
  - [ ] Verify lead capture and conversion tracking
- [ ] **Phase 8**: Production deployment and monitoring
  - [ ] Deploy email automation system
  - [ ] Monitor abandoned cart recovery rates (target: 15-25%)
  - [ ] Track lead progression and conversion analytics

### 🎯 **Success Metrics After Completion:**
- **Lead Capture**: 100% of form submissions stored before payment redirect
- **Email Delivery**: >95% successful delivery rate for transactional emails
- **Abandoned Cart Recovery**: 15-25% conversion rate from recovery email sequences
- **Variable Consistency**: All emails use standardized snake_case format
- **Customer Experience**: Automated, timely email communication at every purchase stage

## Next Steps After Completion
After establishing the transactional email system:
- **Email Analytics Dashboard**: Track email performance metrics and user engagement
- **Advanced Email Automation**: Drip campaigns and user journey emails
- **Email Preference Center**: Allow users to manage email communication preferences
- **A/B Testing Framework**: Test email subject lines and content variations

---

> **Note to AI Developers**: This build note contains specific implementation details derived from actual codebase analysis. When working on this project:
> 1. Refer to the exact line numbers mentioned in Xendit webhook for integration points
> 2. Use the existing `email_templates` table structure and Unlayer editor workflow
> 3. Follow the design context guidelines for consistent branding across all emails
> 4. Test thoroughly with the existing payment flows before deploying to production
> 5. Ensure email failures never break payment processing flows
