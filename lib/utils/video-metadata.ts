/**
 * Video Metadata Utilities
 * 
 * Functions for managing video metadata, including storing Vimeo video durations
 * to ensure consistent display of accurate duration information across the application.
 */

import { getBrowserClient } from "@/lib/supabase/client";
import { debounce } from "lodash";

/**
 * Store video duration in the lessons table after it's been loaded from Vimeo
 * 
 * This function is debounced to prevent excessive database writes when
 * the video player might report multiple duration updates in quick succession.
 * 
 * @param lessonId - The ID of the lesson to update
 * @param durationInSeconds - The accurate duration from Vimeo in seconds
 * @param options - Additional options
 * @returns A promise that resolves when the update is complete
 */
// Always debug for now to help identify issues
const DEBUG_VIDEO_DURATION = true;

export const storeVideoDuration = debounce(async (
  lessonId: string,
  durationInSeconds: number,
  options: {
    debug?: boolean;
  } = {}
): Promise<void> => {
  // Force debug logs on regardless of options to help troubleshoot
  const enableLogs = DEBUG_VIDEO_DURATION || options.debug || process.env.NODE_ENV === 'development';
  
  if (enableLogs) {
    console.log(`[VideoDuration] Attempting to store duration for lesson: ${lessonId}`, {
      duration: durationInSeconds,
      timestamp: new Date().toISOString()
    });
  }
  if (!lessonId || !durationInSeconds) return;
  
  try {
    const supabase = getBrowserClient();
    
    // First check if the lesson exists and get current metadata
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('id, metadata')
      .eq('id', lessonId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching lesson metadata:', fetchError);
      return;
    }
    
    // Access metadata safely by handling its potential types
    const existingMetadata = lesson?.metadata as Record<string, any> || {};
    
    if (enableLogs) {
      console.log(`[VideoDuration] Existing metadata for lesson ${lessonId}:`, {
        existingMetadata,
        currentVideoDuration: existingMetadata.videoDuration,
        newDuration: durationInSeconds
      });
    }
    
    // Don't update if duration is already stored and the same
    if (existingMetadata.videoDuration === durationInSeconds) {
      console.log(`[VideoDuration] Lesson ${lessonId} already has correct duration: ${durationInSeconds}s`);
      return;
    }
    
    // Prepare updated metadata by merging with existing metadata
    const updatedMetadata = {
      ...existingMetadata,
      videoDuration: durationInSeconds,
      // Store a timestamp of when this was last updated
      durationUpdatedAt: new Date().toISOString()
    };
    
    // Update the lesson record
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', lessonId);
      
    if (updateError) {
      console.error('Error updating lesson video duration:', updateError);
      return;
    }
    
    console.log(`[VideoDuration] ✅ UPDATED lesson ${lessonId} with duration: ${durationInSeconds}s`);
    // Log success regardless of debug option to help troubleshoot
    
  } catch (error) {
    console.error('Error storing video duration:', error);
  }
}, 1000); // Debounce for 1 second
