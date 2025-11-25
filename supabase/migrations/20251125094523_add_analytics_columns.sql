-- Add advanced analytics columns to page_views table

alter table public.page_views
add column if not exists ip_address text,
add column if not exists country text,
add column if not exists city text,
add column if not exists device_type text,
add column if not exists browser text,
add column if not exists os text,
add column if not exists duration integer default 0;

-- Create indexes for new columns
create index if not exists idx_page_views_country on public.page_views(country);
create index if not exists idx_page_views_device_type on public.page_views(device_type);

-- Update analytics functions to include new metrics

-- 4. Get Top Locations
create or replace function public.get_top_locations(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  limit_count int default 10
)
returns table (
  location text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(country, 'Unknown') as location,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    country
  order by
    count desc
  limit
    limit_count;
end;
$$;

-- 5. Get Device Breakdown
create or replace function public.get_device_stats(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  device text,
  count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(device_type, 'Unknown') as device,
    count(*) as count
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
  group by
    device_type
  order by
    count desc;
end;
$$;

-- 6. Get Average Time on Page
create or replace function public.get_avg_duration(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns double precision
language plpgsql
security definer
as $$
declare
  avg_dur double precision;
begin
  select
    coalesce(avg(duration), 0)
  into
    avg_dur
  from
    public.page_views
  where
    created_at >= start_date
    and created_at <= end_date
    and duration > 0; -- Only count visits with tracked duration
    
  return avg_dur;
end;
$$;

-- Grant access
grant execute on function public.get_top_locations to authenticated;
grant execute on function public.get_device_stats to authenticated;
grant execute on function public.get_avg_duration to authenticated;
