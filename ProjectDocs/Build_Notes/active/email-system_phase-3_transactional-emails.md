# Email System - Phase 3: Transactional Emails

## Task Objective
To design and implement a robust transactional email system that automatically sends timely and relevant emails to users based on specific actions or system events (e.g., user registration, password reset, payment confirmation), enhancing user experience and platform communication.

## Current State Assessment
The platform currently has an `email-templates-manager.tsx` for creating and managing email template designs using the **Unlayer editor**, and `template-utils.ts` for variable extraction and categorization. The email sending service is configured to use **Postmark**. Some basic transactional template examples such as 'Welcome', 'Email Verification', and 'Password Reset' have already been created as part of the Unlayer integration. However, the comprehensive backend logic to automatically trigger and send a full suite of transactional emails based on various application events (especially post-payment) is not yet fully implemented or centralized for all identified transactional events. Campaign emails are handled separately.

## Future State Goal
A fully operational transactional email system where:
- All key transactional emails (e.g., Welcome, Email Verification, Password Reset, Payment Confirmation, Course Enrollment Confirmation) are defined and templated.
- Backend services and event handlers are in place to automatically trigger these emails with correct, personalized data at the appropriate user/system event.
- Email sending is reliable, logged, and errors are handled gracefully.
- Admins can manage the content and design of these transactional email templates via `email-templates-manager.tsx`.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes (especially Phase 1 and Phase 2 of the Email System, if applicable)
> 2. Project context (`ProjectDocs/contexts/projectContext.md`)
> 3. Design context (`ProjectDocs/contexts/designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Project Context (`ProjectDocs/contexts/projectContext.md`)
- Key project goals include enhancing user experience through advanced interactivity and personalization.
- The technical foundation includes Next.js 15, TypeScript, Supabase (for auth and DB), and a focus on functional, declarative programming.
- Authentication system is fully implemented, providing clear trigger points for emails like welcome, password reset, and email verification.

### From Design Context (`ProjectDocs/contexts/designContext.md`)
- Brand identity emphasizes warmth, elegance, clarity, and support, which should be reflected in email communications.
- Color system, typography, and component patterns should ideally extend to email design for brand consistency, where feasible within email client limitations.

### From Previous Build Notes
- **`ProjectDocs/Build_Notes/postmark-email-integration_phase-1_setup-and-configuration.md`**: Confirms Postmark as the email delivery provider and initial setup for transactional and auth emails.
- **`ProjectDocs/Build_Notes/unlayer-email-editor-integration_phase-1_implementation.md`**: Details the integration of the Unlayer editor for creating and managing email templates. Crucially, it notes the creation of initial templates for 'Welcome', 'Email Verification', and 'Password Reset'. This phase will build upon this existing template infrastructure.
- **`ProjectDocs/Build_Notes/email-system-phase-2_template-editor-and-segmentation-ui.md`**: Focuses on campaign management and segmentation but reaffirms the use of Unlayer and the template management system in `app/admin/email-templates`.
- **`ProjectDocs/Build_Notes/active/payment-actions_phase-1_payment-and-enrollment-flow.md`**: Outlines the Xendit payment and course enrollment flow. This highlights the need for transactional emails such as 'Payment Confirmation' and 'Course Enrollment Confirmation'.
- **`ProjectDocs/Build_Notes/active/shopify-ecommerce-integration_phase-5-0_strategy-and-architecture.md`**: Explains that Shopify serves as a PIM, with custom checkout (Xendit) and order processing. This reinforces the need for transactional emails triggered by our platform's e-commerce events.

## Implementation Plan

### 1. Identify and Prioritize Transactional Emails
- [ ] Review existing transactional emails and confirm their adequacy for general auth flows:
    - [x] **Welcome Email:** Trigger: New user registration. (Also for 'Papers to Profits' if first purchase creates account). *Existing template, review content.*
    - [x] **Email Verification:** Trigger: User registration or explicit request. *Existing template, review content.*
    - [x] **Password Reset Request:** Trigger: User initiates password reset. *Existing template, review content.*
- [ ] Define and prioritize new transactional emails based on specific system events and product types:
    - [ ] **Password Changed Confirmation:** Trigger: User successfully changes their password. *New template/logic.*
    - [ ] **Payment Confirmation (Papers to Profits):** Trigger: Successful Xendit payment for 'Papers to Profits' course. *New template/logic, focused on course payment.*
    - [ ] **Course Enrollment Confirmation (Papers to Profits):** Trigger: Successful enrollment into 'Papers to Profits' course (post-payment). *New template/logic, confirms course access.*
    - [ ] **Order Confirmation (Canva Ebook):** Trigger: Successful Xendit payment for 'Canva Ebook'. **Requires email attachment.** *New template/logic.*
    - [ ] **Order Confirmation (Shopify PIM Products):** Trigger: Successful Xendit payment for orders from Shopify PIM products (custom checkout). **Must support multi-item display.** *New template/logic.*
    - [ ] ~~Subscription-related emails (e.g., upcoming renewal, payment failed, if subscriptions are planned)~~ (Deferring for now unless specified)
- [ ] Prioritize the implementation of these emails based on impact and system dependencies (e.g., core auth emails first, then e-commerce related).

### 2. Template Design and Content Creation
- For each identified transactional email:
  - [ ] **Existing Templates (Welcome, Email Verification, Password Reset Request):**
    - [ ] Review existing Unlayer designs and content. Confirm they meet current requirements for general auth flows and for 'Papers to Profits' welcome scenario.
    - [ ] Update if necessary using the Unlayer editor in `app/admin/email-templates`.
  - [ ] **New Templates (Password Changed, P2P Payment Confirmation, P2P Enrollment Confirmation, Canva Order Confirmation, Shopify Order Confirmation):**
    - [ ] Finalize content (subject line, body text, calls to action) for each specific email.
    - [ ] Design the email template in `app/admin/email-templates` using the Unlayer editor, considering specific needs like placeholders for attachments or multi-item lists.
  - [ ] For all templates:
    - [ ] Identify all necessary dynamic variables (e.g., `{{user.firstName}}`, `{{order.id}}`, `{{order.items}}`, `{{verificationLink}}`, `{{course.name}}`, `{{ebook.attachmentLink}}`).
    - [ ] Ensure `TEMPLATE_VARIABLES` in `email-templates-manager.tsx` (or a similar mechanism) provides good example data and categorization for these template variables for testing purposes within Unlayer.

### 3. Backend Triggering Logic
- For each transactional email, implement backend logic:
  - [ ] **Welcome Email:** (Review existing trigger if any, or implement) Trigger upon successful user registration via Supabase Auth. Also handle trigger from 'Papers to Profits' purchase if it's a new user.
  - [ ] **Email Verification:** (Review existing trigger) Trigger upon user registration or request for verification.
  - [ ] **Password Reset Request:** (Review existing trigger) Trigger upon user request via password reset form.
  - [ ] **Password Changed Confirmation:** Trigger after a successful password change by the user.
  - [ ] **Payment Confirmation (Papers to Profits):** Trigger upon successful Xendit webhook confirmation for a 'Papers to Profits' transaction. Fetch relevant data from `transactions` table.
  - [ ] **Course Enrollment Confirmation (Papers to Profits):** Trigger after successful enrollment creation in `enrollments` table (post-P2P payment). Fetch `courses` data.
  - [ ] **Order Confirmation (Canva Ebook):** Trigger upon successful Xendit webhook confirmation for a 'Canva Ebook' transaction. Fetch relevant data and prepare for attachment.
  - [ ] **Order Confirmation (Shopify PIM Products):** Trigger upon successful Xendit webhook confirmation for an order containing Shopify PIM items. Fetch order details, potentially including multiple line items.
  - [ ] **(Others as identified)**
  - Each trigger should:
    - [ ] Fetch the appropriate template ID/slug from the database (e.g., `email_templates` table).
    - [ ] Gather necessary data from various sources (e.g., `auth.users`, `unified_profiles`, `transactions`, `orders`, `enrollments`, `courses`) to populate variables for the specific email context.
    - [ ] Call a centralized email sending service/function.

### 4. Centralized Email Sending Service
- [ ] Develop or refine a backend service/utility function (e.g., `sendTransactionalEmail(templateKeyOrSlug: string, recipientEmail: string, variables: Record<string, any>)`). This should leverage the existing Postmark integration.
- [ ] This service should handle:
  - [ ] Retrieving template content (HTML, subject) from the database.
  - [ ] Rendering the template with provided variables.
  - [ ] Sending the email via an email provider (e.g., Postmark, SendGrid, Supabase Functions with an SMTP service).
  - [ ] Logging successful sends and errors.

### 5. Configuration and Environment Variables
- [ ] Ensure API keys for email sending services are securely managed (e.g., via environment variables).
- [ ] Configure sender email addresses, names, and reply-to addresses.

### 6. Testing
- [ ] Unit tests for variable replacement and template rendering.
- [ ] Integration tests for triggering logic (e.g., simulate user signup and verify welcome email is sent).
- [ ] End-to-end testing of email delivery and content accuracy.

### 7. Documentation
- [ ] Document how to add new transactional emails.
- [ ] Document the variables available for each template.

## Technical Considerations

### Email Service Provider
- **Postmark** is the chosen provider. Ensure all new logic integrates with the existing Postmark client service.
- API rate limits, deliverability, and cost.

### Asynchronous Sending
- Consider sending emails asynchronously (e.g., via a queue or background job) to avoid blocking user-facing operations.

### Idempotency
- For critical emails like payment confirmations, ensure that sending mechanisms are idempotent or have checks to prevent duplicate sends for the same event.

### Error Handling and Retries
- Robust error handling for API failures from the email service.
- Potential retry mechanisms for transient sending failures.

### Security
- Sanitize any user-provided data used in email variables to prevent injection attacks.
- Securely generate and handle tokens for links (e.g., email verification, password reset).

### Email Deliverability
- SPF, DKIM, DMARC records setup for the sending domain.
- Email content best practices to avoid spam filters.
- Unsubscribe handling (though less common for purely transactional emails, important for any that might be borderline marketing).

## Completion Status
*(To be updated as tasks are completed)*

- [ ] Initial planning and build note creation.

## Next Steps After Completion
*(Define what follows this phase, e.g., advanced email analytics, user notification preferences center, etc.)*

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns.
> 2. Consult the implementation strategy and architecture planning documents.
> 3. Align your work with the project context (`ProjectDocs/contexts/projectContext.md`) and design context (`ProjectDocs/contexts/designContext.md`) guidelines.
> 4. Follow the established folder structure, naming conventions, and coding standards.
> 5. Include this reminder in all future build notes to maintain consistency.
