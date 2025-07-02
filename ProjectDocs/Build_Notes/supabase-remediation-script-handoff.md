# Supabase Remediation Script Testing Handoff Document

## Project Overview
This document provides a comprehensive summary of the Supabase remediation script testing conducted to address missed user records from the migration process. It references the findings and recommendations from [ProjectDocs/data-migration-investigation-findings.md](../data-migration-investigation-findings.md).

## Background

As documented in the data migration investigation findings, a large data migration was executed using the Supabase SQL function `populate_clean_data()`, which created approximately 3,667 migrated user accounts. Two categories of records were identified as missing from this migration:

1. Records with the "imported" tag in systemeio (1,108 records confirmed)
2. Records registered after the user email `smilee.mearah@gmail.com` during the migration process (40 records confirmed)

The remediation effort aimed to properly enroll these missed records by implementing a script that follows the correct enrollment flow from `/app/api/webhooks/xendit`.

## Tasks Completed

1. **Review of Data Migration Process**
   - Reviewed how `auth.users` were created in the migration vs. the webhook flow
   - Confirmed the migration used bulk INSERT operations vs. the webhook's more sophisticated idempotent approach
   - Verified the filtering logic only included records with 'PaidP2P' tag, missing those with 'imported' tag

2. **Script Development & Testing**
   - Created a script (`scripts/enroll-missed-records.ts`) to process missed records following the recommended flow
   - Implemented batch processing with test run capability
   - Developed transaction, auth user, profile, and enrollment creation logic

3. **Script Debugging & Optimization**
   - Fixed transaction lookup query syntax to properly detect existing transactions
   - Enhanced user lookup to use multiple methods (SQL, pagination) for robustness
   - Ensured unified profile creation uses auth user IDs to maintain FK constraints
   - Added proper error handling for all operations

4. **Edge Case Handling**
   - Added logic to handle "user already exists" errors with fallback lookup methods
   - Implemented transaction deduplication to prevent multiple transactions for the same user/course
   - Made profile lookup more reliable by preserving ID relationships

## Technical Challenges Encountered

### 1. "Ghost" User Accounts
- **Issue**: Some users appear to exist according to the Supabase API but cannot be found via any lookup method (SQL or pagination)
- **Details**: When attempting to create these users, we receive "A user with this email address has already been registered" errors, but cannot find them in the database
- **Impact**: This prevents proper enrollment of these users as we cannot obtain their user IDs

### 2. Database Schema Constraints
- **Issue**: Foreign key constraints between `unified_profiles` and `auth.users` require profile IDs to match user IDs
- **Resolution**: Modified profile creation to always use auth user IDs, maintaining referential integrity

### 3. User Lookup Performance
- **Issue**: Pagination-based user lookup is slow for large datasets (1200+ users)
- **Solution**: Implemented SQL-based user lookup (via exec_sql RPC) for efficiency, falling back to pagination when needed

### 4. SQL Function Issues
- **Issue**: The RPC function for user lookup (`get_user_by_email`) returned "structure of query does not match function result type"
- **Workaround**: Used generic `exec_sql` RPC function with direct SQL queries instead

## Current Status of Remediation Script

### What Works
- Transaction creation with proper deduplication checks
- Auth user lookup via direct SQL and pagination fallback
- Unified profile creation with proper foreign key relationship to auth users
- Basic error handling and logging

### Remaining Issues
- "Ghost" user accounts that exist but can't be found through any lookup method
- The script completes with errors due to these ghost accounts
- No successful enrollments were completed in test batches due to these issues

### Test Results from Latest Run
```
=== MISSED RECORDS REMEDIATION - TEST BATCH ===
Processing 2 records as a test batch
No cutoff record found for smilee.mearah@gmail.com, using default date 2023-05-15
Using cutoff timestamp: 2023-05-15
Found 1 imported tag records and 1 new records after cutoff
Total combined records: 2

Processing record for chesa8311@gmail.com (undefined undefined)
Checking for existing transaction for chesa8311@gmail.com...
✅ Created transaction b5339204-f382-47ab-9c49-e3e7ca705c00 for chesa8311@gmail.com
Ensuring auth user and profile for chesa8311@gmail.com
Searching for existing user with email: chesa8311@gmail.com
No user found via SQL for chesa8311@gmail.com, trying pagination...
Trying pagination search for chesa8311@gmail.com...
[Pagination search through 20 pages]
No user found for chesa8311@gmail.com, creating new user...
User chesa8311@gmail.com already exists but was not found in lookup. Trying to find via direct SQL...
User chesa8311@gmail.com exists according to API but cannot be found in the database
Final SQL lookup failed: Error: Failed to find existing user: A user with this email address has already been registered
❌ Failed to ensure auth user and profile for chesa8311@gmail.com: Failed to find existing user: A user with this email address has already been registered

[Similar issue with mosangstop101823@gmail.com]

=== PROCESSING RESULTS ===
Successfully processed: 0 out of 2 records

Failed records:
- chesa8311@gmail.com: Failed to find existing user: A user with this email address has already been registered
- mosangstop101823@gmail.com: Failed to find existing user: A user with this email address has already been registered
```

