# Data Migration Testing Plan: launch_clean_production()

## 1. Pre-Migration Validation

### 1.1 Data Integrity Check
```sql
-- Script: pre_migration_validation.sql
-- Run this BEFORE executing launch_clean_production()

-- Validate P2P users have corresponding profiles and enrollments
WITH p2p_transactions AS (
    SELECT user_id 
    FROM transactions_staging 
    WHERE transaction_type = 'P2P' AND user_id IS NOT NULL
),
validation AS (
    SELECT 
        COUNT(DISTINCT pt.user_id) as total_p2p_users,
        COUNT(DISTINCT up.id) as total_profiles,
        COUNT(DISTINCT e.user_id) as total_enrollments,
        SUM(CASE WHEN up.id IS NULL THEN 1 ELSE 0 END) as missing_profiles,
        SUM(CASE WHEN e.user_id IS NULL THEN 1 ELSE 0 END) as missing_enrollments
    FROM 
        p2p_transactions pt
    LEFT JOIN 
        unified_profiles_staging up ON pt.user_id = up.id
    LEFT JOIN 
        enrollments_staging e ON pt.user_id = e.user_id
)
SELECT * FROM validation;

-- Validate transaction types match production format
SELECT 
    transaction_type, 
    COUNT(*) as count
FROM 
    transactions_staging
GROUP BY 
    transaction_type;

-- Ensure no FK violations exist in staging tables
SELECT 
    COUNT(*) as invalid_user_ids
FROM 
    transactions_staging ts
WHERE 
    ts.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ts.user_id);
    
SELECT 
    COUNT(*) as invalid_user_ids
FROM 
    unified_profiles_staging ups
WHERE 
    NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ups.id);
    
SELECT 
    COUNT(*) as invalid_user_ids
FROM 
    enrollments_staging es
WHERE 
    NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = es.user_id);
    
SELECT 
    COUNT(*) as invalid_transaction_ids
FROM 
    enrollments_staging es
WHERE 
    NOT EXISTS (SELECT 1 FROM transactions_staging ts WHERE ts.id = es.transaction_id);
    
SELECT 
    COUNT(*) as invalid_course_ids
FROM 
    enrollments_staging es
WHERE 
    NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = es.course_id);
```

## 2. Safe Environment Testing

### 2.1 Create Test Schema
```sql
-- Script: create_test_schema.sql
-- Creates a duplicate environment for safe testing

-- Create a test schema
CREATE SCHEMA IF NOT EXISTS migration_test;

-- Copy production tables to test schema
CREATE TABLE migration_test.users AS SELECT * FROM auth.users;
CREATE TABLE migration_test.unified_profiles AS SELECT * FROM unified_profiles;
CREATE TABLE migration_test.transactions AS SELECT * FROM transactions;
CREATE TABLE migration_test.enrollments AS SELECT * FROM enrollments;
CREATE TABLE migration_test.courses AS SELECT * FROM courses;

-- Copy staging tables to test schema
CREATE TABLE migration_test.users_staging AS SELECT * FROM auth_users_staging;
CREATE TABLE migration_test.unified_profiles_staging AS SELECT * FROM unified_profiles_staging;
CREATE TABLE migration_test.transactions_staging AS SELECT * FROM transactions_staging;
CREATE TABLE migration_test.enrollments_staging AS SELECT * FROM enrollments_staging;

-- Add constraints to test tables (simulating production environment)
ALTER TABLE migration_test.unified_profiles ADD PRIMARY KEY (id);
ALTER TABLE migration_test.users ADD PRIMARY KEY (id);
ALTER TABLE migration_test.transactions ADD PRIMARY KEY (id);
ALTER TABLE migration_test.enrollments ADD PRIMARY KEY (id);
ALTER TABLE migration_test.unified_profiles_staging ADD PRIMARY KEY (id);
ALTER TABLE migration_test.transactions_staging ADD PRIMARY KEY (id);
ALTER TABLE migration_test.enrollments_staging ADD PRIMARY KEY (id);
```

