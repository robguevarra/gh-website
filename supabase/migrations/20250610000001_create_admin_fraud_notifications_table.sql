-- Create admin fraud notifications table
CREATE TABLE IF NOT EXISTS public.admin_fraud_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES public.fraud_flags(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors TEXT[] DEFAULT '{}',
  risk_score INTEGER NOT NULL DEFAULT 0,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_fraud_notifications_flag_id ON public.admin_fraud_notifications(flag_id);
CREATE INDEX IF NOT EXISTS idx_admin_fraud_notifications_affiliate_id ON public.admin_fraud_notifications(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_admin_fraud_notifications_unread ON public.admin_fraud_notifications(read) WHERE read = false;

-- Add RLS policies for security
ALTER TABLE public.admin_fraud_notifications ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with admin role can access
CREATE POLICY admin_fraud_notifications_policy ON public.admin_fraud_notifications
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Add comment for documentation
COMMENT ON TABLE public.admin_fraud_notifications IS 'Stores notifications for high-risk fraud flags requiring admin attention';
