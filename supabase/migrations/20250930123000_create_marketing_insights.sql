-- Marketing Insights table to store AI analysis results and KPI snapshots

CREATE TABLE IF NOT EXISTS public.marketing_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.unified_profiles(id),
  filters jsonb,
  metrics_snapshot jsonb,
  model text,
  provider text,
  prompt text,
  output text,
  tokens_used int,
  cost numeric(10,4),
  status text NOT NULL DEFAULT 'completed',
  error jsonb
);

-- Basic index for listing
CREATE INDEX IF NOT EXISTS idx_marketing_insights_created_at ON public.marketing_insights(created_at DESC);

-- RLS: Admin-only access
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketing_insights_admin_select
  ON public.marketing_insights
  FOR SELECT
  USING (public.check_if_user_is_admin(auth.uid()));

CREATE POLICY marketing_insights_admin_insert
  ON public.marketing_insights
  FOR INSERT
  WITH CHECK (public.check_if_user_is_admin(auth.uid()));

CREATE POLICY marketing_insights_admin_update
  ON public.marketing_insights
  FOR UPDATE
  USING (public.check_if_user_is_admin(auth.uid()))
  WITH CHECK (public.check_if_user_is_admin(auth.uid()));

CREATE POLICY marketing_insights_admin_delete
  ON public.marketing_insights
  FOR DELETE
  USING (public.check_if_user_is_admin(auth.uid()));