## Script Architecture

The remediation script (`enroll-missed-records.ts`) follows the recommended flow from the data migration investigation findings:

1. **Initial Setup**:
   - Connects to Supabase using service role key
   - Identifies missed records using cutoff timestamp and imported tag filters
   - Processes records in small batches for testing

2. **Per-Record Processing Flow**:
   ```
   processMissedRecord()
     ↓
   createTransaction() → ensureAuthUserAndProfile() → createEnrollment()
   ```

3. **Key Functions**:
   - `createTransaction()`: Creates a transaction record for the enrollment
   - `ensureAuthUserAndProfile()`: Finds or creates auth user and unified profile
   - `createEnrollment()`: Enrolls the user in the specified course

## Comparison to Original Data Migration

The script adheres to the recommended approach by:

1. Following the idempotent pattern from the webhook flow:
   - Check if user exists before creating
   - Use multiple lookup strategies (SQL, pagination)
   - Handle "already exists" cases gracefully

2. Maintaining proper data relationships:
   - Use auth user IDs as profile IDs
   - Link transactions to user emails
   - Store appropriate metadata for traceability

3. Using proper error handling and reporting:
   - Log all steps and errors
   - Track success/failure rates
   - Provide detailed error messages for debugging

## Recommended Next Steps

### 1. Address Ghost User Accounts
The primary blocker is the "ghost" user accounts that exist but cannot be found through any lookup method. Options to address this:

- **Option A**: Implement a direct auth table scan outside the API
  ```sql
  -- Example approach (would need proper implementation)
  SELECT * FROM auth.users WHERE email = 'specific@email.com'
  ```

- **Option B**: Create a custom RPC function that bypasses API limitations
  ```sql
  -- Example RPC function
  CREATE OR REPLACE FUNCTION get_auth_user_by_exact_email(search_email TEXT)
  RETURNS TABLE (id UUID, email TEXT) AS $$
  BEGIN
    RETURN QUERY
    SELECT u.id, u.email FROM auth.users u
    WHERE LOWER(u.email) = LOWER(search_email);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

- **Option C**: Consider recreating these problematic accounts (high risk)
  - Would require identifying and removing the existing ghost accounts
  - Could break data relationships if not carefully managed
  - Should only be used as a last resort

### 2. Script Optimization for Full Batch

Once the ghost user issue is resolved, prepare for full batch processing:

- Implement batching mechanism to process records in groups of 50-100
- Add resume capability to continue from last successful record
- Enhance logging with timestamp and batch information
- Consider adding a dry-run mode for final verification

### 3. Verification Approach

After successful script execution, implement verification:

- Verify sample of processed records to ensure:
  - Auth user exists and is accessible via API
  - Unified profile exists with correct information
  - Enrollment record exists and links to correct user and course
  - Transaction record is properly linked

## Connection to Healing Migrated Auth Accounts

The ghost user issue might be related to the migrated account healing process described in the data migration investigation findings. The SQL healing script addressed:

- NULL token fields that should have been empty strings
- Missing `encrypted_password` values
- Missing `email_verified: true` flag in user metadata

It's possible that some accounts were:
1. Partially migrated but not fully healed
2. Healed in ways that fixed API access but not searchability
3. Created outside both the normal flow and the bulk migration

A comprehensive audit comparing auth users, identities, and unified profiles may be needed to fully understand and resolve these edge cases.

## Conclusion

While significant progress has been made on the remediation script, the ghost user account issue remains the primary blocker to successful completion. The script architecture is sound and follows the recommended approach from the data migration investigation findings. With the resolution of the ghost user issue, the script should be able to successfully process the missed records and complete the remediation effort.

## 2025-07-02 Progress Update

- Patched remediation script:
  - Added UUID generation for `enrollments.id` (fixed NOT NULL violation).
  - Implemented robust transaction deduplication and processed-record tracking (`migration_log`, metadata flag).
- Testing:
  - 50-record test batch – 100 % success.
  - Full run processed 2 000 / 2 000 records without errors.
- Verification query shows 148 remaining candidates:
  - 147 contacts have **no `auth.users` row** (likely typos, duplicates, or abandoned carts in Systeme.io).
  - 1 contact has an auth user but **no `unified_profiles` row** – profile creation failed during run.
- Exported full list of these 148 emails to CSV for manual audit:
  `ProjectDocs/exports/unenrolled_emails_2025-07-02.csv`.
- Next Steps:
  1. Product/ops team to review CSV and decide which addresses warrant manual enrollment or a targeted script rerun.
  2. For the single “missing profile” account, rerun script on that email to finish enrollment.
  3. Close out remediation once approved.

## References

- [ProjectDocs/data-migration-investigation-findings.md](../data-migration-investigation-findings.md)
- [scripts/enroll-missed-records.ts](/scripts/enroll-missed-records.ts)
- [app/api/webhooks/xendit](/app/api/webhooks/xendit)
- [SQL Healing Script](../data-migration-investigation-findings.md#sql-healing-script)
