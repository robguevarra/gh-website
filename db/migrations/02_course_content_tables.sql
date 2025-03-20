-- Course Content Tables Migration

-- Tags table for content categorization
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table for main course information
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  trailer_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
  is_featured BOOLEAN DEFAULT FALSE,
  required_tier_id UUID REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course_tags junction table
CREATE TABLE IF NOT EXISTS public.course_tags (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (course_id, tag_id)
);

-- Modules table for organizing course sections
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (course_id, position)
);

-- Lessons table for individual content units
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration INT, -- in seconds
  position INT NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  content TEXT, -- markdown content
  attachments JSONB DEFAULT '[]'::jsonb, -- array of attachment objects
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (module_id, position)
);

-- User progress table to track completion
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  last_position INT DEFAULT 0, -- video position in seconds
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- User enrollments table for many-to-many course access
CREATE TABLE IF NOT EXISTS public.user_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, expired
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- RLS Policies

-- Tags table RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view tags
CREATE POLICY tags_view_all ON public.tags 
  FOR SELECT USING (true);

-- Policy: Only admins can modify tags
CREATE POLICY tags_admin_modify ON public.tags 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Courses table RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view published courses
CREATE POLICY courses_view_published ON public.courses 
  FOR SELECT USING (status = 'published');

-- Policy: Only admins can view all courses (including drafts)
CREATE POLICY courses_admin_view_all ON public.courses 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can modify courses
CREATE POLICY courses_admin_modify ON public.courses 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Course_tags table RLS
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view course tags
CREATE POLICY course_tags_view_all ON public.course_tags 
  FOR SELECT USING (true);

-- Policy: Only admins can modify course tags
CREATE POLICY course_tags_admin_modify ON public.course_tags 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Modules table RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view modules of published courses
CREATE POLICY modules_view_published ON public.modules 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id AND courses.status = 'published'
    )
  );

-- Policy: Only admins can view all modules
CREATE POLICY modules_admin_view_all ON public.modules 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can modify modules
CREATE POLICY modules_admin_modify ON public.modules 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Lessons table RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view published lessons
CREATE POLICY lessons_view_published ON public.lessons 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.modules
      JOIN public.courses ON modules.course_id = courses.id
      WHERE modules.id = lessons.module_id AND courses.status = 'published'
    )
  );

-- Policy: Only admins can view all lessons
CREATE POLICY lessons_admin_view_all ON public.lessons 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can modify lessons
CREATE POLICY lessons_admin_modify ON public.lessons 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User progress table RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own progress
CREATE POLICY user_progress_view_own ON public.user_progress 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY user_progress_update_own ON public.user_progress 
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY user_progress_insert_own ON public.user_progress 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all user progress
CREATE POLICY user_progress_admin_view ON public.user_progress 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User enrollments table RLS
ALTER TABLE public.user_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own enrollments
CREATE POLICY user_enrollments_view_own ON public.user_enrollments 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all enrollments
CREATE POLICY user_enrollments_admin_view ON public.user_enrollments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify all enrollments
CREATE POLICY user_enrollments_admin_modify ON public.user_enrollments 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_enrollments_updated_at
BEFORE UPDATE ON public.user_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial tags
INSERT INTO public.tags (name, description)
VALUES
  ('Homeschool Basics', 'Fundamental homeschooling concepts and techniques'),
  ('Elementary Education', 'Content focused on elementary-aged students'),
  ('Middle School', 'Content focused on middle school-aged students'),
  ('High School', 'Content focused on high school-aged students'),
  ('Curriculum Planning', 'Resources for planning your homeschool curriculum'),
  ('Special Needs', 'Resources for homeschooling children with special needs'); 