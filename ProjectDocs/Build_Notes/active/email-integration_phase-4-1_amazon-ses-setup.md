# Email Integration - Phase 4-1: Amazon SES Setup and Core Implementation

## Task Objective
Integrate Amazon Simple Email Service (SES) to handle transactional email sending for the Graceful Homeschooling platform, ensuring reliable delivery for critical communications like purchase confirmations and potentially user authentication events.

## Current State Assessment
The platform currently relies on Supabase's default email provider for authentication emails (like confirmation links). As observed, there might be deliverability or configuration issues, as confirmation emails were not being received consistently when users were created via the `/sync` endpoint with a default password. There is no centralized system or utility for sending application-specific transactional emails (e.g., purchase confirmations, course updates).

## Future State Goal
- All application-level transactional emails (e.g., ebook purchase confirmation, course enrollment welcome) are sent reliably via Amazon SES.
- A reusable, centralized utility function exists within the codebase for sending emails through SES.
- Email content is templated for consistency and maintainability.
- Basic error handling and logging are implemented for SES API calls.
- Supabase continues to handle its core authentication emails (confirmation, password reset) for now, but the system is prepared for potentially migrating those to SES later if needed.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Data Unification Strategy (Phase 3-0)
> 2. Database Schema Enhancement (Phase 3-1)
> 3. Migration Implementation (Phase 3-2)
> 4. Project Context (`ProjectContext.md`)
> 5. Build Notes Guidelines (`build-notes-guidelines.md`)
> 6. AWS SES API Documentation (`https://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html`)
>
> This ensures consistency and alignment with project goals and standards.

### From Database Schema
The following tables contain relevant user and transaction data for email personalization:
- `unified_profiles`: Contains `first_name`, `last_name`, `email`.
- `transactions`: Contains details about purchases (`transaction_type`, `amount`, `paid_at`).
- `ebook_contacts`: Contains email, name, and metadata for ebook buyers.
- `enrollments`: Contains course enrollment details.

### From Codebase Structure
Potential integration points for email sending include:
- Xendit Webhook (`app/api/webhooks/xendit/route.ts`): After successfully processing a `invoice.paid` event for ebooks or courses.
- User Onboarding/Auth flows: If migrating Supabase auth emails later.

## Implementation Plan

### 1. AWS SES Setup & Configuration
- [ ] **Verify Domain/Email:** In the AWS SES console, verify the domain (e.g., `gracefulhomeschooling.com`) and the 'From' email address (e.g., `noreply@gracefulhomeschooling.com`) to be used for sending. This involves adding DNS records (DKIM, SPF/DMARC recommended for deliverability).
- [ ] **Create IAM User/Role:** Create a dedicated IAM user or role with programmatic access and policies restricted to only the necessary SES actions (e.g., `ses:SendEmail`, `ses:SendRawEmail`).
- [ ] **Get Credentials:** Securely obtain the AWS Access Key ID and Secret Access Key for the created IAM user.
- [ ] **Request Production Access:** If necessary, request removal from the SES sandbox environment to send emails to unverified addresses.

### 2. Codebase Setup
- [ ] **Install AWS SDK:** Add the necessary AWS SDK v3 SES client package to the project dependencies.
  ```bash
  npm install @aws-sdk/client-sesv2
  # or yarn add @aws-sdk/client-sesv2
  ```
- [ ] **Configure Credentials:** Store the AWS credentials securely using environment variables (e.g., `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM_EMAIL_ADDRESS`). Ensure these are available in the deployment environment (e.g., Vercel environment variables).

### 3. Create SES Email Sending Utility
- [ ] **Design Utility Function:** Create a reusable server-side function (e.g., in `lib/email/send-email.ts` or similar).
  - Function signature: `sendEmail({ to, subject, bodyHtml, bodyText })`
  - Internally:
    - Initialize the SESv2 client using credentials from environment variables.
    - Construct the `SendEmailCommandInput` parameters (Source, Destination, Content).
    - Use the `SendEmailCommand` with the SES client.
    - Implement basic try/catch error handling around the SES API call.
    - Log success or failure messages, including the SES `MessageId` on success or the error details on failure.
- [ ] **Implement Utility Function:** Write the code for the `sendEmail` utility.

### 4. Implement Email Templating (Basic)
- [ ] **Define Templates:** Create simple string templates for initial emails (e.g., ebook purchase confirmation). Store these potentially as constants or in a separate configuration file.
  - Example Template: `Hello {{firstName}}, thank you for purchasing {{productName}}! Your download link is: {{downloadLink}}`
- [ ] **Integrate Templating:** Update the `sendEmail` utility or the calling code to replace placeholders in the template strings with actual data (e.g., using `string.replace()`).

### 5. Integrate Email Sending into Webhook
- [ ] **Modify Xendit Webhook:** In `app/api/webhooks/xendit/route.ts`, after successfully processing an `invoice.paid` event and updating the database:
  - Identify the product purchased (ebook or course) based on transaction details.
  - Gather necessary data (recipient email, name, product name, potentially a download link for ebooks).
  - Select the appropriate email template.
  - Call the `sendEmail` utility function with the prepared data and template.
  - Add error handling in case email sending fails (log the error, but don't necessarily fail the webhook response).

### 6. Testing and Verification
- [ ] **Test Utility:** Unit test the `sendEmail` utility function (potentially using AWS SDK mocks).
- [ ] **Test Integration:** Trigger the webhook locally or in a staging environment with test payments.
- [ ] **Verify Email Receipt:** Confirm that emails are received in test inboxes.
- [ ] **Check Logs:** Verify success and error logging for SES calls.

## Technical Considerations

### Security
- Store AWS credentials securely using environment variables, never commit them to the repository.
- Use IAM policies with least privilege for the SES sending user/role.
- Be mindful of potential injection vulnerabilities if user-provided data is included directly in email bodies (ensure proper sanitization or use safe templating).

### Deliverability
- Properly configure DKIM and SPF DNS records for the sending domain to improve deliverability and reduce spam classification. Consider DMARC for added protection.
- Monitor bounce and complaint rates via the SES console or by setting up SNS notifications (potential future enhancement).
- Start with a small volume and gradually increase to warm up the sending IP if using a dedicated IP (usually not needed for typical transactional volumes initially).

### Supabase Auth Emails vs. Application Emails
- This plan focuses on integrating SES for *application* emails first (purchase confirmations).
- Supabase will continue handling its core auth emails (confirmation, password reset) via its own configured provider for now.
- Migrating Supabase auth emails to SES is possible but more complex, requiring manual handling of token generation and link construction, and can be considered as a separate, later phase if needed.

### Templating Engine
- Start with simple string replacement for basic templates.
- If more complex templates are needed later (layouts, loops, conditionals), consider integrating a dedicated email templating library (e.g., Handlebars, MJML for responsive HTML).

### Asynchronous Sending
- For high-volume scenarios or to avoid blocking the main request thread (like the webhook response), consider sending emails asynchronously using a background job queue (e.g., Vercel Serverless Functions triggered by a message queue or database event), though this adds complexity. For initial transactional volumes, direct sending from the webhook might be acceptable.

## Completion Status
- **Status:** Planning Phase.
- **Challenges Anticipated:** Correct AWS/DNS configuration, ensuring secure credential handling, potential deliverability issues initially.

## Next Steps After Completion
- Monitor email sending performance (deliverability, bounces, complaints).
- Consider implementing more advanced features like bounce/complaint handling via SNS.
- Evaluate migrating Supabase authentication emails to SES if needed.
- Develop more sophisticated email templates as required.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency 