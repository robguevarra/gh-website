-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the Automation Scheduler (Runs every minute)
-- NOTE: You MUST replace {{PROJECT_URL}} and {{SERVICE_ROLE_KEY}} with your actual values before running this migration.
-- Example URL: https://abcedfghijklm.supabase.co
SELECT cron.schedule(
    'process-automation-scheduler',
    '* * * * *',
    $$
    select
        net.http_post(
            url:='{{PROJECT_URL}}/functions/v1/process-automation-scheduler',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer {{SERVICE_ROLE_KEY}}"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Optional: Schedule Batch Automation (Daily at 9 AM)
-- Un-comment and configure if you have ported the batch automation to an Edge Function
/*
SELECT cron.schedule(
    'process-batch-automation',
    '0 9 * * *',
    $$
    select
        net.http_post(
            url:='{{PROJECT_URL}}/functions/v1/process-batch-automation',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer {{SERVICE_ROLE_KEY}}"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);
*/
