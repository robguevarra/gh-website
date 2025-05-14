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
 * This function recursively processes the rules and conditions.
 */
export async function getUsersBySegmentRules(
  rules: SegmentRules,
  limit: number = 10,
  offset: number = 0
): Promise<SegmentPreviewResult> {
  const supabase = await createServerSupabaseClient();
  
  // Start with a query builder for the users table
  let query = supabase.from('users').select('id, email, name');
  
  // Apply the filters based on the segment rules
  query = applyRulesToQuery(query, rules);
  
  // Get the total count first (without limit/offset)
  let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });
  countQuery = applyRulesToQuery(countQuery, rules);
  const { count, error: countError } = await countQuery;
  
  if (countError) {
    console.error('Error getting segment user count:', countError);
    return { count: 0, sampleUsers: [] };
  }
  
  // Now get the sample users with pagination
  const { data: users, error } = await query
    .limit(limit)
    .offset(offset)
    .order('email', { ascending: true });
  
  if (error) {
    console.error('Error getting segment users:', error);
    return { count: count || 0, sampleUsers: [] };
  }
  
  return {
    count: count || 0,
    sampleUsers: users || [],
  };
}

/**
 * Applies segment rules to a Supabase query.
 * This is a recursive function that handles nested conditions.
 */
function applyRulesToQuery(query: any, rules: SegmentRules): any {
  const { operator, conditions } = rules;
  
  // Base case: no conditions
  if (!conditions || conditions.length === 0) {
    return query;
  }
  
  // Process each condition based on the operator
  if (operator === 'AND') {
    // For AND, we apply all conditions directly to the query
    conditions.forEach(condition => {
      query = applyConditionToQuery(query, condition);
    });
    return query;
  } else if (operator === 'OR') {
    // For OR, we need to use the .or() method with a function
    return query.or(buildOrConditions(conditions));
  } else if (operator === 'NOT') {
    // For NOT, we negate each condition
    // This is a bit trickier and depends on the specific condition
    // For simplicity, we'll just handle the first condition as a NOT
    if (conditions.length > 0) {
      return applyNotConditionToQuery(query, conditions[0]);
    }
    return query;
  }
  
  return query;
}

/**
 * Applies a single condition to a query.
 */
function applyConditionToQuery(query: any, condition: Condition): any {
  if (condition.type === 'tag') {
    // For tag conditions, we check if the user has the specified tag
    return query.in(
      'id',
      supabase
        .from('user_tags')
        .select('user_id')
        .eq('tag_id', condition.tagId)
    );
  } else if (condition.type === 'group') {
    // For group conditions, we recursively apply the nested rules
    const nestedRules: SegmentRules = {
      operator: condition.operator,
      conditions: condition.conditions,
    };
    return applyRulesToQuery(query, nestedRules);
  }
  
  return query;
}

/**
 * Builds an array of OR conditions for the .or() method.
 */
function buildOrConditions(conditions: Condition[]): string {
  // This is a simplified version - in a real implementation,
  // you would build a more complex OR condition string
  const orConditions = conditions.map(condition => {
    if (condition.type === 'tag') {
      return `id.in.(${buildTagSubquery(condition.tagId)})`;
    }
    // For group conditions in an OR, we'd need a more complex approach
    // This is a placeholder
    return '';
  }).filter(Boolean);
  
  return orConditions.join(',');
}

/**
 * Builds a subquery string for tag conditions.
 */
function buildTagSubquery(tagId: string): string {
  return `select user_id from user_tags where tag_id = '${tagId}'`;
}

/**
 * Applies a NOT condition to a query.
 */
function applyNotConditionToQuery(query: any, condition: Condition): any {
  if (condition.type === 'tag') {
    // For NOT tag conditions, we check if the user does NOT have the specified tag
    return query.not(
      'id',
      'in',
      supabase
        .from('user_tags')
        .select('user_id')
        .eq('tag_id', condition.tagId)
    );
  } else if (condition.type === 'group') {
    // For NOT group conditions, we negate the entire group
    // This is complex and would require a custom implementation
    // For simplicity, we'll just return the query unchanged
    return query;
  }
  
  return query;
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
