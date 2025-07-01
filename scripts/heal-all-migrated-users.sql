-- Comprehensive healing script for all migrated auth.users accounts
-- This fixes accounts created via bulk insert during migration

BEGIN;

-- 1. Create a view to identify migrated users that need healing
CREATE OR REPLACE VIEW auth.migrated_users_needing_healing AS
SELECT id, email, confirmation_token, recovery_token, raw_user_meta_data
FROM auth.users
WHERE 
  raw_user_meta_data->>'source' = 'clean_migration'
  AND (
    confirmation_token IS NULL OR 
    recovery_token IS NULL OR 
    encrypted_password IS NULL OR
    (raw_user_meta_data->'email_verified') IS NULL
  );

-- 2. Fix NULL fields in auth.users table for all migrated users
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

-- 3. Update user metadata to include email_verified flag for all migrated users
UPDATE auth.users
SET
  raw_user_meta_data = raw_user_meta_data || '{"email_verified": true}'::jsonb
WHERE
  raw_user_meta_data->>'source' = 'clean_migration'
  AND (raw_user_meta_data->'email_verified') IS NULL;

-- 4. Ensure the identity_data in auth.identities has email_verified for all migrated users
UPDATE auth.identities
SET
  identity_data = identity_data || '{"email_verified": true}'::jsonb
WHERE
  user_id IN (
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'source' = 'clean_migration'
  );

-- 5. Count and output how many records were updated
SELECT 'Users with fixed tokens: ' || COUNT(*) as fixed_users
FROM auth.users
WHERE 
  raw_user_meta_data->>'source' = 'clean_migration'
  AND confirmation_token = ''  -- Only counts records we just fixed
  AND encrypted_password IS NOT NULL;

COMMIT;
