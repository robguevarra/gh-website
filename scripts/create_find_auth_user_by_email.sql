-- More efficient user lookup function
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.created_at
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(user_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;
