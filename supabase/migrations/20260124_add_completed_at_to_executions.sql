
-- Migration: Add completed_at to automation_executions
-- Date: 2026-01-24
-- Description: Adds a timestamp column to track when an execution is completed (success or failure).

ALTER TABLE automation_executions
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
