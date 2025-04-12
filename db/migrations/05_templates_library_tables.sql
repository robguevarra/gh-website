-- Templates Library Tables
-- This migration adds tables for tracking templates and user interactions with templates

-- Templates table for storing metadata about templates
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  google_drive_id TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size TEXT,
  file_type TEXT NOT NULL,
  is_free BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User templates table for tracking user interactions with templates
CREATE TABLE IF NOT EXISTS public.user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Add RLS policies for templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY templates_view ON public.templates
  FOR SELECT USING (true);

-- Only admins can modify templates
CREATE POLICY templates_admin_modify ON public.templates
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Add RLS policies for user_templates
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own template interactions
CREATE POLICY user_templates_view_own ON public.user_templates
  FOR SELECT USING (auth.uid() = user_id);

-- Users can modify their own template interactions
CREATE POLICY user_templates_modify_own ON public.user_templates
  FOR ALL USING (auth.uid() = user_id);

-- Admins can view all template interactions
CREATE POLICY user_templates_admin_view ON public.user_templates
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- Create functions for incrementing template view and download counts
CREATE OR REPLACE FUNCTION increment_template_views(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.templates
  SET view_count = view_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_template_downloads(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.templates
  SET download_count = download_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS templates_category_idx ON public.templates(category);
CREATE INDEX IF NOT EXISTS user_templates_user_id_idx ON public.user_templates(user_id);
CREATE INDEX IF NOT EXISTS user_templates_template_id_idx ON public.user_templates(template_id);
