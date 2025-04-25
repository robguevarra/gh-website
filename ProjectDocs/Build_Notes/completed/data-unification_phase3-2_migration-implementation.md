// Update: This build note has been reviewed and updated for full alignment with the completed Phase 3-0 (Strategy Planning) and Phase 3-1 (Schema Enhancement).
// - All migration logic must use the normalization, precedence, and validation rules from those phases.
// - Table and field names must match the actual schema: unified_profiles, transactions, enrollments, etc.
// - Status, product type, and tag normalization must follow the mapping in Phase 3-0.
// - All validation, conflict resolution, and audit logging must be consistent with the strategy.
// - See Phase 3-0 and 3-1 for detailed field mapping, data model, and transformation rules.

# Data Unification - Phase 3-2: Migration Implementation

## Task Objective
Implement the data migration process to populate the enhanced database schema with unified data from the existing Xendit and Systemeio tables, ensuring data integrity and consistency throughout the migration.

## Current State Assessment
The unified schema is in place, and the migration process is now modularized and automated via API endpoints. The process is designed to be idempotent and robust, supporting both initial migration and incremental syncs.

## Migration Workflow (2024-06-09)

### 1. Auth User Creation (via `/sync` API)
- The `/api/admin/dashboard/sync` endpoint fetches all unique, normalized emails from Xendit (PAID/SETTLED for P2P) and systemeio (tagged PaidP2P).
- It compares these to existing Supabase Auth users (using paginated fetches for >1000 users).
- For each missing email, it creates a new Auth user with a default password and confirmed email status.
- This step ensures referential integrity for all subsequent migrations, as `unified_profiles.id` references `auth.users.id`.
- The endpoint is idempotent: it skips users that already exist and logs all actions.

### 2. Unified Profile Upsert (deduplication, upsert logic)
- After Auth users are created, a deduplicated upsert is performed into `unified_profiles`:
  - For each Auth user, merge profile info from systemeio (prefer names/tags from systemeio, fallback to Xendit if needed).
  - Use a CTE with `distinct on (u.id)` to ensure only one row per user.
  - Upsert into `unified_profiles` using `ON CONFLICT (id) DO UPDATE` to avoid duplicate key errors and ensure idempotency.
  - Example SQL:
    ```sql
    with deduped as (
      select distinct on (u.id)
        u.id,
        lower(trim(u.email)) as email,
        s."First name",
        s."Last name",
        null as phone,
        string_to_array(s."Tag", ',') as tags,
        case
          when s."Tag" ilike '%squeeze%' then 'squeeze'
          when s."Tag" ilike '%canva%' then 'canva'
          else null
        end as acquisition_source,
        coalesce(s."Date Registered", now()) as created_at,
        now() as updated_at
      from auth.users u
      left join systemeio s on lower(trim(s."Email")) = lower(trim(u.email))
      order by u.id, s."Date Registered" desc nulls last
    )
    insert into unified_profiles (id, email, first_name, last_name, phone, tags, acquisition_source, created_at, updated_at)
    select * from deduped
    on conflict (id) do update set
      email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      tags = excluded.tags,
      acquisition_source = excluded.acquisition_source,
      updated_at = now();
    ```
- This step is also idempotent and can be safely re-run.
- [x] Log upserted, skipped, and error emails; return detailed change logs and error samples in response
// **Troubleshooting Note (YYYY-MM-DD):** Investigated sync issues where new transactions were skipped.
// Root cause identified: The batch insert for NEW profiles in this endpoint was failing silently
// due to the use of an invalid `{ skipDuplicates: true }` option in the `.insert()` call (not supported by Supabase JS client for standard tables).
// This prevented `unified_profiles` from being created for users newly added by the `/sync` endpoint.
// **Resolution:** Removed the invalid `skipDuplicates` option. The logic correctly identifies new profiles, and the primary key constraint prevents duplicates.
// **Follow-up Issue (YYYY-MM-DD):** The batch insert still failed with a `duplicate key value violates unique constraint "unified_profiles_pkey"` error.
// This indicated the logic classifying profiles as "new" (because they weren't in the initially fetched `existingMap`) was flawed, as the profile ID actually *did* exist in the database.
// **Resolution 2:** Changed the batch insert (`.insert()`) to a batch upsert (`.upsert(..., { onConflict: 'id' })`). This allows the database to handle the conflict gracefully by updating the existing record instead of throwing an error, ensuring profiles for new Auth users are created or updated reliably.
// This fix allows `/update-profiles` to successfully insert/update new records, enabling subsequent steps (`/update-transactions`) to find the necessary `user_id`.

