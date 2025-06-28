# Clean Migration - Phase 2: Clean Data Population Function

## Task Objective
Create an idempotent SQL function (`populate_clean_data()`) that extracts clean data from verified API sources (`xendit` and `systemeio` tables) and populates existing tables with clean data. The function will support a dry-run mode for testing during development and will serve as the core migration mechanism for the production launch.

## Current State Assessment

### Data Contamination Issues
Based on the investigation in [data-unification_investigation-findings.md](/ProjectDocs/Build_Notes/active/data-unification_investigation-findings.md), we have confirmed:

1. **Mixed Data in Business Tables:** 
   - `unified_profiles` (3,546 records): Contains both real customer data and test accounts
   - `transactions` (3,335 records): Mix of real payments and test transactions
   - `enrollments` (2,870 records): Mix of real course enrollments and test data
   - `purchase_leads` (38 records): Mix of real form submissions and test data
   - `ebook_contacts` (7 records): Mix of real ebook purchases and test data
   - `user_tags` / `user_tags_prod` / `user_tags_dev`: Contains tags from various sources

2. **Clean API Source Tables:**
   - `xendit` (8,828 records): Contains clean payment data from API
     - 3,216 PAID/SETTLED "Papers to Profits" transactions
     - Contains both P2P and Canva ebook payments
     - All records have valid email addresses
   - `systemeio` (14,942 records): Contains clean user profile data from API
     - 3,542 records tagged with "PaidP2P"
     - Contains profile data: first name, last name, tags
     - Tag examples: "PaidP2P,FBInviteSent", "Canva,PaidCanva"
   - `shopify_orders` (856 orders): Already maintained via cron jobs, clean data

3. **Data Inconsistencies:**
   - Xendit P2P paid transactions: 3,216 records
   - Systemeio PaidP2P tagged profiles: 3,542 records
   - Current unified_profiles: 3,546 records
   - Current auth.users: 3,552 users
   - Active enrollments: 2,870 records
   - Missing validation for email consistency across systems

### Current Sync Process Limitations
The current `/sync` endpoint:
- Is not idempotent (always updates timestamps)
- Has limited error handling (first 10 errors only)
- Lacks systematic business rule validation
- Contains no data completeness verification
- Non-optimized sequential processing
- No meaningful change detection

### Schema Alignment Findings (2025-06-28)
- The production `xendit` and `systemeio` tables do **not** match the canonical schemas outlined below. They are legacy CSV-import versions with spaces in column names and many missing fields.
- The `transactions` table is missing several required columns (`api_source`, `last_api_sync_at`, `api_sync_version`, `processed_at`, `fiscal_year`, `fiscal_quarter`).
- The `populate_clean_data()` function and its supporting `population_operation_log` audit table are **not yet implemented**.

## Future State Goal
A robust, idempotent `populate_clean_data()` SQL function that:

1. **Extracts Clean Data:** Reads from trusted API source tables only
2. **Normalizes & Validates:** Ensures data integrity and business rule compliance
3. **Populates Tables:** Creates clean records in existing tables
4. **Verifies Results:** Validates row counts and relationships
5. **Supports Dry Run:** Allows previewing changes without writing data
6. **Minimizes Downtime:** Fast execution for production cutover

## Implementation Plan

### 1. Table Structure Analysis

#### Primary Source Tables (Read-Only)

**xendit** - Clean payment data from API
```sql
CREATE TABLE IF NOT EXISTS public.xendit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  payment_id TEXT,
  business_id TEXT,
  status TEXT,
  payment_method TEXT,
  amount NUMERIC,
  fees NUMERIC,
  payment_channel TEXT,
  payment_destination TEXT,
  customer_name TEXT,
  customer_email TEXT,
  description TEXT,
  failure_code TEXT,
  failure_reason TEXT,
  created TEXT,
  updated TEXT,
  paid_at TEXT,
  payout_at TEXT,
  adjusted_at TEXT,
  settled_at TEXT,
  currency TEXT,
  bank TEXT,
  paid_amount NUMERIC,
  payment_method_info TEXT,
  channel_properties TEXT,
  ewallet_type TEXT,
  sync_timestamp TIMESTAMPTZ DEFAULT now()
);
```

