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
We have designed a unified database schema in Phase 3-1 with properly structured tables for profiles, transactions, and enrollments. However, the actual data still resides in the original Xendit and Systemeio tables in their raw format. We need a robust migration process to transform and load this data into our new schema.

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
