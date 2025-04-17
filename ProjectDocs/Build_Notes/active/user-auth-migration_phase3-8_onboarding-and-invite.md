# User Auth Migration - Phase 3-8: Onboarding and Invite

## Current State & Next Actions (Update)
- The previous migration (Phase 3-2) only included users with existing Supabase Auth accounts.
- Many unified profiles do not yet have Supabase Auth accounts and cannot log in.
- **Next:**
  - Create Supabase Auth users for all remaining unified profiles (legacy users).
  - Send onboarding/invitation emails with default password and require password reset on first login.
  - After onboarding, re-run the migration for profiles, transactions, and enrollments to ensure all users and their data are included.

## Task Objective
Ensure all unified profiles in the new data model have corresponding Supabase Auth accounts, enabling all users to log in. Implement onboarding and invitation flows, including default password assignment, required password reset, and integration with email marketing.

## Current State Assessment
- Unified profiles have been created from Xendit and Systemeio data.
- Only users who already exist in Supabase Auth (`auth.users`) can log in.
- Many legacy users do not have Supabase Auth accounts and cannot access the platform.

## Future State Goal
- Every unified profile has a corresponding Supabase Auth user account.
- All users receive an onboarding/invitation email with a default password.
- Users are required to reset their password on first login.
- Email marketing system is integrated for onboarding and future engagement.
- All actions are logged for audit and compliance.

## Relevant Context
> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Data Unification Strategy (Phase 3-0)
> 2. Database Schema Enhancement (Phase 3-1)
> 3. Migration Implementation (Phase 3-2)
> 4. Project Context (`ProjectContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

## Implementation Plan

### 1. Identify Profiles Without Supabase Auth Accounts
- [ ] Query `unified_profiles` for records not linked to `auth.users`.
- [ ] Document the count and details for audit.

### 2. Create Supabase Auth Users for Legacy Profiles
- [ ] Use Supabase Admin API to bulk-create users for missing accounts.
- [ ] Assign a secure, random default password to each new user.
- [ ] Store a flag or metadata indicating migration-created users.

### 3. Send Onboarding/Invitation Emails
- [ ] Integrate with email marketing system (e.g., Mailgun, SendGrid, Systemeio).
- [ ] Send personalized invitation emails with login instructions and default password.
- [ ] Track delivery and open rates for onboarding emails.

### 4. Require Password Reset on First Login
- [ ] Set Supabase Auth to require password change on first login for migrated users.
- [ ] Provide clear instructions in onboarding email.
- [ ] Monitor and log password reset completions.

### 5. Integrate with Email Marketing
- [ ] Sync new Supabase Auth users to email marketing lists.
- [ ] Tag users as "migrated" for future campaigns.
- [ ] Ensure compliance with opt-in/opt-out preferences.

### 6. Audit Logging and Compliance
- [ ] Log all user creation, email delivery, and password reset events.
- [ ] Provide reports for audit and troubleshooting.

## Technical Considerations

### Supabase Auth Integration
- Use Admin API for secure, bulk user creation.
- Handle rate limits and error responses gracefully.
- Store user metadata for migration tracking.

### Security and Privacy
- Use secure, random default passwords.
- Require password reset on first login.
- Ensure onboarding emails do not expose sensitive information.
- Comply with data privacy and consent requirements.

### Email Marketing Integration
- Use transactional email provider with API support.
- Personalize onboarding emails for better engagement.
- Track delivery, open, and click rates for effectiveness.

### Monitoring and Rollback
- Monitor for delivery failures or user issues.
- Provide rollback or re-invite options if needed.

## References
- See Phase 3-0, 3-1, and 3-2 build notes for unified profile and migration context.
- See ProjectContext.md for platform-wide requirements and standards.

// Comments:
// - This build note ensures all users can access the platform post-migration.
// - All steps follow industry best practice for user onboarding, security, and compliance.
// - Update this note as tasks are completed and new requirements emerge. 