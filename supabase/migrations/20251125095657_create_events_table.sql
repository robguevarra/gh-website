-- Create events table
create table if not exists public.events (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  page_view_id uuid references public.page_views(id),
  visitor_id uuid,
  event_name text not null,
  event_data jsonb default '{}'::jsonb,
  
  constraint events_pkey primary key (id)
);

-- Indexes
create index if not exists events_event_name_idx on public.events(event_name);
create index if not exists events_created_at_idx on public.events(created_at);
create index if not exists events_visitor_id_idx on public.events(visitor_id);

-- RLS Policies
alter table public.events enable row level security;

create policy "Allow public insert to events"
  on public.events
  for insert
  to public
  with check (true);

create policy "Allow authenticated select from events"
  on public.events
  for select
  to authenticated
  using (true);

-- Function to get recent activity (mixed views and events)
create or replace function public.get_recent_activity(limit_count int default 20)
returns table (
  type text,
  id uuid,
  created_at timestamp with time zone,
  details jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  (
    select
      'view' as type,
      pv.id,
      pv.created_at,
      jsonb_build_object(
        'url', pv.url,
        'path', pv.path,
        'city', pv.city,
        'country', pv.country
      ) as details
    from
      public.page_views pv
    order by
      pv.created_at desc
    limit limit_count
  )
  union all
  (
    select
      'event' as type,
      e.id,
      e.created_at,
      jsonb_build_object(
        'event_name', e.event_name,
        'event_data', e.event_data,
        'city', pv.city,
        'country', pv.country
      ) as details
    from
      public.events e
    left join
      public.page_views pv on e.page_view_id = pv.id
    order by
      e.created_at desc
    limit limit_count
  )
  order by
    created_at desc
  limit limit_count;
end;
$$;

-- Function to get conversion stats
create or replace function public.get_conversion_stats(
  target_event_name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  total_visitors bigint,
  total_conversions bigint,
  conversion_rate numeric
)
language plpgsql
security definer
as $$
declare
  v_total_visitors bigint;
  v_total_conversions bigint;
begin
  -- Count unique visitors in the period
  select count(distinct visitor_id)
  into v_total_visitors
  from public.page_views
  where created_at >= start_date and created_at <= end_date;

  -- Count unique visitors who triggered the event
  select count(distinct visitor_id)
  into v_total_conversions
  from public.events
  where event_name = target_event_name
  and created_at >= start_date and created_at <= end_date;

  return query
  select
    coalesce(v_total_visitors, 0),
    coalesce(v_total_conversions, 0),
    case
      when coalesce(v_total_visitors, 0) = 0 then 0
      else round((coalesce(v_total_conversions, 0)::numeric / v_total_visitors::numeric) * 100, 2)
    end;
end;
$$;

-- Grant execute permissions
grant execute on function public.get_recent_activity(int) to authenticated;
grant execute on function public.get_conversion_stats(text, timestamp with time zone, timestamp with time zone) to authenticated;
