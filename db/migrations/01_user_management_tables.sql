-- User Management Tables Migration

-- Profiles table for extended user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership tiers table for subscription levels
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User memberships table to track active subscriptions
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.membership_tiers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tier_id)
);

-- RLS Policies

-- Profiles table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY profiles_view_own ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY profiles_admin_view ON public.profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Membership tiers table RLS
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view membership tiers
CREATE POLICY membership_tiers_view_all ON public.membership_tiers 
  FOR SELECT USING (true);

-- Policy: Only admins can modify membership tiers
CREATE POLICY membership_tiers_admin_modify ON public.membership_tiers 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User memberships table RLS
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own memberships
CREATE POLICY user_memberships_view_own ON public.user_memberships 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all memberships
CREATE POLICY user_memberships_admin_view ON public.user_memberships 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify all memberships
CREATE POLICY user_memberships_admin_modify ON public.user_memberships 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to profiles table
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to membership_tiers table
CREATE TRIGGER update_membership_tiers_updated_at
BEFORE UPDATE ON public.membership_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to user_memberships table
CREATE TRIGGER update_user_memberships_updated_at
BEFORE UPDATE ON public.user_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial membership tiers
INSERT INTO public.membership_tiers (name, description, price_monthly, price_yearly, features)
VALUES
  ('Free', 'Basic access to selected content', 0.00, 0.00, '{"access_level": 1, "features": ["Limited content access", "Community access"]}'::jsonb),
  ('Standard', 'Full access to all courses and features', 29.99, 299.99, '{"access_level": 2, "features": ["Full content access", "Community access", "Progress tracking", "Downloads"]}'::jsonb),
  ('Premium', 'Everything plus coaching and priority support', 49.99, 499.99, '{"access_level": 3, "features": ["Full content access", "Community access", "Progress tracking", "Downloads", "Monthly coaching call", "Priority support"]}'::jsonb); 