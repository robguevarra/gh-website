
-- Migration: Add unique constraint to email_funnel_journeys
-- Date: 2026-01-24
-- Description: Ensures that upsert operations on (funnel_id, contact_id) work correctly.

ALTER TABLE email_funnel_journeys
ADD CONSTRAINT email_funnel_journeys_funnel_id_contact_id_key UNIQUE (funnel_id, contact_id);
