# Data Migration Investigation Findings

## Background
- A large data migration was executed using the Supabase SQL function `populate_clean_data()`
- Approximately 3,667 migrations were created during this process
- The migration affected staging tables that have since been moved to production
- Some records were missed during the migration process and need to be properly enrolled now

## Issues Identified

### 1. Auth User Creation Methodology
- Concerns exist about how `auth.users` were created during migration
- The migration process should have matched the logic in `/app/api/webhooks/xendit` but implemented a different approach

### 2. Missing Records
Two categories of records were missed:
- Records manually imported with an "imported" tag in systemeio (1,108 records confirmed)
- Records registered after user email `smilee.mearah@gmail.com` during the migration process (40 records confirmed)

## Technical Analysis

### Migration Implementation vs. Webhook Flow

#### Auth User Creation Differences

**Migration Function (`populate_clean_data`):**
- Uses a bulk INSERT operation into `auth.users` directly from a temp table
- The temp table contains filtered systemeio records
- Basic fields are populated (id, email, user metadata, created_at, etc.)
- Single transaction approach without individual user verification
- Uses the following filtering logic:
  ```sql
  CREATE TEMP TABLE p2p_users_clean AS
  SELECT DISTINCT ON (LOWER(email))
      email,
      first_name,
      last_name,
      created_at
  FROM (
      SELECT 
          "Email" as email,
          "First name" as first_name,
          "Last name" as last_name,
          now() as created_at
      FROM
          systemeio
      WHERE 
          "Email" LIKE '%@%.%'  -- Simple validation
          AND "Tag" ILIKE '%PaidP2P%'
  ) valid_emails
  ORDER BY LOWER(email);
  ```
- This filtering only includes records with 'PaidP2P' tag, missing those with 'imported' tag

**Webhook Flow (`ensureAuthUserAndProfile`):**
- Uses a more sophisticated, idempotent approach:
  1. Attempts to look up the user via unified_profiles first
  2. If not found, uses paginated admin user listing to search for the user
  3. Creates user only if not found, with proper email confirmation
  4. Creates/updates unified profile with complete metadata
  5. Returns both user ID and profile for subsequent operations
- More robust error handling and edge case management
- Integrates profile creation as part of the same logical transaction

### Database Structure Review
- Examined tables:
  - `auth.users`: Core authentication user records
  - `transactions`: Payment transaction records
  - `unified_profiles`: User profile information
  - `enrollments`: Course enrollment records
- Staging tables:
  - `auth_users_staging`
  - `systemeio_raw_staging`
  - `xendit_raw_staging`

### Missing Records Analysis
1. **Imported Tag Records:** 
   - 1,108 records in the systemeio table with the 'imported' tag
   - These were excluded because the migration only processed records with the 'PaidP2P' tag
   
2. **New Signups:** 
   - 40 records with the 'PaidP2P' tag registered after June 30, 2025 at 01:26:45 UTC
   - This is the timestamp of smilee.mearah@gmail.com's registration
   - These were likely missed because the migration was run before or during their registration

## Correct Enrollment Flow

Based on the webhook implementation in `/app/api/webhooks/xendit` and the utility functions in `payment-utils.ts`, the correct enrollment flow is:

### 1. Create Transaction Record (`logTransaction`)
- Generate transaction ID
- Store payment details (amount, currency, status, etc.)
- Include appropriate metadata and link to user (if available)

### 2. Ensure Auth User Exists (`ensureAuthUserAndProfile`)
- Look up user by email using proper pagination and multiple lookup strategies
- Create user if needed with email confirmation
- Upsert unified profile with first/last name and other details
- Return user ID for enrollment

### 3. Create Enrollment (`createEnrollment`)
- Link user to appropriate course
- Set enrollment status, dates, and metadata
- Return enrollment record

### 4. Additional Steps
- Handle any affiliate conversions if applicable
- Send appropriate notifications/emails
- Update any relevant tracking or analytics

## Current Investigation Plan Status

### Notes
- The migration's filtering logic for P2P users only includes those with the 'PaidP2P' tag in systemeio, which explains why records with the 'imported' tag and those registered after the cutoff were missed.
- There are 1,108 records in systemeio with the 'imported' tag (confirmed).
- There are 40 records with 'PaidP2P' tag registered after the cutoff date for smilee.mearah@gmail.com (confirmed).
- The structure of the `auth.users`, `transactions`, `unified_profiles`, and `enrollments` tables has been reviewed as part of the deep dive.
- Some records were missed: those manually imported (with the 'imported' tag in systemeio) and those who registered after `smilee.mearah@gmail.com` during migration.
- The populate_clean_data function affected staging tables, but production is now live.
- All missed records need to be enrolled following the flow from `/app/api/webhooks/xendit` (transactions → auth users → unified profiles → enrollment).

