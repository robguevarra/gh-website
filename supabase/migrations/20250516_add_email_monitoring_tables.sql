-- Migration to add email monitoring tables
-- This enables storing metrics and alerts for the email queue system

-- Performance metrics table for tracking email batch processing
CREATE TABLE IF NOT EXISTS email_processing_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_size INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  retry_count INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table for storing system alerts
CREATE TABLE IF NOT EXISTS email_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_processing_metrics_timestamp ON email_processing_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_email_alerts_timestamp ON email_alerts (timestamp);
CREATE INDEX IF NOT EXISTS idx_email_alerts_resolved ON email_alerts (resolved);
CREATE INDEX IF NOT EXISTS idx_email_alerts_type ON email_alerts (alert_type);

-- RLS Policies
ALTER TABLE email_processing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alerts ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users with admin role
CREATE POLICY admin_read_metrics ON email_processing_metrics 
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' IN ('admin', 'marketing')
    )
  );

CREATE POLICY admin_read_alerts ON email_alerts 
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' IN ('admin', 'marketing')
    )
  );

CREATE POLICY admin_update_alerts ON email_alerts 
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Service role access (for edge functions)
CREATE POLICY service_role_insert_metrics ON email_processing_metrics 
  FOR INSERT WITH CHECK (true);

CREATE POLICY service_role_insert_alerts ON email_alerts 
  FOR INSERT WITH CHECK (true);
