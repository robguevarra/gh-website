-- Function to execute SQL statements as superuser
-- This is needed for our migrations to work properly
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO anon;
GRANT EXECUTE ON FUNCTION public.execute_sql TO service_role; 