-- Email Marketing Tables Migration

-- Email templates table for reusable designs
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names used in template
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email campaigns table for marketing initiatives
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, cancelled
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE RESTRICT,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign recipients table for targeting
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);

-- Email automations table for triggered sequences
CREATE TABLE IF NOT EXISTS public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- user_signup, course_enrollment, etc.
  trigger_condition JSONB DEFAULT '{}'::jsonb, -- Conditions that trigger automation
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive, active, paused
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User email preferences table for subscription management
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_emails BOOLEAN DEFAULT TRUE,
  transactional_emails BOOLEAN DEFAULT TRUE,
  newsletter BOOLEAN DEFAULT TRUE,
  course_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

-- RLS Policies

-- Email templates table RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and marketing roles can view templates
CREATE POLICY email_templates_admin_view ON public.email_templates 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Policy: Only admins and marketing roles can modify templates
CREATE POLICY email_templates_admin_modify ON public.email_templates 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Email campaigns table RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and marketing roles can view campaigns
CREATE POLICY email_campaigns_admin_view ON public.email_campaigns 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Policy: Only admins and marketing roles can modify campaigns
CREATE POLICY email_campaigns_admin_modify ON public.email_campaigns 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Campaign recipients table RLS
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and marketing roles can view campaign recipients
CREATE POLICY campaign_recipients_admin_view ON public.campaign_recipients 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Policy: Only admins and marketing roles can modify campaign recipients
CREATE POLICY campaign_recipients_admin_modify ON public.campaign_recipients 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Email automations table RLS
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and marketing roles can view email automations
CREATE POLICY email_automations_admin_view ON public.email_automations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- Policy: Only admins and marketing roles can modify email automations
CREATE POLICY email_automations_admin_modify ON public.email_automations 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'marketing')
    )
  );

-- User email preferences table RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own email preferences
CREATE POLICY user_email_preferences_view_own ON public.user_email_preferences 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own email preferences
CREATE POLICY user_email_preferences_update_own ON public.user_email_preferences 
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own email preferences
CREATE POLICY user_email_preferences_insert_own ON public.user_email_preferences 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all email preferences
CREATE POLICY user_email_preferences_admin_view ON public.user_email_preferences 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_recipients_updated_at
BEFORE UPDATE ON public.campaign_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_automations_updated_at
BEFORE UPDATE ON public.email_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_email_preferences_updated_at
BEFORE UPDATE ON public.user_email_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial email templates
INSERT INTO public.email_templates (name, description, subject, html_content, text_content, variables)
VALUES
  ('Welcome Email', 'Sent to users when they first sign up', 'Welcome to Graceful Homeschooling!', 
   '<h1>Welcome to Graceful Homeschooling!</h1><p>Hello {{first_name}},</p><p>Thank you for joining our community of homeschooling families!</p>', 
   'Welcome to Graceful Homeschooling!\n\nHello {{first_name}},\n\nThank you for joining our community of homeschooling families!', 
   '["first_name"]'::jsonb),
  ('Course Enrollment', 'Sent when a user enrolls in a course', 'You''re enrolled in {{course_name}}!', 
   '<h1>You''re enrolled in {{course_name}}!</h1><p>Hello {{first_name}},</p><p>You''re now enrolled in {{course_name}}. Click <a href="{{course_url}}">here</a> to start learning.</p>', 
   'You''re enrolled in {{course_name}}!\n\nHello {{first_name}},\n\nYou''re now enrolled in {{course_name}}. Visit {{course_url}} to start learning.', 
   '["first_name", "course_name", "course_url"]'::jsonb); 