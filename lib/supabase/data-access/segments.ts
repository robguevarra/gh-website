import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

// Define more specific types based on the generated Database types
export type Segment = Database['public']['Tables']['user_segments']['Row'];
export type SegmentInsert = Database['public']['Tables']['user_segments']['Insert'];
export type SegmentUpdate = Database['public']['Tables']['user_segments']['Update'];

/**
 * Creates a new segment.
 * @param segmentData - The data for the new segment.
 * @returns The created segment or null if an error occurred.
 */
export async function createSegment(
  segmentData: SegmentInsert
): Promise<Segment | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_segments')
    .insert(segmentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating segment:', error.message);
    return null;
  }
  return data;
}

/**
 * Retrieves a segment by its ID.
 * @param segmentId - The ID of the segment to retrieve.
 * @returns The segment or null if not found or an error occurred.
 */
export async function getSegmentById(
  segmentId: string
): Promise<Segment | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_segments')
    .select('*')
    .eq('id', segmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null;
    }
    console.error('Error fetching segment by ID:', error.message);
    return null;
  }
  return data;
}

/**
 * Retrieves all segments.
 * @returns An array of segments or null if an error occurred.
 */
export async function listSegments(): Promise<Segment[] | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_segments')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error listing segments:', error.message);
    return null;
  }
  return data;
}

/**
 * Updates an existing segment.
 * @param segmentId - The ID of the segment to update.
 * @param updates - The updates to apply to the segment.
 * @returns The updated segment or null if not found or an error occurred.
 */
export async function updateSegment(
  segmentId: string,
  updates: SegmentUpdate
): Promise<Segment | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_segments')
    .update(updates)
    .eq('id', segmentId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
        return null;
    }
    console.error('Error updating segment:', error.message);
    return null;
  }
  return data;
}

/**
 * Deletes a segment by its ID.
 * @param segmentId - The ID of the segment to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export async function deleteSegment(segmentId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('user_segments')
    .delete()
    .eq('id', segmentId);

  if (error) {
    console.error('Error deleting segment:', error.message);
    return false;
  }
  return true;
}
