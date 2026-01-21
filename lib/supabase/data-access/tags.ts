// lib/supabase/data-access/tags.ts
// Data-access functions for tag types, tags, and user-tag assignments
// Designed for scalability (3k+ users), batch ops, and strong typing

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from '@/types/supabase';

export interface TagType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  parent_id?: string | null;
  type_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_system: boolean;
  tag_type?: Pick<TagType, 'id' | 'name'>;
  user_count?: number;
  user_tags?: { count: number }[];
}

export interface UserTag {
  user_id: string;
  tag_id: string;
  assigned_at: string;
}

interface GetTagsParams {
  typeId?: string;
  parentId?: string | null;
}

// ---- Tag Types ----
export async function getTagTypes(): Promise<TagType[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('tag_types').select('*').order('name');
  if (error) {
    console.error('Error fetching tag types:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  return data as TagType[];
}

export async function createTagType(type: Pick<TagType, 'name' | 'description'>): Promise<TagType> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('tag_types').insert([type]).select().single();
  if (error) throw error;
  return data as TagType;
}

export async function updateTagType(id: string, updates: Partial<TagType>): Promise<TagType> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('tag_types').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as TagType;
}

export async function deleteTagType(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('tag_types').delete().eq('id', id);
  if (error) throw error;
}

// ---- Tags ----
export async function getTags(params?: GetTagsParams): Promise<Tag[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from('tags').select('*, tag_type:tag_types(id, name), user_tags(count)');

  if (params?.typeId) {
    query = query.eq('type_id', params.typeId);
  }

  if (params && Object.prototype.hasOwnProperty.call(params, 'parentId')) {
    if (params.parentId === null) {
      query = query.is('parent_id', null);
    } else if (typeof params.parentId === 'string' && params.parentId.length > 0) {
      query = query.eq('parent_id', params.parentId);
    }
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Supabase error in getTags:', error);
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  const processedData = (data || []).map(tag => {
    const count = tag.user_tags && tag.user_tags.length > 0 ? tag.user_tags[0].count : 0;
    const { user_tags, ...restOfTag } = tag;
    return { ...restOfTag, user_count: count as number };
  });

  return processedData as Tag[];
}

export async function createTag(tag: Pick<Tag, 'name' | 'parent_id' | 'type_id' | 'metadata'>): Promise<Tag> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('tags').insert([tag]).select().single();
  if (error) throw error;
  return data as Tag;
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
  const supabase = await createServerSupabaseClient();

  // Check if system tag
  if (updates.name || updates.type_id || updates.parent_id) {
    const { data: existing } = await supabase.from('tags').select('is_system').eq('id', id).single();
    if (existing?.is_system) {
      throw new Error('Cannot edit system tags');
    }
  }

  const { data, error } = await supabase.from('tags').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Tag;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Check if system tag
  const { data: existing } = await supabase.from('tags').select('is_system').eq('id', id).single();
  if (existing?.is_system) {
    throw new Error('Cannot delete system tags');
  }

  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

// ---- User Tags (Batch-friendly) ----
export async function getTagsForUser(userId: string): Promise<Tag[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_tags')
    .select(`
      assigned_at,
      tag:tags(
        *,
        tag_type:tag_types(id, name)
      )
    `)
    .eq('user_id', userId)
    .order('assigned_at', { ascending: false }); // Most recent first

  if (error) throw error;

  // Transform the data to include assignment metadata on the tag
  return (data || []).map((row: any) => ({
    ...row.tag,
    assigned_at: row.assigned_at // Add assignment timestamp to tag object
  }) as Tag);
}

export async function getUsersForTag(tagId: string, limit = 1000, offset = 0): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_tags')
    .select('user_id')
    .eq('tag_id', tagId)
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data.map((row: any) => row.user_id);
}

export async function assignTagsToUsers({ tagIds, userIds }: { tagIds: string[]; userIds: string[] }): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Check for system tags
  const { data: systemTags } = await supabase.from('tags').select('id, name').eq('is_system', true).in('id', tagIds);
  if (systemTags && systemTags.length > 0) {
    throw new Error(`Cannot manually assign system tags: ${systemTags.map(t => t.name).join(', ')}`);
  }

  const rows = userIds.flatMap(user_id => tagIds.map(tag_id => ({ user_id, tag_id })));
  if (rows.length === 0) return;
  const { error } = await supabase.from('user_tags').upsert(rows, { onConflict: 'user_id,tag_id' });
  if (error) throw error;
}

export async function removeTagsFromUsers({ tagIds, userIds }: { tagIds: string[]; userIds: string[] }): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Check for system tags
  const { data: systemTags } = await supabase.from('tags').select('id, name').eq('is_system', true).in('id', tagIds);
  if (systemTags && systemTags.length > 0) {
    throw new Error(`Cannot manually remove system tags: ${systemTags.map(t => t.name).join(', ')}`);
  }

  for (const tag_id of tagIds) {
    const { error } = await supabase.from('user_tags').delete().in('user_id', userIds).eq('tag_id', tag_id);
    if (error) throw error;
  }
}

// For large userbases (3k+), always use batched queries for assignment/removal.
// For segment preview, aggregate user counts by tag with count queries, not full fetch.