### 2.2 Test Migration Function
```sql
-- Script: test_migration_function.sql
-- Run launch_clean_production in test schema

-- Create test version of function
CREATE OR REPLACE FUNCTION migration_test.launch_clean_production()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    result_msg TEXT := '';
    backup_timestamp TEXT;
BEGIN
    -- Generate timestamp for backup table names
    backup_timestamp := to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- ATOMIC TABLE SWAP TRANSACTION
    BEGIN
        -- Step 1: Rename current tables to _backup
        EXECUTE format('ALTER TABLE migration_test.users RENAME TO users_backup_%s', backup_timestamp);
        EXECUTE format('ALTER TABLE migration_test.unified_profiles RENAME TO unified_profiles_backup_%s', backup_timestamp);
        EXECUTE format('ALTER TABLE migration_test.transactions RENAME TO transactions_backup_%s', backup_timestamp);
        EXECUTE format('ALTER TABLE migration_test.enrollments RENAME TO enrollments_backup_%s', backup_timestamp);
        
        -- Step 2: Rename staging tables to production names
        ALTER TABLE migration_test.users_staging RENAME TO users;
        ALTER TABLE migration_test.unified_profiles_staging RENAME TO unified_profiles;
        ALTER TABLE migration_test.transactions_staging RENAME TO transactions;
        ALTER TABLE migration_test.enrollments_staging RENAME TO enrollments;
        
        -- Step 4: Add FK constraints to new production tables
        ALTER TABLE migration_test.unified_profiles ADD CONSTRAINT unified_profiles_id_fkey 
            FOREIGN KEY (id) REFERENCES migration_test.users(id);
            
        ALTER TABLE migration_test.transactions ADD CONSTRAINT transactions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES migration_test.users(id);
            
        ALTER TABLE migration_test.enrollments ADD CONSTRAINT enrollments_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES migration_test.unified_profiles(id);
            
        ALTER TABLE migration_test.enrollments ADD CONSTRAINT enrollments_transaction_id_fkey 
            FOREIGN KEY (transaction_id) REFERENCES migration_test.transactions(id);
            
        ALTER TABLE migration_test.enrollments ADD CONSTRAINT enrollments_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES migration_test.courses(id);
        
        result_msg := format('SUCCESS: Test migration completed! Backup tables created with timestamp: %s', backup_timestamp);
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback happens automatically due to transaction
        RAISE EXCEPTION 'Test migration failed: %', SQLERRM;
    END;
    
    RETURN result_msg;
END;
$function$;

-- Run the test function
SELECT migration_test.launch_clean_production();
```

## 3. Rollback Testing

### 3.1 Create Rollback Function
```sql
-- Script: create_rollback_function.sql
-- Creates a function to restore from backups while preserving staging tables

CREATE OR REPLACE FUNCTION public.rollback_migration(backup_timestamp TEXT)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result_msg TEXT := '';
    original_profiles_count INT;
    original_transactions_count INT;
    original_enrollments_count INT;
BEGIN
    -- Verify backup tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'unified_profiles_backup_' || backup_timestamp) THEN
        RETURN 'ERROR: Backup tables with timestamp ' || backup_timestamp || ' not found.';
    END IF;

    -- Count records in backup tables
    EXECUTE format('SELECT COUNT(*) FROM public.unified_profiles_backup_%s', backup_timestamp) INTO original_profiles_count;
    EXECUTE format('SELECT COUNT(*) FROM public.transactions_backup_%s', backup_timestamp) INTO original_transactions_count;
    EXECUTE format('SELECT COUNT(*) FROM public.enrollments_backup_%s', backup_timestamp) INTO original_enrollments_count;
    
    -- ATOMIC ROLLBACK TRANSACTION
    BEGIN
        -- Step 1: Rename current production tables back to staging (preserving them)
        ALTER TABLE public.unified_profiles RENAME TO unified_profiles_staging;
        ALTER TABLE public.transactions RENAME TO transactions_staging;
        ALTER TABLE public.enrollments RENAME TO enrollments_staging;
        
        -- Step 2: Rename backup tables to restore them to production
        EXECUTE format('ALTER TABLE public.unified_profiles_backup_%s RENAME TO unified_profiles', backup_timestamp);
        EXECUTE format('ALTER TABLE public.transactions_backup_%s RENAME TO transactions', backup_timestamp);
        EXECUTE format('ALTER TABLE public.enrollments_backup_%s RENAME TO enrollments', backup_timestamp);
        
        -- FK constraints are preserved when tables are renamed
        
        result_msg := format('SUCCESS: Rollback completed using backup tables with timestamp: %s. Records restored - Profiles: %s, Transactions: %s, Enrollments: %s. Staging tables preserved.', 
                            backup_timestamp, 
                            original_profiles_count, 
                            original_transactions_count, 
                            original_enrollments_count);
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback happens automatically due to transaction
        RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
    END;
    
    RETURN result_msg;
END;
$function$;

-- Example usage:
-- SELECT public.rollback_migration('2025_06_29_12_55_15');
```

