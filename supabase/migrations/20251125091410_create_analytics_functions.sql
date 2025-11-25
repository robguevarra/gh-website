-- Create functions for analytics dashboard

-- 1. Get Daily Page Views
create or replace function public.get_daily_page_views(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  date date,
  count bigint,
  unique_visitors bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    created_at::date as date,
    count(*) as count,
    count(distinct visitor_id) as unique_visitors
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    created_at::date
  order by
    created_at::date;
end;
$$;

-- 2. Get Top Sources (UTM Source or Referrer)
create or replace function public.get_top_sources(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  limit_count int default 10
)
returns table (
  source text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(utm_source, case when referrer is null or referrer = '' then 'Direct' else referrer end) as source,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    1
  order by
    count desc
  limit
    limit_count;
end;
$$;

-- 3. Get Top Pages
create or replace function public.get_top_pages(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  limit_count int default 10
)
returns table (
  path text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    page_views.path,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    page_views.path
  order by
    count desc
  limit
    limit_count;
end;
$$;

-- Grant access to authenticated users (admins)
grant execute on function public.get_daily_page_views to authenticated;
grant execute on function public.get_top_sources to authenticated;
grant execute on function public.get_top_pages to authenticated;
