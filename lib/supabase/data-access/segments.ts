import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

// Define more specific types based on the generated Database types
export type Segment = Database['public']['Tables']['segments']['Row'];
export type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
export type SegmentUpdate = Database['public']['Tables']['segments']['Update'];

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
    .from('segments')
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
    .from('segments')
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
 * Retrieves all segments with pagination support.
 * @returns An array of segments or null if an error occurred.
 */
export async function listSegments(): Promise<Segment[] | null> {
  const supabase = await createServerSupabaseClient();
  
  // Implement pagination to handle potentially large number of segments
  let allSegments: Segment[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  try {
    while (hasMore) {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Add this page's results to our collection
        allSegments = [...allSegments, ...data];
        
        // Check if we've reached the end of the results
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        // No more results
        hasMore = false;
      }
    }
    
    return allSegments;
  } catch (error: any) {
    console.error('Error listing segments:', error.message);
    return null;
  }
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
    .from('segments')
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
    .from('segments')
    .delete()
    .eq('id', segmentId);

  if (error) {
    console.error('Error deleting segment:', error.message);
    return false;
  }
  return true;
}
