-- Create a performant search function to handle Directory filtering server-side
-- This avoids Header Overflow from large ID lists and fixes the zero-result issue caused by stale view data.
-- UPDATE: Now also returns modern tags from `user_tags` table instead of legacy `unified_profiles.tags`.
-- UPDATE 2: Added `p_start_date` and `p_end_date` for creation date filtering.

CREATE OR REPLACE FUNCTION public.search_directory(
    p_query text DEFAULT '',
    p_type text DEFAULT 'all',
    p_status text DEFAULT 'all',
    p_smart_list_id uuid DEFAULT NULL,
    p_tag_id uuid DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL,
    p_page int DEFAULT 1,
    p_page_size int DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    email text,
    type text,
    first_name text,
    last_name text,
    tags text[],
    status text,
    created_at timestamptz,
    total_count bigint
) 
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_smart_list_ids uuid[];
BEGIN
    -- 1. Resolve Smart List if needed
    IF p_smart_list_id IS NOT NULL THEN
        -- Resolve smart list to an array of IDs
        -- Assumes resolve_smart_list returns a table with 'id' column
        SELECT ARRAY(
            SELECT id FROM public.resolve_smart_list(p_smart_list_id)
        ) INTO v_smart_list_ids;
    END IF;

    RETURN QUERY
    WITH filtered_contacts AS (
        SELECT v.*
        FROM public.view_directory_contacts v
        WHERE (
            -- Search
            p_query = '' OR
            v.email ILIKE '%' || p_query || '%' OR
            v.first_name ILIKE '%' || p_query || '%' OR
            v.last_name ILIKE '%' || p_query || '%'
        )
        AND (
            -- Type
            p_type = 'all' OR v.type = p_type
        )
        AND (
            -- Status
            p_status = 'all' OR v.status = p_status
        )
        AND (
            -- Smart List
            p_smart_list_id IS NULL OR
            (v_smart_list_ids IS NOT NULL AND v.id = ANY(v_smart_list_ids))
        )
        AND (
            -- Tag Filter (Crucial Fix: Check user_tags table directly)
            p_tag_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.user_tags ut
                WHERE ut.user_id = v.id
                AND ut.tag_id = p_tag_id
            )
        )
        AND (
            -- Date Range Filter
            (p_start_date IS NULL OR v.created_at >= p_start_date)
            AND
            (p_end_date IS NULL OR v.created_at <= p_end_date)
        )
    ),
    counted AS (
        SELECT *, COUNT(*) OVER() as full_count
        FROM filtered_contacts
    )
    SELECT 
        c.id, 
        c.email, 
        c.type, 
        c.first_name, 
        c.last_name, 
        -- Fetch MODERN tags from user_tags + tags tables
        COALESCE(
            ARRAY(
                SELECT t.name 
                FROM public.user_tags ut
                JOIN public.tags t ON t.id = ut.tag_id
                WHERE ut.user_id = c.id
            ), 
            '{}'::text[]
        ) AS tags, 
        c.status, 
        c.created_at, 
        c.full_count
    FROM counted c
    ORDER BY c.created_at DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;