**systemeio** - Clean profile data from API
```sql
CREATE TABLE IF NOT EXISTS public.systemeio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  photo_url TEXT,
  tags TEXT,
  address_city TEXT,
  address_country TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_postal_code TEXT,
  address_state TEXT,
  custom_fields JSONB,
  optin_email BOOLEAN,
  optin_sms BOOLEAN,
  time_zone TEXT,
  language TEXT,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  sync_timestamp TIMESTAMPTZ DEFAULT now()
);
```

#### Destination Tables (Existing Tables)

**unified_profiles** - User profiles
```sql
CREATE TABLE IF NOT EXISTS public.unified_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  tags TEXT[],
  acquisition_source TEXT,
  payment_source TEXT,
  cohort_date DATE,
  systemeio_id TEXT UNIQUE,
  systemeio_tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  tier TEXT DEFAULT 'viewer',
  tier_assignment TEXT DEFAULT 'auto',
  tier_assignment_notes TEXT,
  api_source TEXT NOT NULL DEFAULT 'systemeio',
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1
);
```

**transactions** - Financial transactions
```sql
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  payment_provider_id TEXT,
  payment_provider_fee NUMERIC,
  description TEXT,
  product_name TEXT,
  product_type TEXT,
  product_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB,
  api_source TEXT DEFAULT 'xendit',
  last_api_sync_at TIMESTAMPTZ,
  api_sync_version INTEGER DEFAULT 1,
  processed_at TIMESTAMPTZ DEFAULT now(),
  fiscal_year INTEGER,
  fiscal_quarter INTEGER
);
```

**enrollments** - Course enrollments
```sql
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES unified_profiles(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  transaction_id UUID REFERENCES transactions(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date DATE,
  expiry_date DATE,
  completion_date DATE,
  progress NUMERIC DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB,
  cohort_month TEXT,
  cohort_quarter TEXT,
  UNIQUE(user_id, course_id)
);
```

### 2. Populate Clean Data Function Implementation

#### Function Signature
```sql
CREATE OR REPLACE FUNCTION populate_clean_data(
  dry_run BOOLEAN DEFAULT true, -- Default to dry-run for safety
  verbose BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_time INTERVAL;
  profile_count INTEGER;
  transaction_count INTEGER;
  enrollment_count INTEGER;
  validation_results JSONB;
BEGIN
  -- Record start time for performance measurement
  start_time := clock_timestamp();
  
  -- Begin a transaction that we can roll back if this is a dry run
  IF dry_run THEN
    BEGIN;
  END IF;

  -- Function implementation will go here
  -- Will be detailed in the actual code
  
  -- If this is a dry run, roll back all changes
  IF dry_run THEN
    ROLLBACK;
    result := jsonb_build_object(
      'status', 'dry_run_completed',
      'message', 'Changes were calculated but not applied. Set dry_run := false to apply changes.'
      -- Additional statistics will be included here
    );
  ELSE
    result := jsonb_build_object(
      'status', 'success',
      'message', 'Clean data population completed successfully.'
      -- Additional statistics will be included here
    );
  END IF;
  
  RETURN result;
END;
$$;
```

#### Function Logic Flow

1. **Step 1: Preparation**
   - Begin transaction (will be rolled back if dry_run=true)
   - Record start time for benchmarking
   - Create temporary tables for validation

2. **Step 2: Extract & Transform Profiles**
   - Extract valid profiles from systemeio with "PaidP2P" tag
   - Create auth users for real customers if they don't exist
   - Store in temporary table for processing

3. **Step 3: Extract & Transform Transactions**
   - Extract PAID/SETTLED transactions from xendit for "Papers to Profits"
   - Link to user profiles by email
   - Store in temporary table for processing

