import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Updates course and module progress metrics in the store
 * Called after a lesson is completed or progress is saved
 * 
 * @param userId - The user ID
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @returns Promise<void>
 */
export async function updateProgressMetrics(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  if (!userId || !courseId || !lessonId) return;
  
  try {
    // Simply reload the progress data from the database
    // This avoids TypeScript errors while ensuring we have the most up-to-date progress data
    const store = useStudentDashboardStore.getState();
    
    // Use the existing loadUserProgress function which handles all the TypeScript correctly
    await store.loadUserProgress(userId, true); // Force reload
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Progress metrics updated for user ${userId}, course ${courseId}, lesson ${lessonId}`);
    }
    
    // Finally, update the continuation learning data to ensure it's in sync
    store.loadContinueLearningLesson(userId);
  } catch (error) {
    console.error('Error updating progress metrics:', error);
  }
}

/**
 * Formats a duration value into a human-readable format
 * 
 * @param duration - The duration in seconds or "XX min" string format
 * @param debug - If true, will log debug info about the duration value
 * @returns A formatted string (e.g., "15 min" or "1 min" or "42 sec")
 */
export function formatLessonDuration(
  duration: number | string | null | undefined,
  debug = false
): string {
  if (debug) {
    console.log('Duration value:', duration, 'Type:', typeof duration);
  }

  if (duration === null || duration === undefined) {
    return '15 min'; // Default fallback
  }
  
  // Extract minutes as a number from any format
  let minutes: number;
  
  if (typeof duration === 'string') {
    // Handle "10 min" or "10 mins" format
    if (duration.toLowerCase().includes('min')) {
      // Extract the numeric part
      const match = duration.match(/(\d+)\s*min/i);
      if (match && match[1]) {
        minutes = parseInt(match[1], 10);
        if (!isNaN(minutes)) {
          return formatMinutes(minutes);
        }
      }
      // If we can't extract a number but it has 'min', return as is but normalized
      return duration.replace(/mins/i, 'min').trim();
    }
    
    // Handle "HH:MM:SS" format (e.g. "00:03:53")
    if (duration.includes(':')) {
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        // Hours:Minutes:Seconds format
        const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        
        // For short videos under 60 seconds
        if (totalSeconds < 60) {
          return `${totalSeconds} sec`;
        }
        
        // Otherwise convert to minutes
        const totalMinutes = parts[0] * 60 + parts[1] + (parts[2] > 0 ? 1 : 0); // Round up if seconds > 0
        return formatMinutes(totalMinutes);
      } else if (parts.length === 2) {
        // Minutes:Seconds format
        const totalSeconds = parts[0] * 60 + parts[1];
        
        // For short videos under 60 seconds
        if (totalSeconds < 60) {
          return `${totalSeconds} sec`;
        }
        
        // Otherwise round to minutes
        const mins = parts[0] + (parts[1] > 0 ? 1 : 0); // Round up if seconds > 0
        return formatMinutes(mins);
      }
    }
    
    // Try to parse string as number
    const parsedDuration = parseFloat(duration);
    if (!isNaN(parsedDuration)) {
      // For small numbers, check if it's seconds or minutes
      if (parsedDuration < 60) {
        // If the original string includes 'sec', or it's a very small number, show as seconds
        if (duration.toLowerCase().includes('sec') || parsedDuration < 5) {
          return `${Math.round(parsedDuration)} sec`;
        }
        // Otherwise assume minutes for small numbers
        minutes = Math.ceil(parsedDuration);
      } else {
        // Larger numbers are likely seconds
        if (parsedDuration < 120) {
          // Between 60-120 seconds, show exact seconds
          return `${Math.round(parsedDuration)} sec`;
        } else {
          // Convert to minutes
          minutes = Math.ceil(parsedDuration / 60);
        }
      }
      return formatMinutes(minutes);
    }
  }
  
  // Handle numeric duration
  if (typeof duration === 'number') {
    // Short videos should show seconds instead of rounding up to minutes
    if (duration < 60) {
      // Less than 60 seconds, show as seconds
      return `${Math.round(duration)} sec`;
    } else if (duration < 5 * 60) {
      // If it's a very small number (<5 min), round to nearest minute
      minutes = Math.max(1, Math.round(duration / 60));
    } else {
      // Longer videos, round up to minutes
      minutes = Math.ceil(duration / 60);
    }
    return formatMinutes(minutes);
  }
  
  return '15 min'; // Default fallback
}

/**
 * Helper function to format minutes with proper pluralization
 * 
 * @param minutes - Number of minutes to format
 * @returns Formatted minutes string
 */
function formatMinutes(minutes: number): string {
  // Always ensure we have at least 1 minute
  minutes = Math.max(1, minutes);
  return `${minutes} min`;
}
