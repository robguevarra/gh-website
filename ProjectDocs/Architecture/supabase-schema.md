# Supabase Database Schema for Graceful Homeschooling

This document outlines the database schema design for the Graceful Homeschooling platform using Supabase PostgreSQL.

## Core Tables

### 1. Users and Authentication

```sql
-- Extends Supabase auth.users with custom profile data
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  membership_tier TEXT DEFAULT 'free', -- 'free', 'basic', 'premium'
  membership_status TEXT DEFAULT 'active', -- 'active', 'expired', 'canceled'
  membership_start_date TIMESTAMP WITH TIME ZONE,
  membership_end_date TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  admin_role TEXT, -- 'super_admin', 'content_manager', 'support'
  onboarding_completed BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "marketing": true}'::jsonb
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ));
```

### 2. Content Management

```sql
-- Courses
CREATE TABLE public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  banner_url TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  membership_required TEXT DEFAULT 'free', -- 'free', 'basic', 'premium'
  author_id UUID REFERENCES public.profiles(id),
  is_featured BOOLEAN DEFAULT false,
  duration INTEGER, -- in minutes
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Modules (sections within courses)
CREATE TABLE public.modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' -- 'draft', 'published', 'archived'
);

-- Lessons
CREATE TABLE public.lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Rich text content for the lesson
  video_url TEXT, -- Vimeo URL
  video_id TEXT, -- Vimeo ID
  position INTEGER NOT NULL,
  duration INTEGER, -- in minutes
  is_free_preview BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  attachments JSONB DEFAULT '[]'::jsonb -- Array of attachment objects with URLs
);

-- User Progress
CREATE TABLE public.user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  last_position_seconds INTEGER DEFAULT 0, -- Video position in seconds
  notes TEXT,
  UNIQUE(user_id, lesson_id)
);

-- Course Enrollments
CREATE TABLE public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0, -- 0-100
  payment_id UUID, -- Reference to payment if applicable
  UNIQUE(user_id, course_id)
);

-- Lesson Comments
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES public.comments(id), -- For reply threading
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### 3. E-commerce and Payments

```sql
-- Products
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  product_type TEXT NOT NULL, -- 'course', 'membership', 'physical', 'digital'
  membership_tier TEXT, -- If product is a membership
  course_id UUID REFERENCES public.courses(id), -- If product is a course
  shopify_product_id TEXT, -- For Shopify integration
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Payment Transactions
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'bank_transfer', etc.
  xendit_invoice_id TEXT,
  xendit_payment_id TEXT,
  shopify_order_id TEXT,
  receipt_url TEXT,
  billing_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  status TEXT NOT NULL, -- 'active', 'canceled', 'expired', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  price_id TEXT, -- Reference to price if separate from product
  xendit_subscription_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### 4. Email Marketing

```sql
-- Email Templates
CREATE TABLE public.email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_by UUID REFERENCES public.profiles(id),
  category TEXT, -- 'welcome', 'course', 'marketing', etc.
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Campaigns
CREATE TABLE public.email_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'canceled'
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  audience_filter JSONB, -- Filter criteria for recipients
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Automation Workflows
CREATE TABLE public.email_workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'archived'
  trigger_type TEXT NOT NULL, -- 'enrollment', 'lesson_completion', 'signup', etc.
  trigger_details JSONB DEFAULT '{}'::jsonb,
  workflow_steps JSONB NOT NULL, -- Array of steps with delays, conditions, template_ids
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Logs
CREATE TABLE public.email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_address TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  campaign_id UUID REFERENCES public.email_campaigns(id),
  workflow_id UUID REFERENCES public.email_workflows(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam', 'failed'
  error_message TEXT,
  provider_message_id TEXT,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### 5. Community Features

```sql
-- Community Posts
CREATE TABLE public.community_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published', -- 'published', 'hidden', 'flagged'
  topic_id UUID REFERENCES public.community_topics(id),
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_announcement BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  media_urls JSONB DEFAULT '[]'::jsonb, -- Array of media attachments
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Community Topics
CREATE TABLE public.community_topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  position INTEGER DEFAULT 0,
  membership_required TEXT DEFAULT 'free', -- 'free', 'basic', 'premium'
  is_active BOOLEAN DEFAULT true
);

-- Community Comments
CREATE TABLE public.community_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.community_comments(id), -- For nested comments
  like_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published', -- 'published', 'hidden', 'flagged'
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Community Likes
CREATE TABLE public.community_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  -- Either post_id OR comment_id should be set, not both
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);
```

### 6. Analytics and Tracking

```sql
-- Page Views
CREATE TABLE public.page_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT,
  path TEXT NOT NULL,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  duration INTEGER, -- in seconds
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversion Events
CREATE TABLE public.conversion_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT,
  event_type TEXT NOT NULL, -- 'signup', 'enrollment', 'purchase', etc.
  event_details JSONB DEFAULT '{}'::jsonb,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  fb_ad_id TEXT,
  fb_campaign_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## Row Level Security Policies

For each table, we will implement appropriate RLS policies to ensure data security. The general pattern includes:

1. Users can read and modify their own data
2. Admins can read and modify all data
3. Content visibility is restricted based on membership tier
4. Specific roles have specific permissions (e.g., content managers can modify courses)

## Functions and Triggers

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply this trigger to all tables with updated_at
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- Create similar triggers for other tables with updated_at

-- User enrollment trigger
CREATE OR REPLACE FUNCTION enroll_in_course()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.enrollments (user_id, course_id)
    VALUES (NEW.user_id, (
        SELECT course_id FROM public.products
        WHERE id = NEW.product_id AND product_type = 'course'
    ))
    ON CONFLICT (user_id, course_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_complete
    AFTER INSERT ON public.payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE PROCEDURE enroll_in_course();

-- Update course progress percentage
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    progress INTEGER;
BEGIN
    -- Get total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = (
        SELECT m.course_id
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id
        WHERE l.id = NEW.lesson_id
    );
    
    -- Get completed lessons
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
    AND up.completed = true
    AND m.course_id = (
        SELECT m.course_id
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id
        WHERE l.id = NEW.lesson_id
    );
    
    -- Calculate progress percentage
    IF total_lessons > 0 THEN
        progress := (completed_lessons * 100) / total_lessons;
    ELSE
        progress := 0;
    END IF;
    
    -- Update enrollment progress
    UPDATE public.enrollments
    SET progress_percentage = progress,
        completed = (progress = 100),
        completed_at = CASE WHEN progress = 100 THEN now() ELSE completed_at END
    WHERE user_id = NEW.user_id
    AND course_id = (
        SELECT m.course_id
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id
        WHERE l.id = NEW.lesson_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_lesson_progress_update
    AFTER INSERT OR UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE PROCEDURE update_course_progress();
```

## Indexes

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_profiles_membership_tier ON public.profiles(membership_tier);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_membership_required ON public.courses(membership_required);
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_community_posts_topic_id ON public.community_posts(topic_id);
CREATE INDEX idx_community_comments_post_id ON public.community_comments(post_id);
```

## Implementation Notes

1. The schema uses UUID primary keys for all tables to ensure uniqueness across environments
2. JSONB fields are used for flexible data storage where schema may evolve
3. Timestamps include timezone information for global user base
4. Row Level Security is implemented for all tables to ensure data privacy
5. Foreign key relationships ensure data integrity
6. Each major feature has its own group of related tables
7. The database structure supports future expansion with additional features 