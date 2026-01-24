-- Create table for storing A/B test configuration
create table if not exists public.ab_test_config (
    key text primary key,
    value jsonb not null,
    updated_at timestamp with time zone default now()
);

-- Enable RLS on ab_test_config
alter table public.ab_test_config enable row level security;

-- Create policy for admins to manage config
create policy "Admins can manage ab_test_config"
    on public.ab_test_config
    for all
    to authenticated
    using (
        exists (
            select 1 from public.unified_profiles
            where id = auth.uid() and is_admin = true
        )
    );

-- Create table for storing A/B test history (snapshots)
create table if not exists public.ab_test_history (
    id uuid primary key default gen_random_uuid(),
    snapshot_date timestamp with time zone default now(),
    description text,
    stats jsonb not null,
    created_by uuid references auth.users(id)
);

-- Enable RLS on ab_test_history
alter table public.ab_test_history enable row level security;

-- Create policy for admins to manage history
create policy "Admins can manage ab_test_history"
    on public.ab_test_history
    for all
    to authenticated
    using (
        exists (
            select 1 from public.unified_profiles
            where id = auth.uid() and is_admin = true
        )
    );

-- Initial seed for start date if not exists
insert into public.ab_test_config (key, value)
values ('current_test_start_date', to_jsonb(now()))
on conflict (key) do nothing;

-- Function to get A/B test stats efficiently (Server-side counting)
create or replace function public.get_ab_test_stats(start_date timestamp with time zone default null)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_start_date timestamp with time zone;
    v_stats_a jsonb;
    v_stats_b jsonb;
    v_result jsonb;
begin
    -- Determine start date: use provided, or lookup config, or default to epoch
    if start_date is not null then
        v_start_date := start_date;
    else
        select (value->>'start_date')::timestamp with time zone 
        into v_start_date 
        from public.ab_test_config 
        where key = 'current_test_start_date';
        
        -- If config is just a string iso date
        if v_start_date is null then
             select (value)::text::timestamp with time zone 
             into v_start_date 
             from public.ab_test_config 
             where key = 'current_test_start_date';
        end if;

        if v_start_date is null then
            v_start_date := '2000-01-01'::timestamp with time zone;
        end if;
    end if;

    -- Calculate Stats for Variant A
    with metrics as (
        select
            count(*) as visitors,
            count(distinct visitor_id) as unique_visitors
        from page_views
        where path ilike '%p2p-order-form%'
        and metadata->>'variant' = 'A'
        and created_at >= v_start_date
    ),
    checkouts as (
        select count(*) as count
        from events
        where event_name = 'initiate_checkout'
        and event_data->>'variant' = 'A'
        and created_at >= v_start_date
    ),
    sales as (
        select 
            count(*) as count,
            coalesce(sum(amount), 0) as revenue
        from transactions
        where metadata->>'variant' = 'A'
        and status in ('paid', 'completed')
        and created_at >= v_start_date
    )
    select jsonb_build_object(
        'variant', 'A',
        'visitors', (select visitors from metrics),
        'uniqueVisitors', (select unique_visitors from metrics),
        'checkouts', (select count from checkouts),
        'sales', (select count from sales),
        'revenue', (select revenue from sales)
    ) into v_stats_a;

    -- Calculate Stats for Variant B
    with metrics as (
        select
            count(*) as visitors,
            count(distinct visitor_id) as unique_visitors
        from page_views
        where path ilike '%p2p-order-form%'
        and metadata->>'variant' = 'B'
        and created_at >= v_start_date
    ),
    checkouts as (
        select count(*) as count
        from events
        where event_name = 'initiate_checkout'
        and event_data->>'variant' = 'B'
        and created_at >= v_start_date
    ),
    sales as (
        select 
            count(*) as count,
            coalesce(sum(amount), 0) as revenue
        from transactions
        where metadata->>'variant' = 'B'
        and status in ('paid', 'completed')
        and created_at >= v_start_date
    )
    select jsonb_build_object(
        'variant', 'B',
        'visitors', (select visitors from metrics),
        'uniqueVisitors', (select unique_visitors from metrics),
        'checkouts', (select count from checkouts),
        'sales', (select count from sales),
        'revenue', (select revenue from sales)
    ) into v_stats_b;

    return jsonb_build_object(
        'stats', jsonb_build_array(v_stats_a, v_stats_b),
        'meta', jsonb_build_object('start_date', v_start_date)
    );
end;
$$;
