# Email System - Phase 3: Email Logging and User Tagging Enhancement

## Task Objective
Enhance the platform's email logging system to store complete email content and headers in the `email_send_log` table, and implement automatic user tagging for product purchases in the Xendit webhook handler, specifically adding "P2P Enrolled" tags for Papers to Profits purchases and "Canva Purchase" tags for Canva products.

## Current State Assessment
The platform currently has two separate implementations for sending transactional emails:

1. `lib/services/email/send-transactional-email.ts`: Uses Postmark templates and logs basic information to the `email_send_log` table.
2. `lib/email/transactional-email-service.ts`: Uses custom templates and also logs to the `email_send_log` table.

Both implementations track basic email metadata like recipient, template ID, and status, but do not store the complete email content or headers. This limits our ability to audit email communications and troubleshoot delivery issues.

Additionally, the Xendit webhook handler (`app/api/webhooks/xendit/route.ts`) processes payments and creates enrollments for course purchases but does not currently add user tags to categorize customers based on their purchases. We have a functional user tagging system in place (`app/api/user-tags/route.ts`) but it's not integrated with the payment processing flow.

## Future State Goal
A comprehensive email logging system that captures all relevant information about sent emails, including the full content, headers, and API responses. This will provide complete auditability and troubleshooting capabilities for all transactional emails.

Additionally, users will be automatically tagged based on their purchases when payment is confirmed through the Xendit webhook. This will enable better segmentation for marketing campaigns and personalized user experiences.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes (particularly the email-system_phase-4_passwordless-authentication-flows.md and email-system_phase-3_transactional-emails.md)
> 2. Project context (`ProjectContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Previously Completed Phases
The project has already completed:
- **Email System Phase 3**: Transactional Emails - Established the core infrastructure for sending template-based emails
- **Email System Phase 4**: Passwordless Authentication Flows - Implemented magic link authentication that relies on the email system

### Relevant Components

1. **Email Services**:
   - `lib/services/email/send-transactional-email.ts`: Postmark template-based email service
   - `lib/email/transactional-email-service.ts`: Custom template email service
   
2. **Payment Processing**:
   - `app/api/webhooks/xendit/route.ts`: Handles payment confirmations and creates enrollments
   
3. **User Tagging**:
   - `app/api/user-tags/route.ts`: API endpoints for managing user tags
   - `lib/supabase/data-access/tags.ts`: Core functions for tag management

## Implementation Plan

### 1. Enhance Email Logging Schema
- [ ] Add new columns to the `email_send_log` table:
  ```sql
  ALTER TABLE email_send_log
  ADD COLUMN email_content TEXT,
  ADD COLUMN email_headers JSONB,
  ADD COLUMN raw_response JSONB;
  ```

### 2. Update Postmark Template Email Service
- [ ] Modify `lib/services/email/send-transactional-email.ts` to store email content and headers:
  - Capture the complete template variables and template ID
  - Extract headers from the Postmark API response
  - Store the raw API response for debugging purposes
  - Update the `email_send_log` record with the new fields

### 3. Update Custom Template Email Service
- [ ] Modify `lib/email/transactional-email-service.ts` to store email content and headers:
  - Capture the rendered HTML and text content
  - Extract headers from the Postmark API response
  - Store the raw API response for debugging purposes
  - Update the `email_send_log` record with the new fields

### 4. Create User Tags for Products
- [ ] Ensure required tags exist in the database:
  ```sql
  -- Check if tags exist, create them if not
  INSERT INTO tags (name, type, description)
  VALUES 
    ('P2P Enrolled', 'purchase', 'User has enrolled in Papers to Profits course')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO tags (name, type, description)
  VALUES 
    ('Canva Purchase', 'purchase', 'User has purchased Canva product')
  ON CONFLICT (name) DO NOTHING;
  ```

### 5. Integrate User Tagging in Xendit Webhook
- [ ] Modify `app/api/webhooks/xendit/route.ts` to add tagging for P2P course purchases:
  - After successful enrollment, fetch the "P2P Enrolled" tag ID
  - Import the tag assignment function from `lib/supabase/data-access/tags`
  - Assign the tag to the user who made the purchase
  - Add proper error handling to prevent disrupting the payment flow

- [ ] Modify `app/api/webhooks/xendit/route.ts` to add tagging for Canva purchases:
  - Detect Canva purchases by examining the product metadata
  - Fetch the "Canva Purchase" tag ID
  - Assign the tag to the user who made the purchase
  - Add proper error handling to prevent disrupting the payment flow

### 6. Testing
- [ ] Create test cases for email logging:
  - Send test emails using both email services
  - Verify that the email content, headers, and response are properly stored
  - Test with various email templates and recipients

- [ ] Create test cases for user tagging:
  - Simulate Xendit webhook calls for P2P course purchases
  - Simulate Xendit webhook calls for Canva purchases
  - Verify that users are properly tagged based on their purchases
  - Test error handling for cases where tags or users don't exist

## Technical Considerations

### Database Performance
- The `email_content` column may store large amounts of text data. Consider:
  - Implementing a retention policy to archive or delete old email logs
  - Using TEXT type instead of VARCHAR to avoid size limitations
  - Adding database indices for frequently queried fields

### Data Privacy and Security
- Email content may contain sensitive user information. Ensure:
  - Proper access controls for the `email_send_log` table
  - Compliance with data protection regulations like GDPR
  - Consider encryption for sensitive email content

### Error Handling
- Tag assignment operations should not disrupt the critical payment flow:
  - Wrap tag operations in try/catch blocks
  - Log errors but continue processing the payment
  - Consider implementing a retry mechanism for failed tag assignments

### Idempotency
- Both the email logging and tagging implementations must be idempotent:
  - Multiple webhook calls for the same payment should not create duplicate tags
  - Email resends should create new log entries rather than overwriting existing ones

## Completion Status

This phase is pending implementation. The build note has been created with comprehensive technical specifications and implementation plans.

## Next Steps After Completion
After enhancing the email logging and user tagging systems, we will proceed to Phase 4: Advanced Email Analytics and Reporting, which will build upon the comprehensive email logs to provide insights into email performance and user engagement.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
