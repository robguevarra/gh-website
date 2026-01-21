-- Add ID to ebook_contacts if it doesn't exist
ALTER TABLE ebook_contacts 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Add optimization columns to existing lead tables
ALTER TABLE purchase_leads 
ADD COLUMN IF NOT EXISTS email_marketing_subscribed boolean DEFAULT false;

ALTER TABLE ebook_contacts 
ADD COLUMN IF NOT EXISTS email_marketing_subscribed boolean DEFAULT false;

-- Drop existng view to ensure schema changes apply
DROP VIEW IF EXISTS view_directory_contacts;

-- Create Unified Directory View
-- prioritizing auth.users > purchase_leads > ebook_contacts
CREATE OR REPLACE VIEW view_directory_contacts AS
WITH unified AS (
    -- 1. Customers (Auth/Unified Profiles)
    SELECT 
        id,
        email,
        first_name,
        last_name,
        'customer' as source,
        tags,
        email_marketing_subscribed,
        created_at,
        1 as priority
    FROM unified_profiles
    
    UNION ALL
    
    -- 2. P2P Leads
    SELECT 
        id,
        email,
        first_name,
        last_name,
        'lead_p2p' as source,
        ARRAY['lead', 'p2p_lead']::text[] as tags,
        email_marketing_subscribed,
        submitted_at as created_at,
        2 as priority
    FROM purchase_leads
    
    UNION ALL
    
    -- 3. Canva/Ebook Leads
    SELECT 
        id, -- Now exists
        email,
        first_name,
        last_name,
        'lead_canva' as source,
        ARRAY['lead', 'canva_lead']::text[] as tags,
        email_marketing_subscribed,
        created_at,
        3 as priority
    FROM ebook_contacts
)
SELECT DISTINCT ON (email)
    id,
    email,
    first_name,
    last_name,
    source,
    tags,
    email_marketing_subscribed,
    created_at
FROM unified
ORDER BY email, priority ASC;

-- Drop Tables if they exist (to ensure clean schema)
DROP TABLE IF EXISTS automation_logs;
DROP TABLE IF EXISTS automation_executions;

-- Automation Executions Table
CREATE TABLE IF NOT EXISTS automation_executions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid REFERENCES email_automations(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL, -- Logical ID from view_directory_contacts
    current_node_id text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed', 'retrying')),
    retry_count int DEFAULT 0,
    last_error text,
    context jsonb DEFAULT '{}'::jsonb,
    wake_up_time timestamptz,
    unique_event_id text, -- Idempotency Key
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(unique_event_id)
);

-- Automation Logs Table (Step History)
CREATE TABLE IF NOT EXISTS automation_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id uuid REFERENCES automation_executions(id) ON DELETE CASCADE,
    node_id text NOT NULL,
    action_type text NOT NULL,
    status text NOT NULL CHECK (status IN ('started', 'success', 'failure')),
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Index for Idempotency
CREATE INDEX IF NOT EXISTS idx_automation_logs_idempotency 
ON automation_logs (execution_id, node_id, status);

-- Index for Scheduler
CREATE INDEX IF NOT EXISTS idx_automation_executions_wakeup 
ON automation_executions (status, wake_up_time) 
WHERE status IN ('paused', 'retrying');