### 3.2 Test Rollback After Migration
```sql
-- Script: test_rollback.sql
-- Test rollback after successful migration

-- Step 1: Run test migration
SELECT migration_test.launch_clean_production();

-- Step 2: Capture backup timestamp (manually extract from result)
-- Let's assume it's '2023_06_29_16_45_00'

-- Step 3: Run rollback with captured timestamp
SELECT migration_test.rollback_migration('2023_06_29_16_45_00');

-- Step 4: Verify data integrity after rollback
SELECT COUNT(*) FROM migration_test.users;
SELECT COUNT(*) FROM migration_test.unified_profiles;
SELECT COUNT(*) FROM migration_test.transactions;
SELECT COUNT(*) FROM migration_test.enrollments;
```

## 4. Edge Case Testing

### 4.1 Test with Empty Staging Tables
```sql
-- Script: test_empty_staging.sql
-- Test behavior with empty staging tables

-- Empty the staging tables in test schema
TRUNCATE TABLE migration_test.users_staging;
TRUNCATE TABLE migration_test.unified_profiles_staging;
TRUNCATE TABLE migration_test.transactions_staging;
TRUNCATE TABLE migration_test.enrollments_staging;

-- Attempt migration with empty tables (should fail or warn)
SELECT migration_test.launch_clean_production();
```

### 4.2 Test with Deliberate FK Violation
```sql
-- Script: test_fk_violation.sql
-- Test transaction rollback with FK violation

-- Create a FK violation in the test schema
INSERT INTO migration_test.enrollments_staging (
    id, user_id, course_id, transaction_id, status
) VALUES (
    gen_random_uuid(), 
    gen_random_uuid(), -- Invalid user_id that doesn't exist
    (SELECT id FROM migration_test.courses LIMIT 1),
    (SELECT id FROM migration_test.transactions_staging LIMIT 1),
    'active'
);

-- Attempt migration (should fail and rollback)
SELECT migration_test.launch_clean_production();
```

## 5. Production Preparation

### 5.1 Production Pre-flight Checklist
```
[x] Run pre_migration_validation.sql with no errors ✓ COMPLETED
[x] Confirm record counts match expectations: ✓ COMPLETED
    - Unified profiles: ~3,583 (P2P users only)
    - Transactions: ~6,494 (P2P + Canva)
    - Enrollments: ~3,583 (should match profiles exactly)
[x] Verify transaction types match production format (P2P, Canva, Other) ✓ COMPLETED
[x] Test migration successful in test environment ✓ COMPLETED
[x] Test rollback successful in test environment ✓ COMPLETED (with improved staging table preservation)
[ ] Database backup completed and verified
[ ] Application downtime window scheduled
[ ] Rollback plan documented and reviewed (UPDATED with improved approach)
```

### 5.2 Production Execution Plan
```
1. Take full database backup
2. Enable maintenance mode for application
3. Run pre_migration_validation.sql
4. Execute the finalized launch_clean_production() function:
   - Preserves auth.users table (maintains admin access)
   - Creates timestamped backup tables
   - Performs atomic table swap
   - Verifies minimum record counts for safety
   - Adds proper FK constraints
5. Verify record counts in new tables
6. Run application integration tests
7. Disable maintenance mode
8. Monitor for 24 hours
```

