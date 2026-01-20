import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Types for segment rules
 */
export type OperatorType = 'AND' | 'OR' | 'NOT';

export interface TagCondition {
  type: 'tag';
  tagId: string;
}

export interface GroupCondition {
  type: 'group';
  operator: OperatorType;
  conditions: Condition[];
}

export type Condition = TagCondition | GroupCondition;

export interface SegmentRules {
  operator: OperatorType;
  conditions: Condition[];
}

export interface SegmentPreviewResult {
  count: number;
  sampleUsers: { id: string; email: string; name?: string }[];
}

/**
 * Builds a Supabase query to find users matching the segment rules.
 * Uses application-side logic to resolve complex filtering (avoiding deep subquery syntax issues).
 */
export async function getUsersBySegmentRules(
  rules: SegmentRules,
  limit: number = 10,
  offset: number = 0
): Promise<SegmentPreviewResult> {
  const supabase = await createServerSupabaseClient();

  // 1. Resolve the matching User IDs based on the rules
  const matchingIds = await resolveUserIdsFromRules(rules, supabase);

  // If matchingIds is empty array, it means NO users match
  if (matchingIds !== null && matchingIds.length === 0) {
    return { count: 0, sampleUsers: [] };
  }

  // 2. Optimization: If we have IDs, we can't just pass 6000+ IDs to .in() because of URL length limits (414).
  // We must batch the fetching of profiles if we have a list of IDs.

  // If matchingIds is null, it means "All Users", so standard pagination works.
  if (matchingIds === null) {
    let query = supabase.from('unified_profiles').select('id, email, first_name, last_name');
    let countQuery = supabase.from('unified_profiles').select('id', { count: 'exact', head: true });

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('Error getting total count:', countError);
      return { count: 0, sampleUsers: [] };
    }

    const { data: users, error } = await query
      .range(offset, offset + limit - 1)
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return { count: count || 0, sampleUsers: [] };
    }

    return {
      count: count || 0,
      sampleUsers: (users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'No Name'
      }))
    };
  }

  // 3. Batched ID handling
  // If we have a specific list of IDs (e.g. 6368 IDs), we know the TOTAL count immediately.
  const totalCount = matchingIds.length;

  // For the sample users, we only need to fetch the specific slice for the requested page.
  // slice(offset, offset + limit)
  const slicedIds = matchingIds.slice(offset, offset + limit);

  if (slicedIds.length === 0) {
    return { count: totalCount, sampleUsers: [] };
  }

  // Fetch only the profiles for this slice
  const { data: users, error } = await supabase
    .from('unified_profiles')
    .select('id, email, first_name, last_name')
    .in('id', slicedIds)
    .order('email', { ascending: true }); // Ordering might be per-batch, but acceptable for preview.

  if (error) {
    console.error('Error fetching batched profiles:', error);
    return { count: totalCount, sampleUsers: [] };
  }

  return {
    count: totalCount,
    sampleUsers: (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'No Name'
    })),
  };
}

/**
 * Recursively resolves User IDs matching the rules.
 * Returns:
 * - string[] : The list of matching user IDs
 * - null : Indicates "All Users" (no filter)
 */
async function resolveUserIdsFromRules(rules: SegmentRules, supabase: any): Promise<string[] | null> {
  const { operator, conditions } = rules;

  if (!conditions || conditions.length === 0) {
    return null; // All users
  }

  // Resolve all child conditions
  const results = await Promise.all(conditions.map(c => resolveCondition(c, supabase)));

  // Filter out nulls (which mean "all users") for logic processing
  // Note: Handling "All Users" in sets is tricky.
  // AND with "All" -> intersection is just the others.
  // OR with "All" -> union is "All".

  if (operator === 'AND') {
    // Intersection
    // If any result is empty array, total is empty.
    // If all are null, return null.

    let currentIds: string[] | null = null;
    let first = true;

    for (const res of results) {
      if (res === null) continue; // "All users" doesn't restrict intersection

      if (first) {
        currentIds = res;
        first = false;
      } else {
        // Intersect currentIds with res
        // Optimally use Set
        const setRes = new Set(res);
        currentIds = (currentIds || []).filter(id => setRes.has(id));
      }
    }

    // If we went through all and never found a restriction (all were null), return null
    if (first) return null;

    return currentIds || [];
  }

  if (operator === 'OR') {
    // Union
    // If ANY result is null (All Users), then the result is All Users.
    if (results.includes(null)) return null;

    // Combine all arrays
    const allIds = results.flat() as string[];
    return Array.from(new Set(allIds));
  }

  return null;
}

async function resolveCondition(condition: Condition, supabase: any): Promise<string[] | null> {
  if (condition.type === 'tag') {
    // Validation: If no tag selected, return empty (no match)
    if (!condition.tagId) return [];

    // Fetch all users with this tag using batching
    return await fetchAllUserIdsForTag(condition.tagId, supabase);

  } else if (condition.type === 'group') {
    return resolveUserIdsFromRules({
      operator: condition.operator,
      conditions: condition.conditions
    }, supabase);
  }
  return null;
}

/**
 * Helper to fetch ALL user IDs for a tag, handling pagination/limits.
 */
async function fetchAllUserIdsForTag(tagId: string, supabase: any): Promise<string[]> {
  let allIds: string[] = [];
  const BATCH_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, error } = await supabase
        .from('user_tags')
        .select('user_id')
        .eq('tag_id', tagId)
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error(`Error fetching user_tags batch (offset ${offset}):`, error);
        throw error;
      }

      if (data && data.length > 0) {
        const ids = data.map((r: any) => r.user_id);
        allIds = allIds.concat(ids);

        if (data.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }
      } else {
        hasMore = false;
      }
    }
    return allIds;
  } catch (e) {
    console.error("Critical error fetching tag users:", e);
    return [];
  }
}

/**
 * Gets a preview of users matching a segment.
 */
export async function getSegmentPreview(
  segmentId: string,
  limit: number = 10,
  offset: number = 0
): Promise<SegmentPreviewResult> {
  const supabase = await createServerSupabaseClient();

  // Get the segment rules
  const { data: segment, error } = await supabase
    .from('segments')
    .select('rules')
    .eq('id', segmentId)
    .single();

  if (error || !segment) {
    console.error('Error getting segment for preview:', error);
    return { count: 0, sampleUsers: [] };
  }

  // Get users matching the rules
  return getUsersBySegmentRules(segment.rules as SegmentRules, limit, offset);
}

/**
 * Caches segment preview results.
 * This is a simple in-memory cache. In production, you might use Redis or another caching solution.
 */
const previewCache: Record<string, { result: SegmentPreviewResult; timestamp: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Gets a cached segment preview or generates a new one.
 */
export async function getCachedSegmentPreview(
  segmentId: string,
  limit: number = 10,
  offset: number = 0
): Promise<SegmentPreviewResult> {
  const cacheKey = `${segmentId}:${limit}:${offset}`;
  const cachedResult = previewCache[cacheKey];

  // Check if we have a valid cached result
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    return cachedResult.result;
  }

  // Generate a new preview
  const result = await getSegmentPreview(segmentId, limit, offset);

  // Cache the result
  previewCache[cacheKey] = {
    result,
    timestamp: Date.now(),
  };

  return result;
}
