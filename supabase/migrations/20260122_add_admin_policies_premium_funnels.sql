-- Add RLS Policies for Admin and Marketing users to Premium Funnel tables

DO $$ 
BEGIN
    -- email_funnels
    DROP POLICY IF EXISTS "Admin and Marketing Full Access" ON public.email_funnels;
    CREATE POLICY "Admin and Marketing Full Access" ON public.email_funnels
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'marketing')
      )
    );

    -- email_funnel_steps
    DROP POLICY IF EXISTS "Admin and Marketing Full Access" ON public.email_funnel_steps;
    CREATE POLICY "Admin and Marketing Full Access" ON public.email_funnel_steps
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'marketing')
      )
    );

    -- email_funnel_journeys
    DROP POLICY IF EXISTS "Admin and Marketing Full Access" ON public.email_funnel_journeys;
    CREATE POLICY "Admin and Marketing Full Access" ON public.email_funnel_journeys
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'marketing')
      )
    );

    -- email_funnel_conversions
    DROP POLICY IF EXISTS "Admin and Marketing Full Access" ON public.email_funnel_conversions;
    CREATE POLICY "Admin and Marketing Full Access" ON public.email_funnel_conversions
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'marketing')
      )
    );

END $$;
