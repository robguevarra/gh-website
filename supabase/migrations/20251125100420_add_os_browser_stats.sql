-- Function to get OS stats
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
    coalesce(os, 'Unknown') as os,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    1
  order by
    count desc;
end;
$$;

-- Function to get Browser stats
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
    coalesce(browser, 'Unknown') as browser,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    1
  order by
    count desc;
end;
$$;

-- Grant execute permissions
grant execute on function public.get_os_stats(timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.get_browser_stats(timestamp with time zone, timestamp with time zone) to authenticated;