### 3. Transactions Migration (normalization, upsert, trigger for enrollments)
- All payment records from Xendit are migrated to the `transactions` table:
  - Normalize status, amount, timestamps, and product type.
  - Link each transaction to the correct unified profile by normalized email.
  - Use `nullif(..., '')::timestamptz` to handle empty timestamp strings.
  - Upsert using `ON CONFLICT (external_id) DO UPDATE` to ensure no duplicates and allow incremental syncs.
  - Example SQL:
    ```sql
    insert into transactions (
      user_id, amount, currency, status, transaction_type, payment_method, external_id,
      created_at, paid_at, settled_at, expires_at
    )
    select
      p.id,
      x."Amount",
      x."Currency",
      case x."Status"
        when 'PAID' then 'completed'
        when 'SETTLED' then 'completed'
        when 'UNPAID' then 'pending'
        when 'EXPIRED' then 'expired'
        else 'pending' end,
      case
        when x."Description" ilike '%papers to profits%' then 'P2P'
        when x."Description" ilike '%canva%' then 'Canva'
        else 'Other' end,
      x."Payment Method",
      x."External ID",
      nullif(x."Created Timestamp", '')::timestamptz,
      nullif(x."Paid Timestamp", '')::timestamptz,
      nullif(x."Settled Timestamp", '')::timestamptz,
      nullif(x."Expiry Date", '')::timestamptz
    from xendit x
    join unified_profiles p on lower(trim(x."Email")) = p.email
    where p.id is not null and x."External ID" is not null
    on conflict (external_id) do update set
      user_id = excluded.user_id,
      amount = excluded.amount,
      currency = excluded.currency,
      status = excluded.status,
      transaction_type = excluded.transaction_type,
      payment_method = excluded.payment_method,
      created_at = excluded.created_at,
      paid_at = excluded.paid_at,
      settled_at = excluded.settled_at,
      expires_at = excluded.expires_at;
    ```
- **Trigger Fix:** The `handle_transaction_insert` trigger was updated to use `lower(title)` instead of `lower(name)` for course lookup, matching the actual schema of the `courses` table.
- The trigger automatically creates enrollments for each new "P2P" completed transaction.

### 4. Enrollments Auto-Generation via Trigger
- The `after_transaction_insert` trigger calls `handle_transaction_insert()` after each insert into `transactions`.
- If the transaction is for a completed "P2P" payment, it inserts an enrollment for the user and course.
- The trigger is idempotent and uses `ON CONFLICT (user_id, course_id) DO NOTHING` to avoid duplicates.

### 5. Idempotency and Data Integrity
- All migration steps use upsert logic and deduplication to ensure they can be safely re-run.
- Referential integrity is enforced by only creating profiles for existing Auth users and only creating transactions/enrollments for valid profiles and courses.

### 6. Manual vs. Production Workflow
- **During development:** The dashboard "sync" button triggers the `/sync` API, which creates missing Auth users. Additional endpoints for updating profiles, transactions, and enrollments can be called in sequence for a full migration.
- **In production:** New users, payments, and enrollments are written directly to the unified tables as part of the app's business logic. The migration/sync endpoints are used for initial migration, bulk updates, or admin-triggered refreshes.

### 7. Modularization and Chaining
- Plan to modularize the migration endpoints:
  - `/api/admin/dashboard/update-profiles`
  - `/api/admin/dashboard/update-transactions`
  - `/api/admin/dashboard/update-enrollments`
- The `/sync` endpoint will be updated to call these endpoints in sequence after creating Auth users, enabling a single dashboard action to trigger the full migration.

## Validation and QA
- After each migration step, run validation queries (as documented in previous build notes) to ensure data quality and integrity.
- Monitor logs and handle any exceptions or data quality issues as they arise.

## Recent Findings: Profile Upsert Idempotency & Sync Issues (2024-06-09)

### Summary of Recent Sync Results
- After running the `/update-profiles` endpoint for a second time (following a successful initial sync), the process reported **1745 upserts** and **1000 skipped records**.
- This was unexpected, as the migration logic is designed to be idempotent—meaning only genuinely changed records should be upserted, and unchanged records should be skipped.

### What We Did
- We reviewed the upsert SQL and endpoint logic to confirm that:
  - The upsert uses `ON CONFLICT (id) DO UPDATE` to avoid duplicate key errors.
  - The update sets all profile fields (email, first/last name, tags, acquisition_source, updated_at) to the incoming values.
  - The process should only update rows if the incoming data differs from the existing row.
- We checked for common causes of non-idempotent upserts, including:
  - Type mismatches (e.g., string vs. array for tags)
  - Implicit changes from normalization (e.g., whitespace, case)
  - Always-updating fields (e.g., `updated_at` always set to `now()`)
  - Database triggers or defaults that might alter data on upsert
- We confirmed that the endpoint is not introducing new or duplicate users, and that the email matching logic is consistent.

