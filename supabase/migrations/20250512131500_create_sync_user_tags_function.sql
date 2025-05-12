CREATE OR REPLACE FUNCTION public.sync_all_user_tags_from_unified_profiles()
RETURNS JSONB -- Returning a summary
LANGUAGE plpgsql
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
