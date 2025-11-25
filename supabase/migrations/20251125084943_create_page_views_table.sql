-- Create page_views table for custom visitor tracking
create table if not exists public.page_views (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  url text not null,
  path text not null,
  referrer text,
  user_agent text,
  visitor_id uuid, -- Persistent ID stored in cookie/local storage
  session_id uuid, -- Session ID
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  fbp text, -- Facebook Browser ID
  fbc text, -- Facebook Click ID
  user_id uuid references auth.users(id), -- Optional: link to logged-in user
  metadata jsonb default '{}'::jsonb,
  
  constraint page_views_pkey primary key (id)
);

-- Add RLS policies
alter table public.page_views enable row level security;

-- Allow public insert (for anonymous tracking)
create policy "Allow public insert to page_views"
  on public.page_views
  for insert
  to public, anon
  with check (true);

-- Allow admins to view all (assuming admin role or similar, adjusting for now to allow authenticated read)
create policy "Allow authenticated read of page_views"
  on public.page_views
  for select
  to authenticated
  using (true);

-- Create indexes for common queries
create index if not exists idx_page_views_created_at on public.page_views(created_at);
create index if not exists idx_page_views_visitor_id on public.page_views(visitor_id);
create index if not exists idx_page_views_utm_source on public.page_views(utm_source);