### Explanation of the 1000+ Upserts/Skipped Entries
- Possible causes include:
  - The `updated_at` field is always set to `now()`, causing the row to be considered changed on every run, even if no other fields differ.
  - Minor differences in data formatting (e.g., array order, whitespace, case) may cause the database to treat the incoming row as different from the existing one.
  - The upsert statement does not include a `WHERE` clause to check for actual data changes before updating, so it always performs the update on conflict.
  - The skipped records likely correspond to users who were not present in the incoming data or who failed validation.

### Changes to `/update-profiles` Endpoint (April 2025)
- **Field‑level diff detection:** Only upsert when an incoming profile record actually differs from the existing row, avoiding no‑op updates.  
- **Preserve existing fields:** Read and reuse `phone` from the database instead of overwriting it with `null`.  
- **Batched inserts & updates:** Collected new vs. changed profiles, bulk‑inserted new rows with `insert(..., { skipDuplicates: true })`, and ran individual `update()` calls for genuine changes.  
- **Removed always‑updating timestamps:** Eliminated unconditional `updated_at = now()` on every run so that re‑runs don't mark unchanged records as updated.  
- **Enhanced logging & responses:** Added detailed console logs and returned `sampleErrors` in the JSON response for easy auditing of upserts, skips, and errors.  

### Current Issues
- **Non-idempotent Upserts:** The current upsert logic updates all fields (and the `updated_at` timestamp) on every run, even if the data is unchanged. This leads to unnecessary writes and can obscure true data changes.
- **Lack of Change Detection:** There is no mechanism to compare incoming data to existing rows and only update when a real change is detected.
- **Potential Data Drift:** Repeated updates may introduce subtle data drift if normalization or transformation logic changes over time.
- **Audit/Debug Difficulty:** The logs do not clearly distinguish between meaningful updates and no-op upserts, making it harder to audit changes.

### Next Steps
1. **Refine Upsert Logic:**
   - Update the upsert SQL to only update fields if the incoming data is different from the existing row (e.g., using `WHERE` clauses or more granular conflict handling).
   - Consider excluding `updated_at` from always being set to `now()` unless a real change occurs.
2. **Add Change Detection:**
   - Implement logic to compare incoming and existing data before performing an update.
   - Log when a row is actually changed vs. when it is a no-op.
3. **Improve Logging:**
   - Enhance logs to clearly report which records were truly updated, which were unchanged, and why.
4. **Validation & Testing:**
   - Add tests to verify that repeated syncs do not result in unnecessary upserts.
   - Run validation queries after each sync to confirm idempotency.

## Future State Goal
A successfully completed data migration with:
1. All relevant historical data preserved and properly transformed
2. Unified user profiles that combine information from both sources
3. Normalized transaction records linked to appropriate profiles
4. Course enrollments derived from payment transactions
5. Data validation to ensure consistency and integrity
6. Documentation of any data quality issues encountered

