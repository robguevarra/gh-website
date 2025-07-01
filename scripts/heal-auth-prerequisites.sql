-- Prerequisites for the heal-migrated-auth-accounts script
-- This SQL file creates the necessary functions and permissions to heal auth accounts
-- Run this first before running the healing script

-- Allow the service role to execute SQL (required for creating functions)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission on exec_sql to the service role
GRANT EXECUTE ON FUNCTION exec_sql TO service_role;

-- Create view to check token fields
CREATE OR REPLACE VIEW auth_token_check AS
SELECT 
  id as user_id,
  (confirmation_token IS NULL OR recovery_token IS NULL) as needs_token_healing
FROM auth.users;

-- Function to get migrated users
CREATE OR REPLACE FUNCTION get_migrated_users(result_limit integer DEFAULT NULL)
RETURNS SETOF auth.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM auth.users
  WHERE raw_user_meta_data::jsonb->'source' = '"clean_migration"'
  LIMIT COALESCE(result_limit, 2147483647);  -- Use max int if NULL
END;
$$;

-- Function to heal user tokens
CREATE OR REPLACE FUNCTION heal_user_tokens(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET 
    confirmation_token = '',
    recovery_token = '',
    reauthentication_token = '',
    updated_at = NOW()
  WHERE 
    id = user_id
    AND (confirmation_token IS NULL OR recovery_token IS NULL);
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION get_migrated_users TO service_role;
GRANT EXECUTE ON FUNCTION heal_user_tokens TO service_role;
GRANT SELECT ON auth_token_check TO service_role;