4. **Step 4: Generate Course Enrollments**
   - Create enrollments for P2P course based on valid transactions
   - Apply business rules (expiry dates, cohort assignment)
   - Store in temporary table for processing

5. **Step 5: Execute Data Population**
   - If not dry_run, truncate existing tables
   - Insert from temporary tables to destination tables
   - Preserve FKs and maintain referential integrity

6. **Step 6: Validate Results**
   - Count records in each table
   - Verify referential integrity
   - Check for business rule compliance
   - Compare with expected counts from source tables

7. **Step 7: Return Results**
   - In dry_run mode, rollback transaction and return what would be changed
   - In normal mode, return statistics of changes
   - Include execution time and validation results

### 3. Data Validation Strategy

#### Key Validation Checks

1. **Row Count Validation**
   - Expected P2P user count: ~3,216-3,542
   - Expected transaction count: ~3,216
   - Expected enrollment count: ~3,216

2. **Email Consistency**
   - Every transaction must have a valid email
   - Every profile must have a corresponding auth.users entry
   - All emails should be normalized (lowercase, trimmed)

3. **Financial Validation**
   - All transaction amounts should be positive
   - Currency should be consistent (PHP)
   - Statuses should be normalized (PAID/SETTLED/PENDING)

4. **Referential Integrity**
   - Every transaction should link to a valid profile
   - Every enrollment should link to a valid transaction
   - Every profile should link to a valid auth.users entry

#### Validation Query Pack
Extract from the function, these validation queries will run after migration:

```sql
-- Profile validation
SELECT 
  COUNT(*) as profile_count,
  COUNT(*) FILTER (WHERE email IS NULL) as missing_email,
  COUNT(*) FILTER (WHERE first_name IS NULL AND last_name IS NULL) as missing_names,
  COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = unified_profiles.id)) as orphaned_profiles
FROM unified_profiles;

-- Transaction validation
SELECT
  COUNT(*) as transaction_count,
  COUNT(*) FILTER (WHERE status NOT IN ('PAID', 'SETTLED')) as non_paid_transactions,
  COUNT(*) FILTER (WHERE user_id IS NULL) as missing_user_link,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  AVG(amount) as avg_amount
FROM transactions;

-- Enrollment validation
SELECT
  COUNT(*) as enrollment_count,
  COUNT(*) FILTER (WHERE user_id IS NULL) as missing_user_link,
  COUNT(*) FILTER (WHERE transaction_id IS NULL) as missing_transaction_link,
  COUNT(*) FILTER (WHERE course_id IS NULL) as missing_course_link,
  COUNT(DISTINCT user_id) as unique_users
FROM enrollments;
```

### 4. Go-Live Execution Runbook

#### Pre-Launch Preparation

1. **Database Backup**
   ```sql
   -- Full database backup
   pg_dump -Fc supabase_db > pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump
   ```

2. **Table-Specific Backups**
   ```sql
   -- Backup existing tables directly in database
   CREATE TABLE IF NOT EXISTS unified_profiles_backup AS SELECT * FROM unified_profiles;
   CREATE TABLE IF NOT EXISTS transactions_backup AS SELECT * FROM transactions;
   CREATE TABLE IF NOT EXISTS enrollments_backup AS SELECT * FROM enrollments;
   ```

3. **Verify API Source Tables**
   ```sql
   -- Check cleanliness and completeness of source tables
   SELECT COUNT(*) FROM xendit WHERE status IN ('PAID', 'SETTLED') AND description LIKE '%Papers to Profits%';
   SELECT COUNT(*) FROM systemeio WHERE tags LIKE '%PaidP2P%';
   ```

4. **Dry Run Execution**
   ```sql
   -- Perform dry run and review outcomes
   SELECT * FROM populate_clean_data(dry_run := true, verbose := true);
   ```

#### Launch Day Execution

1. **Enter Maintenance Mode**
   - Enable maintenance page on website
   - Stop all write operations (read-only mode)
   - Notify team of migration start

