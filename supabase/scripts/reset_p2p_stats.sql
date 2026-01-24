
-- RESET STATISTICS FOR FUNNEL: "Uncompleted Registration from P2P"
-- Funnel ID: afe5227f-c7cb-477e-a137-97c497cb5ee7
-- Automation ID: 9a5ad494-1dcb-4e79-9751-d3de9602deb6

BEGIN;

-- 1. Delete Executions (Cascades to automation_logs)
DELETE FROM automation_executions 
WHERE automation_id = '9a5ad494-1dcb-4e79-9751-d3de9602deb6';

-- 2. Delete Conversions
DELETE FROM email_funnel_conversions 
WHERE funnel_id = 'afe5227f-c7cb-477e-a137-97c497cb5ee7';

-- 3. Delete Journeys
DELETE FROM email_funnel_journeys 
WHERE funnel_id = 'afe5227f-c7cb-477e-a137-97c497cb5ee7';

-- 4. Reset Step Metrics (Entered, Completed, Converted, Revenue)
UPDATE email_funnel_steps 
SET metrics = '{"entered": 0, "completed": 0, "converted": 0, "revenue": 0}'::jsonb
WHERE funnel_id = 'afe5227f-c7cb-477e-a137-97c497cb5ee7';

COMMIT;