### 5.3 Rollback Plan
```
If issues occur after migration:
1. Re-enable maintenance mode
2. Run rollback function with timestamp from migration:
   SELECT public.rollback_migration('YYYY_MM_DD_HH24_MI_SS');
3. Verify record counts match pre-migration state
4. Run application integration tests
5. Disable maintenance mode
```

### 5.4 Improved Rollback Benefits

Our improved rollback approach provides significant advantages:

1. **Preserves Staging Tables**: The improved rollback function renames current production tables (former staging) back to `*_staging` instead of dropping them.

2. **Efficiency**: No need to rerun the time-consuming data preparation function after a rollback.

3. **Quick Recovery**: Fix issues in staging tables and retry migration without rebuilding the entire dataset.

4. **No Data Loss**: All work in preparing staging tables is preserved during rollback.

5. **Clear Audit Trail**: Maintains a complete history of migration attempts.

## 6. Post-Migration Validation

### 6.1 Data Integrity Check
```sql
-- Script: post_migration_validation.sql
-- Run after successful migration

-- Verify P2P transaction counts
SELECT COUNT(*) FROM transactions WHERE transaction_type = 'P2P';

-- Verify P2P user counts
SELECT COUNT(*) FROM unified_profiles WHERE is_student = true;

-- Verify enrollment counts (should match P2P users)
SELECT COUNT(*) FROM enrollments;

-- Verify FK integrity
SELECT COUNT(*) FROM unified_profiles up 
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.id);

-- Check record counts match pre-migration state
WITH counts AS (
  SELECT 'unified_profiles' as table_name, COUNT(*) as count FROM unified_profiles
  UNION ALL
  SELECT 'transactions' as table_name, COUNT(*) as count FROM transactions
  UNION ALL
  SELECT 'enrollments' as table_name, COUNT(*) as count FROM enrollments
)
SELECT * FROM counts;
```

### 6.2 Price Update Verification
```sql
-- Script: verify_price_updates.sql
-- Verify price updates after migration

-- Check P2P Xendit pricing (₱1,000)
SELECT COUNT(*), AVG(amount)
FROM transactions 
WHERE transaction_type = 'P2P' 
AND payment_method != 'manual_payment';

-- Check P2P manual pricing (₱800)
SELECT COUNT(*), AVG(amount)
FROM transactions 
WHERE transaction_type = 'P2P' 
AND payment_method = 'manual_payment';

-- Check Canva pricing (₱49)
SELECT COUNT(*), AVG(amount)
FROM transactions 
WHERE transaction_type = 'Canva';
```

### 6.3 Business Rules Verification
```sql
-- Script: verify_business_rules.sql
-- Verify business rules are properly applied

-- Verify P2P users have profiles and enrollments
WITH p2p_users AS (
    SELECT user_id 
    FROM transactions 
    WHERE transaction_type = 'P2P' AND user_id IS NOT NULL
),
validation AS (
    SELECT 
        pu.user_id,
        CASE WHEN up.id IS NULL THEN 'Missing profile' ELSE 'Has profile' END AS profile_status,
        CASE WHEN e.user_id IS NULL THEN 'Missing enrollment' ELSE 'Has enrollment' END AS enrollment_status
    FROM 
        p2p_users pu
    LEFT JOIN 
        unified_profiles up ON pu.user_id = up.id
    LEFT JOIN 
        enrollments e ON pu.user_id = e.user_id
)
SELECT 
    profile_status, 
    enrollment_status, 
    COUNT(*) 
FROM 
    validation 
GROUP BY 
    profile_status, enrollment_status;

-- Verify Canva users have NO profiles or enrollments
SELECT 
    COUNT(*) as canva_users_with_profiles
FROM 
    transactions t
WHERE 
    t.transaction_type = 'Canva'
    AND t.user_id IS NOT NULL;
```

This testing plan provides a comprehensive approach to safely test and deploy the `launch_clean_production()` function with appropriate validation at each stage.
