

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "devcopy";


ALTER SCHEMA "devcopy" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "migration_staging";


ALTER SCHEMA "migration_staging" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."activity_log_type" AS ENUM (
    'AFFILIATE_STATUS_CHANGE',
    'AFFILIATE_APPLICATION',
    'AFFILIATE_SETTINGS_UPDATE',
    'AFFILIATE_COMMISSION_RATE_UPDATE',
    'AFFILIATE_PAYOUT_PROCESSED',
    'FRAUD_FLAG_CREATED',
    'FRAUD_FLAG_RESOLVED',
    'ADMIN_LOGIN',
    'USER_PROFILE_UPDATE_ADMIN',
    'MEMBERSHIP_LEVEL_UPDATE_ADMIN',
    'GENERAL_ADMIN_ACTION'
);


ALTER TYPE "public"."activity_log_type" OWNER TO "postgres";


CREATE TYPE "public"."affiliate_status_type" AS ENUM (
    'pending',
    'active',
    'flagged',
    'inactive'
);


ALTER TYPE "public"."affiliate_status_type" OWNER TO "postgres";


CREATE TYPE "public"."batch_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."batch_status" OWNER TO "postgres";


CREATE TYPE "public"."conversion_status_type" AS ENUM (
    'pending',
    'cleared',
    'paid',
    'flagged'
);


ALTER TYPE "public"."conversion_status_type" OWNER TO "postgres";


CREATE TYPE "public"."email_status" AS ENUM (
    'pending',
    'processing',
    'sent',
    'failed',
    'retrying'
);


