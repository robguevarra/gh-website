-- Fix ambiguous column reference in get_os_stats
create or replace function public.get_os_stats(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  os text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(pv.os, 'Unknown') as os,
    count(*) as count
  from
    public.page_views pv
  where
    pv.created_at >= start_date
    and pv.created_at <= end_date
  group by
    1
  order by
    count desc;
end;
$$;

-- Fix ambiguous column reference in get_browser_stats
create or replace function public.get_browser_stats(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  browser text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(pv.browser, 'Unknown') as browser,
    count(*) as count
  from
    public.page_views pv
  where
    pv.created_at >= start_date
    and pv.created_at <= end_date
  group by
    1
  order by
    count desc;
end;
$$;