### Task List
- [x] Review the populate_clean_data migration process and its effect on staging and production tables.
- [x] Compare how `auth.users` are created in the migration vs. `/app/api/webhooks/xendit`.
  - [x] Summarize differences between migration and webhook approaches
- [x] Investigate enrollment logic in payment-utils and related functions.
- [x] Identify and list missed records: manual imports and new signups during migration.
- [x] Map the correct enrollment flow for these records, referencing `/app/api/webhooks/xendit`.
- [ ] Document findings and next steps before any code changes.

## Auth User Account Comparison

### Unmigrated Account (Fresh)
- Email confirmed at timestamp is properly set
- raw_user_meta_data includes "email_verified": true
- Confirmation token is properly initialized
- Creation and update timestamps align closely
- Created via the normal auth flow with proper initialization

### Migrated Account
- Email confirmed at timestamp is set, but via bulk insert
- raw_user_meta_data has a "source": "clean_migration" attribute and includes first_name/last_name
- Missing proper initialization of some auth fields
- Confirmation token is null
- The bulk insertion approach bypassed normal auth initialization processes

### Magic Link & Account Setup Issues
- Migrated accounts encounter problems because:
  1. The normal confirmation flow expects certain fields to be properly initialized
  2. The bulk insert did not fully replicate the auth system's initialization process
  3. Some metadata fields required for password resets might be missing or improperly set
  4. The `/app/auth/setup-account/page.tsx` expects certain fields that may be missing/different in migrated accounts
  5. The magic link verification process in `/app/api/auth/magic-link/verify/[token]/route.ts` checks for attributes that may be inconsistent in migrated records

## Recommended Next Steps

### 1. Missing Records Remediation

#### Create a Script that follows the webhook flow for missed records:
   - Records with 'imported' tag in systemeio (1,108)
   - Records created after the cutoff timestamp (40)

#### Use the Existing Functions from `payment-utils.ts`:
   - `ensureAuthUserAndProfile`
   - `logTransaction`
   - `createEnrollment`

#### Run in Controlled Phases:
   - First process a small batch as a test (5-10 records)
   - Verify results before processing all records
   - Monitor performance and database impact

### 2. Healing Migrated Auth Accounts

#### Root Issue Identified:
- Migrated auth users were created via bulk SQL insert, bypassing the Supabase Auth API's proper initialization
- This caused multiple issues with authentication flows, including "Database error loading user" during password setup

#### Specific Problems:
- NULL token fields that should have been empty strings (`confirmation_token`, `recovery_token`, etc.)
- Missing `encrypted_password` values
- Missing `email_verified: true` flag in user metadata
- These issues prevented Admin API access and broke magic link authentication flows

#### Solution Implementation:
- Direct SQL updates to fix these issues while preserving user IDs and relationships
- 3,662 migrated accounts were successfully healed via SQL
- Solution preserves all existing database relationships

#### SQL Healing Script:
```sql
BEGIN;

-- Fix NULL fields in auth.users table for all migrated users
UPDATE auth.users
SET
  confirmation_token = '',  -- Empty string instead of NULL
  recovery_token = '',      -- Empty string instead of NULL
  email_change_token_new = '',  -- Empty string instead of NULL
  email_change = '',        -- Empty string instead of NULL
  encrypted_password = '$2a$10$temporarypasswordplaceholderxyz123456'  -- Temporary password hash
WHERE
  raw_user_meta_data->>'source' = 'clean_migration'
  AND (confirmation_token IS NULL OR recovery_token IS NULL OR encrypted_password IS NULL);

-- Update user metadata to include email_verified flag for all migrated users
UPDATE auth.users
SET
  raw_user_meta_data = raw_user_meta_data || '{"email_verified": true}'::jsonb
WHERE
  raw_user_meta_data->>'source' = 'clean_migration'
  AND (raw_user_meta_data->'email_verified') IS NULL;

-- Ensure the identity_data in auth.identities has email_verified for all migrated users
UPDATE auth.identities
SET
  identity_data = identity_data || '{"email_verified": true}'::jsonb
WHERE
  user_id IN (
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'source' = 'clean_migration'
  );

COMMIT;
```

#### Verification:
- Successful Admin API access to previously inaccessible accounts confirmed
- Multiple randomly selected migrated accounts were tested and verified
- API verification confirmed accounts are now fully usable/searchable
- Magic links and account setup processes should now work correctly
