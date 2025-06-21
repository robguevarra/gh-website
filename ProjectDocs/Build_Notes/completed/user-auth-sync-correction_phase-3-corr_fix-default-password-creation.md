 # User Auth Sync Correction - Phase 3-Correction: Fix Default Password Creation

## Task Objective
Correct the `/api/admin/dashboard/sync` endpoint's user creation logic. Ensure new Supabase Auth users are created via the standard email confirmation flow (requiring users to set their own password) instead of assigning a hardcoded default password. Address the status of users previously created with the default password and update relevant documentation.

## Current State Assessment
The `/api/admin/dashboard/sync/route.ts` endpoint currently identifies missing users based on Xendit and Systemeio email lists and creates corresponding accounts in Supabase Auth. However, it uses `admin.auth.admin.createUser` with both `email_confirm: true` and a hardcoded `password: 'graceful2025'` parameter. This marks the email as confirmed immediately and bypasses the standard Supabase flow where the user clicks a confirmation link to set their initial password. Consequently, users created via `/sync` exist in the system but haven't completed the intended onboarding or set a secure password, and they do not receive a confirmation email. The build note `data-unification_phase3-2_migration-implementation.md` incorrectly describes this default password creation as the intended behavior.

## Future State Goal
The `/api/admin/dashboard/sync` endpoint creates Supabase Auth users by calling `admin.auth.admin.createUser` with `email_confirm: true` *without* providing a `password` parameter. Newly created users receive a confirmation email from Supabase prompting them to verify their email and set their own password. The build note `data-unification_phase3-2_migration-implementation.md` accurately reflects this standard email confirmation process. Users previously created by `/sync` with the default password have been handled appropriately (e.g., prompted via password reset).

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. `data-unification_phase3-2_migration-implementation.md` (Build note to be corrected)
> 2. Code file `app/api/admin/dashboard/sync/route.ts` (Endpoint to be modified)
> 3. Code file `app/actions/payment-utils.ts` (Contains `ensureAuthUserAndProfile` showing the desired pattern)
> 4. `ProjectDocs/build-notes-guidelines.md` (For documentation standards)
> 5. Supabase Auth documentation regarding user creation and email confirmation.
>
> This ensures consistency and alignment with project goals and standards.

### From `data-unification_phase3-2_migration-implementation.md`
The section "Migration Workflow -> 1. Auth User Creation (via `/sync` API)" currently states that users are created with a default password. This needs correction.

### From `app/api/admin/dashboard/sync/route.ts`
The code currently contains:
```typescript
const DEFAULT_PASSWORD = 'graceful2025';
// ...
await admin.auth.admin.createUser({
  email,
  password: DEFAULT_PASSWORD, // This needs to be removed
  email_confirm: true,
});
```

### From `app/actions/payment-utils.ts` (`ensureAuthUserAndProfile`)
This function demonstrates the desired pattern for creating users via email confirmation link:
```typescript
await supabase.auth.admin.createUser({
  email,
  email_confirm: true, // No password parameter provided
});
```

## Implementation Plan

### 1. Modify `/sync` Endpoint Logic
- [ ] Edit `app/api/admin/dashboard/sync/route.ts`.
- [ ] Remove the `const DEFAULT_PASSWORD = 'graceful2025';` line.
- [ ] Remove the `password: DEFAULT_PASSWORD,` parameter from the `admin.auth.admin.createUser` call.
- [ ] Ensure `email_confirm: true` remains.
- [ ] Add logging to clearly indicate when a user creation is initiated via this method.

### 2. Correct Build Note Documentation
- [ ] Edit `ProjectDocs/Build_Notes/completed/data-unification_phase3-2_migration-implementation.md`.
- [ ] Update the description in "Migration Workflow -> 1. Auth User Creation (via `/sync` API)" to state that users are created via the standard email confirmation flow *without* a default password, requiring them to click a link and set their own password.

### 3. Handle Existing Users Created via `/sync`
- [ ] **Strategy:** Trigger password reset emails for all affected users.
- [ ] **Implementation:**
    - [ ] Identify users created by the `/sync` endpoint (potentially based on creation date/time or lack of password hash if Supabase allows distinguishing). If difficult to identify precisely, consider sending resets to all users created around the time the `/sync` endpoint was used.
    - [ ] Develop a script or temporary admin function to call `supabase.auth.admin.generateLink({ type: 'recovery', email: userEmail })` for each affected user.
    - [ ] Execute the script/function to send out password reset emails.
    - [ ] Monitor Supabase Auth logs for successful email generation and any potential rate limiting.
- [ ] **Communication (Optional but Recommended):** Consider notifying affected users via a separate channel (if possible) that they will receive a password reset link to properly set up their account access.

### 4. Validation and Testing
- [ ] Run the modified `/sync` endpoint.
- [ ] Verify that a new user created by the endpoint receives a confirmation email from Supabase.
- [ ] Confirm that the user can click the link and successfully set their password.
- [ ] Verify that the password reset emails were sent successfully to the previously affected users.
- [ ] Review server logs for any errors during the `/sync` run or password reset process.

## Technical Considerations

### Supabase Email Provider & Rate Limits
- Ensure the Supabase project's email provider is correctly configured and enabled.
- Be mindful of email rate limits, especially when sending potentially numerous password reset emails in bulk. Consider batching or spacing out the reset process if necessary. Check Supabase Auth logs for rate limit errors.

### User Experience
- The email confirmation and password reset flows rely on Supabase's default templates unless customized. Ensure these templates are clear for users.
- Consider how to handle users who might miss or ignore the initial confirmation or reset emails.

## Completion Status
- **Current Status:** Planning initiated.
- **Pending:** Implementation of code changes, documentation updates, handling existing users, and validation.

## Next Steps After Completion
- Confirm the `/sync` endpoint functions correctly according to the standard email confirmation flow.
- Monitor user sign-ups initiated via this path.
- Archive this build note upon successful completion and validation.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
