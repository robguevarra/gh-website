// lib/supabase/data-access/tags.ts
// Data access functions for tags, tag types, and user-tag assignments
// Functional, modular, DRY, and scalable to 3000+ users

import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserTag {
  user_id: string;
  tag_id: string;
  assigned_at: string;
}

// ----- Tag Types -----
export async function getTagTypes(): Promise<TagType[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tag_types')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTagType(type: Pick<TagType, 'name' | 'description'>): Promise<TagType> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tag_types')
    .insert([type])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTagType(id: string, patch: Partial<TagType>): Promise<TagType> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tag_types')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTagType(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('tag_types')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ----- Tags -----
export async function getTags({ typeId }: { typeId?: string } = {}): Promise<Tag[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase.from('tags').select('*');
  if (typeId) query = query.eq('type_id', typeId);
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTag(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .insert([tag])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTag(id: string, patch: Partial<Tag>): Promise<Tag> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ----- User Tags (Batch-Friendly) -----
export async function getUserTags(userId: string): Promise<UserTag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_tags')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function getUsersByTag(tagId: string, { limit = 1000, offset = 0 } = {}): Promise<UserTag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_tags')
    .select('*')
    .eq('tag_id', tagId)
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export async function assignTagsToUsers({ tagIds, userIds }: { tagIds: string[]; userIds: string[] }): Promise<void> {
  const supabase = createServerSupabaseClient();
  // Bulk insert, deduplicate on conflict
  const rows = userIds.flatMap(user_id => tagIds.map(tag_id => ({ user_id, tag_id })));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('user_tags')
    .upsert(rows, { onConflict: ['user_id', 'tag_id'] });
  if (error) throw error;
}

export async function removeTagsFromUsers({ tagIds, userIds }: { tagIds: string[]; userIds: string[] }): Promise<void> {
  const supabase = createServerSupabaseClient();
  for (const tag_id of tagIds) {
    const { error } = await supabase
      .from('user_tags')
      .delete()
      .in('user_id', userIds)
      .eq('tag_id', tag_id);
    if (error) throw error;
  }
}
