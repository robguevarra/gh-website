-- supabase/migrations/$(date +%Y%m%d%H%M%S)_create_enrollment_trend_functions.sql

-- Function to get daily P2P enrollment counts within a date range
create or replace function get_daily_p2p_enrollment_trends(
    start_date timestamp with time zone, 
    end_date timestamp with time zone,
    target_course_id uuid
)
returns table (date date, count bigint)
language sql
as $$
    select 
        date(timezone('utc', enrolled_at)) as date, 
        count(id)
    from enrollments
    where 
        course_id = target_course_id
        and enrolled_at >= start_date 
        and enrolled_at <= end_date
    group by date(timezone('utc', enrolled_at))
    order by date asc;
$$;

-- Function to get weekly P2P enrollment counts within a date range (Week starts on Sunday - Locale dependent, adjust ISODOW if needed)
create or replace function get_weekly_p2p_enrollment_trends(
    start_date timestamp with time zone, 
    end_date timestamp with time zone,
    target_course_id uuid
)
returns table (week_start_date date, count bigint)
language sql
as $$
    select 
        date_trunc('week', timezone('utc', enrolled_at))::date as week_start_date,
        count(id)
    from enrollments
    where 
        course_id = target_course_id
        and enrolled_at >= start_date 
        and enrolled_at <= end_date
    group by date_trunc('week', timezone('utc', enrolled_at))
    order by week_start_date asc;
$$;

-- Function to get monthly P2P enrollment counts within a date range
create or replace function get_monthly_p2p_enrollment_trends(
    start_date timestamp with time zone, 
    end_date timestamp with time zone,
    target_course_id uuid
)
returns table (month_start_date date, count bigint)
language sql
as $$
    select 
        date_trunc('month', timezone('utc', enrolled_at))::date as month_start_date,
        count(id)
    from enrollments
    where 
        course_id = target_course_id
        and enrolled_at >= start_date 
        and enrolled_at <= end_date
    group by date_trunc('month', timezone('utc', enrolled_at))
    order by month_start_date asc;
$$; 