-- Add graph column to email_automations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_automations' AND column_name = 'graph') THEN
        ALTER TABLE public.email_automations ADD COLUMN graph jsonb DEFAULT '{"nodes": [], "edges": []}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_automations' AND column_name = 'description') THEN
        ALTER TABLE public.email_automations ADD COLUMN description text;
    END IF;
END $$;

-- Create automation_executions table
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    automation_id uuid REFERENCES public.email_automations(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL,
    current_node_id text,
    status text NOT NULL DEFAULT 'active', -- active, waiting, completed, failed
    context jsonb DEFAULT '{}'::jsonb,
    wait_until timestamp with time zone,
    started_at timestamp with time zone DEFAULT now(),
    error_message text,
    CONSTRAINT automation_executions_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_contact_id ON public.automation_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_waiting ON public.automation_executions(status, wait_until);

-- RLS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.automation_executions;
END $$;

CREATE POLICY "Service Role Full Access" ON public.automation_executions FOR ALL TO service_role USING (true);