ALTER TYPE "public"."email_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_batch_status_type" AS ENUM (
    'pending',
    'verified',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."payout_batch_status_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_status_type" AS ENUM (
    'processing',
    'sent',
    'failed',
    'pending',
    'scheduled',
    'paid',
    'cancelled'
);


ALTER TYPE "public"."payout_status_type" OWNER TO "postgres";


CREATE TYPE "public"."postback_status_type" AS ENUM (
    'pending',
    'sent',
    'failed',
    'retrying'
);


ALTER TYPE "public"."postback_status_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_lock"("p_key" "text", "p_timeout_seconds" integer DEFAULT 300) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_lock_acquired BOOLEAN;
    v_lock_id UUID;
BEGIN
    -- Try to insert a new lock
    INSERT INTO public.email_processing_locks (lock_key, locked_until)
    VALUES (p_key, NOW() + (p_timeout_seconds * INTERVAL '1 second'))
    ON CONFLICT (lock_key) 
    DO UPDATE SET 
        locked_until = NOW() + (p_timeout_seconds * INTERVAL '1 second')
    WHERE email_processing_locks.locked_until <= NOW()
    RETURNING id INTO v_lock_id;
    
    v_lock_acquired := (v_lock_id IS NOT NULL);
    RETURN v_lock_acquired;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."acquire_lock"("p_key" "text", "p_timeout_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_jsonb_column"("table_name" "text", "column_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the column already exists
  IF NOT public.check_column_exists(table_name, column_name) THEN
    -- Add the column with a default empty JSON object
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I JSONB DEFAULT ''{}''::jsonb', table_name, column_name);
  END IF;
END;
$$;


ALTER FUNCTION "public"."add_jsonb_column"("table_name" "text", "column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_set_conversion_commission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  membership_level_name TEXT;
  membership_commission_rate NUMERIC;
  calculated_commission NUMERIC;
BEGIN
  -- Get affiliate's membership level and commission rate
  SELECT ml.name, ml.commission_rate
  INTO membership_level_name, membership_commission_rate
  FROM public.affiliates a
  JOIN public.unified_profiles up ON up.id = a.user_id
  JOIN public.membership_levels ml ON ml.id = up.membership_level_id
  WHERE a.id = NEW.affiliate_id;

  IF NOT FOUND THEN
    -- Default to Standard Affiliate Tier if no membership level found
    SELECT commission_rate INTO membership_commission_rate
    FROM public.membership_levels
    WHERE name = 'Standard Affiliate Tier';
    
    IF NOT FOUND THEN
      -- Use 0.20 as fallback if tier not found
      membership_commission_rate := 0.20;
    END IF;
  END IF;

  -- Handle level 2 conversions regardless of membership level
  IF NEW.level = 2 THEN
    calculated_commission := NEW.gmv * 0.10; -- Always 10% for level 2
  ELSE
    -- For level 1, use membership commission rate
    calculated_commission := NEW.gmv * membership_commission_rate;
  END IF;

  NEW.commission_amount := calculated_commission;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_and_set_conversion_commission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_and_set_conversion_commission"() IS 'Trigger function to calculate and set the commission_amount on a new affiliate_conversion record based on GMV, affiliate membership status, and conversion level.';



CREATE OR REPLACE FUNCTION "public"."calculate_enrollment_metrics"() RETURNS TABLE("course_id" "uuid", "total_enrollments" integer, "active_enrollments" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    course_id,
    COUNT(*) AS total_enrollments,
    COUNT(*) FILTER (WHERE status = 'active') AS active_enrollments
  FROM enrollments
  GROUP BY course_id;
END;
$$;


ALTER FUNCTION "public"."calculate_enrollment_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_column_exists"("table_name" "text", "column_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$_$;


ALTER FUNCTION "public"."check_column_exists"("table_name" "text", "column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_if_user_is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- First check using role
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role = 'admin'
    ) INTO is_admin;
    
    -- If that's not true, check is_admin flag
    IF NOT is_admin THEN
        SELECT EXISTS (
            SELECT 1 FROM profiles
            WHERE id = user_id AND is_admin = true
        ) INTO is_admin;
    END IF;
    
    RETURN is_admin;
END;
$$;


ALTER FUNCTION "public"."check_if_user_is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM api_cache WHERE expires_at < NOW();
  RETURN (SELECT COUNT(*) FROM api_cache);
END;
$$;


ALTER FUNCTION "public"."clean_expired_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sql"("sql" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE sql;
END;
$$;


ALTER FUNCTION "public"."execute_sql"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_normalize_postmark_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_event_type TEXT;
  v_message_id TEXT;
  v_user_id UUID;
  v_recipient TEXT;
  v_payload JSONB;
  v_ts TIMESTAMP;
BEGIN
  -- Map record_type to canonical event_type
  v_payload := NEW.payload;
  v_message_id := NEW.message_id;
  v_ts := NEW.created_at;
  v_recipient := COALESCE(v_payload->>'recipient', v_payload->>'Recipient', NULL);
  -- Try to get user_id from payload, fallback to lookup by email
  v_user_id := NULL;
  IF v_payload ? 'user_id' THEN
    v_user_id := (v_payload->>'user_id')::uuid;
  ELSIF v_recipient IS NOT NULL THEN
    SELECT id INTO v_user_id FROM unified_profiles WHERE lower(email) = lower(v_recipient) LIMIT 1;
  END IF;
  -- Map record_type
  CASE NEW.record_type
    WHEN 'Delivery' THEN v_event_type := 'delivered';
    WHEN 'Open' THEN v_event_type := 'opened';
    WHEN 'Click' THEN v_event_type := 'clicked';
    WHEN 'Bounce' THEN v_event_type := 'bounced';
    WHEN 'SpamComplaint' THEN v_event_type := 'spam';
    WHEN 'SubscriptionChange' THEN v_event_type := 'unsubscribed';
    ELSE v_event_type := NULL;
  END CASE;
  IF v_event_type IS NULL THEN
    RETURN NULL;
  END IF;
  -- Idempotency: skip if already exists
  IF EXISTS (
    SELECT 1 FROM email_events
    WHERE email_events.message_id = v_message_id
      AND email_events.event_type = v_event_type
      AND email_events.user_id IS NOT DISTINCT FROM v_user_id
      AND email_events.timestamp = v_ts
  ) THEN
    RETURN NULL;
  END IF;
  -- Insert into email_events
  INSERT INTO email_events (event_type, message_id, user_id, recipient, payload, timestamp, created_at)
  VALUES (v_event_type, v_message_id, v_user_id, v_recipient, v_payload, v_ts, now());
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."fn_normalize_postmark_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_enrollments"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  course_uuid UUID;
BEGIN
  SELECT id INTO course_uuid FROM courses WHERE lower(name) = 'papers to profits' LIMIT 1;
  IF course_uuid IS NULL THEN
    RAISE NOTICE 'Course "Papers to Profits" not found';
    RETURN;
  END IF;
  INSERT INTO enrollments (id, user_id, course_id, transaction_id, status, enrolled_at, expires_at)
  SELECT
    gen_random_uuid(),
    t.user_id,
    course_uuid,
    t.id,
    'active',
    t.paid_at,
    NULL
  FROM transactions t
  WHERE t.status = 'completed' AND t.transaction_type = 'P2P'
  ON CONFLICT (user_id, course_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."generate_enrollments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_affiliate_clicks_by_date_range"("p_affiliate_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) RETURNS TABLE("id" "uuid", "affiliate_id" "uuid", "visitor_id" "uuid", "ip_address" "inet", "user_agent" "text", "referral_url" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "utm_params" "jsonb", "user_agent_details" "jsonb", "landing_page_url" "text", "sub_id" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT 
        id,
        affiliate_id,
        visitor_id,
        ip_address,
        user_agent,
        referral_url,
        created_at,
        updated_at,
        utm_params,
        user_agent_details,
        landing_page_url,
        sub_id
    FROM 
        public.affiliate_clicks
    WHERE 
        affiliate_id = p_affiliate_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date;
$$;


ALTER FUNCTION "public"."get_affiliate_clicks_by_date_range"("p_affiliate_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_environment"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT environment_name 
    FROM environment_config 
    WHERE is_active = true 
    LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_environment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") RETURNS TABLE("date" "date", "count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        DATE(e.enrolled_at) as date,
        COUNT(e.id) as count
    FROM
        public.enrollments e
    WHERE
        e.course_id = target_course_id
        AND e.enrolled_at >= start_date
        AND e.enrolled_at <= end_date
    GROUP BY
        DATE(e.enrolled_at)
    ORDER BY
        date;
$$;


ALTER FUNCTION "public"."get_daily_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_environment_suffix"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN CASE 
        WHEN (SELECT environment_name FROM environment_config WHERE is_active = true) = 'production' 
        THEN '_prod' 
        ELSE '_dev'
    END;
END;
$$;


ALTER FUNCTION "public"."get_environment_suffix"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") RETURNS TABLE("month_start_date" "date", "count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        DATE_TRUNC('month', e.enrolled_at)::date as month_start_date,
        COUNT(e.id) as count
    FROM
        public.enrollments e
    WHERE
        e.course_id = target_course_id
        AND e.enrolled_at >= start_date
        AND e.enrolled_at <= end_date
    GROUP BY
        month_start_date
    ORDER BY
        month_start_date;
$$;


ALTER FUNCTION "public"."get_monthly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_revenue_trends"("p_start_date" "text", "p_end_date" "text") RETURNS TABLE("month_start" "date", "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('month', t.paid_at)::date AS month_start,
    SUM(t.amount)::numeric AS total_revenue
  FROM
    public.transactions t
  WHERE
    t.status = 'completed'
    AND t.paid_at >= p_start_date::timestamptz AND t.paid_at <= p_end_date::timestamptz
  GROUP BY
    month_start
  ORDER BY
    month_start;
END;
$$;


ALTER FUNCTION "public"."get_monthly_revenue_trends"("p_start_date" "text", "p_end_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_payout_batch_stats"() RETURNS TABLE("totalBatches" bigint, "pendingBatches" bigint, "processingBatches" bigint, "completedBatches" bigint, "failedBatches" bigint, "totalAmount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS "totalBatches",
    COUNT(*) FILTER (WHERE status = 'pending') AS "pendingBatches",
    COUNT(*) FILTER (WHERE status = 'processing' OR status = 'verified') AS "processingBatches",
    COUNT(*) FILTER (WHERE status = 'completed') AS "completedBatches",
    COUNT(*) FILTER (WHERE status = 'failed') AS "failedBatches",
    COALESCE(SUM(total_amount), 0) AS "totalAmount"
  FROM
    public.affiliate_payout_batches;
END;
$$;


ALTER FUNCTION "public"."get_payout_batch_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_population_history"("limit_count" integer DEFAULT 10) RETURNS TABLE("operation_name" "text", "table_name" "text", "status" "text", "records_processed" integer, "duration_ms" integer, "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "error_message" "text")
    LANGUAGE "sql"
    AS $$
    SELECT 
        operation_name,
        table_name,
        status,
        records_processed,
        duration_ms,
        started_at,
        completed_at,
        error_message
    FROM population_operation_log
    ORDER BY started_at DESC
    LIMIT limit_count;
$$;


ALTER FUNCTION "public"."get_population_history"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_revenue_by_product"("p_start_date" "text" DEFAULT NULL::"text", "p_end_date" "text" DEFAULT NULL::"text", "p_source_platform" "text" DEFAULT NULL::"text") RETURNS TABLE("product_identifier" "text", "product_name" "text", "source_platform" "text", "total_revenue" numeric, "units_sold" bigint, "average_transaction_value" numeric)
    LANGUAGE "sql" STABLE
    AS $$
WITH TimeFilteredTransactions AS (
    -- Apply date filters first for efficiency
    SELECT *
    FROM public.unified_transactions_view v
    WHERE
        v.status = 'completed'
        AND (p_source_platform IS NULL OR v.source_platform = p_source_platform)
        AND (p_start_date IS NULL OR v.transaction_datetime >= p_start_date::timestamptz)
        AND (p_end_date IS NULL OR v.transaction_datetime < (p_end_date::timestamptz + interval '1 day'))
),
ProductData AS (
    -- Extract product info from Xendit transactions
    SELECT
        tft.transaction_id,
        tft.source_platform,
        tft.product_details ->> 'type' AS product_identifier, -- Use 'type' (e.g., 'P2P') as identifier
        tft.product_details ->> 'name' AS product_name,
        1::bigint AS quantity, -- Assume quantity 1 for Xendit
        tft.amount
    FROM TimeFilteredTransactions tft
    WHERE tft.source_platform = 'xendit'

    UNION ALL

    -- Extract product info from Shopify order items (unnesting the JSON array)
    SELECT
        tft.transaction_id,
        tft.source_platform,
        -- Use SKU as primary identifier if available, fallback to product_id::text
        COALESCE(items.item ->> 'sku', items.item ->> 'product_id') AS product_identifier,
        items.item ->> 'name' AS product_name,
        (items.item ->> 'quantity')::bigint AS quantity,
        -- Use line item price * quantity for accurate item revenue before aggregation
        (items.item ->> 'price')::numeric * (items.item ->> 'quantity')::bigint AS amount
    FROM TimeFilteredTransactions tft
    CROSS JOIN LATERAL jsonb_array_elements(tft.product_details) AS items(item) -- Unnest the product_details array
    WHERE tft.source_platform = 'shopify' AND tft.product_details IS NOT NULL AND jsonb_typeof(tft.product_details) = 'array'
)
SELECT
    pd.product_identifier::text,
    pd.product_name::text,
    pd.source_platform::text,
    SUM(pd.amount)::numeric AS total_revenue,
    SUM(pd.quantity)::bigint AS units_sold, -- Sum quantities for Shopify, count for Xendit
    CASE
        WHEN COUNT(DISTINCT pd.transaction_id) > 0 THEN (SUM(pd.amount) / COUNT(DISTINCT pd.transaction_id))::numeric
        ELSE 0::numeric
    END AS average_transaction_value -- ATV based on distinct parent transactions/orders
FROM ProductData pd
GROUP BY pd.source_platform, pd.product_identifier, pd.product_name
ORDER BY pd.source_platform, total_revenue DESC;

$$;


ALTER FUNCTION "public"."get_revenue_by_product"("p_start_date" "text", "p_end_date" "text", "p_source_platform" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_revenue_by_product"("p_start_date" "text", "p_end_date" "text", "p_source_platform" "text") IS 'Aggregates completed transaction revenue by product, handling different product detail structures from Xendit and Shopify within a specified date range and optional source platform filter.';



CREATE OR REPLACE FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text" DEFAULT 'day'::"text", "p_source_platform" "text" DEFAULT NULL::"text") RETURNS TABLE("date" "text", "revenue" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_start_date timestamptz;
    v_end_date timestamptz;
BEGIN
    -- Attempt to cast input dates, handle potential errors if needed
    BEGIN
        v_start_date := p_start_date::timestamptz;
        v_end_date := p_end_date::timestamptz;
    EXCEPTION WHEN others THEN
        -- Handle invalid date format if necessary, e.g., raise exception or return empty set
        RAISE EXCEPTION 'Invalid date format provided. Use ISO 8601 format.';
    END;

    -- Validate granularity
    IF p_granularity NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'Invalid granularity specified. Use ''day'', ''week'', or ''month''.';
    END IF;

    -- Validate source platform
    IF p_source_platform IS NOT NULL AND p_source_platform NOT IN ('xendit', 'shopify') THEN
        RAISE EXCEPTION 'Invalid source platform specified. Use ''xendit'', ''shopify'', or NULL.';
    END IF;

    RETURN QUERY
    SELECT
        to_char(date_trunc(p_granularity, v.transaction_datetime),
            CASE p_granularity
                WHEN 'day' THEN 'YYYY-MM-DD'
                WHEN 'week' THEN 'YYYY-IW' -- ISO Week format
                WHEN 'month' THEN 'YYYY-MM'
                ELSE 'YYYY-MM-DD' -- Default just in case
            END
        ) AS date,
        COALESCE(SUM(v.amount), 0)::numeric AS revenue
    FROM
        public.unified_transactions_view v
    WHERE
        v.status = 'completed' -- Only count completed transactions
        AND v.transaction_datetime >= v_start_date
        AND v.transaction_datetime < v_end_date + interval '1 day' -- Ensure end date is inclusive
        AND (p_source_platform IS NULL OR v.source_platform = p_source_platform)
    GROUP BY
        date_trunc(p_granularity, v.transaction_datetime)
    ORDER BY
        date_trunc(p_granularity, v.transaction_datetime);

END;
$$;


ALTER FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text", "p_source_platform" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text", "p_source_platform" "text") IS 'Aggregates completed transaction revenue from unified_transactions_view by day, week, or month within a specified date range and optional source platform filter.';



CREATE OR REPLACE FUNCTION "public"."get_store_products_with_ratings"("search_term" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "title" "text", "handle" "text", "featured_image_url" "text", "price" numeric, "compare_at_price" numeric, "average_rating" numeric, "review_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.title,
        p.handle,
        p.featured_image_url,
        -- Assuming the first variant's price is the one to use
        (SELECT v.price FROM public.shopify_product_variants v WHERE v.product_id = p.id ORDER BY v.created_at LIMIT 1)::NUMERIC AS price,
        (SELECT v.compare_at_price FROM public.shopify_product_variants v WHERE v.product_id = p.id ORDER BY v.created_at LIMIT 1)::NUMERIC AS compare_at_price,
        -- Calculate average rating and count from approved reviews
        AVG(r.rating) AS average_rating,
        COUNT(r.id)::INT AS review_count
    FROM
        public.shopify_products p
    LEFT JOIN
        public.product_reviews r ON p.id = r.product_id AND r.is_approved = TRUE
    WHERE
        p.status = 'ACTIVE'
        -- Apply search term filter if provided (searching title and description)
        AND (search_term IS NULL OR p.title ILIKE '%' || search_term || '%' OR p.description ILIKE '%' || search_term || '%')
    GROUP BY
        p.id, p.title, p.handle, p.featured_image_url -- Group by product to aggregate reviews
    ORDER BY
        p.created_at DESC; -- Or other desired default sorting
END;
$$;


ALTER FUNCTION "public"."get_store_products_with_ratings"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") RETURNS TABLE("week_start_date" "date", "count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        DATE_TRUNC('week', e.enrolled_at)::date as week_start_date,
        COUNT(e.id) as count
    FROM
        public.enrollments e
    WHERE
        e.course_id = target_course_id
        AND e.enrolled_at >= start_date
        AND e.enrolled_at <= end_date
    GROUP BY
        week_start_date
    ORDER BY
        week_start_date;
$$;


ALTER FUNCTION "public"."get_weekly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_ebook_contacts_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_ebook_contacts_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_fraud_flag_affiliate_suspension"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- NEW.affiliate_id is directly available from the fraud_flags table
    IF NEW.affiliate_id IS NOT NULL THEN
        -- Update the affiliate's status to 'flagged' -- Changed from 'suspended' to 'flagged'
        UPDATE public.affiliates
        SET status = 'flagged',
            updated_at = clock_timestamp() -- Ensure updated_at is also refreshed
        WHERE id = NEW.affiliate_id;
        
        RAISE NOTICE 'Affiliate % status updated to flagged due to fraud flag %', 
                     NEW.affiliate_id, NEW.id;
    ELSE
        RAISE WARNING 'fraud_flag % was inserted without an affiliate_id.', NEW.id;
    END IF;

    RETURN NEW; -- Result is ignored since this is an AFTER trigger
END;
$$;


ALTER FUNCTION "public"."handle_fraud_flag_affiliate_suspension"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO migration_log (step, status, message)
    VALUES ('handle_profile_update','info', CONCAT('Profile updated: ', NEW.email));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_transaction_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.transaction_type = 'P2P' THEN
    INSERT INTO enrollments (id, user_id, course_id, transaction_id, status, enrolled_at)
    SELECT
      gen_random_uuid(), NEW.user_id,
      (SELECT id FROM courses WHERE lower(title) = 'papers to profits' LIMIT 1),
      NEW.id, 'active', NEW.paid_at
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_transaction_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("user_id" "uuid", "required_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id
    AND p.name = required_permission
  );
END;
$$;


ALTER FUNCTION "public"."has_permission"("user_id" "uuid", "required_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment"("x" integer, "row_id" "uuid", "table_name" "text", "column_name" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  current_value integer;
  sql text;
BEGIN
  sql := format('SELECT %I FROM %I WHERE id = $1', column_name, table_name);
  EXECUTE sql INTO current_value USING row_id;
  RETURN current_value + x;
END;
$_$;


ALTER FUNCTION "public"."increment"("x" integer, "row_id" "uuid", "table_name" "text", "column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_campaign_metric"("p_campaign_id" "uuid", "p_metric_name" "text", "p_increment_value" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  column_name TEXT;
  query TEXT;
BEGIN
  -- Map metric name to column name to prevent SQL injection from p_metric_name
  CASE p_metric_name
    WHEN 'opens' THEN column_name := 'total_opens';
    WHEN 'clicks' THEN column_name := 'total_clicks';
    WHEN 'bounces' THEN column_name := 'total_bounces';
    WHEN 'deliveries' THEN column_name := 'total_delivered'; -- Assuming Postmark 'Delivery' event maps here
    WHEN 'spam_complaints' THEN column_name := 'total_spam_complaints';
    WHEN 'unsubscribes' THEN column_name := 'total_unsubscribes';
    WHEN 'sent' THEN column_name := 'total_sent'; -- For completeness, though usually set by batch processor
    WHEN 'failed' THEN column_name := 'total_failed'; -- For completeness
    ELSE
      RAISE EXCEPTION 'Invalid metric name: %', p_metric_name;
  END CASE;

  query := format(
    'UPDATE public.campaign_analytics SET %I = %I + %s WHERE campaign_id = %L',
    column_name, 
    column_name, 
    p_increment_value,
    p_campaign_id
  );
  
  --RAISE NOTICE 'Executing query: %', query; -- For debugging
  EXECUTE query;

  -- If the campaign_analytics row doesn't exist, this won't do anything.
  -- Consider an UPSERT or an INSERT if not found, but for webhooks, 
  -- the row should ideally be created when the campaign is finalized or first email sent.
  -- The checkAndFinalizeCampaigns function already does an UPSERT for some metrics.
END;
$$;


ALTER FUNCTION "public"."increment_campaign_metric"("p_campaign_id" "uuid", "p_metric_name" "text", "p_increment_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT auth.uid() IN (
      SELECT id FROM auth.users WHERE (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb" DEFAULT NULL::"jsonb", "p_new_state" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Insert the audit log entry
  INSERT INTO admin_audit_log (
    admin_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    previous_state,
    new_state,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_previous_state,
    p_new_state,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb", "p_new_state" "jsonb", "p_ip_address" "text", "p_user_agent" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb", "p_new_state" "jsonb", "p_ip_address" "text", "p_user_agent" "text") IS 'Helper function for recording administrative actions in the audit log';



CREATE OR REPLACE FUNCTION "public"."log_environment_switch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only log when is_active changes to true
    IF NEW.is_active = true AND OLD.is_active = false THEN
        INSERT INTO environment_switch_log (
            from_environment, 
            to_environment, 
            switched_by, 
            notes
        ) VALUES (
            (SELECT environment_name FROM environment_config WHERE is_active = false),
            NEW.environment_name,
            current_user,
            'Environment switch triggered'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_environment_switch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text" DEFAULT NULL::"text", "p_resource_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Insert the activity log entry
  INSERT INTO user_activity_log (
    user_id,
    activity_type,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_session_id
  ) RETURNING id INTO v_log_id;
  
  -- If this is a login activity, update the user's login statistics
  IF p_activity_type = 'login' THEN
    UPDATE unified_profiles
    SET 
      last_login_at = now(),
      login_count = COALESCE(login_count, 0) + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_session_id" "text") IS 'Helper function for recording user activities and updating login statistics';



CREATE OR REPLACE FUNCTION "public"."migrate_profiles"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO unified_profiles (id, email, first_name, last_name, tags, acquisition_source, created_at, updated_at)
  SELECT
    COALESCE(u.id, gen_random_uuid()),
    COALESCE(s.email, x.email),
    s.first_name,
    s.last_name,
    s.tags_arr,
    CASE
      WHEN s.tags_arr && ARRAY['squeeze'] THEN 'squeeze'
      WHEN s.tags_arr && ARRAY['canva'] THEN 'canva'
      ELSE NULL
    END,
    COALESCE(s.registered_ts, x.created_ts),
    now()
  FROM (
    SELECT
      lower(trim("Email")) AS email,
      max("Date Registered") AS registered_ts,
      max(trim("First name")) AS first_name,
      max(trim("Last name")) AS last_name,
      coalesce(array_remove(array_agg(DISTINCT trim("Tag")), ''), ARRAY[]::text[]) AS tags_arr
    FROM systemeio
    WHERE "Email" IS NOT NULL
    GROUP BY lower(trim("Email"))
  ) AS s
  FULL JOIN (
    SELECT
      lower(trim("Email")) AS email,
      max("Created Timestamp"::timestamptz) AS created_ts
    FROM xendit
    WHERE "Email" IS NOT NULL
    GROUP BY lower(trim("Email"))
  ) AS x ON s.email = x.email
  LEFT JOIN auth.users u ON lower(trim(u.email)) = COALESCE(s.email, x.email)
  ON CONFLICT (email) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        tags = EXCLUDED.tags,
        acquisition_source = EXCLUDED.acquisition_source,
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."migrate_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_profiles_upsert"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  WITH deduped AS (
    SELECT DISTINCT ON (u.id)
      u.id,
      lower(trim(u.email)) AS email,
      s."First name",
      s."Last name",
      NULL AS phone,
      string_to_array(s."Tag", ',') AS tags,
      CASE
        WHEN s."Tag" ILIKE '%squeeze%' THEN 'squeeze'
        WHEN s."Tag" ILIKE '%canva%' THEN 'canva'
        ELSE NULL
      END AS acquisition_source,
      COALESCE(s."Date Registered", now()) AS created_at,
      now() AS updated_at
    FROM auth.users u
    LEFT JOIN systemeio s ON lower(trim(s."Email")) = lower(trim(u.email))
    ORDER BY u.id, s."Date Registered" DESC NULLS LAST
  )
  INSERT INTO unified_profiles (id, email, first_name, last_name, phone, tags, acquisition_source, created_at, updated_at)
  SELECT * FROM deduped
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    tags = excluded.tags,
    acquisition_source = excluded.acquisition_source,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."migrate_profiles_upsert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_transactions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  WITH latest AS (
    SELECT * FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY x."External ID" ORDER BY x."Created Timestamp" DESC) AS rn
      FROM xendit x WHERE x."External ID" IS NOT NULL
    ) t WHERE rn = 1
  )
  INSERT INTO transactions (id, user_id, amount, currency, status, transaction_type, payment_method, external_id, created_at, paid_at, settled_at, expires_at)
  SELECT
    gen_random_uuid(),
    p.id,
    lt."Amount",
    lt."Currency",
    CASE lt."Status"
      WHEN 'PAID' THEN 'completed'
      WHEN 'SETTLED' THEN 'completed'
      WHEN 'UNPAID' THEN 'pending'
      WHEN 'EXPIRED' THEN 'expired'
      ELSE 'pending'
    END,
    CASE lt."Description"
      WHEN 'Papers to Profits Learning Fee' THEN 'P2P'
      WHEN 'Canva Ebook' THEN 'Canva'
      ELSE 'Other'
    END,
    lt."Payment Method",
    lt."External ID",
    lt."Created Timestamp"::timestamptz,
    lt."Paid Timestamp"::timestamptz,
    lt."Settled Timestamp"::timestamptz,
    lt."Expiry Date"::timestamptz
  FROM latest lt
  JOIN unified_profiles p ON lower(trim(lt."Email")) = p.email
  ON CONFLICT (external_id) DO UPDATE
    SET status = EXCLUDED.status,
        transaction_type = EXCLUDED.transaction_type,
        paid_at = EXCLUDED.paid_at,
        settled_at = EXCLUDED.settled_at,
        expires_at = EXCLUDED.expires_at;
END;
$$;


ALTER FUNCTION "public"."migrate_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_transactions_upsert"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO transactions (
    user_id, amount, currency, status, transaction_type, payment_method, external_id,
    created_at, paid_at, settled_at, expires_at
  )
  SELECT
    p.id,
    x."Amount",
    x."Currency",
    CASE x."Status"
      WHEN 'PAID' THEN 'completed'
      WHEN 'SETTLED' THEN 'completed'
      WHEN 'UNPAID' THEN 'pending'
      WHEN 'EXPIRED' THEN 'expired'
      ELSE 'pending' END,
    CASE
      WHEN x."Description" ILIKE '%papers to profits%' THEN 'P2P'
      WHEN x."Description" ILIKE '%canva%' THEN 'Canva'
      ELSE 'Other' END,
    x."Payment Method",
    x."External ID",
    nullif(x."Created Timestamp", '')::timestamptz,
    nullif(x."Paid Timestamp", '')::timestamptz,
    nullif(x."Settled Timestamp", '')::timestamptz,
    nullif(x."Expiry Date", '')::timestamptz
  FROM xendit x
  JOIN unified_profiles p ON lower(trim(x."Email")) = p.email
  WHERE p.id IS NOT NULL AND x."External ID" IS NOT NULL
  ON CONFLICT (external_id) DO UPDATE SET
    user_id = excluded.user_id,
    amount = excluded.amount,
    currency = excluded.currency,
    status = excluded.status,
    transaction_type = excluded.transaction_type,
    payment_method = excluded.payment_method,
    created_at = excluded.created_at,
    paid_at = excluded.paid_at,
    settled_at = excluded.settled_at,
    expires_at = excluded.expires_at;
END;
$$;


ALTER FUNCTION "public"."migrate_transactions_upsert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_lesson"("p_lesson_id" "uuid", "p_target_module_id" "uuid", "p_new_position" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_source_module_id UUID;
  v_lesson_title TEXT;
  v_lesson RECORD;
BEGIN
  -- Start a transaction
  BEGIN
    -- Get the current module_id of the lesson
    SELECT module_id, title INTO v_source_module_id, v_lesson_title
    FROM lessons
    WHERE id = p_lesson_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lesson with ID % not found', p_lesson_id;
    END IF;
    
    -- If the lesson is already in the target module, just update its position
    IF v_source_module_id = p_target_module_id THEN
      -- Update the lesson position
      UPDATE lessons
      SET 
        position = p_new_position,
        updated_at = NOW()
      WHERE 
        id = p_lesson_id;
      
      -- Reorder other lessons in the module
      UPDATE lessons
      SET 
        position = position + 1,
        updated_at = NOW()
      WHERE 
        module_id = p_target_module_id
        AND id != p_lesson_id
        AND position >= p_new_position;
    ELSE
      -- Move the lesson to the new module and set its position
      UPDATE lessons
      SET 
        module_id = p_target_module_id,
        position = p_new_position,
        updated_at = NOW()
      WHERE 
        id = p_lesson_id;
      
      -- Reorder other lessons in the target module
      UPDATE lessons
      SET 
        position = position + 1,
        updated_at = NOW()
      WHERE 
        module_id = p_target_module_id
        AND id != p_lesson_id
        AND position >= p_new_position;
      
      -- Reorder lessons in the source module to close the gap
      UPDATE lessons
      SET 
        position = position - 1,
        updated_at = NOW()
      WHERE 
        module_id = v_source_module_id
        AND position > (
          SELECT position FROM lessons WHERE id = p_lesson_id
        );
    END IF;
    
    -- Commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      ROLLBACK;
      RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."move_lesson"("p_lesson_id" "uuid", "p_target_module_id" "uuid", "p_new_position" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_all_prod_tables"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  operation_id uuid;
  profiles_count integer := 0;
  transactions_count integer := 0;
  enrollments_count integer := 0;
  p2p_course_id uuid;
  start_time timestamptz := now();
BEGIN
  -- Create operation log entry
  INSERT INTO population_operation_log (operation_name, table_name, started_at, status)
  VALUES ('full_production_population_corrected', 'all_prod_tables', start_time, 'started')
  RETURNING id INTO operation_id;
  
  -- Get Papers to Profits course ID
  SELECT id INTO p2p_course_id FROM courses WHERE title = 'Papers to Profits' LIMIT 1;
  IF p2p_course_id IS NULL THEN
    RAISE EXCEPTION 'Papers to Profits course not found';
  END IF;
  
  -- STEP 1: Populate unified_profiles_prod (using DISTINCT ON to handle multiple payments per customer)
  WITH customer_profiles AS (
    SELECT DISTINCT ON (au.id)
      au.id as user_id,
      lower(trim(au.email)) as email,
      COALESCE(s."First name", split_part(x."Customer Name", ' ', 1)) as first_name,
      COALESCE(s."Last name", split_part(x."Customer Name", ' ', 2)) as last_name,
      NULL as phone,
      CASE WHEN s."Tag" IS NOT NULL THEN string_to_array(s."Tag", ',') ELSE NULL END as tags,
      CASE 
        WHEN s."Tag" ILIKE '%squeeze%' THEN 'squeeze'
        WHEN s."Tag" ILIKE '%canva%' THEN 'canva'
        ELSE 'direct'
      END as acquisition_source,
      COALESCE(
        s."Date Registered", 
        CASE WHEN x."Created Timestamp" IS NOT NULL AND x."Created Timestamp" != '' 
             THEN x."Created Timestamp"::timestamptz 
             ELSE au.created_at END
      ) as created_at,
      now() as updated_at
    FROM auth.users au
    JOIN xendit x ON lower(trim(x."Email")) = lower(trim(au.email))
      AND x."Status" IN ('PAID', 'SETTLED') 
      AND x."Description" = 'Papers to Profits Learning Fee'
    LEFT JOIN systemeio s ON lower(trim(s."Email")) = lower(trim(au.email))
    ORDER BY au.id, x."Paid Timestamp" DESC NULLS LAST -- Use most recent payment for profile
  )
  INSERT INTO unified_profiles_prod (
    id, email, first_name, last_name, phone, tags, acquisition_source, created_at, updated_at
  )
  SELECT * FROM customer_profiles
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    tags = EXCLUDED.tags,
    acquisition_source = EXCLUDED.acquisition_source,
    updated_at = now();
    
  GET DIAGNOSTICS profiles_count = ROW_COUNT;
  
  -- STEP 2: Populate ALL transactions_prod from Xendit P2P payments (can have multiple per customer)
  INSERT INTO transactions_prod (
    user_id, amount, currency, status, transaction_type, payment_method, 
    external_id, created_at, paid_at, settled_at, contact_email
  )
  SELECT
    up.id as user_id,
    x."Amount"::numeric / 100.0,
    COALESCE(x."Currency", 'PHP') as currency,
    CASE x."Status"
      WHEN 'PAID' THEN 'completed'
      WHEN 'SETTLED' THEN 'completed'
      WHEN 'UNPAID' THEN 'pending'
      WHEN 'EXPIRED' THEN 'expired'
      ELSE 'pending'
    END as status,
    'P2P' as transaction_type,
    x."Payment Method",
    x."External ID",
    CASE WHEN x."Created Timestamp" IS NOT NULL AND x."Created Timestamp" != '' 
         THEN x."Created Timestamp"::timestamptz ELSE NULL END,
    CASE WHEN x."Paid Timestamp" IS NOT NULL AND x."Paid Timestamp" != '' 
         THEN x."Paid Timestamp"::timestamptz ELSE NULL END,
    CASE WHEN x."Settled Timestamp" IS NOT NULL AND x."Settled Timestamp" != '' 
         THEN x."Settled Timestamp"::timestamptz ELSE NULL END,
    lower(trim(x."Email"))
  FROM xendit x
  JOIN unified_profiles_prod up ON lower(trim(x."Email")) = up.email
  WHERE x."External ID" IS NOT NULL
    AND x."Status" IN ('PAID', 'SETTLED', 'UNPAID', 'EXPIRED')
    AND x."Description" = 'Papers to Profits Learning Fee'
  ON CONFLICT (external_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    updated_at = now();
    
  GET DIAGNOSTICS transactions_count = ROW_COUNT;
  
  -- STEP 3: Generate enrollments_prod (one per customer, using latest completed transaction)
  WITH latest_completed_transactions AS (
    SELECT DISTINCT ON (user_id)
      user_id,
      id as transaction_id,
      COALESCE(paid_at, created_at) as enrolled_at
    FROM transactions_prod 
    WHERE status = 'completed' 
      AND transaction_type = 'P2P'
    ORDER BY user_id, paid_at DESC NULLS LAST
  )
  INSERT INTO enrollments_prod (
    user_id, course_id, transaction_id, status, enrolled_at
  )
  SELECT
    user_id,
    p2p_course_id,
    transaction_id,
    'active' as status,
    enrolled_at
  FROM latest_completed_transactions
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    transaction_id = EXCLUDED.transaction_id,
    enrolled_at = EXCLUDED.enrolled_at;
    
  GET DIAGNOSTICS enrollments_count = ROW_COUNT;
  
  -- Update operation log
  UPDATE population_operation_log
  SET 
    status = 'success',
    completed_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - start_time))::integer * 1000,
    records_processed = profiles_count,
    details = jsonb_build_object(
      'profiles_populated', profiles_count,
      'transactions_populated', transactions_count,
      'enrollments_created', enrollments_count,
      'total_customers', profiles_count,
      'business_workflow', 'CORRECTED: Real Papers to Profits customer sync with proper duplicate handling'
    )
  WHERE id = operation_id;
  
  -- Return results following REAL business metrics
  RETURN jsonb_build_object(
    'success', true,
    'operation_id', operation_id,
    'FULLY_CORRECTED', jsonb_build_object(
      'understanding', 'Now correctly follows Papers to Profits business workflow',
      'customer_count', profiles_count || ' actual paying customers',
      'transaction_count', transactions_count || ' total P2P payment transactions',
      'enrollment_count', enrollments_count || ' course enrollments granted'
    ),
    'business_metrics', jsonb_build_object(
      'paying_customers', profiles_count,
      'total_p2p_transactions', transactions_count,
      'active_enrollments', enrollments_count,
      'conversion_rate', ROUND((profiles_count::numeric / 14942.0) * 100, 2) || '% of leads became paying customers',
      'average_transactions_per_customer', ROUND(transactions_count::numeric / NULLIF(profiles_count, 0), 2)
    ),
    'corrected_data_flow', jsonb_build_object(
      'source_identification', 'Xendit Papers to Profits Learning Fee payments only',
      'customer_matching', 'Match existing auth.users by email with Xendit payments',
      'profile_unification', 'Merge Systemeio lead data with payment data',
      'transaction_processing', 'All P2P payment transactions (multiple per customer allowed)',
      'enrollment_granting', 'One enrollment per customer using latest completed transaction'
    ),
    'timestamp', now()
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE population_operation_log
  SET 
    status = 'error',
    completed_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - start_time))::integer * 1000,
    error_message = SQLERRM,
    error_details = jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
  WHERE id = operation_id;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'operation_id', operation_id,
    'timestamp', now()
  );
END;
$$;


ALTER FUNCTION "public"."populate_all_prod_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_transactions_prod"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    operation_id uuid;
    start_time timestamptz;
    inserted_count INTEGER := 0;
    temp_count INTEGER;
    error_count INTEGER := 0;
    result jsonb;
    source_counts jsonb := '{}'::jsonb;
BEGIN
    -- Start operation logging
    start_time := now();
    INSERT INTO population_operation_log (operation_name, table_name, status)
    VALUES ('populate_transactions_prod', 'transactions_prod', 'started')
    RETURNING id INTO operation_id;
    
    BEGIN
        -- Clear existing data in production table
        DELETE FROM transactions_prod;
        
        -- Process Xendit transactions
        BEGIN
            WITH inserted AS (
                INSERT INTO transactions_prod (
                    id, user_id, amount, currency, status, payment_method,
                    created_at, updated_at, transaction_type, external_id,
                    paid_at, settled_at, expires_at, metadata, contact_email
                )
                SELECT 
                    gen_random_uuid() AS id,
                    up.id AS user_id,
                    (x."Amount"::numeric / 100) AS amount, -- Convert from cents
                    x."Currency"::text,
                    CASE 
                        WHEN x."Status" = 'PAID' THEN 'paid'
                        WHEN x."Status" = 'SETTLED' THEN 'settled'
                        ELSE 'pending'
                    END::text AS status,
                    'xendit'::text AS payment_method,
                    COALESCE(x."Created Timestamp"::timestamptz, now()) AS created_at,
                    now() AS updated_at,
                    'payment'::text AS transaction_type,
                    x."External ID"::text,
                    COALESCE(x."Paid Timestamp"::timestamptz, x."Created Timestamp"::timestamptz) AS paid_at,
                    NULLIF(x."Settled Timestamp", '')::timestamptz AS settled_at,
                    NULLIF(x."Expiry Date", '')::timestamptz AS expires_at,
                    jsonb_build_object(
                        'source', 'xendit',
                        'xendit_external_id', x."External ID",
                        'original_status', x."Status"
                    ) AS metadata,
                    x."Email"::text AS contact_email
                FROM xendit x
                LEFT JOIN unified_profiles_prod up ON x."Email" = up.email
                WHERE x."Status" IN ('PAID', 'SETTLED')
                  AND x."Amount" IS NOT NULL
                  AND x."Amount" > 0
                  AND x."Email" IS NOT NULL
                  AND x."External ID" IS NOT NULL
                ON CONFLICT (external_id) DO NOTHING
                RETURNING id
            )
            SELECT COUNT(*) INTO temp_count FROM inserted;
            inserted_count := inserted_count + temp_count;
            source_counts := jsonb_set(source_counts, '{xendit}', to_jsonb(temp_count));
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            source_counts := jsonb_set(source_counts, '{xendit_error}', to_jsonb(SQLERRM));
        END;
        
        -- Process Shopify transactions
        BEGIN
            WITH inserted AS (
                INSERT INTO transactions_prod (
                    id, user_id, amount, currency, status, payment_method,
                    created_at, updated_at, transaction_type, external_id,
                    paid_at, metadata, contact_email
                )
                SELECT 
                    gen_random_uuid() AS id,
                    up.id AS user_id,
                    so.total_price::numeric AS amount,
                    lower(so.currency)::text AS currency,
                    'paid'::text AS status,
                    'shopify'::text AS payment_method,
                    so.created_at,
                    so.updated_at,
                    'payment'::text AS transaction_type,
                    so.order_number::text AS external_id,
                    so.processed_at AS paid_at,
                    jsonb_build_object(
                        'source', 'shopify',
                        'shopify_order_id', so.shopify_order_id,
                        'financial_status', so.financial_status
                    ) AS metadata,
                    COALESCE(so.email, up.email)::text AS contact_email
                FROM shopify_orders so
                LEFT JOIN unified_profiles_prod up ON so.email = up.email
                WHERE so.financial_status = 'paid'
                  AND so.total_price IS NOT NULL
                  AND so.total_price > 0
                  AND so.order_number IS NOT NULL
                ON CONFLICT (external_id) DO NOTHING
                RETURNING id
            )
            SELECT COUNT(*) INTO temp_count FROM inserted;
            inserted_count := inserted_count + temp_count;
            source_counts := jsonb_set(source_counts, '{shopify}', to_jsonb(temp_count));
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            source_counts := jsonb_set(source_counts, '{shopify_error}', to_jsonb(SQLERRM));
        END;
        
        -- Build result
        result := jsonb_build_object(
            'status', CASE WHEN error_count = 0 THEN 'success' ELSE 'partial_success' END,
            'inserted', inserted_count,
            'total_processed', inserted_count,
            'errors', error_count,
            'source_breakdown', source_counts,
            'table', 'transactions_prod'
        );
        
        -- Update operation log
        UPDATE population_operation_log 
        SET 
            status = CASE WHEN error_count = 0 THEN 'success' ELSE 'partial_success' END,
            records_processed = inserted_count,
            details = result,
            completed_at = now(),
            duration_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000
        WHERE id = operation_id;
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'status', 'error',
            'error', SQLERRM,
            'table', 'transactions_prod'
        );
        
        UPDATE population_operation_log 
        SET 
            status = 'error',
            error_message = SQLERRM,
            completed_at = now(),
            duration_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000
        WHERE id = operation_id;
        
        RETURN result;
    END;
END;
$$;


ALTER FUNCTION "public"."populate_transactions_prod"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_unified_profiles_prod"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    operation_id uuid;
    start_time timestamptz;
    inserted_count INTEGER := 0;
    updated_count INTEGER := 0;
    temp_count INTEGER;
    error_count INTEGER := 0;
    result jsonb;
    source_counts jsonb := '{}'::jsonb;
BEGIN
    -- Start operation logging
    start_time := now();
    INSERT INTO population_operation_log (operation_name, table_name, status)
    VALUES ('populate_unified_profiles_prod', 'unified_profiles_prod', 'started')
    RETURNING id INTO operation_id;
    
    BEGIN
        -- Clear existing data in production table
        DELETE FROM unified_profiles_prod;
        
        -- Process Xendit data (note: Xendit table doesn't have user_id, we need to create UUIDs)
        BEGIN
            WITH inserted AS (
                INSERT INTO unified_profiles_prod (
                    id, email, first_name, last_name, phone, tags, acquisition_source,
                    created_at, updated_at, status, admin_metadata, email_marketing_subscribed
                )
                SELECT 
                    gen_random_uuid() AS id, -- Generate UUID since Xendit doesn't have user_id
                    x."Email",
                    SPLIT_PART(x."Customer Name", ' ', 1) AS first_name, -- Extract first name
                    CASE 
                        WHEN position(' ' in x."Customer Name") > 0 
                        THEN substring(x."Customer Name" from position(' ' in x."Customer Name") + 1)
                        ELSE NULL 
                    END AS last_name, -- Extract last name
                    x."Customer Mobile Number",
                    ARRAY[]::TEXT[] AS tags,
                    'xendit' AS acquisition_source,
                    COALESCE(x."Created Timestamp"::timestamptz, now()) AS created_at,
                    now() AS updated_at,
                    'active' AS status,
                    jsonb_build_object('source', 'xendit', 'external_id', x."External ID") AS admin_metadata,
                    TRUE AS email_marketing_subscribed
                FROM xendit x
                WHERE 
                    x."Status" IN ('PAID', 'SETTLED')
                    AND x."Email" IS NOT NULL
                    AND x."Email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' -- Basic email validation
                ON CONFLICT (email) DO NOTHING -- Use email as conflict resolution since we don't have UUIDs
                RETURNING id
            )
            SELECT COUNT(*) INTO temp_count FROM inserted;
            inserted_count := inserted_count + temp_count;
            source_counts := jsonb_set(source_counts, '{xendit}', to_jsonb(temp_count));
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            source_counts := jsonb_set(source_counts, '{xendit_error}', to_jsonb(SQLERRM));
        END;
        
        -- Process Systemeio data
        BEGIN
            WITH upserted AS (
                INSERT INTO unified_profiles_prod (
                    id, email, first_name, last_name, tags, acquisition_source,
                    created_at, updated_at, status, admin_metadata, email_marketing_subscribed
                )
                SELECT 
                    gen_random_uuid() AS id,
                    s."Email",
                    s."First name",
                    s."Last name",
                    CASE WHEN s."Tag" IS NOT NULL THEN ARRAY[s."Tag"] ELSE ARRAY[]::TEXT[] END AS tags,
                    'systemeio' AS acquisition_source,
                    s."Date Registered" AS created_at,
                    now() AS updated_at,
                    'active' AS status,
                    jsonb_build_object('source', 'systemeio') AS admin_metadata,
                    TRUE AS email_marketing_subscribed
                FROM systemeio s
                WHERE 
                    s."Email" IS NOT NULL
                    AND s."Email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
                ON CONFLICT (email) DO 
                UPDATE SET
                    first_name = COALESCE(EXCLUDED.first_name, unified_profiles_prod.first_name),
                    last_name = COALESCE(EXCLUDED.last_name, unified_profiles_prod.last_name),
                    updated_at = GREATEST(EXCLUDED.updated_at, unified_profiles_prod.updated_at),
                    admin_metadata = unified_profiles_prod.admin_metadata || EXCLUDED.admin_metadata
                RETURNING id
            )
            SELECT COUNT(*) INTO temp_count FROM upserted;
            updated_count := updated_count + temp_count;
            source_counts := jsonb_set(source_counts, '{systemeio}', to_jsonb(temp_count));
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            source_counts := jsonb_set(source_counts, '{systemeio_error}', to_jsonb(SQLERRM));
        END;
        
        -- Process Shopify data (join with customers table for names)
        BEGIN
            WITH upserted AS (
                INSERT INTO unified_profiles_prod (
                    id, email, first_name, last_name, phone, tags, acquisition_source,
                    created_at, updated_at, status, admin_metadata, email_marketing_subscribed
                )
                SELECT 
                    COALESCE(sc.unified_profile_id, gen_random_uuid()) AS id, -- Use existing or generate new
                    COALESCE(sc.email, so.email) AS email,
                    sc.first_name,
                    sc.last_name,
                    COALESCE(sc.phone, so.phone) AS phone,
                    COALESCE(sc.tags, ARRAY[]::TEXT[]) AS tags,
                    'shopify' AS acquisition_source,
                    so.created_at,
                    so.updated_at,
                    'active' AS status,
                    jsonb_build_object('source', 'shopify', 'external_id', so.id) AS admin_metadata,
                    COALESCE(sc.accepts_marketing, TRUE) AS email_marketing_subscribed
                FROM shopify_orders so
                JOIN shopify_customers sc ON so.customer_id = sc.id
                WHERE 
                    so.financial_status = 'paid'
                    AND COALESCE(sc.email, so.email) IS NOT NULL
                    AND COALESCE(sc.email, so.email) ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
                ON CONFLICT (email) DO 
                UPDATE SET
                    first_name = COALESCE(EXCLUDED.first_name, unified_profiles_prod.first_name),
                    last_name = COALESCE(EXCLUDED.last_name, unified_profiles_prod.last_name),
                    phone = COALESCE(EXCLUDED.phone, unified_profiles_prod.phone),
                    updated_at = GREATEST(EXCLUDED.updated_at, unified_profiles_prod.updated_at),
                    admin_metadata = unified_profiles_prod.admin_metadata || EXCLUDED.admin_metadata
                RETURNING id
            )
            SELECT COUNT(*) INTO temp_count FROM upserted;
            updated_count := updated_count + temp_count;
            source_counts := jsonb_set(source_counts, '{shopify}', to_jsonb(temp_count));
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            source_counts := jsonb_set(source_counts, '{shopify_error}', to_jsonb(SQLERRM));
        END;
        
        -- Build result
        result := jsonb_build_object(
            'status', CASE WHEN error_count = 0 THEN 'success' ELSE 'partial_success' END,
            'inserted', inserted_count,
            'updated', updated_count,
            'total_processed', inserted_count + updated_count,
            'errors', error_count,
            'source_breakdown', source_counts,
            'table', 'unified_profiles_prod'
        );
        
        -- Update operation log
        UPDATE population_operation_log 
        SET 
            status = CASE WHEN error_count = 0 THEN 'success' ELSE 'partial_success' END,
            records_processed = inserted_count + updated_count,
            details = result,
            completed_at = now(),
            duration_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000
        WHERE id = operation_id;
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle any unexpected errors
        result := jsonb_build_object(
            'status', 'error',
            'error', SQLERRM,
            'table', 'unified_profiles_prod'
        );
        
        UPDATE population_operation_log 
        SET 
            status = 'error',
            error_message = SQLERRM,
            completed_at = now(),
            duration_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000
        WHERE id = operation_id;
        
        RETURN result;
    END;
END;
$_$;


ALTER FUNCTION "public"."populate_unified_profiles_prod"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_lock"("p_key" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    DELETE FROM public.email_processing_locks 
    WHERE lock_key = p_key 
    RETURNING 1 INTO v_rows_affected;
    
    RETURN (v_rows_affected > 0);
END;
$$;


ALTER FUNCTION "public"."release_lock"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_lessons"("p_module_id" "uuid", "p_lesson_order" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lesson_record RECORD;
BEGIN
  -- Start a transaction
  BEGIN
    -- Loop through each lesson in the order
    FOR lesson_record IN SELECT * FROM jsonb_array_elements(p_lesson_order)
    LOOP
      -- Update the lesson position
      UPDATE lessons
      SET 
        position = (lesson_record.value->>'position')::INT,
        updated_at = NOW()
      WHERE 
        id = (lesson_record.value->>'id')::UUID
        AND module_id = p_module_id;
      
      -- Check if the update affected a row
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Lesson with ID % not found in module %', 
          (lesson_record.value->>'id')::UUID, p_module_id;
      END IF;
    END LOOP;
    
    -- Commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      ROLLBACK;
      RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."reorder_lessons"("p_module_id" "uuid", "p_lesson_order" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_modules"("p_course_id" "uuid", "p_module_order" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  module_record RECORD;
BEGIN
  -- Start a transaction
  BEGIN
    -- Loop through each module in the order
    FOR module_record IN SELECT * FROM jsonb_array_elements(p_module_order)
    LOOP
      -- Update the module position
      UPDATE modules
      SET 
        position = (module_record.value->>'position')::INT,
        updated_at = NOW()
      WHERE 
        id = (module_record.value->>'id')::UUID
        AND course_id = p_course_id;
      
      -- Check if the update affected a row
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Module with ID % not found in course %', 
          (module_record.value->>'id')::UUID, p_course_id;
      END IF;
    END LOOP;
    
    -- Commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      ROLLBACK;
      RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."reorder_modules"("p_course_id" "uuid", "p_module_order" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_table_name"("base_table_name" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT CASE 
        WHEN get_current_environment() = 'production' 
        THEN base_table_name || '_prod'
        ELSE base_table_name || '_dev'
    END;
$$;


ALTER FUNCTION "public"."resolve_table_name"("base_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_users"("p_search_term" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_acquisition_source" "text" DEFAULT NULL::"text", "p_created_after" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_before" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_has_transactions" boolean DEFAULT NULL::boolean, "p_has_enrollments" boolean DEFAULT NULL::boolean, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "phone" "text", "avatar_url" "text", "tags" "text"[], "acquisition_source" "text", "status" "text", "admin_metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_login_at" timestamp with time zone, "login_count" integer, "transaction_count" bigint, "enrollment_count" bigint, "total_spent" numeric, "email_bounced" boolean, "email_engagement_score" numeric, "last_email_activity" timestamp with time zone, "email_delivered_count" bigint, "email_opened_count" bigint, "email_clicked_count" bigint, "email_bounced_count" bigint, "email_open_rate" numeric, "email_click_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT
      up.id,
      COUNT(DISTINCT t.id) AS transaction_count,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COALESCE(SUM(t.amount), 0) AS total_spent
    FROM
      unified_profiles up
      LEFT JOIN transactions t ON up.id = t.user_id
      LEFT JOIN enrollments e ON up.id = e.user_id
    GROUP BY
      up.id
  ),
  email_stats AS (
    SELECT
      ee.user_id,
      COUNT(CASE WHEN ee.event_type = 'delivered' THEN 1 END) AS delivered_count,
      COUNT(CASE WHEN ee.event_type = 'opened' THEN 1 END) AS opened_count,
      COUNT(CASE WHEN ee.event_type = 'clicked' THEN 1 END) AS clicked_count,
      COUNT(CASE WHEN ee.event_type = 'bounced' THEN 1 END) AS bounced_count,
      MAX(CASE WHEN ee.event_type IN ('delivered', 'opened', 'clicked') THEN ee.created_at END) AS last_activity
    FROM
      email_events ee
    GROUP BY
      ee.user_id
  )
  SELECT
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.phone,
    NULL::TEXT AS avatar_url, -- Not available in unified_profiles
    up.tags,
    up.acquisition_source,
    up.status,
    up.admin_metadata,
    up.created_at,
    up.updated_at,
    up.last_login_at,
    up.login_count,
    COALESCE(uc.transaction_count, 0) AS transaction_count,
    COALESCE(uc.enrollment_count, 0) AS enrollment_count,
    COALESCE(uc.total_spent, 0) AS total_spent,
    up.email_bounced,
    -- Calculate engagement score: (opens + clicks * 2) / delivered * 100
    CASE 
      WHEN COALESCE(es.delivered_count, 0) = 0 THEN 0
      ELSE ROUND(
        ((COALESCE(es.opened_count, 0) + COALESCE(es.clicked_count, 0) * 2) * 100.0) / 
        GREATEST(es.delivered_count, 1), 
        2
      )
    END AS email_engagement_score,
    es.last_activity AS last_email_activity,
    COALESCE(es.delivered_count, 0) AS email_delivered_count,
    COALESCE(es.opened_count, 0) AS email_opened_count,
    COALESCE(es.clicked_count, 0) AS email_clicked_count,
    COALESCE(es.bounced_count, 0) AS email_bounced_count,
    -- Calculate open rate: opens / delivered * 100
    CASE 
      WHEN COALESCE(es.delivered_count, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(es.opened_count, 0) * 100.0) / es.delivered_count, 2)
    END AS email_open_rate,
    -- Calculate click rate: clicks / delivered * 100
    CASE 
      WHEN COALESCE(es.delivered_count, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(es.clicked_count, 0) * 100.0) / es.delivered_count, 2)
    END AS email_click_rate
  FROM
    unified_profiles up
    JOIN user_counts uc ON up.id = uc.id
    LEFT JOIN email_stats es ON up.id = es.user_id
  WHERE
    (p_search_term IS NULL OR 
     up.email ILIKE '%' || p_search_term || '%' OR
     up.first_name ILIKE '%' || p_search_term || '%' OR
     up.last_name ILIKE '%' || p_search_term || '%' OR
     (up.first_name || ' ' || up.last_name) ILIKE '%' || p_search_term || '%')
    AND (p_status IS NULL OR up.status = p_status)
    AND (p_tags IS NULL OR up.tags @> p_tags)
    AND (p_acquisition_source IS NULL OR up.acquisition_source = p_acquisition_source)
    AND (p_created_after IS NULL OR up.created_at >= p_created_after)
    AND (p_created_before IS NULL OR up.created_at <= p_created_before)
    AND (p_has_transactions IS NULL OR 
         (p_has_transactions = true AND uc.transaction_count > 0) OR
         (p_has_transactions = false AND uc.transaction_count = 0))
    AND (p_has_enrollments IS NULL OR 
         (p_has_enrollments = true AND uc.enrollment_count > 0) OR
         (p_has_enrollments = false AND uc.enrollment_count = 0))
  ORDER BY
    up.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_users"("p_search_term" "text", "p_status" "text", "p_tags" "text"[], "p_acquisition_source" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_has_transactions" boolean, "p_has_enrollments" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_environment"("target_env" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result text;
BEGIN
    -- Validate environment
    IF target_env NOT IN ('production', 'development') THEN
        RAISE EXCEPTION 'Invalid environment: %. Must be production or development', target_env;
    END IF;
    
    -- Update environment configuration
    UPDATE environment_config SET is_active = false WHERE is_active = true;
    UPDATE environment_config SET is_active = true WHERE environment_name = target_env;
    
    result := 'Environment switched to: ' || target_env;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."switch_environment"("target_env" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_environment_and_set_session"("target_env" "text", "switch_notes" "text" DEFAULT 'Switch triggered via RPC'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  log_id INTEGER;
  from_env TEXT;
  switched_by_value TEXT := 'System'; -- default value, never null
BEGIN
  -- Try to get current user's email; if not available, keep default
  BEGIN
    SELECT email INTO switched_by_value FROM auth.users WHERE id = auth.uid();
    IF switched_by_value IS NULL THEN
      switched_by_value := 'System';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      switched_by_value := 'System';
  END;

  -- Get current environment
  SELECT environment_name INTO from_env
  FROM public.environment_config
  WHERE is_active = true
  LIMIT 1;

  -- Deactivate active env
  UPDATE public.environment_config
  SET is_active = false
  WHERE is_active = true;

  -- Activate target
  UPDATE public.environment_config
  SET is_active = true
  WHERE environment_name = target_env;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid environment name: %', target_env;
  END IF;

  -- set session var
  PERFORM set_config('app.environment', target_env, false);

  -- log
  INSERT INTO public.environment_switch_log (from_environment, to_environment, notes, switched_by)
  VALUES (from_env, target_env, switch_notes, switched_by_value)
  RETURNING id INTO log_id;

  RETURN 'Switched environment from ' || COALESCE(from_env,'N/A') || ' to ' || target_env || '. Log ID: ' || log_id;
END;
$$;


ALTER FUNCTION "public"."switch_environment_and_set_session"("target_env" "text", "switch_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_affiliate_clicks_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO affiliate_clicks_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            affiliate_id = EXCLUDED.affiliate_id,
            visitor_id = EXCLUDED.visitor_id,
            ip_address = EXCLUDED.ip_address,
            user_agent = EXCLUDED.user_agent,
            referral_url = EXCLUDED.referral_url,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            utm_params = EXCLUDED.utm_params,
            user_agent_details = EXCLUDED.user_agent_details,
            landing_page_url = EXCLUDED.landing_page_url,
            sub_id = EXCLUDED.sub_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE affiliate_clicks_dev
        SET 
            affiliate_id = NEW.affiliate_id,
            visitor_id = NEW.visitor_id,
            ip_address = NEW.ip_address,
            user_agent = NEW.user_agent,
            referral_url = NEW.referral_url,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at,
            utm_params = NEW.utm_params,
            user_agent_details = NEW.user_agent_details,
            landing_page_url = NEW.landing_page_url,
            sub_id = NEW.sub_id
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM affiliate_clicks_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_affiliate_clicks_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_affiliate_conversions_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO affiliate_conversions_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            affiliate_id = EXCLUDED.affiliate_id,
            click_id = EXCLUDED.click_id,
            order_id = EXCLUDED.order_id,
            gmv = EXCLUDED.gmv,
            commission_amount = EXCLUDED.commission_amount,
            level = EXCLUDED.level,
            status = EXCLUDED.status,
            cleared_at = EXCLUDED.cleared_at,
            paid_at = EXCLUDED.paid_at,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            sub_id = EXCLUDED.sub_id,
            status_history = EXCLUDED.status_history,
            payout_id = EXCLUDED.payout_id,
            clearing_reason = EXCLUDED.clearing_reason,
            auto_cleared = EXCLUDED.auto_cleared;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE affiliate_conversions_dev
        SET 
            affiliate_id = NEW.affiliate_id,
            click_id = NEW.click_id,
            order_id = NEW.order_id,
            gmv = NEW.gmv,
            commission_amount = NEW.commission_amount,
            level = NEW.level,
            status = NEW.status,
            cleared_at = NEW.cleared_at,
            paid_at = NEW.paid_at,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at,
            sub_id = NEW.sub_id,
            status_history = NEW.status_history,
            payout_id = NEW.payout_id,
            clearing_reason = NEW.clearing_reason,
            auto_cleared = NEW.auto_cleared
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM affiliate_conversions_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_affiliate_conversions_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_affiliates_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO affiliates_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            user_id = EXCLUDED.user_id,
            slug = EXCLUDED.slug,
            parent_affiliate = EXCLUDED.parent_affiliate,
            status = EXCLUDED.status,
            commission_rate = EXCLUDED.commission_rate,
            is_member = EXCLUDED.is_member,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            payout_method = EXCLUDED.payout_method,
            bank_code = EXCLUDED.bank_code,
            bank_name = EXCLUDED.bank_name,
            account_number = EXCLUDED.account_number,
            account_holder_name = EXCLUDED.account_holder_name,
            phone_number = EXCLUDED.phone_number,
            bank_account_verified = EXCLUDED.bank_account_verified,
            bank_verification_date = EXCLUDED.bank_verification_date,
            gcash_number = EXCLUDED.gcash_number,
            gcash_name = EXCLUDED.gcash_name,
            gcash_verified = EXCLUDED.gcash_verified,
            gcash_verification_date = EXCLUDED.gcash_verification_date;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE affiliates_dev
        SET 
            user_id = NEW.user_id,
            slug = NEW.slug,
            parent_affiliate = NEW.parent_affiliate,
            status = NEW.status,
            commission_rate = NEW.commission_rate,
            is_member = NEW.is_member,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at,
            payout_method = NEW.payout_method,
            bank_code = NEW.bank_code,
            bank_name = NEW.bank_name,
            account_number = NEW.account_number,
            account_holder_name = NEW.account_holder_name,
            phone_number = NEW.phone_number,
            bank_account_verified = NEW.bank_account_verified,
            bank_verification_date = NEW.bank_verification_date,
            gcash_number = NEW.gcash_number,
            gcash_name = NEW.gcash_name,
            gcash_verified = NEW.gcash_verified,
            gcash_verification_date = NEW.gcash_verification_date
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM affiliates_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_affiliates_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_all_user_tags_from_unified_profiles"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  managed_tag_ids UUID[];
  summary_json JSONB;
  deleted_count INTEGER := 0;
  inserted_count INTEGER := 0;
BEGIN
  managed_tag_ids := ARRAY[
    'ee077154-fb1e-44d8-a16a-8ea33ca3f1f1', -- Canva Interest
    '5cc77891-a563-4651-a0d0-bef67951a15d', -- Canva Purchase
    'f125358c-1807-4cb1-b426-5c38cab59e62', -- P2P Purchase
    'ed664cd5-5cb0-4bca-a95e-85e8664f4955', -- P2P Enrolled
    'ba01d974-d5f0-4584-9aef-abfffb419065', -- FB Invite Sent
    '019feb2f-7f5b-4862-a21b-b131ebf81592', -- Course Invite Sent
    '8a7cc0c0-acee-4bcf-a961-5d7fb9541f46', -- Email Invite Sent
    'ed439a1f-6e83-4d35-b563-ff2e6e5cebcf', -- Imported from Systeme.io
    '040ad8d6-1dda-4f53-9d37-30e38b9e03b3', -- Squeeze Page Lead
    '7d0422ea-01e6-4678-b591-60f64e43a640'  -- Test Tag
  ];

  -- Step 1: Create a temporary table with the desired state
  CREATE TEMP TABLE desired_user_tags_temp AS
  WITH user_old_tags_cte AS (
    SELECT
      up.id AS user_id,
      LOWER(unnest(up.tags)) AS old_tag_name
    FROM
      public.unified_profiles up
    WHERE
      up.tags IS NOT NULL AND array_length(up.tags, 1) > 0
  ),
  mapped_new_tags_cte AS (
    SELECT
      uot_cte.user_id,
      uot_cte.old_tag_name,
      CASE
        WHEN uot_cte.old_tag_name IN ('canva') THEN 'ee077154-fb1e-44d8-a16a-8ea33ca3f1f1'::uuid
        WHEN uot_cte.old_tag_name IN ('paidcanva') THEN '5cc77891-a563-4651-a0d0-bef67951a15d'::uuid
        WHEN uot_cte.old_tag_name IN ('paidp2p') THEN 'f125358c-1807-4cb1-b426-5c38cab59e62'::uuid
        WHEN uot_cte.old_tag_name = 'enrolled p2p' THEN 'ed664cd5-5cb0-4bca-a95e-85e8664f4955'::uuid
        WHEN uot_cte.old_tag_name IN ('fbinvitesent') THEN 'ba01d974-d5f0-4584-9aef-abfffb419065'::uuid
        WHEN uot_cte.old_tag_name IN ('invitedtocourse') THEN '019feb2f-7f5b-4862-a21b-b131ebf81592'::uuid
        WHEN uot_cte.old_tag_name = 'inviteemail' THEN '8a7cc0c0-acee-4bcf-a961-5d7fb9541f46'::uuid
        WHEN uot_cte.old_tag_name = 'imported' THEN 'ed439a1f-6e83-4d35-b563-ff2e6e5cebcf'::uuid
        WHEN uot_cte.old_tag_name = 'squeeze' THEN '040ad8d6-1dda-4f53-9d37-30e38b9e03b3'::uuid
        WHEN uot_cte.old_tag_name = 'testtag' THEN '7d0422ea-01e6-4678-b591-60f64e43a640'::uuid
        ELSE NULL
      END AS new_tag_id
    FROM
      user_old_tags_cte uot_cte
  )
  SELECT
    mnt_cte.user_id,
    mnt_cte.new_tag_id
  FROM
    mapped_new_tags_cte mnt_cte
  WHERE
    mnt_cte.new_tag_id IS NOT NULL;

  -- Step 2: Delete tags from user_tags that are in our managed set but no longer desired
  WITH deleted_tags AS (
    DELETE FROM public.user_tags ut
    WHERE ut.tag_id = ANY(managed_tag_ids)
      AND NOT EXISTS (
        SELECT 1
        FROM desired_user_tags_temp dut
        WHERE dut.user_id = ut.user_id AND dut.new_tag_id = ut.tag_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM deleted_tags;

  -- Step 3: Insert new/updated associations from the desired state
  WITH inserted_tags AS (
    INSERT INTO public.user_tags (user_id, tag_id)
    SELECT user_id, new_tag_id FROM desired_user_tags_temp
    ON CONFLICT (user_id, tag_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO inserted_count FROM inserted_tags;

  -- Step 4: Clean up temp table
  DROP TABLE desired_user_tags_temp;

  summary_json := jsonb_build_object(
    'deleted_count', deleted_count,
    'inserted_count', inserted_count,
    'status', 'success'
  );

  RETURN summary_json;

EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      -- Attempt to drop temp table even on error, if it exists
      DROP TABLE IF EXISTS desired_user_tags_temp;
    EXCEPTION
      WHEN OTHERS THEN
        -- Do nothing if drop fails
    END;
    summary_json := jsonb_build_object(
      'deleted_count', deleted_count, -- Might be partially complete
      'inserted_count', inserted_count, -- Might be partially complete
      'status', 'error',
      'error_message', SQLERRM,
      'error_details', SQLSTATE
    );
    RETURN summary_json;
END;
$$;


ALTER FUNCTION "public"."sync_all_user_tags_from_unified_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ebook_contacts_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ebook_contacts_dev VALUES (NEW.*) 
        ON CONFLICT (email) DO UPDATE 
        SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            metadata = EXCLUDED.metadata,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ebook_contacts_dev
        SET 
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            phone = NEW.phone,
            metadata = NEW.metadata,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at
        WHERE email = NEW.email;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM ebook_contacts_dev WHERE email = OLD.email;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_ebook_contacts_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ecommerce_order_items_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ecommerce_order_items_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            order_id = EXCLUDED.order_id,
            product_id = EXCLUDED.product_id,
            quantity = EXCLUDED.quantity,
            price_at_purchase = EXCLUDED.price_at_purchase,
            currency = EXCLUDED.currency,
            product_snapshot = EXCLUDED.product_snapshot,
            created_at = EXCLUDED.created_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ecommerce_order_items_dev
        SET 
            order_id = NEW.order_id,
            product_id = NEW.product_id,
            quantity = NEW.quantity,
            price_at_purchase = NEW.price_at_purchase,
            currency = NEW.currency,
            product_snapshot = NEW.product_snapshot,
            created_at = NEW.created_at
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM ecommerce_order_items_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_ecommerce_order_items_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ecommerce_orders_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ecommerce_orders_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            user_id = EXCLUDED.user_id,
            unified_profile_id = EXCLUDED.unified_profile_id,
            order_status = EXCLUDED.order_status,
            total_amount = EXCLUDED.total_amount,
            currency = EXCLUDED.currency,
            payment_method = EXCLUDED.payment_method,
            xendit_payment_id = EXCLUDED.xendit_payment_id,
            transaction_id = EXCLUDED.transaction_id,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE ecommerce_orders_dev
        SET 
            user_id = NEW.user_id,
            unified_profile_id = NEW.unified_profile_id,
            order_status = NEW.order_status,
            total_amount = NEW.total_amount,
            currency = NEW.currency,
            payment_method = NEW.payment_method,
            xendit_payment_id = NEW.xendit_payment_id,
            transaction_id = NEW.transaction_id,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM ecommerce_orders_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_ecommerce_orders_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_enrollments_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO enrollments_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            user_id = EXCLUDED.user_id,
            course_id = EXCLUDED.course_id,
            transaction_id = EXCLUDED.transaction_id,
            status = EXCLUDED.status,
            enrolled_at = EXCLUDED.enrolled_at,
            expires_at = EXCLUDED.expires_at,
            last_accessed_at = EXCLUDED.last_accessed_at,
            metadata = EXCLUDED.metadata;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE enrollments_dev
        SET 
            user_id = NEW.user_id,
            course_id = NEW.course_id,
            transaction_id = NEW.transaction_id,
            status = NEW.status,
            enrolled_at = NEW.enrolled_at,
            expires_at = NEW.expires_at,
            last_accessed_at = NEW.last_accessed_at,
            metadata = NEW.metadata
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM enrollments_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_enrollments_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_fraud_flags_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO fraud_flags_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            affiliate_id = EXCLUDED.affiliate_id,
            reason = EXCLUDED.reason,
            details = EXCLUDED.details,
            created_at = EXCLUDED.created_at,
            resolved = EXCLUDED.resolved,
            resolved_at = EXCLUDED.resolved_at,
            resolver_notes = EXCLUDED.resolver_notes,
            updated_at = EXCLUDED.updated_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE fraud_flags_dev
        SET 
            affiliate_id = NEW.affiliate_id,
            reason = NEW.reason,
            details = NEW.details,
            created_at = NEW.created_at,
            resolved = NEW.resolved,
            resolved_at = NEW.resolved_at,
            resolver_notes = NEW.resolver_notes,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM fraud_flags_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_fraud_flags_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_is_student_from_enrollments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_user_id UUID;
  active_enrollments_count INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    SELECT COUNT(*)
    INTO active_enrollments_count
    FROM public.enrollments
    WHERE user_id = OLD.user_id AND status = 'active';

    IF active_enrollments_count > 0 THEN
      UPDATE public.unified_profiles SET is_student = true WHERE id = OLD.user_id;
    ELSE
      UPDATE public.unified_profiles SET is_student = false WHERE id = OLD.user_id;
    END IF;
  END IF;

  SELECT COUNT(*)
  INTO active_enrollments_count
  FROM public.enrollments
  WHERE user_id = target_user_id AND status = 'active';

  IF active_enrollments_count > 0 THEN
    UPDATE public.unified_profiles SET is_student = true WHERE id = target_user_id;
  ELSE
    UPDATE public.unified_profiles SET is_student = false WHERE id = target_user_id;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_is_student_from_enrollments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_new_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM migrate_profiles();
  PERFORM migrate_transactions();
  PERFORM generate_enrollments();
END;
$$;


ALTER FUNCTION "public"."sync_new_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Merge logic: upsert from both sources, normalize email, tags, etc.
  -- Conflict resolution: Systemeio for profile, Xendit for payment info
  -- Audit logging for all changes
END;
$$;


ALTER FUNCTION "public"."sync_profile_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_purchase_leads_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO purchase_leads_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            product_type = EXCLUDED.product_type,
            status = EXCLUDED.status,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            xendit_external_id = EXCLUDED.xendit_external_id,
            source_page = EXCLUDED.source_page,
            utm_source = EXCLUDED.utm_source,
            utm_medium = EXCLUDED.utm_medium,
            utm_campaign = EXCLUDED.utm_campaign,
            metadata = EXCLUDED.metadata,
            submitted_at = EXCLUDED.submitted_at,
            last_activity_at = EXCLUDED.last_activity_at,
            converted_at = EXCLUDED.converted_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE purchase_leads_dev
        SET 
            email = NEW.email,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            phone = NEW.phone,
            product_type = NEW.product_type,
            status = NEW.status,
            amount = NEW.amount,
            currency = NEW.currency,
            xendit_external_id = NEW.xendit_external_id,
            source_page = NEW.source_page,
            utm_source = NEW.utm_source,
            utm_medium = NEW.utm_medium,
            utm_campaign = NEW.utm_campaign,
            metadata = NEW.metadata,
            submitted_at = NEW.submitted_at,
            last_activity_at = NEW.last_activity_at,
            converted_at = NEW.converted_at
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM purchase_leads_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_purchase_leads_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_transactions_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO transactions_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            user_id = EXCLUDED.user_id,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            payment_method = EXCLUDED.payment_method,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            transaction_type = EXCLUDED.transaction_type,
            external_id = EXCLUDED.external_id,
            paid_at = EXCLUDED.paid_at,
            settled_at = EXCLUDED.settled_at,
            expires_at = EXCLUDED.expires_at,
            metadata = EXCLUDED.metadata,
            contact_email = EXCLUDED.contact_email;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE transactions_dev
        SET 
            user_id = NEW.user_id,
            amount = NEW.amount,
            currency = NEW.currency,
            status = NEW.status,
            payment_method = NEW.payment_method,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at,
            transaction_type = NEW.transaction_type,
            external_id = NEW.external_id,
            paid_at = NEW.paid_at,
            settled_at = NEW.settled_at,
            expires_at = NEW.expires_at,
            metadata = NEW.metadata,
            contact_email = NEW.contact_email
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM transactions_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_transactions_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_unified_profile_from_affiliate_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.user_id IS NOT NULL THEN
      UPDATE public.unified_profiles
      SET affiliate_id = NEW.id,
          affiliate_general_status = NEW.status,
          is_affiliate = (NEW.status = 'active')
      WHERE id = NEW.user_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      IF OLD.user_id IS DISTINCT FROM NEW.user_id AND OLD.user_id IS NOT NULL THEN
        UPDATE public.unified_profiles
        SET affiliate_id = NULL,
            affiliate_general_status = NULL,
            is_affiliate = false
        WHERE id = OLD.user_id;
      END IF;
      IF NEW.user_id IS NOT NULL THEN
        UPDATE public.unified_profiles
        SET affiliate_id = NEW.id,
            affiliate_general_status = NEW.status,
            is_affiliate = (NEW.status = 'active')
        WHERE id = NEW.user_id;
      END IF;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.user_id IS NOT NULL THEN
      UPDATE public.unified_profiles
      SET affiliate_id = NULL,
          affiliate_general_status = NULL,
          is_affiliate = false
      WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_unified_profile_from_affiliate_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_unified_profiles_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO unified_profiles_dev VALUES (NEW.*) 
        ON CONFLICT (id) DO UPDATE 
        SET 
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            tags = EXCLUDED.tags,
            acquisition_source = EXCLUDED.acquisition_source,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            status = EXCLUDED.status,
            admin_metadata = EXCLUDED.admin_metadata,
            last_login_at = EXCLUDED.last_login_at,
            login_count = EXCLUDED.login_count,
            email_bounced = EXCLUDED.email_bounced,
            email_spam_complained = EXCLUDED.email_spam_complained,
            email_last_spam_at = EXCLUDED.email_last_spam_at,
            email_marketing_subscribed = EXCLUDED.email_marketing_subscribed,
            affiliate_id = EXCLUDED.affiliate_id,
            affiliate_general_status = EXCLUDED.affiliate_general_status,
            membership_level_id = EXCLUDED.membership_level_id,
            is_student = EXCLUDED.is_student,
            is_affiliate = EXCLUDED.is_affiliate,
            is_admin = EXCLUDED.is_admin,
            tier_assignment_notes = EXCLUDED.tier_assignment_notes;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE unified_profiles_dev
        SET 
            email = NEW.email,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            phone = NEW.phone,
            tags = NEW.tags,
            acquisition_source = NEW.acquisition_source,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at,
            status = NEW.status,
            admin_metadata = NEW.admin_metadata,
            last_login_at = NEW.last_login_at,
            login_count = NEW.login_count,
            email_bounced = NEW.email_bounced,
            email_spam_complained = NEW.email_spam_complained,
            email_last_spam_at = NEW.email_last_spam_at,
            email_marketing_subscribed = NEW.email_marketing_subscribed,
            affiliate_id = NEW.affiliate_id,
            affiliate_general_status = NEW.affiliate_general_status,
            membership_level_id = NEW.membership_level_id,
            is_student = NEW.is_student,
            is_affiliate = NEW.is_affiliate,
            is_admin = NEW.is_admin,
            tier_assignment_notes = NEW.tier_assignment_notes
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM unified_profiles_dev WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_unified_profiles_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_tags_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_tags_dev VALUES (NEW.*) 
        ON CONFLICT (user_id, tag_id) DO UPDATE 
        SET 
            assigned_at = EXCLUDED.assigned_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE user_tags_dev
        SET 
            assigned_at = NEW.assigned_at
        WHERE user_id = NEW.user_id AND tag_id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM user_tags_dev WHERE user_id = OLD.user_id AND tag_id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_user_tags_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_fraud_flags_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_fraud_flags_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_affiliate_status_on_fraud_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.affiliates
  SET status = 'flagged'
  WHERE id = NEW.affiliate_id;
  RETURN NEW; -- Result is ignored for AFTER trigger, but good practice
END;
$$;


ALTER FUNCTION "public"."update_affiliate_status_on_fraud_flag"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_affiliate_status_on_fraud_flag"() IS 'Trigger function to update an affiliate''s status to ''flagged'' when a new record is inserted into the fraud_flags table for that affiliate.';



CREATE OR REPLACE FUNCTION "public"."update_api_cache_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_api_cache_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_course_id UUID;
    total_modules INT;
    completed_modules INT;
    total_lessons INT;
    completed_lessons INT;
    new_percentage NUMERIC;
BEGIN
    -- Get the course_id for the module
    SELECT modules.course_id INTO v_course_id
    FROM public.modules
    WHERE modules.id = NEW.module_id;
    
    IF v_course_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total modules in the course
    SELECT COUNT(*) INTO total_modules
    FROM public.modules
    WHERE modules.course_id = v_course_id;
    
    -- Count modules with 100% progress for the user in this course
    SELECT COUNT(*) INTO completed_modules
    FROM public.module_progress
    JOIN public.modules ON module_progress.module_id = modules.id
    WHERE modules.course_id = v_course_id
    AND module_progress.user_id = NEW.user_id
    AND module_progress.progress_percentage >= 100;
    
    -- Count total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = v_course_id;
    
    -- Count completed lessons for the user in this course
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
    AND m.course_id = v_course_id
    AND up.status = 'completed';
    
    -- Calculate new progress percentage based on lessons (not modules)
    IF total_lessons > 0 THEN
        new_percentage := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    ELSE
        new_percentage := 0;
    END IF;
    
    -- Update or insert course progress
    INSERT INTO public.course_progress (
        user_id,
        course_id,
        progress_percentage,
        last_accessed_at,
        completed_at
    )
    VALUES (
        NEW.user_id,
        v_course_id,
        new_percentage,
        NOW(),
        CASE WHEN new_percentage >= 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        progress_percentage = new_percentage,
        last_accessed_at = NOW(),
        completed_at = CASE WHEN new_percentage >= 100 THEN NOW() ELSE course_progress.completed_at END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_progress_from_lesson"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_course_id UUID;
    total_lessons INT;
    completed_lessons INT;
    new_percentage NUMERIC;
BEGIN
    -- Get the course_id for the lesson
    SELECT m.course_id INTO v_course_id
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE l.id = NEW.lesson_id;
    
    IF v_course_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = v_course_id;
    
    -- Count completed lessons for the user in this course
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
    AND m.course_id = v_course_id
    AND up.status = 'completed';
    
    -- Calculate new progress percentage
    IF total_lessons > 0 THEN
        new_percentage := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    ELSE
        new_percentage := 0;
    END IF;
    
    -- Update or insert course progress
    INSERT INTO public.course_progress (
        user_id,
        course_id,
        progress_percentage,
        last_accessed_at,
        completed_at
    )
    VALUES (
        NEW.user_id,
        v_course_id,
        new_percentage,
        NOW(),
        CASE WHEN new_percentage >= 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        progress_percentage = new_percentage,
        last_accessed_at = NOW(),
        completed_at = CASE WHEN new_percentage >= 100 THEN NOW() ELSE course_progress.completed_at END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_progress_from_lesson"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_positions"("module_updates" "jsonb"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- First, temporarily move all modules to negative positions to avoid conflicts
  UPDATE modules
  SET position = -position - 1000000
  WHERE id = ANY(SELECT (jsonb_array_elements(module_updates)->>'id')::uuid);

  -- Then update each module with its new position
  FOR i IN 1..array_length(module_updates, 1) LOOP
    UPDATE modules
    SET 
      position = (module_updates[i]->>'position')::integer,
      updated_at = (module_updates[i]->>'updated_at')::timestamptz
    WHERE id = (module_updates[i]->>'id')::uuid;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_module_positions"("module_updates" "jsonb"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_temp_position integer;
  v_update jsonb;
BEGIN
  -- Start a transaction
  BEGIN
    -- First, move all affected modules to temporary positions to avoid conflicts
    v_temp_position := -1000000;
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
      UPDATE modules
      SET position = v_temp_position
      WHERE id = (v_update->>'id')::uuid
      AND course_id = p_course_id;
      
      v_temp_position := v_temp_position + 1;
    END LOOP;

    -- Then update each module with its new position
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
      UPDATE modules
      SET 
        position = (v_update->>'position')::integer,
        updated_at = now()
      WHERE id = (v_update->>'id')::uuid
      AND course_id = p_course_id;
    END LOOP;

    -- If any errors occur, the transaction will be rolled back
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update module positions: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_temp_position integer;
  v_update jsonb;
BEGIN
  -- Start a transaction
  BEGIN
    -- First, move all affected modules to temporary positions to avoid conflicts
    v_temp_position := -1000000;
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
      UPDATE modules
      SET position = v_temp_position
      WHERE id = (v_update->>'id')::uuid
      AND course_id = p_course_id;
      
      v_temp_position := v_temp_position + 1;
    END LOOP;

    -- Then update each module with its new position
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
      UPDATE modules
      SET 
        position = (v_update->>'position')::integer,
        updated_at = now()
      WHERE id = (v_update->>'id')::uuid
      AND course_id = p_course_id;
    END LOOP;

    -- If any errors occur, the transaction will be rolled back
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update module positions: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_module_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_module_id UUID;
    total_lessons INT;
    completed_lessons INT;
    new_percentage NUMERIC;
BEGIN
    -- Get the module_id for the lesson
    SELECT modules.id INTO v_module_id
    FROM public.lessons
    JOIN public.modules ON lessons.module_id = modules.id
    WHERE lessons.id = NEW.lesson_id;
    
    IF v_module_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total lessons in the module
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons
    WHERE lessons.module_id = v_module_id;
    
    -- Count completed lessons for the user in this module
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress
    JOIN public.lessons ON user_progress.lesson_id = lessons.id
    WHERE lessons.module_id = v_module_id
    AND user_progress.user_id = NEW.user_id
    AND user_progress.status = 'completed';
    
    -- Calculate new progress percentage
    IF total_lessons > 0 THEN
        new_percentage := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    ELSE
        new_percentage := 0;
    END IF;
    
    -- Update or insert module progress
    INSERT INTO public.module_progress (
        user_id,
        module_id,
        progress_percentage,
        last_accessed_at,
        completed_at
    )
    VALUES (
        NEW.user_id,
        v_module_id,
        new_percentage,
        NOW(),
        CASE WHEN new_percentage >= 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, module_id) 
    DO UPDATE SET
        progress_percentage = new_percentage,
        last_accessed_at = NOW(),
        completed_at = CASE WHEN new_percentage >= 100 THEN NOW() ELSE module_progress.completed_at END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_module_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_revenue_metrics"() RETURNS TABLE("month" "date", "total_revenue" numeric, "avg_transaction_value" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('month', paid_at) AS month,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_transaction_value
  FROM transactions
  WHERE status = 'completed'
  GROUP BY month;
END;
$$;


ALTER FUNCTION "public"."update_revenue_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_progress"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_status" "text", "p_progress_percentage" numeric, "p_last_position" numeric, "p_completed_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert the record, or update it if it exists
  INSERT INTO user_progress(
    user_id, 
    lesson_id, 
    status, 
    progress_percentage, 
    last_position, 
    completed_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id, 
    p_lesson_id, 
    p_status, 
    p_progress_percentage, 
    p_last_position, 
    p_completed_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    progress_percentage = EXCLUDED.progress_percentage,
    last_position = EXCLUDED.last_position,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW()
  RETURNING to_jsonb(user_progress.*) INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."upsert_user_progress"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_status" "text", "p_progress_percentage" numeric, "p_last_position" numeric, "p_completed_at" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "devcopy"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "status" "text" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "enrollments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'pending'::"text"])))
);


ALTER TABLE "devcopy"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "devcopy"."unified_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "tags" "text"[],
    "acquisition_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "admin_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_login_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "email_bounced" boolean DEFAULT false NOT NULL,
    "email_spam_complained" boolean DEFAULT false,
    "email_last_spam_at" timestamp with time zone,
    "email_marketing_subscribed" boolean DEFAULT true NOT NULL,
    "affiliate_id" "uuid",
    "affiliate_general_status" "public"."affiliate_status_type",
    "membership_level_id" "uuid",
    "is_student" boolean DEFAULT false NOT NULL,
    "is_affiliate" boolean DEFAULT false NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "tier_assignment_notes" "text",
    CONSTRAINT "unified_profiles_email_check" CHECK (("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))
);


ALTER TABLE "devcopy"."unified_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "devcopy"."unified_profiles"."status" IS 'User account status (active, suspended, etc.)';



COMMENT ON COLUMN "devcopy"."unified_profiles"."admin_metadata" IS 'JSON metadata for administrative use';



COMMENT ON COLUMN "devcopy"."unified_profiles"."last_login_at" IS 'Timestamp of the user''s last login';



COMMENT ON COLUMN "devcopy"."unified_profiles"."login_count" IS 'Count of user logins';



COMMENT ON COLUMN "devcopy"."unified_profiles"."email_bounced" IS 'Indicates if an email sent to the user has hard bounced.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."email_marketing_subscribed" IS 'Indicates if the user is subscribed to marketing emails.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."affiliate_id" IS 'Direct link to the affiliates record if this user is an affiliate. Enforces 1-to-1 relationship.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."affiliate_general_status" IS 'Mirrors the status from the affiliates table for quick checks. Kept in sync by a trigger.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."is_student" IS 'Flag indicating if the user has an active student enrollment.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."is_affiliate" IS 'Flag indicating if the user is an active affiliate.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."is_admin" IS 'Flag indicating if the user has admin privileges.';



COMMENT ON COLUMN "devcopy"."unified_profiles"."tier_assignment_notes" IS 'Notes about the tier assignment, including reasons for manual upgrades or downgrades';



CREATE TABLE IF NOT EXISTS "public"."Account" (
    "id" integer NOT NULL,
    "userId" integer NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "providerAccountId" "text" NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" integer,
    "token_type" "text",
    "scope" "text",
    "id_token" "text",
    "session_state" "text"
);


ALTER TABLE "public"."Account" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Account_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Account_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Account_id_seq" OWNED BY "public"."Account"."id";



CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" integer NOT NULL,
    "sessionToken" "text" NOT NULL,
    "userId" integer NOT NULL,
    "expires" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Session" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Session_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."Session_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Session_id_seq" OWNED BY "public"."Session"."id";



CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" integer NOT NULL,
    "name" "text",
    "email" "text",
    "emailVerified" timestamp(3) without time zone,
    "image" "text",
    "password" "text"
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."User_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."User_id_seq" OWNED BY "public"."User"."id";



CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
    "identifier" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."VerificationToken" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "expires_at" timestamp with time zone,
    "capabilities" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_ads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "adset_id" "uuid",
    "fb_ad_id" "text" NOT NULL,
    "name" "text",
    "status" "text",
    "effective_status" "text",
    "creative_id" "text",
    "creative_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ad_ads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_adsets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "fb_adset_id" "text" NOT NULL,
    "name" "text",
    "status" "text",
    "effective_status" "text",
    "daily_budget" numeric,
    "lifetime_budget" numeric,
    "targeting_summary" "text",
    "start_time" timestamp with time zone,
    "stop_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ad_adsets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_attributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "transaction_id" "uuid",
    "campaign_id" "uuid",
    "adset_id" "uuid",
    "ad_id" "uuid",
    "conversion_event" "text" NOT NULL,
    "event_time" timestamp with time zone NOT NULL,
    "conversion_value" numeric,
    "currency" "text",
    "source_platform" "text" DEFAULT 'facebook'::"text" NOT NULL,
    "fb_click_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ad_attributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fb_campaign_id" "text" NOT NULL,
    "name" "text",
    "objective" "text",
    "status" "text",
    "effective_status" "text",
    "start_time" timestamp with time zone,
    "stop_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ad_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_spend" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "campaign_id" "uuid",
    "adset_id" "uuid",
    "ad_id" "uuid",
    "spend" numeric NOT NULL,
    "impressions" integer,
    "clicks" integer,
    "currency" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ad_spend" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" bigint NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_user_id" "uuid",
    "target_user_id" "uuid",
    "target_entity_id" "text",
    "activity_type" "public"."activity_log_type" NOT NULL,
    "description" "text" NOT NULL,
    "details" "jsonb",
    "ip_address" "inet"
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_activity_log" IS 'Stores a log of administrative actions performed in the system for audit and activity feed purposes.';



COMMENT ON COLUMN "public"."admin_activity_log"."admin_user_id" IS 'The admin user who performed the action. Null if system-generated or admin user deleted.';



COMMENT ON COLUMN "public"."admin_activity_log"."target_user_id" IS 'The user profile affected by the action (e.g., an affiliate).';



COMMENT ON COLUMN "public"."admin_activity_log"."target_entity_id" IS 'ID of the primary entity affected by the action (e.g., affiliate_id, fraud_flag_id, setting_name).';



COMMENT ON COLUMN "public"."admin_activity_log"."details" IS 'Structured data about the event, like old/new values for a setting change.';



ALTER TABLE "public"."admin_activity_log" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."admin_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "previous_state" "jsonb",
    "new_state" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_audit_log" IS 'Audit trail for administrative actions';



COMMENT ON COLUMN "public"."admin_audit_log"."admin_id" IS 'The admin who performed the action';



COMMENT ON COLUMN "public"."admin_audit_log"."user_id" IS 'The user affected by the action (if applicable)';



COMMENT ON COLUMN "public"."admin_audit_log"."action_type" IS 'Type of action performed (create, update, delete, etc.)';



COMMENT ON COLUMN "public"."admin_audit_log"."entity_type" IS 'Type of entity affected (user, enrollment, transaction, etc.)';



COMMENT ON COLUMN "public"."admin_audit_log"."entity_id" IS 'ID of the entity affected';



COMMENT ON COLUMN "public"."admin_audit_log"."previous_state" IS 'JSON representation of the entity state before the action';



COMMENT ON COLUMN "public"."admin_audit_log"."new_state" IS 'JSON representation of the entity state after the action';



COMMENT ON COLUMN "public"."admin_audit_log"."ip_address" IS 'IP address of the admin who performed the action';



COMMENT ON COLUMN "public"."admin_audit_log"."user_agent" IS 'User agent of the admin who performed the action';



CREATE TABLE IF NOT EXISTS "public"."admin_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_entity_type" "text" NOT NULL,
    "target_entity_id" "uuid" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "verification_type" "text" NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_verifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_verifications" IS 'Stores records of administrative verifications for various entities like payouts or applications.';



COMMENT ON COLUMN "public"."admin_verifications"."target_entity_type" IS 'Type of the entity being verified (e.g., ''payout'', ''affiliate_application'').';



COMMENT ON COLUMN "public"."admin_verifications"."target_entity_id" IS 'ID of the entity being verified.';



COMMENT ON COLUMN "public"."admin_verifications"."admin_user_id" IS 'ID of the admin user performing the verification (references unified_profiles.id).';



COMMENT ON COLUMN "public"."admin_verifications"."verification_type" IS 'Specific type of verification performed (e.g., ''initial_approval'', ''final_confirmation'').';



COMMENT ON COLUMN "public"."admin_verifications"."is_verified" IS 'Boolean status indicating if the verification was successful/confirmed.';



COMMENT ON COLUMN "public"."admin_verifications"."notes" IS 'Optional notes provided by the admin during verification.';



COMMENT ON COLUMN "public"."admin_verifications"."verified_at" IS 'Timestamp when the verification was completed.';



CREATE TABLE IF NOT EXISTS "public"."affiliate_bank_validations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid",
    "payout_method" "text" NOT NULL,
    "bank_code" "text",
    "account_number" "text" NOT NULL,
    "account_holder_name" "text" NOT NULL,
    "phone_number" "text",
    "validation_status" "text",
    "validation_response" "jsonb",
    "validated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "affiliate_bank_validations_validation_status_check" CHECK (("validation_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'failed'::"text", 'name_mismatch'::"text"])))
);


ALTER TABLE "public"."affiliate_bank_validations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "visitor_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "referral_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "utm_params" "jsonb",
    "user_agent_details" "jsonb",
    "landing_page_url" "text",
    "sub_id" "text"
);


ALTER TABLE "public"."affiliate_clicks" OWNER TO "postgres";


COMMENT ON TABLE "public"."affiliate_clicks" IS 'Tracks clicks generated by affiliate links.';



COMMENT ON COLUMN "public"."affiliate_clicks"."visitor_id" IS 'Unique identifier for the visitor who clicked the link.';



COMMENT ON COLUMN "public"."affiliate_clicks"."ip_address" IS 'IP address of the visitor.';



COMMENT ON COLUMN "public"."affiliate_clicks"."user_agent" IS 'User agent string of the visitor''s browser.';



COMMENT ON COLUMN "public"."affiliate_clicks"."referral_url" IS 'The URL from which the click originated.';



COMMENT ON COLUMN "public"."affiliate_clicks"."utm_params" IS 'Stores UTM parameters (source, medium, campaign, etc.) as a JSON object';



COMMENT ON COLUMN "public"."affiliate_clicks"."user_agent_details" IS 'Parsed user agent details including browser, device, OS';



COMMENT ON COLUMN "public"."affiliate_clicks"."landing_page_url" IS 'URL of the page the visitor landed on';



CREATE TABLE IF NOT EXISTS "public"."affiliate_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "click_id" "uuid",
    "order_id" "uuid",
    "gmv" numeric(12,2) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "status" "public"."conversion_status_type" DEFAULT 'pending'::"public"."conversion_status_type" NOT NULL,
    "cleared_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sub_id" "text",
    "status_history" "jsonb" DEFAULT '[]'::"jsonb",
    "payout_id" "uuid",
    "clearing_reason" "text",
    "auto_cleared" boolean DEFAULT false
);


ALTER TABLE "public"."affiliate_conversions" OWNER TO "postgres";


COMMENT ON TABLE "public"."affiliate_conversions" IS 'Tracks successful conversions attributed to affiliates.';



COMMENT ON COLUMN "public"."affiliate_conversions"."click_id" IS 'Reference to the click that led to this conversion, if available.';



COMMENT ON COLUMN "public"."affiliate_conversions"."order_id" IS 'Identifier for the order associated with this conversion.';



COMMENT ON COLUMN "public"."affiliate_conversions"."gmv" IS 'Gross Merchandise Value of the conversion.';



COMMENT ON COLUMN "public"."affiliate_conversions"."commission_amount" IS 'Calculated commission for this conversion.';



COMMENT ON COLUMN "public"."affiliate_conversions"."level" IS 'Commission level (e.g., 1 for direct, 2 for sub-affiliate).';



COMMENT ON COLUMN "public"."affiliate_conversions"."cleared_at" IS 'Timestamp when the conversion is confirmed and cleared for payout.';



COMMENT ON COLUMN "public"."affiliate_conversions"."status_history" IS 'History of status changes with timestamps, old and new statuses, and optional notes';



CREATE TABLE IF NOT EXISTS "public"."affiliate_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "url_path" "text" NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."affiliate_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_payout_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "public"."payout_batch_status_type" DEFAULT 'pending'::"public"."payout_batch_status_type" NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "fee_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "net_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "affiliate_count" integer DEFAULT 0 NOT NULL,
    "conversion_count" integer DEFAULT 0 NOT NULL,
    "payout_method" "text" NOT NULL,
    "processing_log" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."affiliate_payout_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_payout_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "rule_type" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."affiliate_payout_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "status" "public"."payout_status_type" DEFAULT 'pending'::"public"."payout_status_type" NOT NULL,
    "payout_method" "text",
    "reference" "text",
    "transaction_date" "date",
    "scheduled_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "xendit_disbursement_id" "text",
    "processing_notes" "text",
    "fee_amount" numeric(10,2),
    "net_amount" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."affiliate_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_program_config" (
    "id" integer DEFAULT 1 NOT NULL,
    "cookie_duration_days" integer DEFAULT 30 NOT NULL,
    "min_payout_threshold" numeric(10,2) DEFAULT 50.00 NOT NULL,
    "terms_of_service_content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payout_schedule" "text" DEFAULT 'monthly'::"text",
    "payout_currency" "text" DEFAULT 'USD'::"text",
    "enabled_payout_methods" "text"[] DEFAULT ARRAY['gcash'::"text"],
    "require_verification_for_bank_transfer" boolean DEFAULT true,
    "require_verification_for_gcash" boolean DEFAULT false,
    "refund_period_days" integer DEFAULT 30,
    "auto_clear_enabled" boolean DEFAULT true,
    "fraud_check_enabled" boolean DEFAULT true,
    "min_days_before_clear" integer DEFAULT 7,
    "max_days_before_clear" integer DEFAULT 45,
    CONSTRAINT "affiliate_program_config_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."affiliate_program_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "parent_affiliate" "uuid",
    "status" "public"."affiliate_status_type" DEFAULT 'pending'::"public"."affiliate_status_type" NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "is_member" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payout_method" "text" DEFAULT 'gcash'::"text",
    "bank_code" "text",
    "bank_name" "text",
    "account_number" "text",
    "account_holder_name" "text",
    "phone_number" "text",
    "bank_account_verified" boolean DEFAULT false,
    "bank_verification_date" timestamp with time zone,
    "gcash_number" "text",
    "gcash_name" "text",
    "gcash_verified" boolean DEFAULT false,
    "gcash_verification_date" timestamp with time zone,
    CONSTRAINT "affiliates_payout_method_check" CHECK (("payout_method" = ANY (ARRAY['bank_transfer'::"text", 'gcash'::"text", 'paymaya'::"text"])))
);


ALTER TABLE "public"."affiliates" OWNER TO "postgres";


COMMENT ON TABLE "public"."affiliates" IS 'Stores affiliate user information and their status.';



COMMENT ON COLUMN "public"."affiliates"."slug" IS 'Unique vanity URL slug for affiliate links.';



COMMENT ON COLUMN "public"."affiliates"."parent_affiliate" IS 'For multi-level affiliate structures, references the parent affiliate.';



COMMENT ON COLUMN "public"."affiliates"."is_member" IS 'Indicates if the affiliate is a paying member, potentially affecting commission rates.';



COMMENT ON COLUMN "public"."affiliates"."gcash_number" IS 'GCash mobile number for payouts (format: 09XXXXXXXXX)';



COMMENT ON COLUMN "public"."affiliates"."gcash_name" IS 'Account holder name for GCash (must match GCash account)';



COMMENT ON COLUMN "public"."affiliates"."gcash_verified" IS 'Whether GCash account details have been verified';



COMMENT ON COLUMN "public"."affiliates"."gcash_verification_date" IS 'When GCash account was verified';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "publish_date" timestamp with time zone,
    "expiry_date" timestamp with time zone,
    "link_url" "text",
    "link_text" "text",
    "image_url" "text",
    "host_name" "text",
    "host_avatar_url" "text",
    "target_audience" "text",
    "sort_order" integer,
    CONSTRAINT "announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "announcements_type_check" CHECK (("type" = ANY (ARRAY['live_class'::"text", 'sale_promo'::"text", 'general_update'::"text", 'new_content'::"text"])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS 'Stores announcements for the platform, including live classes, sales, and general updates.';



COMMENT ON COLUMN "public"."announcements"."type" IS 'Type of announcement, e.g., live_class, sale_promo, general_update, new_content';



COMMENT ON COLUMN "public"."announcements"."status" IS 'Status of the announcement, e.g., draft, published, archived';



COMMENT ON COLUMN "public"."announcements"."publish_date" IS 'When the announcement should become visible';



COMMENT ON COLUMN "public"."announcements"."expiry_date" IS 'Optional, when the announcement should cease to be visible';



COMMENT ON COLUMN "public"."announcements"."link_url" IS 'Optional URL for the announcement, e.g., Zoom link, sale page';



COMMENT ON COLUMN "public"."announcements"."link_text" IS 'Optional text for the link_url, e.g., Join Live Class, Shop Now';



COMMENT ON COLUMN "public"."announcements"."image_url" IS 'Optional URL for an accompanying image';



COMMENT ON COLUMN "public"."announcements"."host_name" IS 'Optional, name of the host if type is live_class';



COMMENT ON COLUMN "public"."announcements"."host_avatar_url" IS 'Optional, avatar URL of the host if type is live_class';



COMMENT ON COLUMN "public"."announcements"."target_audience" IS 'Optional, for future segmentation, e.g., all_users, enrolled_students:[course_id], segment:[segment_id]';



COMMENT ON COLUMN "public"."announcements"."sort_order" IS 'Optional, for manual ordering of announcements';



CREATE TABLE IF NOT EXISTS "public"."api_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cache_key" character varying(255) NOT NULL,
    "api_type" character varying(50) NOT NULL,
    "data" "jsonb" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "total_recipients" integer DEFAULT 0,
    "total_sent" integer DEFAULT 0,
    "total_delivered" integer DEFAULT 0,
    "total_opens" integer DEFAULT 0,
    "total_clicks" integer DEFAULT 0,
    "total_unsubscribes" integer DEFAULT 0,
    "total_bounces" integer DEFAULT 0,
    "total_complaints" integer DEFAULT 0,
    "open_rate" numeric(5,2),
    "click_rate" numeric(5,2),
    "bounce_rate" numeric(5,2),
    "last_calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "total_failed" integer DEFAULT 0,
    "total_spam_complaints" integer DEFAULT 0
);


ALTER TABLE "public"."campaign_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sent_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."campaign_recipients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaign_recipients"."status" IS 'The status of the recipient in the campaign (e.g., pending, processing, sent, delivered, opened, clicked, bounced, unsubscribed, failed).';



CREATE TABLE IF NOT EXISTS "public"."campaign_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "segment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."campaign_segments" IS 'Join table linking campaigns to their target audience segments.';



CREATE TABLE IF NOT EXISTS "public"."campaign_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text" NOT NULL,
    "type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_media" (
    "course_id" "uuid" NOT NULL,
    "media_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "progress_percentage" numeric DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_tags" (
    "course_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "trailer_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "is_featured" boolean DEFAULT false,
    "required_tier_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL,
    "published_version" integer,
    "settings" "jsonb" DEFAULT '{"access": {"drip_content": false, "prerequisite_courses": []}, "display": {"show_progress": true, "show_completion": true, "show_discussions": true}, "enrollment": {"type": "open", "price": null, "currency": "USD", "trial_days": 0}}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discount_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ebook_contacts" (
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ebook_contacts_email_check" CHECK (("email" ~* '^[^@\\s]+@[^@\\s]+\.[^@\\s]+$'::"text"))
);


ALTER TABLE "public"."ebook_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."ebook_contacts" IS 'Stores contact information for ebook purchasers for delivery and marketing.';



COMMENT ON COLUMN "public"."ebook_contacts"."email" IS 'Unique email address of the ebook buyer.';



COMMENT ON COLUMN "public"."ebook_contacts"."metadata" IS 'Stores additional metadata related to the purchase (e.g., product ID, source).';



COMMENT ON COLUMN "public"."ebook_contacts"."updated_at" IS 'Tracks the last time the contact record was updated.';



CREATE TABLE IF NOT EXISTS "public"."ecommerce_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "price_at_purchase" numeric(10,2) NOT NULL,
    "currency" character varying(3) NOT NULL,
    "product_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."ecommerce_order_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."ecommerce_order_items" IS 'Stores individual items associated with a custom e-commerce order.';



COMMENT ON COLUMN "public"."ecommerce_order_items"."product_id" IS 'FK to the shopify_products table.';



COMMENT ON COLUMN "public"."ecommerce_order_items"."price_at_purchase" IS 'Captures the price paid, in case product price changes later.';



COMMENT ON COLUMN "public"."ecommerce_order_items"."product_snapshot" IS 'Optional JSON blob containing product details (title, sku, etc.) at the time of purchase for historical accuracy.';



CREATE TABLE IF NOT EXISTS "public"."ecommerce_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "unified_profile_id" "uuid",
    "order_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) NOT NULL,
    "payment_method" "text" DEFAULT 'xendit'::"text" NOT NULL,
    "xendit_payment_id" "text",
    "transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "check_order_status" CHECK (("order_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."ecommerce_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."ecommerce_orders" IS 'Stores order details generated by the custom Xendit checkout flow.';



COMMENT ON COLUMN "public"."ecommerce_orders"."xendit_payment_id" IS 'Unique identifier from the Xendit payment transaction.';



COMMENT ON COLUMN "public"."ecommerce_orders"."transaction_id" IS 'FK to the unified transactions table.';



CREATE TABLE IF NOT EXISTS "public"."email_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "timestamp" timestamp with time zone NOT NULL,
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_condition" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_automations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "status" "public"."batch_status" DEFAULT 'pending'::"public"."batch_status" NOT NULL,
    "batch_size" integer NOT NULL,
    "processed_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "fail_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "template_id" "uuid" NOT NULL,
    "sender_email" "text" NOT NULL,
    "sender_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_ab_test" boolean DEFAULT false,
    "ab_test_variant_count" integer DEFAULT 0,
    "ab_test_winner_version" integer,
    "ab_test_winner_selected_at" timestamp with time zone,
    "segment_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "content_json" "jsonb" DEFAULT '{}'::"jsonb",
    "selected_template_id" "uuid",
    "campaign_html_body" "text",
    "campaign_design_json" "jsonb",
    "subject" "text",
    "segment_rules" "jsonb",
    "status_message" "text"
);


ALTER TABLE "public"."email_campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_campaigns"."selected_template_id" IS 'Foreign key to the original email_templates.id chosen for this campaign. Snapshotting content ensures campaign stability.';



COMMENT ON COLUMN "public"."email_campaigns"."campaign_html_body" IS 'Snapshot of the HTML email body for this specific campaign, potentially customized from a template.';



COMMENT ON COLUMN "public"."email_campaigns"."campaign_design_json" IS 'Snapshot of the Unlayer design JSON for this campaign''s email body.';



CREATE TABLE IF NOT EXISTS "public"."email_change_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "old_email" "text",
    "new_email" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "change_type" "text",
    "verification_status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."email_change_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_change_log" IS 'Tracks email changes for audit purposes - admin access only';



CREATE TABLE IF NOT EXISTS "public"."email_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email_id" "uuid",
    "event_type" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb",
    "message_id" "text",
    "recipient" "text",
    "campaign_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb",
    "recipient_email" "text",
    "provider_message_id" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['Delivery'::"text", 'Bounce'::"text", 'Open'::"text", 'Click'::"text", 'SpamComplaint'::"text", 'SubscriptionChange'::"text", 'Inbound'::"text"])))
);


ALTER TABLE "public"."email_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_preference_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_user_id" "uuid",
    "action" "text" NOT NULL,
    "previous_status" boolean,
    "new_status" boolean NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    CONSTRAINT "check_action_format" CHECK (("action" = ANY (ARRAY['subscribed_marketing'::"text", 'unsubscribed_marketing'::"text"])))
);


ALTER TABLE "public"."email_preference_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_preference_audit_logs" IS 'Logs changes to user email preferences, such as marketing subscriptions.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."user_id" IS 'The user whose preference was changed.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."admin_user_id" IS 'The administrator who performed the change. Null if system-initiated or user self-service.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."action" IS 'The specific preference change action taken (e.g., subscribed_marketing, unsubscribed_marketing).';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."previous_status" IS 'The status of the preference before this change.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."new_status" IS 'The status of the preference after this change.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."changed_at" IS 'Timestamp of when the preference change was recorded.';



COMMENT ON COLUMN "public"."email_preference_audit_logs"."notes" IS 'Optional notes provided by the administrator or system regarding the change.';



CREATE TABLE IF NOT EXISTS "public"."email_processing_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lock_key" "text" NOT NULL,
    "locked_until" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_processing_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_processing_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_size" integer NOT NULL,
    "success_count" integer NOT NULL,
    "failure_count" integer NOT NULL,
    "retry_count" integer NOT NULL,
    "execution_time_ms" integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_processing_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_data" "jsonb",
    "status" "public"."email_status" DEFAULT 'pending'::"public"."email_status" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sender_email" "text",
    "sender_name" "text",
    "subject" "text",
    "html_content" "text",
    "text_content" "text",
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "provider_message_id" "text"
);


ALTER TABLE "public"."email_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_send_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "recipient_email" "text" NOT NULL,
    "variables" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "lead_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email_content" "text",
    "email_headers" "jsonb",
    "raw_response" "jsonb",
    "subject" "text",
    CONSTRAINT "email_send_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_send_log" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_send_log"."email_content" IS 'Full content of the email (HTML/text or template variables)';



COMMENT ON COLUMN "public"."email_send_log"."email_headers" IS 'Email headers from provider API response';



COMMENT ON COLUMN "public"."email_send_log"."raw_response" IS 'Raw API response from email provider for debugging';



COMMENT ON COLUMN "public"."email_send_log"."subject" IS 'Subject line of the email for easy reference and searching';



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "design" "jsonb",
    "category" "text" DEFAULT 'uncategorized'::"text" NOT NULL,
    "subcategory" "text",
    "version" integer DEFAULT 1,
    "active" boolean DEFAULT true,
    "previous_versions" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_templates"."design" IS 'Stores the Unlayer editor design JSON for recreating the email template';



COMMENT ON COLUMN "public"."email_templates"."category" IS 'Broad category for the email template (e.g., authentication, transactional, marketing).';



COMMENT ON COLUMN "public"."email_templates"."subcategory" IS 'Specific type within the category (e.g., welcome, password-reset, newsletter).';



CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "status" "text" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "enrollments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments_backup_pre_migration" (
    "id" "uuid",
    "user_id" "uuid",
    "course_id" "uuid",
    "transaction_id" "uuid",
    "status" "text",
    "enrolled_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone,
    "metadata" "jsonb"
);


ALTER TABLE "public"."enrollments_backup_pre_migration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."environment_config" (
    "id" integer NOT NULL,
    "environment_name" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "environment_config_environment_name_check" CHECK (("environment_name" = ANY (ARRAY['production'::"text", 'development'::"text"])))
);


ALTER TABLE "public"."environment_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."environment_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."environment_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."environment_config_id_seq" OWNED BY "public"."environment_config"."id";



CREATE TABLE IF NOT EXISTS "public"."environment_switch_log" (
    "id" integer NOT NULL,
    "from_environment" "text",
    "to_environment" "text" NOT NULL,
    "switched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "switched_by" "text" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."environment_switch_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."environment_switch_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."environment_switch_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."environment_switch_log_id_seq" OWNED BY "public"."environment_switch_log"."id";



CREATE TABLE IF NOT EXISTS "public"."fraud_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolver_notes" "text",
    "updated_at" timestamp with time zone DEFAULT "clock_timestamp"() NOT NULL
);


ALTER TABLE "public"."fraud_flags" OWNER TO "postgres";


COMMENT ON TABLE "public"."fraud_flags" IS 'Logs potential fraudulent activities related to affiliates.';



COMMENT ON COLUMN "public"."fraud_flags"."details" IS 'JSON object storing specific data related to the fraud flag.';



COMMENT ON COLUMN "public"."fraud_flags"."resolved_at" IS 'Timestamp when the fraud flag was resolved.';



COMMENT ON COLUMN "public"."fraud_flags"."resolver_notes" IS 'Notes from the admin who resolved the flag.';



CREATE TABLE IF NOT EXISTS "public"."gcash_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'unverified'::"text" NOT NULL,
    "current_step" "text" DEFAULT 'phone_verification'::"text" NOT NULL,
    "gcash_number" "text" NOT NULL,
    "gcash_name" "text" NOT NULL,
    "id_document_url" "text",
    "id_document_type" "text",
    "selfie_url" "text",
    "address_proof_url" "text",
    "phone_verified" boolean DEFAULT false,
    "phone_verification_code" "text",
    "phone_verification_expires" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "rejection_reason" "text",
    "submitted_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gcash_verifications_current_step_check" CHECK (("current_step" = ANY (ARRAY['phone_verification'::"text", 'id_upload'::"text", 'selfie_upload'::"text", 'address_verification'::"text", 'admin_review'::"text", 'completed'::"text"]))),
    CONSTRAINT "gcash_verifications_id_document_type_check" CHECK (("id_document_type" = ANY (ARRAY['drivers_license'::"text", 'passport'::"text", 'umid'::"text", 'postal_id'::"text", 'voters_id'::"text", 'sss_id'::"text", 'tin_id'::"text"]))),
    CONSTRAINT "gcash_verifications_status_check" CHECK (("status" = ANY (ARRAY['unverified'::"text", 'pending_documents'::"text", 'pending_review'::"text", 'verified'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."gcash_verifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."gcash_verifications" IS 'GCash account verification records for affiliate KYC compliance';



COMMENT ON COLUMN "public"."gcash_verifications"."status" IS 'Current verification status';



COMMENT ON COLUMN "public"."gcash_verifications"."current_step" IS 'Current step in the verification workflow';



COMMENT ON COLUMN "public"."gcash_verifications"."gcash_number" IS 'GCash mobile number (09XXXXXXXXX format)';



COMMENT ON COLUMN "public"."gcash_verifications"."gcash_name" IS 'Account holder name matching GCash account';



COMMENT ON COLUMN "public"."gcash_verifications"."phone_verification_code" IS 'SMS verification code (temporary)';



COMMENT ON COLUMN "public"."gcash_verifications"."expires_at" IS 'When the verification expires (1 year from approval)';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "paid_date" timestamp with time zone,
    "amount" numeric(10,2) NOT NULL,
    "items" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "video_url" "text",
    "duration" integer,
    "position" integer NOT NULL,
    "is_preview" boolean DEFAULT false,
    "content" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "content_json" "jsonb",
    "version" integer DEFAULT 1
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_classes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "event_datetime" timestamp with time zone NOT NULL,
    "host_name" "text",
    "host_avatar_url" "text",
    "zoom_link" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."magic_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "email" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "user_id" "uuid",
    "purchase_lead_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."magic_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."magic_links" IS 'Stores magic link tokens for passwordless authentication flows';



COMMENT ON COLUMN "public"."magic_links"."token" IS 'JWT token for magic link authentication';



COMMENT ON COLUMN "public"."magic_links"."purpose" IS 'Purpose of magic link: account_setup, login, shopify_access';



COMMENT ON COLUMN "public"."magic_links"."user_id" IS 'Associated user ID if user exists';



COMMENT ON COLUMN "public"."magic_links"."purchase_lead_id" IS 'Associated purchase lead if applicable';



COMMENT ON COLUMN "public"."magic_links"."expires_at" IS 'When magic link expires (typically 48 hours)';



COMMENT ON COLUMN "public"."magic_links"."used_at" IS 'When magic link was used (single-use enforcement)';



COMMENT ON COLUMN "public"."magic_links"."ip_address" IS 'IP address when magic link was used';



COMMENT ON COLUMN "public"."magic_links"."user_agent" IS 'User agent when magic link was used';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'PHP'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "transaction_type" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "external_id" "text",
    "paid_at" timestamp with time zone,
    "settled_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "metadata" "jsonb",
    "contact_email" "text"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unified_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "tags" "text"[],
    "acquisition_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "admin_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_login_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "email_bounced" boolean DEFAULT false NOT NULL,
    "email_spam_complained" boolean DEFAULT false,
    "email_last_spam_at" timestamp with time zone,
    "email_marketing_subscribed" boolean DEFAULT true NOT NULL,
    "affiliate_id" "uuid",
    "affiliate_general_status" "public"."affiliate_status_type",
    "membership_level_id" "uuid",
    "is_student" boolean DEFAULT false NOT NULL,
    "is_affiliate" boolean DEFAULT false NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "tier_assignment_notes" "text",
    CONSTRAINT "unified_profiles_email_check" CHECK (("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))
);


ALTER TABLE "public"."unified_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."unified_profiles"."status" IS 'User account status (active, suspended, etc.)';



COMMENT ON COLUMN "public"."unified_profiles"."admin_metadata" IS 'JSON metadata for administrative use';



COMMENT ON COLUMN "public"."unified_profiles"."last_login_at" IS 'Timestamp of the user''s last login';



COMMENT ON COLUMN "public"."unified_profiles"."login_count" IS 'Count of user logins';



COMMENT ON COLUMN "public"."unified_profiles"."email_bounced" IS 'Indicates if an email sent to the user has hard bounced.';



COMMENT ON COLUMN "public"."unified_profiles"."email_marketing_subscribed" IS 'Indicates if the user is subscribed to marketing emails.';



COMMENT ON COLUMN "public"."unified_profiles"."affiliate_id" IS 'Direct link to the affiliates record if this user is an affiliate. Enforces 1-to-1 relationship.';



COMMENT ON COLUMN "public"."unified_profiles"."affiliate_general_status" IS 'Mirrors the status from the affiliates table for quick checks. Kept in sync by a trigger.';



COMMENT ON COLUMN "public"."unified_profiles"."is_student" IS 'Flag indicating if the user has an active student enrollment.';



COMMENT ON COLUMN "public"."unified_profiles"."is_affiliate" IS 'Flag indicating if the user is an active affiliate.';



COMMENT ON COLUMN "public"."unified_profiles"."is_admin" IS 'Flag indicating if the user has admin privileges.';



COMMENT ON COLUMN "public"."unified_profiles"."tier_assignment_notes" IS 'Notes about the tier assignment, including reasons for manual upgrades or downgrades';



CREATE OR REPLACE VIEW "public"."marketing_performance_view" AS
 SELECT "spend"."date",
    "spend"."spend",
    "spend"."impressions",
    "spend"."clicks",
    "spend"."currency" AS "spend_currency",
    "camp"."id" AS "campaign_id",
    "camp"."fb_campaign_id",
    "camp"."name" AS "campaign_name",
    "camp"."objective" AS "campaign_objective",
    "camp"."status" AS "campaign_status",
    "ads"."id" AS "adset_id",
    "ads"."fb_adset_id",
    "ads"."name" AS "adset_name",
    "ads"."status" AS "adset_status",
    "ad"."id" AS "ad_id",
    "ad"."fb_ad_id",
    "ad"."name" AS "ad_name",
    "ad"."status" AS "ad_status",
    NULL::"uuid" AS "transaction_id",
    NULL::"uuid" AS "enrollment_id",
    NULL::numeric AS "attributed_revenue",
    NULL::"text" AS "conversion_event",
    'facebook'::"text" AS "source_channel"
   FROM ((("public"."ad_spend" "spend"
     LEFT JOIN "public"."ad_ads" "ad" ON (("spend"."ad_id" = "ad"."id")))
     LEFT JOIN "public"."ad_adsets" "ads" ON (("ad"."adset_id" = "ads"."id")))
     LEFT JOIN "public"."ad_campaigns" "camp" ON (("ads"."campaign_id" = "camp"."id")))
UNION ALL
 SELECT "date"("e"."enrolled_at") AS "date",
    NULL::numeric AS "spend",
    NULL::integer AS "impressions",
    NULL::integer AS "clicks",
    "t"."currency" AS "spend_currency",
    NULL::"uuid" AS "campaign_id",
    NULL::"text" AS "fb_campaign_id",
    NULL::"text" AS "campaign_name",
    NULL::"text" AS "campaign_objective",
    NULL::"text" AS "campaign_status",
    NULL::"uuid" AS "adset_id",
    NULL::"text" AS "fb_adset_id",
    NULL::"text" AS "adset_name",
    NULL::"text" AS "adset_status",
    NULL::"uuid" AS "ad_id",
    NULL::"text" AS "fb_ad_id",
    NULL::"text" AS "ad_name",
    NULL::"text" AS "ad_status",
    "e"."transaction_id",
    "e"."id" AS "enrollment_id",
    "t"."amount" AS "attributed_revenue",
    'p2p_enrollment'::"text" AS "conversion_event",
        CASE
            WHEN (("up"."tags" IS NOT NULL) AND ("array_length"("up"."tags", 1) > 0)) THEN "up"."tags"[1]
            ELSE 'organic/unknown'::"text"
        END AS "source_channel"
   FROM (("public"."enrollments" "e"
     JOIN "public"."transactions" "t" ON (("e"."transaction_id" = "t"."id")))
     JOIN "public"."unified_profiles" "up" ON (("e"."user_id" = "up"."id")))
  WHERE (("t"."status" = 'COMPLETED'::"text") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."ad_attributions" "aa"
          WHERE ("aa"."transaction_id" = "e"."transaction_id")))));


ALTER TABLE "public"."marketing_performance_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."marketing_source_view" AS
 SELECT "p"."acquisition_source",
    "count"(*) AS "user_count",
    "count"(DISTINCT
        CASE
            WHEN ("t"."status" = 'completed'::"text") THEN "t"."user_id"
            ELSE NULL::"uuid"
        END) AS "paid_user_count"
   FROM ("public"."unified_profiles" "p"
     LEFT JOIN "public"."transactions" "t" ON (("t"."user_id" = "p"."id")))
  GROUP BY "p"."acquisition_source";


ALTER TABLE "public"."marketing_source_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid",
    "filename" "text" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_levels_commission_rate_check" CHECK ((("commission_rate" >= (0)::numeric) AND ("commission_rate" <= (1)::numeric)))
);


ALTER TABLE "public"."membership_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) NOT NULL,
    "price_yearly" numeric(10,2) NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."membership_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migration_log" (
    "id" integer NOT NULL,
    "step" "text" NOT NULL,
    "status" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."migration_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migration_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."migration_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migration_log_id_seq" OWNED BY "public"."migration_log"."id";



CREATE TABLE IF NOT EXISTS "public"."module_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "progress_percentage" numeric DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."module_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "section_id" "uuid",
    "is_published" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    CONSTRAINT "modules_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_enrollments_view" AS
 SELECT "date_trunc"('month'::"text", "enrollments"."enrolled_at") AS "month",
    "enrollments"."course_id",
    "count"(*) AS "enrollment_count"
   FROM "public"."enrollments"
  GROUP BY ("date_trunc"('month'::"text", "enrollments"."enrolled_at")), "enrollments"."course_id";


ALTER TABLE "public"."monthly_enrollments_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."network_postbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversion_id" "uuid" NOT NULL,
    "network_name" "text" NOT NULL,
    "sub_id" "text",
    "postback_url" "text" NOT NULL,
    "status" "public"."postback_status_type" DEFAULT 'pending'::"public"."postback_status_type" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."network_postbacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_snippet" "text" NOT NULL,
    "email" "text",
    "ip_address" "text" NOT NULL,
    "user_agent" "text",
    "status" "text" NOT NULL,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_attempts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."password_reset_metrics" AS
 SELECT "date_trunc"('day'::"text", "password_reset_attempts"."created_at") AS "day",
    "password_reset_attempts"."status",
    "count"(*) AS "count",
    "count"(DISTINCT "password_reset_attempts"."ip_address") AS "unique_ips",
    "count"(DISTINCT "password_reset_attempts"."email") AS "unique_emails"
   FROM "public"."password_reset_attempts"
  GROUP BY ("date_trunc"('day'::"text", "password_reset_attempts"."created_at")), "password_reset_attempts"."status"
  ORDER BY ("date_trunc"('day'::"text", "password_reset_attempts"."created_at")) DESC, "password_reset_attempts"."status";


ALTER TABLE "public"."password_reset_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "provider_token" "text",
    "last_four" "text",
    "expiry_date" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payout_id" "uuid",
    "conversion_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payout_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."payout_items" IS 'Stores individual conversion line items included in an affiliate payout.';



COMMENT ON COLUMN "public"."payout_items"."id" IS 'Unique identifier for the payout item.';



COMMENT ON COLUMN "public"."payout_items"."payout_id" IS 'Foreign key to the affiliate_payouts table, linking this item to a specific payout.';



COMMENT ON COLUMN "public"."payout_items"."conversion_id" IS 'Foreign key to the affiliate_conversions table, linking this item to a specific conversion.';



COMMENT ON COLUMN "public"."payout_items"."amount" IS 'The amount of this specific conversion item included in the payout.';



COMMENT ON COLUMN "public"."payout_items"."created_at" IS 'Timestamp of when the payout item record was created.';



COMMENT ON COLUMN "public"."payout_items"."updated_at" IS 'Timestamp of when the payout item record was last updated.';



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "resource_type" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."population_operation_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer DEFAULT 0,
    "error_message" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_details" "jsonb",
    CONSTRAINT "population_operation_log_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'success'::"text", 'partial_success'::"text", 'error'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."population_operation_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."postmark_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_type" "text" NOT NULL,
    "message_id" "text",
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."postmark_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processing_locks" (
    "id" "uuid" NOT NULL,
    "lock_name" "text" NOT NULL,
    "acquired_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."processing_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "is_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_reviews" IS 'Stores user reviews and ratings for products.';



COMMENT ON COLUMN "public"."product_reviews"."rating" IS 'Star rating from 1 to 5.';



COMMENT ON COLUMN "public"."product_reviews"."is_approved" IS 'Whether the review is approved by an admin to be publicly visible.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "product_type" "text" NOT NULL,
    "status" "text" DEFAULT 'form_submitted'::"text" NOT NULL,
    "amount" numeric,
    "currency" "text" DEFAULT 'PHP'::"text",
    "xendit_external_id" "text",
    "source_page" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "converted_at" timestamp with time zone,
    CONSTRAINT "purchase_leads_product_type_check" CHECK (("product_type" = ANY (ARRAY['P2P'::"text", 'Canva'::"text", 'SHOPIFY_ECOM'::"text"]))),
    CONSTRAINT "purchase_leads_status_check" CHECK (("status" = ANY (ARRAY['form_submitted'::"text", 'payment_initiated'::"text", 'payment_completed'::"text", 'payment_failed'::"text", 'payment_abandoned'::"text", 'lead_nurture'::"text"])))
);


ALTER TABLE "public"."purchase_leads" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."revenue_analysis_view" AS
 SELECT "date_trunc"('month'::"text", "transactions"."paid_at") AS "month",
    "transactions"."transaction_type",
    "sum"("transactions"."amount") AS "total_revenue",
    "count"(*) AS "transaction_count",
    "avg"("transactions"."amount") AS "avg_transaction_value"
   FROM "public"."transactions"
  WHERE ("transactions"."status" = 'completed'::"text")
  GROUP BY ("date_trunc"('month'::"text", "transactions"."paid_at")), "transactions"."transaction_type";


ALTER TABLE "public"."revenue_analysis_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "priority" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "position" integer NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "ip_address" "text",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "rules" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."segments" IS 'Stores user-defined audience segments for targeting campaigns.';



COMMENT ON COLUMN "public"."segments"."name" IS 'Unique, user-friendly name for the segment.';



COMMENT ON COLUMN "public"."segments"."rules" IS 'JSONB object defining the logic/conditions for this segment (e.g., based on user tags).';



CREATE TABLE IF NOT EXISTS "public"."shopify_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unified_profile_id" "uuid",
    "shopify_customer_id" bigint NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "accepts_marketing" boolean,
    "orders_count" integer,
    "total_spent" numeric,
    "state" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "manual_link_notes" "text",
    "linked_by" "uuid",
    "linked_at" timestamp with time zone
);


ALTER TABLE "public"."shopify_customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shopify_customers"."manual_link_notes" IS 'Notes from admin when manually linking to unified profile';



COMMENT ON COLUMN "public"."shopify_customers"."linked_by" IS 'Admin user who performed manual linking';



COMMENT ON COLUMN "public"."shopify_customers"."linked_at" IS 'When manual linking was performed';



CREATE TABLE IF NOT EXISTS "public"."shopify_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "shopify_line_item_id" bigint NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "shopify_product_id" bigint,
    "shopify_variant_id" bigint,
    "title" "text",
    "variant_title" "text",
    "sku" "text",
    "quantity" integer,
    "price" numeric,
    "total_discount" numeric,
    "vendor" "text"
);


ALTER TABLE "public"."shopify_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "shopify_order_id" bigint NOT NULL,
    "order_number" "text",
    "email" "text",
    "phone" "text",
    "total_price" numeric,
    "subtotal_price" numeric,
    "total_tax" numeric,
    "total_discounts" numeric,
    "currency" "text",
    "financial_status" "text",
    "fulfillment_status" "text",
    "landing_site" "text",
    "referring_site" "text",
    "source_name" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."shopify_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shopify_variant_id" bigint NOT NULL,
    "product_id" "uuid",
    "title" "text",
    "sku" "text",
    "price" numeric,
    "compare_at_price" numeric,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."shopify_product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shopify_product_id" bigint NOT NULL,
    "title" "text",
    "handle" "text",
    "product_type" "text",
    "status" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "vendor" "text",
    "tags" "text"[],
    "featured_image_url" "text",
    "google_drive_file_id" "text",
    "description_html" "text",
    "image_urls" "jsonb",
    "collection_handles" "text"[],
    "is_one_time_purchase" boolean DEFAULT false
);


ALTER TABLE "public"."shopify_products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shopify_products"."featured_image_url" IS 'URL for the main product image, synced from Shopify.';



COMMENT ON COLUMN "public"."shopify_products"."google_drive_file_id" IS 'Google Drive File/Folder ID for the associated digital product asset.';



COMMENT ON COLUMN "public"."shopify_products"."description_html" IS 'Product description HTML content from Shopify.';



COMMENT ON COLUMN "public"."shopify_products"."image_urls" IS 'JSON array of product image objects, e.g., [{url, altText}].';



COMMENT ON COLUMN "public"."shopify_products"."collection_handles" IS 'Array of handles for Shopify collections this product belongs to.';



CREATE TABLE IF NOT EXISTS "public"."shopify_webhook_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."shopify_webhook_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "transaction_id" "uuid",
    "billing_period_start" timestamp with time zone NOT NULL,
    "billing_period_end" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."systemeio" (
    "Email" "text" NOT NULL,
    "First name" "text",
    "Last name" "text",
    "Tag" "text",
    "Date Registered" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."systemeio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."systemeio_backup" (
    "Email" "text",
    "First name" "text",
    "Last name" "text",
    "Tag" "text",
    "Date Registered" timestamp with time zone
);


ALTER TABLE "public"."systemeio_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tag_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type_id" "uuid",
    "parent_id" "uuid",
    "metadata" "jsonb"
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions_backup_pre_migration" (
    "id" "uuid",
    "user_id" "uuid",
    "amount" numeric(10,2),
    "currency" "text",
    "status" "text",
    "payment_method" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "transaction_type" "text",
    "external_id" "text",
    "paid_at" timestamp with time zone,
    "settled_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "metadata" "jsonb",
    "contact_email" "text"
);


ALTER TABLE "public"."transactions_backup_pre_migration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unified_profiles_backup_pre_migration" (
    "id" "uuid",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "tags" "text"[],
    "acquisition_source" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "status" "text",
    "admin_metadata" "jsonb",
    "last_login_at" timestamp with time zone,
    "login_count" integer,
    "email_bounced" boolean,
    "email_spam_complained" boolean,
    "email_last_spam_at" timestamp with time zone,
    "email_marketing_subscribed" boolean,
    "affiliate_id" "uuid",
    "affiliate_general_status" "public"."affiliate_status_type",
    "membership_level_id" "uuid",
    "is_student" boolean,
    "is_affiliate" boolean,
    "is_admin" boolean,
    "tier_assignment_notes" "text"
);


ALTER TABLE "public"."unified_profiles_backup_pre_migration" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unified_transactions_view" AS
 SELECT "t"."id" AS "transaction_id",
    'xendit'::"text" AS "source_platform",
    "t"."user_id",
    COALESCE("t"."contact_email", "up"."email") AS "email",
    "t"."paid_at" AS "transaction_datetime",
    "t"."amount",
    "t"."currency",
        CASE
            WHEN ("t"."status" = ANY (ARRAY['PAID'::"text", 'SETTLED'::"text"])) THEN 'completed'::"text"
            WHEN ("t"."status" = 'EXPIRED'::"text") THEN 'expired'::"text"
            WHEN ("t"."status" = 'PENDING'::"text") THEN 'pending'::"text"
            ELSE "lower"("t"."status")
        END AS "status",
    "t"."payment_method",
    "jsonb_build_object"('type', "t"."transaction_type", 'name',
        CASE "t"."transaction_type"
            WHEN 'P2P'::"text" THEN 'Papers to Profits Course'::"text"
            WHEN 'Canva'::"text" THEN 'Canva Ebook'::"text"
            ELSE 'Unknown Xendit Product'::"text"
        END, 'quantity', 1, 'price', "t"."amount") AS "product_details",
    "t"."external_id" AS "external_reference",
    "t"."created_at",
    "t"."updated_at"
   FROM ("public"."transactions" "t"
     LEFT JOIN "public"."unified_profiles" "up" ON (("t"."user_id" = "up"."id")))
UNION ALL
 SELECT "so"."id" AS "transaction_id",
    'shopify'::"text" AS "source_platform",
    "sc"."unified_profile_id" AS "user_id",
    "so"."email",
    "so"."processed_at" AS "transaction_datetime",
    "so"."total_price" AS "amount",
    "so"."currency",
        CASE
            WHEN ("so"."financial_status" = 'paid'::"text") THEN 'completed'::"text"
            WHEN ("so"."financial_status" = 'partially_refunded'::"text") THEN 'partially_refunded'::"text"
            WHEN ("so"."financial_status" = 'refunded'::"text") THEN 'refunded'::"text"
            WHEN ("so"."financial_status" = 'voided'::"text") THEN 'cancelled'::"text"
            WHEN ("so"."financial_status" = 'pending'::"text") THEN 'pending'::"text"
            ELSE "lower"("so"."financial_status")
        END AS "status",
    "so"."source_name" AS "payment_method",
    ( SELECT "jsonb_agg"("jsonb_build_object"('sku', "soi"."sku", 'name', "soi"."title", 'product_id', "soi"."product_id", 'variant_id', "soi"."variant_id", 'quantity', "soi"."quantity", 'price', "soi"."price")) AS "jsonb_agg"
           FROM "public"."shopify_order_items" "soi"
          WHERE ("soi"."order_id" = "so"."id")) AS "product_details",
    ("so"."shopify_order_id")::"text" AS "external_reference",
    "so"."created_at",
    "so"."updated_at"
   FROM ("public"."shopify_orders" "so"
     LEFT JOIN "public"."shopify_customers" "sc" ON (("so"."customer_id" = "sc"."id")));


ALTER TABLE "public"."unified_transactions_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."unified_transactions_view" IS 'Unified view combining Xendit transactions and Shopify orders for revenue analysis.';



COMMENT ON COLUMN "public"."unified_transactions_view"."transaction_id" IS 'Unique identifier for the transaction/order (UUID from source table).';



COMMENT ON COLUMN "public"."unified_transactions_view"."source_platform" IS 'Indicates the origin of the transaction (''xendit'' or ''shopify'').';



COMMENT ON COLUMN "public"."unified_transactions_view"."user_id" IS 'Associated user ID from unified_profiles (linked via transactions.user_id or shopify_customers.unified_profile_id).';



COMMENT ON COLUMN "public"."unified_transactions_view"."email" IS 'Customer email address associated with the transaction/order.';



COMMENT ON COLUMN "public"."unified_transactions_view"."transaction_datetime" IS 'Timestamp when the transaction was considered paid/processed (paid_at for Xendit, processed_at for Shopify).';



COMMENT ON COLUMN "public"."unified_transactions_view"."amount" IS 'Total amount of the transaction/order.';



COMMENT ON COLUMN "public"."unified_transactions_view"."currency" IS 'Currency code (e.g., PHP, USD).';



COMMENT ON COLUMN "public"."unified_transactions_view"."status" IS 'Normalized status of the transaction (e.g., completed, pending, refunded, expired, cancelled).';



COMMENT ON COLUMN "public"."unified_transactions_view"."payment_method" IS 'Payment method used (from Xendit or Shopify source_name/gateway).';



COMMENT ON COLUMN "public"."unified_transactions_view"."product_details" IS 'JSONB containing details of the product(s) involved in the transaction. For Xendit, based on transaction_type. For Shopify, aggregated from shopify_order_items.';



COMMENT ON COLUMN "public"."unified_transactions_view"."external_reference" IS 'Original external identifier (Xendit external_id or Shopify shopify_order_id).';



COMMENT ON COLUMN "public"."unified_transactions_view"."created_at" IS 'Timestamp when the record was created in the source system.';



COMMENT ON COLUMN "public"."unified_transactions_view"."updated_at" IS 'Timestamp when the record was last updated in the source system.';



CREATE TABLE IF NOT EXISTS "public"."user_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_activity_log" IS 'Log of user activities and engagement';



COMMENT ON COLUMN "public"."user_activity_log"."user_id" IS 'The user who performed the activity';



COMMENT ON COLUMN "public"."user_activity_log"."activity_type" IS 'Type of activity (login, view_course, complete_lesson, etc.)';



COMMENT ON COLUMN "public"."user_activity_log"."resource_type" IS 'Type of resource accessed (course, lesson, product, etc.)';



COMMENT ON COLUMN "public"."user_activity_log"."resource_id" IS 'ID of the resource accessed';



COMMENT ON COLUMN "public"."user_activity_log"."metadata" IS 'Additional metadata about the activity';



COMMENT ON COLUMN "public"."user_activity_log"."ip_address" IS 'IP address of the user';



COMMENT ON COLUMN "public"."user_activity_log"."user_agent" IS 'User agent of the user';



COMMENT ON COLUMN "public"."user_activity_log"."session_id" IS 'Session ID for grouping related activities';



CREATE TABLE IF NOT EXISTS "public"."user_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "title" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_email_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "marketing_emails" boolean DEFAULT true,
    "transactional_emails" boolean DEFAULT true,
    "newsletter" boolean DEFAULT true,
    "course_updates" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_email_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "payment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "payment_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "note_text" "text" NOT NULL,
    "note_type" "text" DEFAULT 'general'::"text",
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notes" IS 'Administrative notes for user accounts';



COMMENT ON COLUMN "public"."user_notes"."user_id" IS 'The user this note is about';



COMMENT ON COLUMN "public"."user_notes"."admin_id" IS 'The admin who created this note';



COMMENT ON COLUMN "public"."user_notes"."note_text" IS 'The content of the note';



COMMENT ON COLUMN "public"."user_notes"."note_type" IS 'Type of note (general, support, billing, etc.)';



COMMENT ON COLUMN "public"."user_notes"."is_pinned" IS 'Whether this note should be pinned to the top';



CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "progress_percentage" numeric(5,2) DEFAULT 0,
    "last_position" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_purchase_history_view" AS
 SELECT "up"."id" AS "user_id",
    "up"."email",
    "up"."first_name",
    "up"."last_name",
    'transaction'::"text" AS "record_type",
    "t"."id" AS "record_id",
    "t"."amount",
    "t"."currency",
    "t"."status",
    "t"."transaction_type" AS "product_type",
    "t"."created_at" AS "purchase_date",
    "t"."payment_method",
    "t"."external_id" AS "reference",
    NULL::"jsonb" AS "product_details"
   FROM ("public"."unified_profiles" "up"
     JOIN "public"."transactions" "t" ON (("up"."id" = "t"."user_id")))
UNION ALL
 SELECT "up"."id" AS "user_id",
    "up"."email",
    "up"."first_name",
    "up"."last_name",
    'shopify_order'::"text" AS "record_type",
    "so"."id" AS "record_id",
    "so"."total_price" AS "amount",
    "so"."currency",
    "so"."financial_status" AS "status",
    'shopify'::"text" AS "product_type",
    "so"."processed_at" AS "purchase_date",
    "so"."source_name" AS "payment_method",
    "so"."order_number" AS "reference",
    ( SELECT "jsonb_agg"("jsonb_build_object"('sku', "soi"."sku", 'title', "soi"."title", 'variant_title', "soi"."variant_title", 'quantity', "soi"."quantity", 'price', "soi"."price")) AS "jsonb_agg"
           FROM "public"."shopify_order_items" "soi"
          WHERE ("soi"."order_id" = "so"."id")) AS "product_details"
   FROM (("public"."unified_profiles" "up"
     JOIN "public"."shopify_customers" "sc" ON (("up"."id" = "sc"."unified_profile_id")))
     JOIN "public"."shopify_orders" "so" ON (("sc"."id" = "so"."customer_id")));


ALTER TABLE "public"."user_purchase_history_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_purchase_history_view" IS 'Unified view of user purchase history across Xendit transactions and Shopify orders';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "segment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_segments" IS 'Stores user-defined segments based on rules (e.g., tag combinations).';



COMMENT ON COLUMN "public"."user_segments"."id" IS 'Unique identifier for the segment.';



COMMENT ON COLUMN "public"."user_segments"."created_at" IS 'Timestamp of when the segment was created.';



COMMENT ON COLUMN "public"."user_segments"."updated_at" IS 'Timestamp of when the segment was last updated.';



CREATE TABLE IF NOT EXISTS "public"."user_tags" (
    "user_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_time_spent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "duration_seconds" integer NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_time_spent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wishlist_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."wishlist_items" IS 'Stores products that users have added to their wishlist.';



COMMENT ON COLUMN "public"."wishlist_items"."user_id" IS 'The user who added the item to the wishlist.';



COMMENT ON COLUMN "public"."wishlist_items"."product_id" IS 'The product added to the wishlist.';



CREATE TABLE IF NOT EXISTS "public"."xendit" (
    "Status" "text",
    "Description" "text",
    "External ID" "text" NOT NULL,
    "Email" "text",
    "Created Timestamp" "text",
    "Paid Timestamp" "text",
    "Expiry Date" "text",
    "Settled Timestamp" "text",
    "Timezone" "text",
    "Payment Method" "text",
    "Currency" "text",
    "Amount" bigint,
    "Fee" "text",
    "Received Amount" "text",
    "VA Number" "text",
    "Bank Name" "text",
    "Promotion(s)" "text",
    "Invoice ID" "text",
    "Customer Name" "text",
    "Customer Email" "text",
    "Customer Mobile Number" "text"
);


ALTER TABLE "public"."xendit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xendit_backup" (
    "Status" "text",
    "Description" "text",
    "External ID" "text",
    "Email" "text",
    "Created Timestamp" "text",
    "Paid Timestamp" "text",
    "Expiry Date" "text",
    "Settled Timestamp" "text",
    "Timezone" "text",
    "Payment Method" "text",
    "Currency" "text",
    "Amount" bigint,
    "Fee" "text",
    "Received Amount" "text",
    "VA Number" "text",
    "Bank Name" "text",
    "Promotion(s)" "text",
    "Invoice ID" "text",
    "Customer Name" "text",
    "Customer Email" "text",
    "Customer Mobile Number" "text"
);


ALTER TABLE "public"."xendit_backup" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Account" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Account_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Session" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Session_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."User" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."User_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."environment_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."environment_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."environment_switch_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."environment_switch_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."migration_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migration_log_id_seq"'::"regclass");



ALTER TABLE ONLY "devcopy"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "devcopy"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "devcopy"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_affiliate_id_key" UNIQUE ("affiliate_id");



ALTER TABLE ONLY "devcopy"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "devcopy"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_ads"
    ADD CONSTRAINT "ad_ads_fb_ad_id_key" UNIQUE ("fb_ad_id");



ALTER TABLE ONLY "public"."ad_ads"
    ADD CONSTRAINT "ad_ads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_adsets"
    ADD CONSTRAINT "ad_adsets_fb_adset_id_key" UNIQUE ("fb_adset_id");



ALTER TABLE ONLY "public"."ad_adsets"
    ADD CONSTRAINT "ad_adsets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_fb_campaign_id_key" UNIQUE ("fb_campaign_id");



ALTER TABLE ONLY "public"."ad_campaigns"
    ADD CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_spend"
    ADD CONSTRAINT "ad_spend_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_verifications"
    ADD CONSTRAINT "admin_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_bank_validations"
    ADD CONSTRAINT "affiliate_bank_validations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_conversions"
    ADD CONSTRAINT "affiliate_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_affiliate_id_slug_key" UNIQUE ("affiliate_id", "slug");



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_payout_batches"
    ADD CONSTRAINT "affiliate_payout_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_payout_rules"
    ADD CONSTRAINT "affiliate_payout_rules_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."affiliate_payout_rules"
    ADD CONSTRAINT "affiliate_payout_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_program_config"
    ADD CONSTRAINT "affiliate_program_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_cache"
    ADD CONSTRAINT "api_cache_cache_key_key" UNIQUE ("cache_key");



ALTER TABLE ONLY "public"."api_cache"
    ADD CONSTRAINT "api_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_campaign_id_key" UNIQUE ("campaign_id");



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_recipients"
    ADD CONSTRAINT "campaign_recipients_campaign_id_user_id_key" UNIQUE ("campaign_id", "user_id");



ALTER TABLE ONLY "public"."campaign_recipients"
    ADD CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_segments"
    ADD CONSTRAINT "campaign_segments_campaign_id_segment_id_key" UNIQUE ("campaign_id", "segment_id");



ALTER TABLE ONLY "public"."campaign_segments"
    ADD CONSTRAINT "campaign_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_campaign_id_version_key" UNIQUE ("campaign_id", "version");



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_media"
    ADD CONSTRAINT "course_media_pkey" PRIMARY KEY ("course_id", "media_id");



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_pkey" PRIMARY KEY ("course_id", "tag_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ebook_contacts"
    ADD CONSTRAINT "ebook_contacts_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_order_id_product_id_key" UNIQUE ("order_id", "product_id");



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_xendit_payment_id_key" UNIQUE ("xendit_payment_id");



ALTER TABLE ONLY "public"."email_alerts"
    ADD CONSTRAINT "email_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_automations"
    ADD CONSTRAINT "email_automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_batches"
    ADD CONSTRAINT "email_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_change_log"
    ADD CONSTRAINT "email_change_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preference_audit_logs"
    ADD CONSTRAINT "email_preference_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_processing_locks"
    ADD CONSTRAINT "email_processing_locks_lock_key_key" UNIQUE ("lock_key");



ALTER TABLE ONLY "public"."email_processing_locks"
    ADD CONSTRAINT "email_processing_locks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_processing_metrics"
    ADD CONSTRAINT "email_processing_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_send_log"
    ADD CONSTRAINT "email_send_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_course_unique" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."environment_config"
    ADD CONSTRAINT "environment_config_environment_name_key" UNIQUE ("environment_name");



ALTER TABLE ONLY "public"."environment_config"
    ADD CONSTRAINT "environment_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."environment_switch_log"
    ADD CONSTRAINT "environment_switch_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_flags"
    ADD CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gcash_verifications"
    ADD CONSTRAINT "gcash_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_position_key" UNIQUE ("module_id", "position");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_classes"
    ADD CONSTRAINT "live_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."magic_links"
    ADD CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."magic_links"
    ADD CONSTRAINT "magic_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_items"
    ADD CONSTRAINT "media_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_levels"
    ADD CONSTRAINT "membership_levels_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."membership_levels"
    ADD CONSTRAINT "membership_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_tiers"
    ADD CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migration_log"
    ADD CONSTRAINT "migration_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_progress"
    ADD CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_progress"
    ADD CONSTRAINT "module_progress_user_id_module_id_key" UNIQUE ("user_id", "module_id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_course_id_position_key" UNIQUE ("course_id", "position");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."network_postbacks"
    ADD CONSTRAINT "network_postbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_attempts"
    ADD CONSTRAINT "password_reset_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_items"
    ADD CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_resource_type_action_type_key" UNIQUE ("resource_type", "action_type");



ALTER TABLE ONLY "public"."population_operation_log"
    ADD CONSTRAINT "population_operation_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."postmark_events"
    ADD CONSTRAINT "postmark_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processing_locks"
    ADD CONSTRAINT "processing_locks_lock_name_key" UNIQUE ("lock_name");



ALTER TABLE ONLY "public"."processing_locks"
    ADD CONSTRAINT "processing_locks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_leads"
    ADD CONSTRAINT "purchase_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_customers"
    ADD CONSTRAINT "shopify_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_customers"
    ADD CONSTRAINT "shopify_customers_shopify_customer_id_key" UNIQUE ("shopify_customer_id");



ALTER TABLE ONLY "public"."shopify_order_items"
    ADD CONSTRAINT "shopify_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_order_items"
    ADD CONSTRAINT "shopify_order_items_shopify_line_item_id_key" UNIQUE ("shopify_line_item_id");



ALTER TABLE ONLY "public"."shopify_orders"
    ADD CONSTRAINT "shopify_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_orders"
    ADD CONSTRAINT "shopify_orders_shopify_order_id_key" UNIQUE ("shopify_order_id");



ALTER TABLE ONLY "public"."shopify_product_variants"
    ADD CONSTRAINT "shopify_product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_product_variants"
    ADD CONSTRAINT "shopify_product_variants_shopify_variant_id_key" UNIQUE ("shopify_variant_id");



ALTER TABLE ONLY "public"."shopify_products"
    ADD CONSTRAINT "shopify_products_handle_idx" UNIQUE ("handle");



ALTER TABLE ONLY "public"."shopify_products"
    ADD CONSTRAINT "shopify_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_products"
    ADD CONSTRAINT "shopify_products_shopify_product_id_key" UNIQUE ("shopify_product_id");



ALTER TABLE ONLY "public"."shopify_webhook_queue"
    ADD CONSTRAINT "shopify_webhook_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."systemeio"
    ADD CONSTRAINT "systemeio_pkey" PRIMARY KEY ("Email", "Date Registered");



ALTER TABLE ONLY "public"."tag_types"
    ADD CONSTRAINT "tag_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tag_types"
    ADD CONSTRAINT "tag_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_affiliate_id_key" UNIQUE ("affiliate_id");



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "unique_affiliates_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "unique_user_product_wishlist" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_carts"
    ADD CONSTRAINT "user_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_email_preferences"
    ADD CONSTRAINT "user_email_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_email_preferences"
    ADD CONSTRAINT "user_email_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_tier_id_key" UNIQUE ("user_id", "tier_id");



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "user_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tags"
    ADD CONSTRAINT "user_tags_pkey" PRIMARY KEY ("user_id", "tag_id");



ALTER TABLE ONLY "public"."user_time_spent"
    ADD CONSTRAINT "user_time_spent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xendit"
    ADD CONSTRAINT "xendit_pkey" PRIMARY KEY ("External ID");



CREATE INDEX "enrollments_course_id_idx" ON "devcopy"."enrollments" USING "btree" ("course_id");



CREATE INDEX "enrollments_enrolled_at_idx" ON "devcopy"."enrollments" USING "btree" ("enrolled_at");



CREATE INDEX "enrollments_expires_at_idx" ON "devcopy"."enrollments" USING "btree" ("expires_at");



CREATE INDEX "enrollments_status_idx" ON "devcopy"."enrollments" USING "btree" ("status");



CREATE INDEX "enrollments_transaction_id_idx" ON "devcopy"."enrollments" USING "btree" ("transaction_id");



CREATE INDEX "enrollments_user_id_course_id_idx" ON "devcopy"."enrollments" USING "btree" ("user_id", "course_id");



CREATE INDEX "enrollments_user_id_idx" ON "devcopy"."enrollments" USING "btree" ("user_id");



CREATE INDEX "unified_profiles_acquisition_source_idx" ON "devcopy"."unified_profiles" USING "btree" ("acquisition_source");



CREATE INDEX "unified_profiles_acquisition_source_idx1" ON "devcopy"."unified_profiles" USING "btree" ("acquisition_source");



CREATE INDEX "unified_profiles_created_at_idx" ON "devcopy"."unified_profiles" USING "btree" ("created_at");



CREATE INDEX "unified_profiles_email_idx" ON "devcopy"."unified_profiles" USING "btree" ("email");



CREATE INDEX "unified_profiles_email_idx1" ON "devcopy"."unified_profiles" USING "gin" ("email" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_first_name_idx" ON "devcopy"."unified_profiles" USING "gin" ("first_name" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_last_name_idx" ON "devcopy"."unified_profiles" USING "gin" ("last_name" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_lower_idx" ON "devcopy"."unified_profiles" USING "btree" ("lower"("email"));



CREATE INDEX "unified_profiles_status_idx" ON "devcopy"."unified_profiles" USING "btree" ("status");



CREATE INDEX "unified_profiles_tags_idx" ON "devcopy"."unified_profiles" USING "gin" ("tags");



CREATE INDEX "unified_profiles_tags_idx1" ON "devcopy"."unified_profiles" USING "gin" ("tags");



CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account" USING "btree" ("provider", "providerAccountId");



CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session" USING "btree" ("sessionToken");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken" USING "btree" ("identifier", "token");



CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken" USING "btree" ("token");



CREATE INDEX "admin_audit_log_action_type_idx" ON "public"."admin_audit_log" USING "btree" ("action_type");



CREATE INDEX "admin_audit_log_admin_id_idx" ON "public"."admin_audit_log" USING "btree" ("admin_id");



CREATE INDEX "admin_audit_log_created_at_idx" ON "public"."admin_audit_log" USING "btree" ("created_at");



CREATE INDEX "admin_audit_log_entity_type_idx" ON "public"."admin_audit_log" USING "btree" ("entity_type");



CREATE INDEX "admin_audit_log_user_id_idx" ON "public"."admin_audit_log" USING "btree" ("user_id");



CREATE INDEX "affiliate_links_affiliate_id_idx" ON "public"."affiliate_links" USING "btree" ("affiliate_id");



CREATE INDEX "idx_ad_ads_adset_id" ON "public"."ad_ads" USING "btree" ("adset_id");



CREATE INDEX "idx_ad_ads_fb_ad_id" ON "public"."ad_ads" USING "btree" ("fb_ad_id");



CREATE INDEX "idx_ad_adsets_campaign_id" ON "public"."ad_adsets" USING "btree" ("campaign_id");



CREATE INDEX "idx_ad_adsets_fb_adset_id" ON "public"."ad_adsets" USING "btree" ("fb_adset_id");



CREATE INDEX "idx_ad_attributions_ad_id" ON "public"."ad_attributions" USING "btree" ("ad_id");



CREATE INDEX "idx_ad_attributions_adset_id" ON "public"."ad_attributions" USING "btree" ("adset_id");



CREATE INDEX "idx_ad_attributions_campaign_id" ON "public"."ad_attributions" USING "btree" ("campaign_id");



CREATE INDEX "idx_ad_attributions_event_time" ON "public"."ad_attributions" USING "btree" ("event_time");



CREATE INDEX "idx_ad_attributions_user_id" ON "public"."ad_attributions" USING "btree" ("user_id");



CREATE INDEX "idx_ad_campaigns_fb_campaign_id" ON "public"."ad_campaigns" USING "btree" ("fb_campaign_id");



CREATE INDEX "idx_ad_spend_date_ad_id" ON "public"."ad_spend" USING "btree" ("date", "ad_id");



CREATE INDEX "idx_admin_activity_log_activity_type" ON "public"."admin_activity_log" USING "btree" ("activity_type");



CREATE INDEX "idx_admin_activity_log_admin_user_id" ON "public"."admin_activity_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_activity_log_target_entity_id" ON "public"."admin_activity_log" USING "btree" ("target_entity_id");



CREATE INDEX "idx_admin_activity_log_timestamp" ON "public"."admin_activity_log" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_admin_verifications_admin_user_id" ON "public"."admin_verifications" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_verifications_target_entity" ON "public"."admin_verifications" USING "btree" ("target_entity_id", "target_entity_type");



CREATE INDEX "idx_affiliate_clicks_affiliate_id_created_at" ON "public"."affiliate_clicks" USING "btree" ("affiliate_id", "created_at" DESC);



CREATE INDEX "idx_affiliate_clicks_created_at" ON "public"."affiliate_clicks" USING "btree" ("created_at");



CREATE INDEX "idx_affiliate_clicks_ip_address" ON "public"."affiliate_clicks" USING "btree" ("ip_address");



CREATE INDEX "idx_affiliate_clicks_utm_params" ON "public"."affiliate_clicks" USING "gin" ("utm_params");



CREATE INDEX "idx_affiliate_clicks_visitor_id" ON "public"."affiliate_clicks" USING "btree" ("visitor_id");



CREATE INDEX "idx_affiliate_conversions_affiliate_id_status" ON "public"."affiliate_conversions" USING "btree" ("affiliate_id", "status");



CREATE INDEX "idx_affiliate_conversions_affiliate_id_status_created_at" ON "public"."affiliate_conversions" USING "btree" ("affiliate_id", "status", "created_at" DESC);



CREATE INDEX "idx_affiliate_conversions_cleared_at" ON "public"."affiliate_conversions" USING "btree" ("cleared_at");



CREATE INDEX "idx_affiliate_conversions_created_at" ON "public"."affiliate_conversions" USING "btree" ("created_at");



CREATE INDEX "idx_affiliate_conversions_order_id" ON "public"."affiliate_conversions" USING "btree" ("order_id");



CREATE INDEX "idx_affiliate_conversions_paid_at" ON "public"."affiliate_conversions" USING "btree" ("paid_at");



CREATE INDEX "idx_affiliate_conversions_status" ON "public"."affiliate_conversions" USING "btree" ("status");



CREATE INDEX "idx_affiliate_payout_batches_status" ON "public"."affiliate_payout_batches" USING "btree" ("status");



CREATE INDEX "idx_affiliate_payouts_affiliate_id" ON "public"."affiliate_payouts" USING "btree" ("affiliate_id");



CREATE INDEX "idx_affiliate_payouts_batch_id" ON "public"."affiliate_payouts" USING "btree" ("batch_id");



CREATE INDEX "idx_affiliate_payouts_status" ON "public"."affiliate_payouts" USING "btree" ("status");



CREATE INDEX "idx_affiliates_created_at" ON "public"."affiliates" USING "btree" ("created_at");



CREATE INDEX "idx_affiliates_status" ON "public"."affiliates" USING "btree" ("status");



CREATE INDEX "idx_announcements_publish_date" ON "public"."announcements" USING "btree" ("publish_date" DESC);



CREATE INDEX "idx_announcements_status_publish_date" ON "public"."announcements" USING "btree" ("status", "publish_date");



CREATE INDEX "idx_announcements_type" ON "public"."announcements" USING "btree" ("type");



CREATE INDEX "idx_api_cache_expires" ON "public"."api_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_api_cache_key" ON "public"."api_cache" USING "btree" ("cache_key");



CREATE INDEX "idx_api_cache_type" ON "public"."api_cache" USING "btree" ("api_type");



CREATE INDEX "idx_content_templates_type" ON "public"."content_templates" USING "btree" ("type");



CREATE INDEX "idx_ebook_contacts_created_at" ON "public"."ebook_contacts" USING "btree" ("created_at");



CREATE INDEX "idx_ecommerce_order_items_order_id" ON "public"."ecommerce_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_ecommerce_order_items_product_id" ON "public"."ecommerce_order_items" USING "btree" ("product_id");



CREATE INDEX "idx_ecommerce_orders_status" ON "public"."ecommerce_orders" USING "btree" ("order_status");



CREATE INDEX "idx_ecommerce_orders_transaction_id" ON "public"."ecommerce_orders" USING "btree" ("transaction_id");



CREATE INDEX "idx_ecommerce_orders_unified_profile_id" ON "public"."ecommerce_orders" USING "btree" ("unified_profile_id");



CREATE INDEX "idx_ecommerce_orders_user_id" ON "public"."ecommerce_orders" USING "btree" ("user_id");



CREATE INDEX "idx_email_alerts_resolved" ON "public"."email_alerts" USING "btree" ("resolved");



CREATE INDEX "idx_email_alerts_timestamp" ON "public"."email_alerts" USING "btree" ("timestamp");



CREATE INDEX "idx_email_alerts_type" ON "public"."email_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_email_batches_campaign_id" ON "public"."email_batches" USING "btree" ("campaign_id");



CREATE INDEX "idx_email_batches_status" ON "public"."email_batches" USING "btree" ("status");



CREATE INDEX "idx_email_change_log_changed_at" ON "public"."email_change_log" USING "btree" ("changed_at");



CREATE INDEX "idx_email_change_log_user_id" ON "public"."email_change_log" USING "btree" ("user_id");



CREATE INDEX "idx_email_events_campaign_event_time" ON "public"."email_events" USING "btree" ("campaign_id", "event_type", "received_at");



CREATE INDEX "idx_email_events_campaign_id" ON "public"."email_events" USING "btree" ("campaign_id");



CREATE INDEX "idx_email_events_email_id" ON "public"."email_events" USING "btree" ("email_id");



CREATE INDEX "idx_email_events_event_type" ON "public"."email_events" USING "btree" ("event_type");



CREATE INDEX "idx_email_events_provider_message_id" ON "public"."email_events" USING "btree" ("provider_message_id");



CREATE INDEX "idx_email_events_received_at" ON "public"."email_events" USING "btree" ("received_at");



CREATE INDEX "idx_email_events_recipient" ON "public"."email_events" USING "btree" ("recipient");



CREATE INDEX "idx_email_events_timestamp" ON "public"."email_events" USING "btree" ("timestamp");



CREATE INDEX "idx_email_events_user_id" ON "public"."email_events" USING "btree" ("user_id");



CREATE INDEX "idx_email_preference_audit_logs_admin_user_id" ON "public"."email_preference_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_email_preference_audit_logs_user_id" ON "public"."email_preference_audit_logs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_email_processing_locks_key" ON "public"."email_processing_locks" USING "btree" ("lock_key");



CREATE INDEX "idx_email_processing_metrics_timestamp" ON "public"."email_processing_metrics" USING "btree" ("timestamp");



CREATE INDEX "idx_email_queue_campaign_id" ON "public"."email_queue" USING "btree" ("campaign_id");



CREATE INDEX "idx_email_queue_provider_message_id" ON "public"."email_queue" USING "btree" ("provider_message_id");



CREATE INDEX "idx_email_queue_scheduled_at" ON "public"."email_queue" USING "btree" ("scheduled_at");



CREATE INDEX "idx_email_queue_status" ON "public"."email_queue" USING "btree" ("status");



CREATE INDEX "idx_email_send_log_created_at" ON "public"."email_send_log" USING "btree" ("created_at");



CREATE INDEX "idx_email_send_log_lead_id" ON "public"."email_send_log" USING "btree" ("lead_id") WHERE ("lead_id" IS NOT NULL);



CREATE INDEX "idx_email_send_log_recipient" ON "public"."email_send_log" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_send_log_status" ON "public"."email_send_log" USING "btree" ("status");



CREATE INDEX "idx_email_send_log_template_id" ON "public"."email_send_log" USING "btree" ("template_id");



CREATE INDEX "idx_enrollments_course_id" ON "public"."enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_enrolled_at" ON "public"."enrollments" USING "btree" ("enrolled_at");



CREATE INDEX "idx_enrollments_expires_at" ON "public"."enrollments" USING "btree" ("expires_at");



CREATE INDEX "idx_enrollments_status" ON "public"."enrollments" USING "btree" ("status");



CREATE INDEX "idx_enrollments_transaction_id" ON "public"."enrollments" USING "btree" ("transaction_id");



CREATE INDEX "idx_enrollments_user_course" ON "public"."enrollments" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_enrollments_user_id" ON "public"."enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_fraud_flags_affiliate_id_resolved_created_at" ON "public"."fraud_flags" USING "btree" ("affiliate_id", "resolved", "created_at" DESC);



CREATE INDEX "idx_fraud_flags_created_at" ON "public"."fraud_flags" USING "btree" ("created_at");



CREATE INDEX "idx_fraud_flags_resolved" ON "public"."fraud_flags" USING "btree" ("resolved");



CREATE INDEX "idx_gcash_verifications_affiliate_id" ON "public"."gcash_verifications" USING "btree" ("affiliate_id");



CREATE INDEX "idx_gcash_verifications_current_step" ON "public"."gcash_verifications" USING "btree" ("current_step");



CREATE INDEX "idx_gcash_verifications_expires_at" ON "public"."gcash_verifications" USING "btree" ("expires_at");



CREATE INDEX "idx_gcash_verifications_status" ON "public"."gcash_verifications" USING "btree" ("status");



CREATE INDEX "idx_gcash_verifications_submitted_at" ON "public"."gcash_verifications" USING "btree" ("submitted_at");



CREATE INDEX "idx_lessons_module_id" ON "public"."lessons" USING "btree" ("module_id");



CREATE INDEX "idx_magic_links_email" ON "public"."magic_links" USING "btree" ("email");



CREATE INDEX "idx_magic_links_expires_at" ON "public"."magic_links" USING "btree" ("expires_at");



CREATE INDEX "idx_magic_links_purpose" ON "public"."magic_links" USING "btree" ("purpose");



CREATE INDEX "idx_magic_links_token" ON "public"."magic_links" USING "btree" ("token");



CREATE INDEX "idx_magic_links_used_at" ON "public"."magic_links" USING "btree" ("used_at");



CREATE INDEX "idx_magic_links_user_id" ON "public"."magic_links" USING "btree" ("user_id");



CREATE INDEX "idx_media_assets_course_id" ON "public"."media_assets" USING "btree" ("course_id");



CREATE INDEX "idx_media_assets_type" ON "public"."media_assets" USING "btree" ("type");



CREATE INDEX "idx_media_items_type" ON "public"."media_items" USING "btree" ("type");



CREATE INDEX "idx_modules_section_id" ON "public"."modules" USING "btree" ("section_id");



CREATE INDEX "idx_password_reset_attempts_created_at" ON "public"."password_reset_attempts" USING "btree" ("created_at");



CREATE INDEX "idx_password_reset_attempts_email" ON "public"."password_reset_attempts" USING "btree" ("email");



CREATE INDEX "idx_password_reset_attempts_ip_address" ON "public"."password_reset_attempts" USING "btree" ("ip_address");



CREATE INDEX "idx_payout_items_conversion_id" ON "public"."payout_items" USING "btree" ("conversion_id");



CREATE INDEX "idx_payout_items_payout_id" ON "public"."payout_items" USING "btree" ("payout_id");



CREATE INDEX "idx_population_operation_log_table_started" ON "public"."population_operation_log" USING "btree" ("table_name", "started_at" DESC);



CREATE INDEX "idx_processing_locks_expires_at" ON "public"."processing_locks" USING "btree" ("expires_at");



CREATE INDEX "idx_product_reviews_approved_product" ON "public"."product_reviews" USING "btree" ("product_id", "is_approved") WHERE ("is_approved" = true);



CREATE INDEX "idx_product_reviews_product_id" ON "public"."product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_user_id" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_products_collection_handles" ON "public"."shopify_products" USING "gin" ("collection_handles");



CREATE INDEX "idx_purchase_leads_email" ON "public"."purchase_leads" USING "btree" ("email");



CREATE INDEX "idx_purchase_leads_product_type" ON "public"."purchase_leads" USING "btree" ("product_type");



CREATE INDEX "idx_purchase_leads_status" ON "public"."purchase_leads" USING "btree" ("status");



CREATE INDEX "idx_purchase_leads_submitted_at" ON "public"."purchase_leads" USING "btree" ("submitted_at");



CREATE INDEX "idx_purchase_leads_xendit_external_id" ON "public"."purchase_leads" USING "btree" ("xendit_external_id") WHERE ("xendit_external_id" IS NOT NULL);



CREATE INDEX "idx_sections_course_id" ON "public"."sections" USING "btree" ("course_id");



CREATE INDEX "idx_security_events_created_at" ON "public"."security_events" USING "btree" ("created_at");



CREATE INDEX "idx_security_events_event_type" ON "public"."security_events" USING "btree" ("event_type");



CREATE INDEX "idx_security_events_ip_address" ON "public"."security_events" USING "btree" ("ip_address");



CREATE INDEX "idx_security_events_user_id" ON "public"."security_events" USING "btree" ("user_id");



CREATE INDEX "idx_shopify_customers_customer_id" ON "public"."shopify_customers" USING "btree" ("shopify_customer_id");



CREATE INDEX "idx_shopify_customers_email" ON "public"."shopify_customers" USING "btree" ("email");



CREATE INDEX "idx_shopify_customers_email_lower" ON "public"."shopify_customers" USING "btree" ("lower"("email"));



CREATE INDEX "idx_shopify_customers_unified_profile_id" ON "public"."shopify_customers" USING "btree" ("unified_profile_id");



CREATE INDEX "idx_shopify_order_items_line_item_id" ON "public"."shopify_order_items" USING "btree" ("shopify_line_item_id");



CREATE INDEX "idx_shopify_order_items_order_id" ON "public"."shopify_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_shopify_order_items_product_id" ON "public"."shopify_order_items" USING "btree" ("product_id");



CREATE INDEX "idx_shopify_order_items_variant_id" ON "public"."shopify_order_items" USING "btree" ("variant_id");



CREATE INDEX "idx_shopify_orders_created_at" ON "public"."shopify_orders" USING "btree" ("created_at");



CREATE INDEX "idx_shopify_orders_customer_id" ON "public"."shopify_orders" USING "btree" ("customer_id");



CREATE INDEX "idx_shopify_orders_email" ON "public"."shopify_orders" USING "btree" ("email");



CREATE INDEX "idx_shopify_orders_email_lower" ON "public"."shopify_orders" USING "btree" ("lower"("email"));



CREATE INDEX "idx_shopify_orders_financial_status" ON "public"."shopify_orders" USING "btree" ("financial_status");



CREATE INDEX "idx_shopify_orders_order_id" ON "public"."shopify_orders" USING "btree" ("shopify_order_id");



CREATE INDEX "idx_shopify_product_variants_product_id" ON "public"."shopify_product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_shopify_product_variants_sku" ON "public"."shopify_product_variants" USING "btree" ("sku");



CREATE INDEX "idx_shopify_product_variants_variant_id" ON "public"."shopify_product_variants" USING "btree" ("shopify_variant_id");



CREATE INDEX "idx_shopify_products_handle" ON "public"."shopify_products" USING "btree" ("handle");



CREATE INDEX "idx_shopify_products_product_id" ON "public"."shopify_products" USING "btree" ("shopify_product_id");



CREATE INDEX "idx_tags_parent_id" ON "public"."tags" USING "btree" ("parent_id");



CREATE INDEX "idx_tags_type_id" ON "public"."tags" USING "btree" ("type_id");



CREATE INDEX "idx_transactions_contact_email_lower" ON "public"."transactions" USING "btree" ("lower"("contact_email"));



CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_expires_at" ON "public"."transactions" USING "btree" ("expires_at");



CREATE INDEX "idx_transactions_paid_at" ON "public"."transactions" USING "btree" ("paid_at");



CREATE INDEX "idx_transactions_settled_at" ON "public"."transactions" USING "btree" ("settled_at");



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "idx_transactions_transaction_type" ON "public"."transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_unified_profiles_acquisition_source" ON "public"."unified_profiles" USING "btree" ("acquisition_source");



CREATE INDEX "idx_unified_profiles_email" ON "public"."unified_profiles" USING "btree" ("email");



CREATE INDEX "idx_unified_profiles_email_lower" ON "public"."unified_profiles" USING "btree" ("lower"("email"));



CREATE INDEX "idx_unified_profiles_tags" ON "public"."unified_profiles" USING "gin" ("tags");



CREATE INDEX "idx_user_segments_segment_id" ON "public"."user_segments" USING "btree" ("segment_id");



CREATE INDEX "idx_user_segments_user_id" ON "public"."user_segments" USING "btree" ("user_id");



CREATE INDEX "idx_user_tags_tag_id" ON "public"."user_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_user_tags_user_id" ON "public"."user_tags" USING "btree" ("user_id");



CREATE INDEX "idx_wishlist_items_product_id" ON "public"."wishlist_items" USING "btree" ("product_id");



CREATE INDEX "idx_wishlist_items_user_id" ON "public"."wishlist_items" USING "btree" ("user_id");



CREATE INDEX "unified_profiles_acquisition_source_idx" ON "public"."unified_profiles" USING "btree" ("acquisition_source");



CREATE INDEX "unified_profiles_created_at_idx" ON "public"."unified_profiles" USING "btree" ("created_at");



CREATE INDEX "unified_profiles_email_trgm_idx" ON "public"."unified_profiles" USING "gin" ("email" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_first_name_trgm_idx" ON "public"."unified_profiles" USING "gin" ("first_name" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_last_name_trgm_idx" ON "public"."unified_profiles" USING "gin" ("last_name" "public"."gin_trgm_ops");



CREATE INDEX "unified_profiles_status_idx" ON "public"."unified_profiles" USING "btree" ("status");



CREATE INDEX "unified_profiles_tags_idx" ON "public"."unified_profiles" USING "gin" ("tags");



CREATE INDEX "user_activity_log_activity_type_idx" ON "public"."user_activity_log" USING "btree" ("activity_type");



CREATE INDEX "user_activity_log_created_at_idx" ON "public"."user_activity_log" USING "btree" ("created_at");



CREATE INDEX "user_activity_log_resource_type_idx" ON "public"."user_activity_log" USING "btree" ("resource_type");



CREATE INDEX "user_activity_log_user_id_idx" ON "public"."user_activity_log" USING "btree" ("user_id");



CREATE INDEX "user_carts_product_id_idx" ON "public"."user_carts" USING "btree" ("product_id");



CREATE INDEX "user_carts_user_id_idx" ON "public"."user_carts" USING "btree" ("user_id");



CREATE UNIQUE INDEX "user_carts_user_product_idx" ON "public"."user_carts" USING "btree" ("user_id", "product_id");



CREATE INDEX "user_notes_admin_id_idx" ON "public"."user_notes" USING "btree" ("admin_id");



CREATE INDEX "user_notes_created_at_idx" ON "public"."user_notes" USING "btree" ("created_at");



CREATE INDEX "user_notes_is_pinned_idx" ON "public"."user_notes" USING "btree" ("is_pinned");



CREATE INDEX "user_notes_note_type_idx" ON "public"."user_notes" USING "btree" ("note_type");



CREATE INDEX "user_notes_user_id_idx" ON "public"."user_notes" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "after_profile_update" AFTER UPDATE ON "public"."unified_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_profile_update"();



CREATE OR REPLACE TRIGGER "after_transaction_insert" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_transaction_insert"();



CREATE OR REPLACE TRIGGER "log_environment_switch_trigger" AFTER UPDATE ON "public"."environment_config" FOR EACH ROW EXECUTE FUNCTION "public"."log_environment_switch"();



CREATE OR REPLACE TRIGGER "on_ebook_contacts_update" BEFORE UPDATE ON "public"."ebook_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_ebook_contacts_update"();



CREATE OR REPLACE TRIGGER "on_user_segments_update" BEFORE UPDATE ON "public"."user_segments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_admin_verifications_updated_at" BEFORE UPDATE ON "public"."admin_verifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_affiliate_clicks_updated_at" BEFORE UPDATE ON "public"."affiliate_clicks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_affiliate_conversions_updated_at" BEFORE UPDATE ON "public"."affiliate_conversions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_affiliate_links_updated_at" BEFORE UPDATE ON "public"."affiliate_links" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_affiliate_program_config_updated_at" BEFORE UPDATE ON "public"."affiliate_program_config" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_affiliates_updated_at" BEFORE UPDATE ON "public"."affiliates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_fraud_flags_updated_at" BEFORE UPDATE ON "public"."fraud_flags" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_fraud_flags_timestamp"();



CREATE OR REPLACE TRIGGER "set_live_classes_updated_at" BEFORE UPDATE ON "public"."live_classes" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_membership_levels_updated_at" BEFORE UPDATE ON "public"."membership_levels" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_network_postbacks_updated_at" BEFORE UPDATE ON "public"."network_postbacks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_payout_items_updated_at" BEFORE UPDATE ON "public"."payout_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_segments_timestamp" BEFORE UPDATE ON "public"."segments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "sync_affiliate_clicks_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."affiliate_clicks" FOR EACH ROW EXECUTE FUNCTION "public"."sync_affiliate_clicks_changes"();



CREATE OR REPLACE TRIGGER "sync_affiliate_conversions_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."affiliate_conversions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_affiliate_conversions_changes"();



CREATE OR REPLACE TRIGGER "sync_affiliates_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."affiliates" FOR EACH ROW EXECUTE FUNCTION "public"."sync_affiliates_changes"();



CREATE OR REPLACE TRIGGER "sync_ebook_contacts_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."ebook_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ebook_contacts_changes"();



CREATE OR REPLACE TRIGGER "sync_ecommerce_order_items_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."ecommerce_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ecommerce_order_items_changes"();



CREATE OR REPLACE TRIGGER "sync_ecommerce_orders_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."ecommerce_orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ecommerce_orders_changes"();



CREATE OR REPLACE TRIGGER "sync_enrollments_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_enrollments_changes"();



CREATE OR REPLACE TRIGGER "sync_fraud_flags_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."fraud_flags" FOR EACH ROW EXECUTE FUNCTION "public"."sync_fraud_flags_changes"();



CREATE OR REPLACE TRIGGER "sync_purchase_leads_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."purchase_leads" FOR EACH ROW EXECUTE FUNCTION "public"."sync_purchase_leads_changes"();



CREATE OR REPLACE TRIGGER "sync_transactions_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_transactions_changes"();



CREATE OR REPLACE TRIGGER "sync_unified_profiles_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."unified_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_unified_profiles_changes"();



CREATE OR REPLACE TRIGGER "sync_user_tags_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_tags" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_tags_changes"();



CREATE OR REPLACE TRIGGER "trg_postmark_events_insert" AFTER INSERT ON "public"."postmark_events" FOR EACH ROW EXECUTE FUNCTION "public"."fn_normalize_postmark_event"();



CREATE OR REPLACE TRIGGER "trigger_flag_affiliate_on_fraud_insert" AFTER INSERT ON "public"."fraud_flags" FOR EACH ROW EXECUTE FUNCTION "public"."update_affiliate_status_on_fraud_flag"();



CREATE OR REPLACE TRIGGER "trigger_set_conversion_commission" BEFORE INSERT ON "public"."affiliate_conversions" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_and_set_conversion_commission"();



CREATE OR REPLACE TRIGGER "trigger_sync_is_student_after_enrollment_change" AFTER INSERT OR DELETE OR UPDATE OF "user_id", "status" ON "public"."user_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_is_student_from_enrollments"();



CREATE OR REPLACE TRIGGER "trigger_sync_is_student_on_enrollments_change" AFTER INSERT OR DELETE OR UPDATE OF "user_id", "status" ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_is_student_from_enrollments"();



CREATE OR REPLACE TRIGGER "trigger_sync_unified_profile_after_affiliate_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."affiliates" FOR EACH ROW EXECUTE FUNCTION "public"."sync_unified_profile_from_affiliate_changes"();



CREATE OR REPLACE TRIGGER "update_access_grants_updated_at" BEFORE UPDATE ON "public"."access_grants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_payout_batches_updated_at" BEFORE UPDATE ON "public"."affiliate_payout_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_payout_rules_updated_at" BEFORE UPDATE ON "public"."affiliate_payout_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_payouts_updated_at" BEFORE UPDATE ON "public"."affiliate_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_affiliate_status_on_fraud_flag" AFTER INSERT ON "public"."fraud_flags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_fraud_flag_affiliate_suspension"();



CREATE OR REPLACE TRIGGER "update_api_cache_timestamp" BEFORE UPDATE ON "public"."api_cache" FOR EACH ROW EXECUTE FUNCTION "public"."update_api_cache_timestamp"();



CREATE OR REPLACE TRIGGER "update_campaign_analytics_updated_at" BEFORE UPDATE ON "public"."campaign_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_recipients_updated_at" BEFORE UPDATE ON "public"."campaign_recipients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_segments_updated_at" BEFORE UPDATE ON "public"."campaign_segments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_templates_updated_at" BEFORE UPDATE ON "public"."campaign_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_progress_from_lesson_trigger" AFTER INSERT OR UPDATE ON "public"."user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_progress_from_lesson"();



CREATE OR REPLACE TRIGGER "update_course_progress_trigger" AFTER INSERT OR UPDATE ON "public"."module_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_progress"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discount_codes_updated_at" BEFORE UPDATE ON "public"."discount_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_automations_updated_at" BEFORE UPDATE ON "public"."email_automations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_batches_updated_at" BEFORE UPDATE ON "public"."email_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_campaigns_updated_at" BEFORE UPDATE ON "public"."email_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_processing_locks_updated_at" BEFORE UPDATE ON "public"."email_processing_locks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_queue_updated_at" BEFORE UPDATE ON "public"."email_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_media_assets_updated_at" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_membership_tiers_updated_at" BEFORE UPDATE ON "public"."membership_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_module_progress_trigger" AFTER INSERT OR UPDATE OF "status", "progress_percentage" ON "public"."user_progress" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"text") OR ("new"."progress_percentage" >= (100)::numeric))) EXECUTE FUNCTION "public"."update_module_progress"();



CREATE OR REPLACE TRIGGER "update_modules_updated_at" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_permissions_updated_at" BEFORE UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_roles_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_payments_updated_at" BEFORE UPDATE ON "public"."subscription_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_carts_updated_at" BEFORE UPDATE ON "public"."user_carts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_email_preferences_updated_at" BEFORE UPDATE ON "public"."user_email_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_enrollments_updated_at" BEFORE UPDATE ON "public"."user_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_memberships_updated_at" BEFORE UPDATE ON "public"."user_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_notes_updated_at_trigger" BEFORE UPDATE ON "public"."user_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_notes_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_progress_updated_at" BEFORE UPDATE ON "public"."user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_ads"
    ADD CONSTRAINT "ad_ads_adset_id_fkey" FOREIGN KEY ("adset_id") REFERENCES "public"."ad_adsets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_adsets"
    ADD CONSTRAINT "ad_adsets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "public"."ad_ads"("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_adset_id_fkey" FOREIGN KEY ("adset_id") REFERENCES "public"."ad_adsets"("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."ad_attributions"
    ADD CONSTRAINT "ad_attributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."ad_spend"
    ADD CONSTRAINT "ad_spend_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "public"."ad_ads"("id");



ALTER TABLE ONLY "public"."ad_spend"
    ADD CONSTRAINT "ad_spend_adset_id_fkey" FOREIGN KEY ("adset_id") REFERENCES "public"."ad_adsets"("id");



ALTER TABLE ONLY "public"."ad_spend"
    ADD CONSTRAINT "ad_spend_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."admin_verifications"
    ADD CONSTRAINT "admin_verifications_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."affiliate_bank_validations"
    ADD CONSTRAINT "affiliate_bank_validations_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_conversions"
    ADD CONSTRAINT "affiliate_conversions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_conversions"
    ADD CONSTRAINT "affiliate_conversions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "public"."affiliate_clicks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."affiliate_conversions"
    ADD CONSTRAINT "affiliate_conversions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id");



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."affiliate_payout_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_parent_affiliate_fkey" FOREIGN KEY ("parent_affiliate") REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_recipients"
    ADD CONSTRAINT "campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_recipients"
    ADD CONSTRAINT "campaign_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_segments"
    ADD CONSTRAINT "campaign_segments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_segments"
    ADD CONSTRAINT "campaign_segments_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."course_media"
    ADD CONSTRAINT "course_media_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_media"
    ADD CONSTRAINT "course_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_progress"
    ADD CONSTRAINT "course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_required_tier_id_fkey" FOREIGN KEY ("required_tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."ecommerce_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ecommerce_order_items"
    ADD CONSTRAINT "ecommerce_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_unified_profile_id_fkey" FOREIGN KEY ("unified_profile_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."ecommerce_orders"
    ADD CONSTRAINT "ecommerce_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_alerts"
    ADD CONSTRAINT "email_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_automations"
    ADD CONSTRAINT "email_automations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_batches"
    ADD CONSTRAINT "email_batches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_selected_template_id_fkey" FOREIGN KEY ("selected_template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_change_log"
    ADD CONSTRAINT "email_change_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_change_log"
    ADD CONSTRAINT "email_change_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_events"
    ADD CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_preference_audit_logs"
    ADD CONSTRAINT "email_preference_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_preference_audit_logs"
    ADD CONSTRAINT "email_preference_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_send_log"
    ADD CONSTRAINT "email_send_log_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."purchase_leads"("id");



ALTER TABLE ONLY "public"."email_send_log"
    ADD CONSTRAINT "email_send_log_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "fk_campaign" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id");



ALTER TABLE ONLY "public"."email_batches"
    ADD CONSTRAINT "fk_campaign" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "fk_product_reviews_user_id_to_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "fk_product_reviews_user_id_to_profiles" ON "public"."product_reviews" IS 'Links the review to the author''s profile.';



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "fk_tags_parent_id" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "fk_tags_type_id" FOREIGN KEY ("type_id") REFERENCES "public"."tag_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "fk_unified_profiles_affiliate_id" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "fk_user_segments_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fraud_flags"
    ADD CONSTRAINT "fraud_flags_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gcash_verifications"
    ADD CONSTRAINT "gcash_verifications_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gcash_verifications"
    ADD CONSTRAINT "gcash_verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."magic_links"
    ADD CONSTRAINT "magic_links_purchase_lead_id_fkey" FOREIGN KEY ("purchase_lead_id") REFERENCES "public"."purchase_leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."magic_links"
    ADD CONSTRAINT "magic_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_progress"
    ADD CONSTRAINT "module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_progress"
    ADD CONSTRAINT "module_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."network_postbacks"
    ADD CONSTRAINT "network_postbacks_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "public"."affiliate_conversions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_items"
    ADD CONSTRAINT "payout_items_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "public"."affiliate_conversions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopify_customers"
    ADD CONSTRAINT "shopify_customers_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopify_customers"
    ADD CONSTRAINT "shopify_customers_unified_profile_id_fkey" FOREIGN KEY ("unified_profile_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."shopify_order_items"
    ADD CONSTRAINT "shopify_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."shopify_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopify_order_items"
    ADD CONSTRAINT "shopify_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id");



ALTER TABLE ONLY "public"."shopify_order_items"
    ADD CONSTRAINT "shopify_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."shopify_product_variants"("id");



ALTER TABLE ONLY "public"."shopify_orders"
    ADD CONSTRAINT "shopify_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."shopify_customers"("id");



ALTER TABLE ONLY "public"."shopify_product_variants"
    ADD CONSTRAINT "shopify_product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."user_memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."unified_profiles"
    ADD CONSTRAINT "unified_profiles_membership_level_id_fkey" FOREIGN KEY ("membership_level_id") REFERENCES "public"."membership_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_carts"
    ADD CONSTRAINT "user_carts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_carts"
    ADD CONSTRAINT "user_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_email_preferences"
    ADD CONSTRAINT "user_email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_enrollments"
    ADD CONSTRAINT "user_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."unified_profiles"("id");



ALTER TABLE ONLY "public"."user_notes"
    ADD CONSTRAINT "user_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "user_segments_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tags"
    ADD CONSTRAINT "user_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tags"
    ADD CONSTRAINT "user_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."unified_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_time_spent"
    ADD CONSTRAINT "user_time_spent_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_time_spent"
    ADD CONSTRAINT "user_time_spent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shopify_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all verifications" ON "public"."gcash_verifications" USING ((EXISTS ( SELECT 1
   FROM "public"."unified_profiles"
  WHERE (("unified_profiles"."id" = "auth"."uid"()) AND ("unified_profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view all verifications" ON "public"."gcash_verifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."unified_profiles"
  WHERE (("unified_profiles"."id" = "auth"."uid"()) AND ("unified_profiles"."is_admin" = true)))));



CREATE POLICY "Affiliates can update own verification" ON "public"."gcash_verifications" FOR UPDATE USING (("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))));



CREATE POLICY "Affiliates can view own verification" ON "public"."gcash_verifications" FOR SELECT USING (("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow admin full access to payout_items" ON "public"."payout_items" TO "authenticated", "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow admins to delete affiliate records" ON "public"."affiliates" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admins to insert affiliate records" ON "public"."affiliates" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to manage fraud flags" ON "public"."fraud_flags" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to select all affiliate data" ON "public"."affiliates" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admins to select all clicks" ON "public"."affiliate_clicks" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admins to select all conversions" ON "public"."affiliate_conversions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admins to update all affiliate data" ON "public"."affiliates" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to update conversions" ON "public"."affiliate_conversions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to view all user roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Allow affiliates to see their active fraud flags" ON "public"."fraud_flags" FOR SELECT TO "authenticated" USING ((("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))) AND ("resolved" = false)));



CREATE POLICY "Allow affiliates to select their own clicks" ON "public"."affiliate_clicks" FOR SELECT TO "authenticated" USING (("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow affiliates to select their own conversions" ON "public"."affiliate_conversions" FOR SELECT TO "authenticated" USING (("affiliate_id" IN ( SELECT "affiliates"."id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow all authenticated users to read shopify products" ON "public"."shopify_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all users to view roles" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Allow anon users to read shopify products" ON "public"."shopify_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow authenticated users to insert reviews" ON "public"."product_reviews" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to insert their own affiliate record" ON "public"."affiliates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to manage user_segments" ON "public"."user_segments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow full access for admins" ON "public"."announcements" USING (((( SELECT (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text")))::boolean = true)) WITH CHECK (((( SELECT (("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text")))::boolean = true));



CREATE POLICY "Allow individual affiliates to select their own data" ON "public"."affiliates" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual affiliates to update their own data" ON "public"."affiliates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow public read access for approved reviews" ON "public"."product_reviews" FOR SELECT USING (("is_approved" = true));



CREATE POLICY "Allow public read access to published announcements" ON "public"."announcements" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"text") AND ((("type" <> 'live_class'::"text") AND (("publish_date" <= "now"()) OR ("publish_date" IS NULL))) OR (("type" = 'live_class'::"text") AND ("publish_date" >= "now"()))) AND (("expiry_date" IS NULL) OR ("expiry_date" >= "now"()))));



CREATE POLICY "Allow select for authenticated users" ON "public"."shopify_products" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow service_role full access" ON "public"."admin_activity_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on user_segments" ON "public"."user_segments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users to delete their own wishlist items" ON "public"."wishlist_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert into their own wishlist" ON "public"."wishlist_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to select their own wishlist items" ON "public"."wishlist_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable delete for service role" ON "public"."email_processing_locks" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Enable insert for service role" ON "public"."email_batches" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Enable insert for service role" ON "public"."email_processing_locks" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Enable insert for service role" ON "public"."email_queue" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."email_batches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."email_processing_locks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."email_queue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for service role" ON "public"."email_batches" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Enable update for service role" ON "public"."email_processing_locks" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Enable update for service role" ON "public"."email_queue" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Media assets are deletable by users with manage_courses permiss" ON "public"."media_assets" FOR DELETE USING ("public"."has_permission"("auth"."uid"(), 'manage_courses'::"text"));



CREATE POLICY "Media assets are insertable by users with manage_courses permis" ON "public"."media_assets" FOR INSERT WITH CHECK ("public"."has_permission"("auth"."uid"(), 'manage_courses'::"text"));



CREATE POLICY "Media assets are updatable by users with manage_courses permiss" ON "public"."media_assets" FOR UPDATE USING ("public"."has_permission"("auth"."uid"(), 'manage_courses'::"text"));



CREATE POLICY "Media assets are viewable by everyone" ON "public"."media_assets" FOR SELECT USING (true);



CREATE POLICY "Service role can access all magic links" ON "public"."magic_links" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete their own cart items" ON "public"."user_carts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own cart items" ON "public"."user_carts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own course progress" ON "public"."course_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own module progress" ON "public"."module_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own time spent records" ON "public"."user_time_spent" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only access their own magic links" ON "public"."magic_links" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("email" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "Users can read their own cart" ON "public"."user_carts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own cart items" ON "public"."user_carts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own course progress" ON "public"."course_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own module progress" ON "public"."module_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own course progress" ON "public"."course_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own module progress" ON "public"."module_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own time spent records" ON "public"."user_time_spent" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."access_grants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "access_grants_admin_modify" ON "public"."access_grants" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "access_grants_admin_view" ON "public"."access_grants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "access_grants_view_own" ON "public"."access_grants" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_all_processing_locks" ON "public"."processing_locks" USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_app_meta_data" ->> 'role'::"text") = 'admin'::"text"))))));



CREATE POLICY "admin_manage_all_courses" ON "public"."courses" TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "admin_password_reset_attempts" ON "public"."password_reset_attempts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_id" = '5872bf95-f27f-4fd9-90e4-823f85a205cc'::"uuid")))));



CREATE POLICY "admin_read_alerts" ON "public"."email_alerts" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_app_meta_data" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'marketing'::"text"])))))));



CREATE POLICY "admin_read_metrics" ON "public"."email_processing_metrics" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_app_meta_data" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'marketing'::"text"])))))));



CREATE POLICY "admin_security_events" ON "public"."security_events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role_id" = '5872bf95-f27f-4fd9-90e4-823f85a205cc'::"uuid")))));



CREATE POLICY "admin_update_alerts" ON "public"."email_alerts" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_app_meta_data" ->> 'role'::"text") = 'admin'::"text"))))));



ALTER TABLE "public"."affiliate_clicks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliate_conversions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."affiliates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_analytics_admin_modify" ON "public"."campaign_analytics" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "campaign_analytics_admin_view" ON "public"."campaign_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."campaign_recipients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_recipients_admin_modify" ON "public"."campaign_recipients" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "campaign_recipients_admin_view" ON "public"."campaign_recipients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."campaign_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_segments_admin_modify" ON "public"."campaign_segments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "campaign_segments_admin_view" ON "public"."campaign_segments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."campaign_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_templates_admin_modify" ON "public"."campaign_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "campaign_templates_admin_view" ON "public"."campaign_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."course_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_tags_admin_modify" ON "public"."course_tags" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "course_tags_view_all" ON "public"."course_tags" FOR SELECT USING (true);



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_codes_admin_modify" ON "public"."discount_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "discount_codes_admin_view" ON "public"."discount_codes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "discount_codes_view_active" ON "public"."discount_codes" FOR SELECT USING (((("start_date" IS NULL) OR ("start_date" <= "now"())) AND (("end_date" IS NULL) OR ("end_date" >= "now"())) AND (("usage_limit" IS NULL) OR ("usage_count" < "usage_limit"))));



ALTER TABLE "public"."ebook_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_automations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_automations_admin_modify" ON "public"."email_automations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "email_automations_admin_view" ON "public"."email_automations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."email_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_campaigns_admin_modify" ON "public"."email_campaigns" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "email_campaigns_admin_view" ON "public"."email_campaigns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."email_change_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_change_log_admin_insert" ON "public"."email_change_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."unified_profiles"
  WHERE (("unified_profiles"."id" = "auth"."uid"()) AND ("unified_profiles"."is_admin" = true)))));



CREATE POLICY "email_change_log_admin_read" ON "public"."email_change_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."unified_profiles"
  WHERE (("unified_profiles"."id" = "auth"."uid"()) AND ("unified_profiles"."is_admin" = true)))));



ALTER TABLE "public"."email_processing_locks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_processing_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_templates_admin_modify" ON "public"."email_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



CREATE POLICY "email_templates_admin_view" ON "public"."email_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'admin'::"text") OR ("profiles"."role" = 'marketing'::"text"))))));



ALTER TABLE "public"."fraud_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gcash_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_admin_modify" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "invoices_admin_view" ON "public"."invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "invoices_view_own" ON "public"."invoices" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_admin_modify" ON "public"."lessons" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "lessons_admin_view_all" ON "public"."lessons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "lessons_view_published" ON "public"."lessons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."modules"
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("modules"."id" = "lessons"."module_id") AND ("courses"."status" = 'published'::"text")))));



ALTER TABLE "public"."magic_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_tiers_admin_modify" ON "public"."membership_tiers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "membership_tiers_view_all" ON "public"."membership_tiers" FOR SELECT USING (true);



ALTER TABLE "public"."module_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_admin_modify" ON "public"."modules" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "modules_admin_view_all" ON "public"."modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "modules_view_published" ON "public"."modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "modules"."course_id") AND ("courses"."status" = 'published'::"text")))));



