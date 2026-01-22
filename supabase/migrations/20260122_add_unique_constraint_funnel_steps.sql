-- Add unique constraint to email_funnel_steps to support upsert operations
-- This is required for the builder to sync nodes correctly.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_funnel_steps_funnel_id_node_id_key'
    ) THEN
        ALTER TABLE email_funnel_steps
        ADD CONSTRAINT email_funnel_steps_funnel_id_node_id_key UNIQUE (funnel_id, node_id);
    END IF;
END $$;