This migration will populate our new schema with clean, consistent data that is ready for use in dashboard analytics and business intelligence features.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Data Unification Strategy (Phase 3-0)
> 2. Database Schema Enhancement (Phase 3-1)
> 3. Project Context (`ProjectContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Data Unification Strategy
The strategy established:
- Email as the primary matching key between systems
- Data transformation rules for standardizing formats
- Conflict resolution approach (Xendit authoritative for payments, Systemeio for profiles)

### From Database Schema Enhancement
The schema includes:
- Unified profiles table with user information
- Normalized transactions table for payment data
- Enrollments table connecting users to courses

## Implementation Plan

### 1. Prepare Migration Environment (Executed)

#### Database Snapshots for Rollback
- **Action:** Create backups of Xendit and Systemeio tables before migration.
- **Example SQL:**
```sql
CREATE TABLE IF NOT EXISTS xendit_backup AS TABLE xendit;
CREATE TABLE IF NOT EXISTS systemeio_backup AS TABLE systemeio;
```
// Comments: These backups allow for rollback in case of migration issues.

#### Migration Logging Infrastructure
- **Action:** Create a migration_log table to track progress and errors.
- **Example SQL:**
```sql
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
// Comments: This table will be used to log each migration step and any errors for audit and troubleshooting.

#### Staging Schema for Migration Testing
- **Action:** Create a staging schema for dry-run migration and validation.
- **Example SQL:**
```sql
CREATE SCHEMA IF NOT EXISTS migration_staging;
```
// Comments: Use this schema to test migration logic before applying to production tables.

- [x] Create database snapshots for rollback capability
- [x] Set up migration logging infrastructure
- [x] Establish test environment for migration validation

### 2. Implement Profile Data Migration (Executed)

#### migrate_profiles Function
- **Purpose:** Extract unique emails from Xendit and Systemeio, combine profile info using precedence rules, normalize fields, and link to auth.users.
- **Example Logic:**
  1. Select all unique emails from both sources, lowercased and trimmed.
  2. For each email:
     - Prefer Systemeio for first/last name and tags.
     - Prefer Xendit for payment-related info.
     - Link to auth.users if email exists there.
     - Insert or update unified_profiles with normalized data.
     - Log conflicts and resolutions to migration_log.
- **Example SQL (conceptual):**
```sql
-- Pseudocode for migration logic
INSERT INTO unified_profiles (id, email, first_name, last_name, tags, acquisition_source, created_at)
SELECT
  COALESCE(u.id, gen_random_uuid()),
  e.email,
  s.first_name,
  s.last_name,
  string_to_array(s.tag, ','),
  CASE WHEN s.tag ILIKE '%squeeze%' THEN 'squeeze' WHEN s.tag ILIKE '%canva%' THEN 'canva' ELSE NULL END,
  COALESCE(s."Date Registered", x."Created Timestamp")::timestamptz
FROM (
  SELECT LOWER(TRIM(email)) AS email FROM xendit
  UNION
  SELECT LOWER(TRIM("Email")) AS email FROM systemeio
) e
LEFT JOIN systemeio s ON LOWER(TRIM(s."Email")) = e.email
LEFT JOIN xendit x ON LOWER(TRIM(x."Email")) = e.email
LEFT JOIN auth.users u ON LOWER(TRIM(u.email)) = e.email
ON CONFLICT (email) DO UPDATE SET ...;
```
// Comments: This logic ensures all profiles are unified, normalized, and linked to auth.users where possible.

#### Email Matching Algorithm
- **Action:** Implement case-insensitive, trimmed matching for emails.
- **Logic:**
  - Lowercase and trim all emails before comparison.
  - Detect and flag duplicates for manual review.
  - Log all duplicate resolutions to migration_log.

#### Validation Queries for Profiles
- **Purpose:** Ensure no data loss, required fields are complete, and formats are standardized.
- **Example SQL:**
```sql
-- Check for missing required fields
SELECT * FROM unified_profiles WHERE email IS NULL OR created_at IS NULL;
-- Check for duplicate emails
SELECT email, COUNT(*) FROM unified_profiles GROUP BY email HAVING COUNT(*) > 1;
-- Check for unlinked auth.users
SELECT * FROM unified_profiles WHERE id NOT IN (SELECT id FROM auth.users);
```
// Comments: These queries should be run after migration to ensure data quality and compliance.

- [x] Create migrate_profiles function
- [x] Develop email matching algorithm
- [x] Create validation queries for profiles

### 3. Implement Transaction Data Migration (Executed)

#### migrate_transactions Function
- **Purpose:** Transform Xendit payment records to normalized format, link to unified profiles, standardize status and amounts, convert timestamps, and categorize by product type.
- **Example Logic:**
  1. Extract all payment records from Xendit.
  2. Normalize email, status, amount, and timestamps.
  3. Map status: 'PAID', 'SETTLED' → 'completed'; 'UNPAID' → 'pending'; 'EXPIRED' → 'expired'.
  4. Map Description to product type: 'Papers to Profits Learning Fee' → 'P2P'; 'Canva Ebook' → 'Canva'.
  5. Link each transaction to unified_profiles by normalized email.
  6. Insert into transactions table, logging any issues to migration_log.
- **Example SQL (conceptual):**
```sql
INSERT INTO transactions (user_id, amount, currency, status, transaction_type, payment_method, external_id, created_at, paid_at, settled_at, expires_at)
SELECT
  p.id,
  x."Amount",
  x."Currency",
  CASE x."Status"
    WHEN 'PAID' THEN 'completed'
    WHEN 'SETTLED' THEN 'completed'
    WHEN 'UNPAID' THEN 'pending'
    WHEN 'EXPIRED' THEN 'expired'
    ELSE 'pending' END,
  CASE x."Description"
    WHEN 'Papers to Profits Learning Fee' THEN 'P2P'
    WHEN 'Canva Ebook' THEN 'Canva'
    ELSE 'Other' END,
  x."Payment Method",
  x."External ID",
  x."Created Timestamp"::timestamptz,
  x."Paid Timestamp"::timestamptz,
  x."Settled Timestamp"::timestamptz,
  x."Expiry Date"::timestamptz
FROM xendit x
JOIN unified_profiles p ON LOWER(TRIM(x."Email")) = p.email
ON CONFLICT (external_id) DO UPDATE SET ...;
```
// Comments: This logic ensures all transactions are normalized, linked, and categorized for BI use.

#### Payment Categorization Logic
- **Action:** Map Description field to standardized product types.
- **Logic:**
  - 'Papers to Profits Learning Fee' → 'P2P'
  - 'Canva Ebook' → 'Canva'
  - All others → 'Other'
- **Comments:** This enables product-level analytics and reporting.

#### Validation Queries for Transactions
- **Purpose:** Ensure all payments are migrated, linked, and correctly mapped.
- **Example SQL:**
```sql
-- Check for missing required fields
SELECT * FROM transactions WHERE user_id IS NULL OR amount IS NULL OR status IS NULL;
-- Check for unmapped product types
SELECT * FROM transactions WHERE transaction_type = 'Other';
-- Check for duplicate external IDs
SELECT external_id, COUNT(*) FROM transactions GROUP BY external_id HAVING COUNT(*) > 1;
```
// Comments: These queries should be run after migration to ensure data quality and compliance.

- [x] Create migrate_transactions function
- [x] Implement payment categorization logic
- [x] Create validation queries for transactions

### 4. Implement Enrollment Generation (Revised & Executed)

#### generate_enrollments Function
- **Purpose:** Analyze successful payment transactions for the Papers to Profits course only, create enrollment records, set status/dates, and link to profiles and courses.
- **Example Logic:**
  1. Select all transactions with status 'completed' and transaction_type = 'P2P'.
  2. For each transaction:
     - Map 'P2P' to the Papers to Profits course_id.
     - Create enrollment with user_id, course_id, transaction_id, status 'active', and enrolled_at = paid_at.
     - Set expires_at if applicable (e.g., for time-limited access).
     - Log any issues to migration_log.
- **Example SQL (conceptual):**
```sql
INSERT INTO enrollments (user_id, course_id, transaction_id, status, enrolled_at, expires_at)
SELECT
  t.user_id,
  (SELECT id FROM courses WHERE name = 'Papers to Profits' LIMIT 1),
  t.id,
  'active',
  t.paid_at,
  NULL -- or calculated expiration
FROM transactions t
WHERE t.status = 'completed' AND t.transaction_type = 'P2P'
ON CONFLICT (user_id, course_id) DO UPDATE SET ...;
```
// Comments: This logic ensures enrollments are only created for valid, completed Papers to Profits payments.
// Canva Ebook transactions are NOT included in enrollments, but are still tracked in transactions for BI.

#### Course Mapping Logic
- **Action:** Map transaction_type to course_id.
- **Logic:**
  - 'P2P' → Papers to Profits course
  - All others (including 'Canva') → NULL (no enrollment)
- **Comments:** This ensures only valid course purchases result in enrollments.

#### Validation Queries for Enrollments
- **Purpose:** Ensure enrollments match payment records, are linked to correct courses, and have consistent status.
- **Example SQL:**
```sql
-- Check for enrollments with missing user or course
SELECT * FROM enrollments WHERE user_id IS NULL OR course_id IS NULL;
-- Check for enrollments not linked to a completed transaction
SELECT * FROM enrollments e JOIN transactions t ON e.transaction_id = t.id WHERE t.status != 'completed';
-- Check for duplicate enrollments
SELECT user_id, course_id, COUNT(*) FROM enrollments GROUP BY user_id, course_id HAVING COUNT(*) > 1;
```
// Comments: These queries should be run after migration to ensure data quality and compliance.

- [x] Create generate_enrollments function
- [x] Implement course mapping logic (P2P only)
- [x] Create validation queries for enrollments

### 5. Implement Incremental Synchronization (Executed)

#### sync_new_data Function
- **Purpose:** Identify and migrate new or updated records since the last migration, applying the same transformation and loading logic as the initial migration.
- **Example Logic:**
  1. Track last processed record IDs or timestamps for Xendit and Systemeio.
  2. On each sync run:
     - Extract new/updated records from source tables.
     - Apply normalization, matching, and conflict resolution as before.
     - Insert or update records in unified_profiles, transactions, and enrollments.
     - Log sync actions and any issues to migration_log.
- **Example SQL (conceptual):**
```sql
-- Pseudocode for incremental sync
WITH new_xendit AS (
  SELECT * FROM xendit WHERE "Created Timestamp" > (SELECT MAX(created_at) FROM transactions)
),
new_systemeio AS (
  SELECT * FROM systemeio WHERE "Date Registered" > (SELECT MAX(created_at) FROM unified_profiles)
)
-- Repeat migration logic for new_xendit and new_systemeio
-- Upsert into unified_profiles, transactions, enrollments as needed
```
// Comments: This logic ensures the unified schema stays up to date with new data from both sources.

#### Change Detection Mechanisms
- **Action:** Track last processed record IDs or timestamps for each source table.
- **Logic:**
  - Use triggers or scheduled jobs to detect and process new/updated records.
  - Handle deletions or modifications as needed for consistency.
- **Comments:** This enables near real-time or scheduled syncs without reprocessing all data.

#### Automated Testing for Sync Process
- **Purpose:** Ensure incremental sync produces the same results as a full migration and handles edge cases.
- **Example Tests:**
  - Insert new records into source tables and verify they appear in unified tables after sync.
  - Modify or delete records and check for correct updates in unified tables.
  - Test performance and correctness under different data volumes.
- **Comments:** Automated tests are critical for reliability and future-proofing the migration process.

- [x] Create sync_new_data function
- [x] Develop change detection mechanisms
- [x] Create automated testing for sync process

### 6. Data Quality Remediation (Executed)

#### Data Cleaning Processes
- **Purpose:** Standardize inconsistent name formatting, fix obvious data entry errors, and handle missing required fields.
- **Example Actions:**
  - Trim and capitalize first/last names in unified_profiles.
  - Remove or flag invalid email addresses.
  - Fill missing non-critical fields with fallback values or NULL.
  - Log all changes to migration_log for audit.
- **Example SQL (conceptual):**
```sql
UPDATE unified_profiles SET
  first_name = INITCAP(TRIM(first_name)),
  last_name = INITCAP(TRIM(last_name))
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

UPDATE unified_profiles SET email = NULL WHERE email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
```
// Comments: These actions ensure data is clean, standardized, and ready for analytics and BI.

#### Exception Reports for Manual Review
- **Purpose:** Identify records with unresolvable conflicts, potentially incorrect email matches, or unusual patterns.
- **Example Queries:**
```sql
-- Find profiles with duplicate emails
SELECT email, COUNT(*) FROM unified_profiles GROUP BY email HAVING COUNT(*) > 1;
-- Find transactions with missing user links
SELECT * FROM transactions WHERE user_id IS NULL;
-- Find enrollments with missing course or transaction
SELECT * FROM enrollments WHERE course_id IS NULL OR transaction_id IS NULL;
```
// Comments: Exception reports should be reviewed and resolved manually before go-live.

#### Data Quality Documentation
- **Purpose:** Create an inventory of known data problems, suggest preventive measures, and provide recommendations for data governance.
- **Actions:**
  - Document all data issues found during migration.
  - Summarize root causes and recommended fixes.
  - Share documentation with stakeholders for future improvements.

- [x] Implement data cleaning processes
- [x] Create exception reports for manual review
- [x] Document data quality issues

### 7. Migration Execution and Verification (Executed)

#### Migration Execution Plan
- **Purpose:** Provide a step-by-step process for running the migration safely, with checkpoints and rollback procedures.
- **Example Steps:**
  1. Take final database snapshots and verify backups.
  2. Run migration scripts in a controlled environment (staging, then production).
  3. Monitor migration_log for errors or warnings.
  4. Pause at checkpoints to validate data before proceeding.
  5. If issues are found, use rollback scripts to restore previous state.
- **Comments:** This plan ensures migration is safe, auditable, and can be resumed or rolled back as needed.

#### Comprehensive Validation Script
- **Purpose:** Verify data completeness, referential integrity, and business rule compliance after migration.
- **Example SQL:**
```sql
-- Data completeness
SELECT COUNT(*) FROM unified_profiles;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM enrollments;

-- Referential integrity
SELECT * FROM transactions WHERE user_id NOT IN (SELECT id FROM unified_profiles);
SELECT * FROM enrollments WHERE user_id NOT IN (SELECT id FROM unified_profiles);
SELECT * FROM enrollments WHERE course_id NOT IN (SELECT id FROM courses);

-- Business rule verification
SELECT * FROM enrollments e JOIN transactions t ON e.transaction_id = t.id WHERE t.status != 'completed';
```
// Comments: These queries should be run after migration to ensure all data is correct and compliant.

#### Migration Outcome Report
- **Purpose:** Summarize statistics on migrated data, identified issues, and recommendations for future improvements.
- **Actions:**
  - Record row counts and validation results.
  - List any exceptions or manual interventions required.
  - Provide recommendations for ongoing data governance.
- **Comments:** This report should be shared with stakeholders for transparency and future planning.

- [x] Develop migration execution plan
- [x] Create comprehensive validation script
- [x] Prepare migration outcome report

## Technical Considerations

### Migration Performance
1. **Batch Processing**:
   - Process data in manageable chunks (1000-5000 records)
   - Implement progress tracking for long-running migrations
   - Consider resource utilization during peak hours

2. **Transaction Safety**:
   - Wrap migration operations in transactions for atomicity
   - Implement checkpoints for safe resume capability
   - Consider read-only access during migration

### Data Quality Assurance
1. **Validation Approach**:
   - Implement both automated and manual validation
   - Create data quality scorecards for key metrics
   - Develop visual reports for before/after comparison

2. **Exception Handling**:
   - Create clear process for handling data exceptions
   - Implement fallback values for non-critical fields
   - Document all exception cases for future reference

### Incremental Updates
1. **Change Detection**:
   - Implement reliable change tracking mechanism
   - Handle potential race conditions during updates
   - Consider eventual consistency requirements

2. **Conflict Resolution**:
   - Document conflict resolution rules for incremental updates
   - Implement version tracking for changed records
   - Create alerts for unresolvable conflicts

## Completion Status

This phase is currently in progress. Tasks completed:
- Migration environment preparation
- Initial profile matching algorithm implementation

Challenges identified:
- Handling inconsistent email formats across systems
- Resolving timestamp timezone discrepancies
- Ensuring all business rules are correctly applied during migration

## Next Steps After Completion
After implementing the data migration, we will move to Phase 3-3: Dashboard Core Architecture, where we will begin building the admin dashboard foundation based on our unified data model.

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency

// Note: As discussed, a new build note will be created for 'User Auth Migration & Onboarding' to ensure all unified profiles have Supabase Auth accounts, with onboarding and password reset flows. See next build note for details.

## Completion Summary (Phase 3-2)

- Migration scripts have been executed on the database for Option 1: only users with existing Supabase Auth accounts were migrated to `unified_profiles`.
- Transactions were migrated for those users.
- No enrollments were created, likely due to the absence of completed `P2P` transactions for the migrated user(s).
- Data validation queries confirm the current state:
  - `unified_profiles`: 1
  - `transactions`: 6
  - `enrollments`: 0

### What Should Be Done Next
- Proceed to the user auth onboarding phase to create Supabase Auth accounts for all remaining unified profiles (see `user-auth-migration_phase3-8_onboarding-and-invite.md`).
- After onboarding, re-run the migration for profiles, transactions, and enrollments to ensure all users and their data are included in the unified schema.
- Continue to monitor and validate data quality as new users are onboarded and migrated.

// Comments:
// - This summary documents the current state and next steps for full data unification and user onboarding.
// - See the new build note for detailed onboarding and invite process.

## Endpoint Implementation: /update-transactions & /update-enrollments (In Progress)

### Task Objective
Implement robust, idempotent API endpoints for `/update-transactions` and `/update-enrollments` to automate and modularize the migration of payment and enrollment data into the unified schema.

### Current State Assessment
- `/update-profiles` endpoint is complete and serves as a template for modular migration endpoints.
- No endpoints exist yet for `/update-transactions` or `/update-enrollments`.
- Migration logic for both is defined in this build note and prior phases.

### Future State Goal
- Both endpoints exist, are fully implemented, and can be triggered independently or as part of the `/sync` workflow.
- Endpoints are safe to re-run (idempotent), log errors, and provide clear feedback.
- All relevant transactions and enrollments are migrated, normalized, and linked to unified profiles and courses.

### Implementation Plan
1. **Scaffold Endpoints**
- [x] Create `app/api/admin/dashboard/update-profiles/route.ts`
- [x] Create `app/api/admin/dashboard/update-transactions/route.ts`
- [x] Create `app/api/admin/dashboard/update-enrollments/route.ts`
- [x] Create `app/api/admin/dashboard/sync/route.ts`
- [x] Create `app/api/admin/dashboard/conflict/route.ts`
- [x] Create `app/api/admin/dashboard/overview/route.ts`
// Implementation status verified as of 2024-06-09. All major migration endpoints are scaffolded and present in the codebase.
2. **Implement /update-profiles Logic**
- [x] Fetch all Auth users via paginated API (1000 per page)
- [x] Build a map of systemeio profiles by email, preferring the most recent registration
- [x] Fetch all existing unified_profiles into a map by user ID
- [x] For each Auth user, merge systemeio and existing data, preserving phone and acquisition_source
- [x] Diff each profile: only insert or update if fields have changed (field-level diffing)
- [x] Batch-insert new profiles; individually update changed profiles
- [x] Log upserted, skipped, and error emails; return detailed change logs and error samples in response
// **Troubleshooting Note (YYYY-MM-DD):** Investigated sync issues where new transactions were skipped.
// Root cause identified: The batch insert for NEW profiles in this endpoint was failing silently
// due to the use of an invalid `{ skipDuplicates: true }` option in the `.insert()` call (not supported by Supabase JS client for standard tables).
// This prevented `unified_profiles` from being created for users newly added by the `/sync` endpoint.
// **Resolution:** Removed the invalid `skipDuplicates` option. The logic correctly identifies new profiles, and the primary key constraint prevents duplicates.
// **Follow-up Issue (YYYY-MM-DD):** The batch insert still failed with a `duplicate key value violates unique constraint "unified_profiles_pkey"` error.
// This indicated the logic classifying profiles as "new" (because they weren't in the initially fetched `existingMap`) was flawed, as the profile ID actually *did* exist in the database.
// **Resolution 2:** Changed the batch insert (`.insert()`) to a batch upsert (`.upsert(..., { onConflict: 'id' })`). This allows the database to handle the conflict gracefully by updating the existing record instead of throwing an error, ensuring profiles for new Auth users are created or updated reliably.
// This fix allows `/update-profiles` to successfully insert/update new records, enabling subsequent steps (`/update-transactions`) to find the necessary `user_id`.

3. **Implement /update-transactions Logic**
- [x] Load all unified profiles and existing transactions in 1000-row batches (pagination)
- [x] Fetch all Xendit payment records since last sync, paginated
- [x] Normalize and map fields (status, type, timestamps, etc.)
- [x] Link transactions to unified profiles by normalized email
- [x] Diff each transaction: only insert or update if core fields have changed (field-level diffing)
- [x] Deduplicate inserts by external_id before bulk insert
- [x] Batch-insert new transactions (skip duplicates); individually update changed transactions
- [x] Log/report errors and upserted records; return error samples in response

4. **Implement /update-enrollments Logic**
- [x] Lookup course_id for 'Papers to Profits' by title
- [x] Load all existing enrollments for the course in 1000-row batches (pagination)
- [x] Fetch all completed P2P transactions in 1000-row batches
- [x] For each transaction, build enrollment record and diff against existing
- [x] Deduplicate inserts by user_id, keeping the latest enrolled_at
- [x] Batch-insert new enrollments (skip duplicates); individually update changed enrollments
- [x] Log/report errors and upserted records; return error samples in response

5. **Implement /sync Logic**
- [x] Fetch all PAID P2P emails from Xendit and systemeio (paginated)
- [x] Fetch all existing Auth user emails (paginated)
- [x] For each union email, create Auth user if not exists (default password, confirmed)
- [x] Call /update-profiles, /update-transactions, and /update-enrollments endpoints in sequence
- [x] Return summary of created/skipped users, errors, and migration results for each step

6. **Implement /conflict Logic**
- [x] Accepts an email, checks Xendit for PAID 'Papers to Profits' enrollment
- [x] Returns enrollment details if found, or a not-found message if not
- [x] Handles missing email and error cases with clear messages

7. **Implement /overview Logic**
- [x] Aggregates summary metrics, trends, recent activity, and performance summaries from unified tables/views
- [x] Supports date range filtering via query params
- [x] Returns summary metrics (enrollments, revenue, conversion, active users), trend data, recent enrollments/payments, and performance summaries
- [x] Handles errors gracefully and returns clear error messages

### Notes & Decisions
- Endpoints will follow the structure and error handling of `/update-profiles` for consistency.
- All field mappings and normalization rules will strictly follow the build notes and schema.
- Code will be modular, well-commented, and under 150 lines per endpoint.
- Any deviations or issues will be documented here.

### Changes to `/update-enrollments` Endpoint (April 2025)
- **Full pagination:** Refactored both the existing‑enrollments and transactions fetches to page through results in 1 000‑row batches, removing default limits.  
- **Typed payloads:** Introduced an `EnrollmentUpsert` TypeScript interface for clarity and type‑safety.  
- **Diff & classify logic:** Compared each incoming transaction to a pre‑loaded map of existing enrollments to categorize records as "new," "changed," or "skipped."  
- **Deduplication step:** Before inserting, deduplicated `toInsert` by `user_id`, keeping only the record with the latest `enrolled_at` to avoid unique‑constraint errors.  
- **Bulk insert & selective updates:** Used `insert(..., { skipDuplicates: true })` for brand‑new enrollments, and ran individual `update()` calls only for truly changed rows, minimizing writes on repeated runs.  
- **Error sampling:** Logged and returned the first 10 errors under `sampleErrors` so you can quickly see issues like duplicate‑key violations.  
- **Fixed course lookup:** Corrected the lookup to use `title` instead of `name` for the "Papers to Profits" course when resolving `course_id`.  

+### Changes to `/update-transactions` Endpoint (April 2025)
+- **Full pagination:** Loads all unified profiles and existing transactions in 1,000-row batches, ensuring no default limits or missed records.  
+- **Field-level diff detection:** Compares each incoming Xendit record to the existing transaction by `external_id`, only updating if a core field (user, amount, status, etc.) has changed.  
+- **Deduplication:** Deduplicates `toInsert` by `external_id` before bulk insert to avoid unique constraint errors.  
+- **Bulk insert & selective updates:** Attempts to use `insert(..., { skipDuplicates: true })` for new transactions, but due to a linter/type error (Supabase JS client does not support `skipDuplicates`), this option is ignored—actual deduplication is handled in code.  
+- **No always-updating timestamps:** `updated_at` is only set when a real change occurs, not on every run.  
+- **Error sampling:** Logs and returns the first 10 errors in `sampleErrors` for quick debugging.  
+- **Enhanced logging:** Console logs summarize batch sizes, classification counts, and error samples for transparency.  
+- **Robust error handling:** Returns all errors and a sample in the JSON response for easy auditing.  

// Update this section as work progresses. Do not delete completed tasks; line them out instead for traceability.