ALTER TABLE "public"."password_reset_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_admin_view" ON "public"."payment_methods" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "payment_methods_delete_own" ON "public"."payment_methods" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "payment_methods_insert_own" ON "public"."payment_methods" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "payment_methods_update_own" ON "public"."payment_methods" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "payment_methods_view_own" ON "public"."payment_methods" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."payout_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_admin_modify" ON "public"."permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "permissions_view_all" ON "public"."permissions" FOR SELECT USING (true);



ALTER TABLE "public"."processing_locks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_policy" ON "public"."profiles" TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"))) WITH CHECK ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_modify" ON "public"."role_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "role_permissions_view_all" ON "public"."role_permissions" FOR SELECT USING (true);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_admin_modify" ON "public"."roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "roles_view_all" ON "public"."roles" FOR SELECT USING (true);



ALTER TABLE "public"."security_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_processing_locks" ON "public"."processing_locks" USING (true);



CREATE POLICY "service_role_insert_alerts" ON "public"."email_alerts" FOR INSERT WITH CHECK (true);



CREATE POLICY "service_role_insert_metrics" ON "public"."email_processing_metrics" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."subscription_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_payments_admin_modify" ON "public"."subscription_payments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "subscription_payments_admin_view" ON "public"."subscription_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "subscription_payments_view_own" ON "public"."subscription_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_admin_modify" ON "public"."tags" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "tags_view_all" ON "public"."tags" FOR SELECT USING (true);



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_admin_modify" ON "public"."transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "transactions_admin_view" ON "public"."transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "transactions_view_own" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_email_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_email_preferences_admin_view" ON "public"."user_email_preferences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_email_preferences_insert_own" ON "public"."user_email_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_email_preferences_update_own" ON "public"."user_email_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_email_preferences_view_own" ON "public"."user_email_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_enrollments_admin_modify" ON "public"."user_enrollments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_enrollments_admin_view" ON "public"."user_enrollments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_enrollments_view_own" ON "public"."user_enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_memberships_admin_modify" ON "public"."user_memberships" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_memberships_admin_view" ON "public"."user_memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_memberships_view_own" ON "public"."user_memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_progress_admin_view" ON "public"."user_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_progress_insert_own" ON "public"."user_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_update_own" ON "public"."user_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_view_own" ON "public"."user_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin_modify" ON "public"."user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_roles_admin_view" ON "public"."user_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "user_roles_view_own" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_time_spent" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view_published_courses" ON "public"."courses" FOR SELECT TO "authenticated" USING (("status" = 'published'::"text"));



