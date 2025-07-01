-- Create RPC function to find auth user by email
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(email_to_find TEXT)
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.created_at
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(email_to_find)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(TEXT) TO service_role;
