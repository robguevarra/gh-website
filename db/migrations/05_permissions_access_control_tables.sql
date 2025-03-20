-- Permissions and Access Control Tables Migration

-- Roles table for user role definitions
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission objects
  priority INT NOT NULL, -- Higher number means higher priority
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table for granular capabilities
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource_type TEXT NOT NULL, -- courses, users, etc.
  action_type TEXT NOT NULL, -- create, read, update, delete
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (resource_type, action_type)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- User roles junction table (if more than one role per user)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Access grants table for temporary privileges
CREATE TABLE IF NOT EXISTS public.access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- courses, modules, etc.
  resource_id UUID NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  capabilities JSONB DEFAULT '[]'::jsonb, -- Array of allowed actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Roles table RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view roles
CREATE POLICY roles_view_all ON public.roles 
  FOR SELECT USING (true);

-- Policy: Only admins can modify roles
CREATE POLICY roles_admin_modify ON public.roles 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permissions table RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view permissions
CREATE POLICY permissions_view_all ON public.permissions 
  FOR SELECT USING (true);

-- Policy: Only admins can modify permissions
CREATE POLICY permissions_admin_modify ON public.permissions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Role permissions table RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view role permissions
CREATE POLICY role_permissions_view_all ON public.role_permissions 
  FOR SELECT USING (true);

-- Policy: Only admins can modify role permissions
CREATE POLICY role_permissions_admin_modify ON public.role_permissions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User roles table RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY user_roles_view_own ON public.user_roles 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all user roles
CREATE POLICY user_roles_admin_view ON public.user_roles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify user roles
CREATE POLICY user_roles_admin_modify ON public.user_roles 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Access grants table RLS
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own access grants
CREATE POLICY access_grants_view_own ON public.access_grants 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all access grants
CREATE POLICY access_grants_admin_view ON public.access_grants 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify access grants
CREATE POLICY access_grants_admin_modify ON public.access_grants 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
BEFORE UPDATE ON public.permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_grants_updated_at
BEFORE UPDATE ON public.access_grants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial roles
INSERT INTO public.roles (name, description, permissions, priority)
VALUES
  ('admin', 'Full administrative access to all system features', '["*"]'::jsonb, 100),
  ('marketing', 'Access to marketing features and campaigns', '["email:*", "analytics:read"]'::jsonb, 50),
  ('instructor', 'Can create and manage courses', '["courses:*", "modules:*", "lessons:*"]'::jsonb, 40),
  ('moderator', 'Can moderate community content', '["comments:*", "users:read"]'::jsonb, 30),
  ('user', 'Regular user with access to purchased content', '[]'::jsonb, 10);

-- Insert core permissions
INSERT INTO public.permissions (name, description, resource_type, action_type)
VALUES
  ('create_courses', 'Create new courses', 'courses', 'create'),
  ('read_courses', 'View courses', 'courses', 'read'),
  ('update_courses', 'Edit courses', 'courses', 'update'),
  ('delete_courses', 'Delete courses', 'courses', 'delete'),
  
  ('create_modules', 'Create new modules', 'modules', 'create'),
  ('read_modules', 'View modules', 'modules', 'read'),
  ('update_modules', 'Edit modules', 'modules', 'update'),
  ('delete_modules', 'Delete modules', 'modules', 'delete'),
  
  ('create_lessons', 'Create new lessons', 'lessons', 'create'),
  ('read_lessons', 'View lessons', 'lessons', 'read'),
  ('update_lessons', 'Edit lessons', 'lessons', 'update'),
  ('delete_lessons', 'Delete lessons', 'lessons', 'delete'),
  
  ('create_users', 'Create users', 'users', 'create'),
  ('read_users', 'View users', 'users', 'read'),
  ('update_users', 'Edit users', 'users', 'update'),
  ('delete_users', 'Delete users', 'users', 'delete'),
  
  ('create_comments', 'Create comments', 'comments', 'create'),
  ('read_comments', 'View comments', 'comments', 'read'),
  ('update_comments', 'Edit comments', 'comments', 'update'),
  ('delete_comments', 'Delete comments', 'comments', 'delete'),
  
  ('send_emails', 'Send email campaigns', 'email', 'create'),
  ('read_analytics', 'View analytics data', 'analytics', 'read');

-- Map permissions to roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM public.roles WHERE name = 'instructor'),
  id
FROM public.permissions 
WHERE resource_type IN ('courses', 'modules', 'lessons') 
  AND action_type IN ('create', 'read', 'update', 'delete');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM public.roles WHERE name = 'moderator'),
  id
FROM public.permissions 
WHERE (resource_type = 'comments' AND action_type IN ('read', 'update', 'delete'))
   OR (resource_type = 'users' AND action_type = 'read'); 