ALTER TABLE "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lessons";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."media_assets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."modules";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";















































































































































































































GRANT ALL ON FUNCTION "public"."acquire_lock"("p_key" "text", "p_timeout_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."acquire_lock"("p_key" "text", "p_timeout_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_lock"("p_key" "text", "p_timeout_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_jsonb_column"("table_name" "text", "column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_jsonb_column"("table_name" "text", "column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_jsonb_column"("table_name" "text", "column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_set_conversion_commission"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_set_conversion_commission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_set_conversion_commission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_enrollment_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_enrollment_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_enrollment_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_column_exists"("table_name" "text", "column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_column_exists"("table_name" "text", "column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_column_exists"("table_name" "text", "column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_if_user_is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_if_user_is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_if_user_is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_sql"("sql" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("sql" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_normalize_postmark_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_normalize_postmark_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_normalize_postmark_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_enrollments"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_enrollments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_enrollments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_affiliate_clicks_by_date_range"("p_affiliate_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_affiliate_clicks_by_date_range"("p_affiliate_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_affiliate_clicks_by_date_range"("p_affiliate_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_environment_suffix"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_environment_suffix"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_environment_suffix"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_revenue_trends"("p_start_date" "text", "p_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue_trends"("p_start_date" "text", "p_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_revenue_trends"("p_start_date" "text", "p_end_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payout_batch_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_payout_batch_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payout_batch_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_population_history"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_population_history"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_population_history"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_revenue_by_product"("p_start_date" "text", "p_end_date" "text", "p_source_platform" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_revenue_by_product"("p_start_date" "text", "p_end_date" "text", "p_source_platform" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_revenue_by_product"("p_start_date" "text", "p_end_date" "text", "p_source_platform" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text", "p_source_platform" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text", "p_source_platform" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_revenue_trends"("p_start_date" "text", "p_end_date" "text", "p_granularity" "text", "p_source_platform" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_products_with_ratings"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_products_with_ratings"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_products_with_ratings"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_weekly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_weekly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_p2p_enrollment_trends"("start_date" timestamp without time zone, "end_date" timestamp without time zone, "target_course_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_ebook_contacts_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_ebook_contacts_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_ebook_contacts_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_fraud_flag_affiliate_suspension"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_fraud_flag_affiliate_suspension"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_fraud_flag_affiliate_suspension"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_transaction_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_transaction_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_transaction_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "required_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "required_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("user_id" "uuid", "required_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment"("x" integer, "row_id" "uuid", "table_name" "text", "column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment"("x" integer, "row_id" "uuid", "table_name" "text", "column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment"("x" integer, "row_id" "uuid", "table_name" "text", "column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_campaign_metric"("p_campaign_id" "uuid", "p_metric_name" "text", "p_increment_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_campaign_metric"("p_campaign_id" "uuid", "p_metric_name" "text", "p_increment_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_campaign_metric"("p_campaign_id" "uuid", "p_metric_name" "text", "p_increment_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb", "p_new_state" "jsonb", "p_ip_address" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb", "p_new_state" "jsonb", "p_ip_address" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("p_admin_id" "uuid", "p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_previous_state" "jsonb", "p_new_state" "jsonb", "p_ip_address" "text", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_environment_switch"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_environment_switch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_environment_switch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_metadata" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_profiles_upsert"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_profiles_upsert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_profiles_upsert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_transactions_upsert"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_transactions_upsert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_transactions_upsert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."move_lesson"("p_lesson_id" "uuid", "p_target_module_id" "uuid", "p_new_position" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."move_lesson"("p_lesson_id" "uuid", "p_target_module_id" "uuid", "p_new_position" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_lesson"("p_lesson_id" "uuid", "p_target_module_id" "uuid", "p_new_position" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_all_prod_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_all_prod_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_all_prod_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_transactions_prod"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_transactions_prod"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_transactions_prod"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_unified_profiles_prod"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_unified_profiles_prod"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_unified_profiles_prod"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_lock"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."release_lock"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_lock"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_lessons"("p_module_id" "uuid", "p_lesson_order" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_lessons"("p_module_id" "uuid", "p_lesson_order" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_lessons"("p_module_id" "uuid", "p_lesson_order" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_modules"("p_course_id" "uuid", "p_module_order" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_modules"("p_course_id" "uuid", "p_module_order" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_modules"("p_course_id" "uuid", "p_module_order" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_table_name"("base_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_table_name"("base_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_table_name"("base_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_users"("p_search_term" "text", "p_status" "text", "p_tags" "text"[], "p_acquisition_source" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_has_transactions" boolean, "p_has_enrollments" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_users"("p_search_term" "text", "p_status" "text", "p_tags" "text"[], "p_acquisition_source" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_has_transactions" boolean, "p_has_enrollments" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users"("p_search_term" "text", "p_status" "text", "p_tags" "text"[], "p_acquisition_source" "text", "p_created_after" timestamp with time zone, "p_created_before" timestamp with time zone, "p_has_transactions" boolean, "p_has_enrollments" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_environment"("target_env" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_environment"("target_env" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_environment"("target_env" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_environment_and_set_session"("target_env" "text", "switch_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_environment_and_set_session"("target_env" "text", "switch_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_environment_and_set_session"("target_env" "text", "switch_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_affiliate_clicks_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_affiliate_clicks_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_affiliate_clicks_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_affiliate_conversions_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_affiliate_conversions_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_affiliate_conversions_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_affiliates_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_affiliates_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_affiliates_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_all_user_tags_from_unified_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_all_user_tags_from_unified_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_all_user_tags_from_unified_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ebook_contacts_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ebook_contacts_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ebook_contacts_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ecommerce_order_items_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ecommerce_order_items_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ecommerce_order_items_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ecommerce_orders_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ecommerce_orders_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ecommerce_orders_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_enrollments_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_enrollments_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_enrollments_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_fraud_flags_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_fraud_flags_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_fraud_flags_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_is_student_from_enrollments"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_is_student_from_enrollments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_is_student_from_enrollments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_new_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_new_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_new_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_purchase_leads_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_purchase_leads_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_purchase_leads_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_transactions_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_transactions_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_transactions_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_unified_profile_from_affiliate_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_unified_profile_from_affiliate_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_unified_profile_from_affiliate_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_unified_profiles_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_unified_profiles_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_unified_profiles_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_tags_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_tags_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_tags_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_fraud_flags_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_fraud_flags_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_fraud_flags_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_affiliate_status_on_fraud_flag"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_affiliate_status_on_fraud_flag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_affiliate_status_on_fraud_flag"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_api_cache_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_api_cache_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_api_cache_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_progress_from_lesson"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_progress_from_lesson"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_progress_from_lesson"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_positions"("module_updates" "jsonb"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_positions"("module_updates" "jsonb"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_positions"("module_updates" "jsonb"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_positions_transaction"("p_course_id" "uuid", "p_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_module_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_module_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_module_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_revenue_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_revenue_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_revenue_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_progress"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_status" "text", "p_progress_percentage" numeric, "p_last_position" numeric, "p_completed_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_progress"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_status" "text", "p_progress_percentage" numeric, "p_last_position" numeric, "p_completed_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_progress"("p_user_id" "uuid", "p_lesson_id" "uuid", "p_status" "text", "p_progress_percentage" numeric, "p_last_position" numeric, "p_completed_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."Account" TO "anon";
GRANT ALL ON TABLE "public"."Account" TO "authenticated";
GRANT ALL ON TABLE "public"."Account" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Account_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Account_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Account_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Session" TO "anon";
GRANT ALL ON TABLE "public"."Session" TO "authenticated";
GRANT ALL ON TABLE "public"."Session" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Session_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Session_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Session_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";



GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."User_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."VerificationToken" TO "anon";
GRANT ALL ON TABLE "public"."VerificationToken" TO "authenticated";
GRANT ALL ON TABLE "public"."VerificationToken" TO "service_role";



GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."access_grants" TO "anon";
GRANT ALL ON TABLE "public"."access_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."access_grants" TO "service_role";



GRANT ALL ON TABLE "public"."ad_ads" TO "anon";
GRANT ALL ON TABLE "public"."ad_ads" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_ads" TO "service_role";



GRANT ALL ON TABLE "public"."ad_adsets" TO "anon";
GRANT ALL ON TABLE "public"."ad_adsets" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_adsets" TO "service_role";



GRANT ALL ON TABLE "public"."ad_attributions" TO "anon";
GRANT ALL ON TABLE "public"."ad_attributions" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_attributions" TO "service_role";



GRANT ALL ON TABLE "public"."ad_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."ad_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."ad_spend" TO "anon";
GRANT ALL ON TABLE "public"."ad_spend" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_spend" TO "service_role";



GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_activity_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_activity_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_activity_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_verifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_bank_validations" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_bank_validations" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_bank_validations" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_clicks" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_conversions" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_links" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_links" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_links" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_payout_batches" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_payout_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_payout_batches" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_payout_rules" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_payout_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_payout_rules" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_payouts" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_program_config" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_program_config" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_program_config" TO "service_role";



GRANT ALL ON TABLE "public"."affiliates" TO "anon";
GRANT ALL ON TABLE "public"."affiliates" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliates" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."api_cache" TO "anon";
GRANT ALL ON TABLE "public"."api_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."api_cache" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_analytics" TO "anon";
GRANT ALL ON TABLE "public"."campaign_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_recipients" TO "anon";
GRANT ALL ON TABLE "public"."campaign_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_segments" TO "anon";
GRANT ALL ON TABLE "public"."campaign_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_segments" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_templates" TO "anon";
GRANT ALL ON TABLE "public"."campaign_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_templates" TO "service_role";



GRANT ALL ON TABLE "public"."content_templates" TO "anon";
GRANT ALL ON TABLE "public"."content_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."content_templates" TO "service_role";



GRANT ALL ON TABLE "public"."course_media" TO "anon";
GRANT ALL ON TABLE "public"."course_media" TO "authenticated";
GRANT ALL ON TABLE "public"."course_media" TO "service_role";



GRANT ALL ON TABLE "public"."course_progress" TO "anon";
GRANT ALL ON TABLE "public"."course_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."course_progress" TO "service_role";



GRANT ALL ON TABLE "public"."course_tags" TO "anon";
GRANT ALL ON TABLE "public"."course_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."course_tags" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."discount_codes" TO "anon";
GRANT ALL ON TABLE "public"."discount_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_codes" TO "service_role";



GRANT ALL ON TABLE "public"."ebook_contacts" TO "anon";
GRANT ALL ON TABLE "public"."ebook_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."ebook_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."ecommerce_orders" TO "anon";
GRANT ALL ON TABLE "public"."ecommerce_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."ecommerce_orders" TO "service_role";



GRANT ALL ON TABLE "public"."email_alerts" TO "anon";
GRANT ALL ON TABLE "public"."email_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."email_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."email_automations" TO "anon";
GRANT ALL ON TABLE "public"."email_automations" TO "authenticated";
GRANT ALL ON TABLE "public"."email_automations" TO "service_role";



GRANT ALL ON TABLE "public"."email_batches" TO "anon";
GRANT ALL ON TABLE "public"."email_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."email_batches" TO "service_role";



GRANT ALL ON TABLE "public"."email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_change_log" TO "anon";
GRANT ALL ON TABLE "public"."email_change_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_change_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_events" TO "anon";
GRANT ALL ON TABLE "public"."email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."email_events" TO "service_role";



GRANT ALL ON TABLE "public"."email_preference_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_preference_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_preference_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_processing_locks" TO "anon";
GRANT ALL ON TABLE "public"."email_processing_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."email_processing_locks" TO "service_role";



GRANT ALL ON TABLE "public"."email_processing_metrics" TO "anon";
GRANT ALL ON TABLE "public"."email_processing_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."email_processing_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."email_send_log" TO "anon";
GRANT ALL ON TABLE "public"."email_send_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_send_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments_backup_pre_migration" TO "anon";
GRANT ALL ON TABLE "public"."enrollments_backup_pre_migration" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments_backup_pre_migration" TO "service_role";



GRANT ALL ON TABLE "public"."environment_config" TO "anon";
GRANT ALL ON TABLE "public"."environment_config" TO "authenticated";
GRANT ALL ON TABLE "public"."environment_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."environment_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."environment_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."environment_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."environment_switch_log" TO "anon";
GRANT ALL ON TABLE "public"."environment_switch_log" TO "authenticated";
GRANT ALL ON TABLE "public"."environment_switch_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."environment_switch_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."environment_switch_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."environment_switch_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_flags" TO "anon";
GRANT ALL ON TABLE "public"."fraud_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_flags" TO "service_role";



GRANT ALL ON TABLE "public"."gcash_verifications" TO "anon";
GRANT ALL ON TABLE "public"."gcash_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."gcash_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."live_classes" TO "anon";
GRANT ALL ON TABLE "public"."live_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."live_classes" TO "service_role";



GRANT ALL ON TABLE "public"."magic_links" TO "anon";
GRANT ALL ON TABLE "public"."magic_links" TO "authenticated";
GRANT ALL ON TABLE "public"."magic_links" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."unified_profiles" TO "anon";
GRANT ALL ON TABLE "public"."unified_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_performance_view" TO "anon";
GRANT ALL ON TABLE "public"."marketing_performance_view" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_performance_view" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_source_view" TO "anon";
GRANT ALL ON TABLE "public"."marketing_source_view" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_source_view" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."media_items" TO "anon";
GRANT ALL ON TABLE "public"."media_items" TO "authenticated";
GRANT ALL ON TABLE "public"."media_items" TO "service_role";



GRANT ALL ON TABLE "public"."membership_levels" TO "anon";
GRANT ALL ON TABLE "public"."membership_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_levels" TO "service_role";



GRANT ALL ON TABLE "public"."membership_tiers" TO "anon";
GRANT ALL ON TABLE "public"."membership_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."migration_log" TO "anon";
GRANT ALL ON TABLE "public"."migration_log" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migration_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migration_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migration_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."module_progress" TO "anon";
GRANT ALL ON TABLE "public"."module_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."module_progress" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_enrollments_view" TO "anon";
GRANT ALL ON TABLE "public"."monthly_enrollments_view" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_enrollments_view" TO "service_role";



GRANT ALL ON TABLE "public"."network_postbacks" TO "anon";
GRANT ALL ON TABLE "public"."network_postbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."network_postbacks" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_attempts" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_metrics" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payout_items" TO "anon";
GRANT ALL ON TABLE "public"."payout_items" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_items" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."population_operation_log" TO "anon";
GRANT ALL ON TABLE "public"."population_operation_log" TO "authenticated";
GRANT ALL ON TABLE "public"."population_operation_log" TO "service_role";



GRANT ALL ON TABLE "public"."postmark_events" TO "anon";
GRANT ALL ON TABLE "public"."postmark_events" TO "authenticated";
GRANT ALL ON TABLE "public"."postmark_events" TO "service_role";



GRANT ALL ON TABLE "public"."processing_locks" TO "anon";
GRANT ALL ON TABLE "public"."processing_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."processing_locks" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";
GRANT SELECT ON TABLE "public"."product_reviews" TO PUBLIC;



GRANT INSERT("user_id") ON TABLE "public"."product_reviews" TO "authenticated";



GRANT INSERT("product_id") ON TABLE "public"."product_reviews" TO "authenticated";



GRANT INSERT("rating") ON TABLE "public"."product_reviews" TO "authenticated";



GRANT INSERT("comment") ON TABLE "public"."product_reviews" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_leads" TO "anon";
GRANT ALL ON TABLE "public"."purchase_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_leads" TO "service_role";



GRANT ALL ON TABLE "public"."revenue_analysis_view" TO "anon";
GRANT ALL ON TABLE "public"."revenue_analysis_view" TO "authenticated";
GRANT ALL ON TABLE "public"."revenue_analysis_view" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."security_events" TO "anon";
GRANT ALL ON TABLE "public"."security_events" TO "authenticated";
GRANT ALL ON TABLE "public"."security_events" TO "service_role";



GRANT ALL ON TABLE "public"."segments" TO "anon";
GRANT ALL ON TABLE "public"."segments" TO "authenticated";
GRANT ALL ON TABLE "public"."segments" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_customers" TO "anon";
GRANT ALL ON TABLE "public"."shopify_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_customers" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_order_items" TO "anon";
GRANT ALL ON TABLE "public"."shopify_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_orders" TO "anon";
GRANT ALL ON TABLE "public"."shopify_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_orders" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_product_variants" TO "anon";
GRANT ALL ON TABLE "public"."shopify_product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_products" TO "anon";
GRANT ALL ON TABLE "public"."shopify_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_products" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_webhook_queue" TO "anon";
GRANT ALL ON TABLE "public"."shopify_webhook_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_webhook_queue" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_payments" TO "anon";
GRANT ALL ON TABLE "public"."subscription_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";



GRANT ALL ON TABLE "public"."systemeio" TO "anon";
GRANT ALL ON TABLE "public"."systemeio" TO "authenticated";
GRANT ALL ON TABLE "public"."systemeio" TO "service_role";



GRANT ALL ON TABLE "public"."systemeio_backup" TO "anon";
GRANT ALL ON TABLE "public"."systemeio_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."systemeio_backup" TO "service_role";



GRANT ALL ON TABLE "public"."tag_types" TO "anon";
GRANT ALL ON TABLE "public"."tag_types" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_types" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."transactions_backup_pre_migration" TO "anon";
GRANT ALL ON TABLE "public"."transactions_backup_pre_migration" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions_backup_pre_migration" TO "service_role";



GRANT ALL ON TABLE "public"."unified_profiles_backup_pre_migration" TO "anon";
GRANT ALL ON TABLE "public"."unified_profiles_backup_pre_migration" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_profiles_backup_pre_migration" TO "service_role";



GRANT ALL ON TABLE "public"."unified_transactions_view" TO "anon";
GRANT ALL ON TABLE "public"."unified_transactions_view" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_transactions_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."user_carts" TO "anon";
GRANT ALL ON TABLE "public"."user_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_carts" TO "service_role";



GRANT ALL ON TABLE "public"."user_email_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_email_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_email_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."user_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."user_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_notes" TO "anon";
GRANT ALL ON TABLE "public"."user_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notes" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_purchase_history_view" TO "anon";
GRANT ALL ON TABLE "public"."user_purchase_history_view" TO "authenticated";
GRANT ALL ON TABLE "public"."user_purchase_history_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_segments" TO "anon";
GRANT ALL ON TABLE "public"."user_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_segments" TO "service_role";



GRANT ALL ON TABLE "public"."user_tags" TO "anon";
GRANT ALL ON TABLE "public"."user_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_time_spent" TO "anon";
GRANT ALL ON TABLE "public"."user_time_spent" TO "authenticated";
GRANT ALL ON TABLE "public"."user_time_spent" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."xendit" TO "anon";
GRANT ALL ON TABLE "public"."xendit" TO "authenticated";
GRANT ALL ON TABLE "public"."xendit" TO "service_role";



GRANT ALL ON TABLE "public"."xendit_backup" TO "anon";
GRANT ALL ON TABLE "public"."xendit_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."xendit_backup" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
