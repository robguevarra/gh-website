# User Auth Migration - Phase 3-8: Onboarding and Invite

## [NEXT STEP: 2024-06-09] Complete Legacy User Migration for Full Data Unification
- The next step is to identify all emails in Xendit and Systemeio that are NOT present in `auth.users` or `unified_profiles`.
- Bulk-create Supabase Auth users for these missing emails.
- Re-run the migration scripts to populate `unified_profiles`, `transactions`, and `enrollments` for all users.
- This will ensure the unified schema is complete and the dashboard/analytics are accurate.
- After this, validate with the provided QA queries and only then proceed to onboarding/invite.

## [UPDATE: 2024-06-09] Decoupling Migration from Onboarding/Invite
**We are now separating the user migration from the onboarding/invite process.**

- All legacy users will be migrated into Supabase Auth and linked to unified profiles, but onboarding/invite emails will NOT be sent until the site and email marketing systems are ready.
- Each migrated user will be flagged as 'pending onboarding' in metadata.
- This allows us to complete the dashboard, QA, and all business logic with real data, without inviting users to an unfinished product.
- When the site is ready, we will run a separate onboarding/invite phase to send emails and require password resets.

## [2024-06-10] Temporary Admin Controls for Migration & QA

- Added two temporary admin buttons to the dashboard overview UI:
  1. **Manual Sync**: Triggers a backend sync/migration process to update unified tables (`unified_profiles`, `transactions`, `enrollments`) with the latest data from Xendit and systemeio. Ensures all new/changed records are processed. Intended for use during build/testing to keep data fresh.
  2. **Check Email Conflicts**: Runs a conflict check to identify users who are marked as PAID/SETTLED in Xendit but not tagged as PaidP2P in systemeio. Flags these for review or auto-tagging. Supports QA and data integrity during migration.

- Both buttons are visible in the dashboard header, show loading states, and display toast notifications. Currently, they use placeholder logic; backend API integration is the next step.

- These controls are for admin/build use only and will be removed or restricted in production.

---

## Task Objective
Ensure all unified profiles in the new data model have corresponding Supabase Auth user accounts, enabling all users to log in. Implement onboarding and invitation flows, including default password assignment, required password reset, and integration with email marketing.

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

## Implementation Plan (Simple, Modular Approach)

1. **Compare Paid P2P Email List with Existing Supabase Auth Users**
   - [ ] Query Xendit and systemeio for all users with 'PAID' status for 'Papers to Profits'.
   - [ ] Normalize and deduplicate email addresses.
   - [ ] Compare with `auth.users` to identify missing accounts.

2. **Identify Emails Needing New Auth Accounts**
   - [ ] List all emails not present in `auth.users`.
   - [ ] Prepare for bulk creation.

3. **Bulk-Create Missing Users in Supabase Auth**
   - [ ] Use Supabase MCP Auth Admin API to create users in bulk.
   - [ ] Set password to `graceful2025` (documented password policy for migration).
   - [ ] Set metadata: `onboarding_status: 'pending'`, `user_type: 'PaidP2P'`.
   - [ ] Do not send onboarding/invite emails yet.

4. **Cross-Link/Enrich with systemeio Data and Set 'PaidP2P' Status**
   - [ ] For each new user, enrich profile with systemeio data if available.
   - [ ] Mark user as 'PaidP2P' in metadata.

5. **Log All Actions for Traceability**
   - [ ] Log user creation, metadata updates, and any errors.
   - [ ] Provide audit trail for compliance.

// Password Policy for Migration:
// - All bulk-created users will have the password: 'graceful2025'.
// - Users will be required to reset their password on first login (enforced in onboarding phase).
// - This is a temporary measure for migration/testing only.

// Bulk creation will use Supabase MCP Auth Admin API, not direct SQL, for security and compliance.
// SQL will be used to identify missing users and prepare data for MCP.

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