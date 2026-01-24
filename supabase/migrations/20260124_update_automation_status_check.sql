
-- Migration: Add 'converted' to automation_executions status check
-- Date: 2026-01-24
-- Description: Allows executions to be marked as 'converted' to distinguish them from natural completions.

ALTER TABLE automation_executions
DROP CONSTRAINT IF EXISTS automation_executions_status_check;

ALTER TABLE automation_executions
ADD CONSTRAINT automation_executions_status_check
CHECK (status IN ('active', 'paused', 'completed', 'failed', 'retrying', 'converted'));