2. **Execute Migration**
   ```sql
   -- Execute the population function with dry_run=false to apply changes
   -- The function internally handles the transaction
   SELECT * FROM populate_clean_data(dry_run := false, verbose := true);
   
   -- Validate results
   SELECT COUNT(*) FROM unified_profiles;
   SELECT COUNT(*) FROM transactions;
   SELECT COUNT(*) FROM enrollments;
   
   -- Run validation pack queries
   -- (See validation queries above)
   ```

3. **Enable Traffic**
   - Disable maintenance mode
   - Restore write access
   - Monitor for any issues

4. **Post-Migration Verification**
   - Check sample user accounts
   - Verify transactions and enrollments
   - Validate API connections still working
   
### 5. Risk Assessment and Mitigation

#### Identified Risks

1. **Data Loss**
   - **Risk**: Critical customer data could be lost during migration
   - **Mitigation**: Multiple backup strategies, transaction-based migration
   - **Rollback**: Restore from backups if issues occur

2. **Downtime**
   - **Risk**: Extended service outage during migration
   - **Mitigation**: Optimize function for speed, pre-test execution time
   - **Fallback**: Schedule during off-hours, have clear communication plan

3. **Inconsistent Data**
   - **Risk**: Referential integrity issues after migration
   - **Mitigation**: Strong validation checks before committing transaction
   - **Solution**: Extensive test runs in staging before production

4. **Missing Records**
   - **Risk**: Some customers might not be migrated correctly
   - **Mitigation**: Thorough count validation against source systems
   - **Recovery**: Process for handling individual record issues
   
5. **FK Constraint Violations**
   - **Risk**: Foreign key constraints could fail during data migration
   - **Mitigation**: Ordered operations (profiles → transactions → enrollments)
   - **Solution**: Use temporary tables for validation before final insertion

## Implementation Checklist

### Phase 1: Development & Testing
- [ ] Create function skeleton with all core logic
- [ ] Implement dry-run mode for testing
- [ ] Build comprehensive validation queries
- [ ] **Align source-table schemas** (`xendit`, `systemeio`) with expected columns *or* load into new staging tables (`xendit_raw`, `systemeio_raw`).
- [ ] **Add missing columns to `transactions`** (`api_source`, `last_api_sync_at`, `api_sync_version`, `processed_at`, `fiscal_year`, `fiscal_quarter`).
- [ ] **Create `population_operation_log` audit table** for migration runs.
- [ ] Test with staging environment database
- [ ] Measure execution performance
- [ ] Document expected row counts and validation thresholds

### Phase 2: Staging Verification
- [ ] Execute full dry-run in staging environment
- [ ] Verify all validation checks pass
- [ ] Time the execution process
- [ ] Test rollback procedures
- [ ] Document any unexpected edge cases

### Phase 3: Production Readiness
- [ ] Schedule maintenance window
- [ ] Prepare communication for team
- [ ] Create all backup scripts
- [ ] Set up monitoring for the migration
- [ ] Prepare rollback scripts

### Phase 4: Go Live
- [ ] Execute backup procedures
- [ ] Enter maintenance mode
- [ ] Execute migration function
- [ ] Validate results
- [ ] Resume normal operations

## Summary

This solution provides:

1. **Zero Test Contamination**: By starting fresh with clean API source data
2. **Fast Execution**: Through optimized SQL function with transaction support
3. **Verification**: Via extensive validation checks before commit
4. **Rollback Safety**: With multiple backup strategies and transaction-based execution
5. **Minimal Downtime**: Through careful preparation and optimization
6. **No Refactoring Required**: Works with existing table structure and FK constraints
7. **Safe Testing**: Dry-run mode allows verification without affecting production

By implementing the `populate_clean_data()` function, we create a repeatable, reliable mechanism for ensuring clean production data, addressing the core issue of test data contamination while preserving all legitimate customer data from trusted API sources.
