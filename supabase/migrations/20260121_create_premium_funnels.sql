-- Create Premium Funnel Architecture Tables

-- 1. email_funnels
CREATE TABLE IF NOT EXISTS public.email_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  automation_id uuid REFERENCES public.email_automations(id),
  status text DEFAULT 'draft', -- draft, active, paused
  conversion_goal_event text, -- e.g., 'checkout.completed'
  conversion_goal_value decimal DEFAULT 0,
  settings jsonb DEFAULT '{"attribution_window_days": 30}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. email_funnel_steps
CREATE TABLE IF NOT EXISTS public.email_funnel_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.email_funnels(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  name text NOT NULL,
  step_order int,
  step_type text, -- 'email', 'delay', 'condition', etc.
  template_id uuid REFERENCES public.email_templates(id), -- Optional link for email steps
  metrics jsonb DEFAULT '{"entered": 0, "completed": 0, "converted": 0, "revenue": 0}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. email_funnel_journeys
CREATE TABLE IF NOT EXISTS public.email_funnel_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.email_funnels(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL, -- references unified_profiles(id) ideally, but keeping flexible
  current_step_id uuid REFERENCES public.email_funnel_steps(id),
  status text DEFAULT 'active', -- active, completed, dropped, converted
  revenue_generated decimal DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 4. email_funnel_conversions
CREATE TABLE IF NOT EXISTS public.email_funnel_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.email_funnels(id) ON DELETE CASCADE,
  contact_id uuid,
  transaction_id uuid, -- references transactions(id) ideally
  amount decimal DEFAULT 0,
  currency text DEFAULT 'PHP',
  attributed_step_id uuid REFERENCES public.email_funnel_steps(id),
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.email_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_funnel_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_funnel_conversions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_funnels;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_funnel_steps;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_funnel_journeys;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_funnel_conversions;
END $$;

CREATE POLICY "Service Role Full Access" ON public.email_funnels FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.email_funnel_steps FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.email_funnel_journeys FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.email_funnel_conversions FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_funnels_automation_id ON public.email_funnels(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_funnel_steps_funnel_id ON public.email_funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_email_funnel_journeys_contact_id ON public.email_funnel_journeys(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_funnel_journeys_status ON public.email_funnel_journeys(status);
CREATE INDEX IF NOT EXISTS idx_email_funnel_conversions_funnel_id ON public.email_funnel_conversions(funnel_id);
