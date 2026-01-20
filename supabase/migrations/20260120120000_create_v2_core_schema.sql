-- 0. Enable citext extension
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. Create CRM Activities Table
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  contact_email citext NOT NULL,
  contact_id uuid, -- Nullable FK to unified_profiles
  type text NOT NULL, -- e.g. 'checkout.abandoned', 'email.opened'
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT crm_activities_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_email ON public.crm_activities USING btree (contact_email);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type_created ON public.crm_activities USING btree (type, created_at DESC);

-- 2. Create Smart Lists Table
CREATE TABLE IF NOT EXISTS public.crm_smart_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text,
    rules jsonb NOT NULL DEFAULT '[]'::jsonb,
    last_count integer DEFAULT 0,
    last_counted_at timestamp with time zone,
    CONSTRAINT crm_smart_lists_pkey PRIMARY KEY (id)
);

-- 3. Create Email Engine Tables
CREATE TABLE IF NOT EXISTS public.email_campaigns_v2 (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    subject text,
    smart_list_id uuid REFERENCES public.crm_smart_lists(id),
    status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, archived
    scheduled_at timestamp with time zone,
    content_design jsonb, -- Unlayer JSON
    content_html text,
    stats jsonb DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}'::jsonb,
    CONSTRAINT email_campaigns_v2_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.email_jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    campaign_id uuid REFERENCES public.email_campaigns_v2(id) ON DELETE CASCADE,
    recipient_email citext NOT NULL,
    recipient_resource_type text NOT NULL, -- 'user' or 'lead'
    recipient_resource_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, skipped
    stream_type text NOT NULL DEFAULT 'broadcast', -- broadcast, outbound
    remote_message_id text, -- Postmark ID
    error_message text,
    retry_count integer DEFAULT 0,
    CONSTRAINT email_jobs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON public.email_jobs (status);
CREATE INDEX IF NOT EXISTS idx_email_jobs_campaign ON public.email_jobs (campaign_id);

-- 4. Create Unified Directory View
CREATE OR REPLACE VIEW public.view_directory_contacts AS
SELECT
    u.id::uuid AS id,
    u.email::text AS email,
    'customer'::text AS type,
    u.first_name::text,
    u.last_name::text,
    u.tags::text[] AS tags,
    u.status::text AS status,
    u.created_at
FROM public.unified_profiles u
UNION ALL
SELECT
    l.id::uuid AS id,
    l.email::text AS email,
    'lead'::text AS type,
    l.first_name::text,
    l.last_name::text,
    ARRAY['lead']::text[] AS tags,
    l.status::text AS status,
    l.submitted_at AS created_at
FROM public.purchase_leads l
WHERE l.email NOT IN (SELECT email FROM public.unified_profiles);

-- 5. Enable RLS (Security)
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_smart_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.crm_activities;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.crm_smart_lists;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_campaigns_v2;
    DROP POLICY IF EXISTS "Service Role Full Access" ON public.email_jobs;
END $$;

CREATE POLICY "Service Role Full Access" ON public.crm_activities FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.crm_smart_lists FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.email_campaigns_v2 FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role Full Access" ON public.email_jobs FOR ALL TO service_role USING (true);
