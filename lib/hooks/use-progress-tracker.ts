'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { updateProgressMetrics } from '@/lib/utils/progress-helpers';

interface ProgressTrackerProps {
  userId: string | null;
  lessonId: string;
  courseId?: string;
  initialPosition?: number;
  initialPercentage?: number;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  isVisible?: boolean;
}

/**
 * Enhanced progress tracker hook for accurate video progress tracking
 * 
 * This hook tracks lesson progress based on video playback events, accumulates
 * watch time only when the user is actively watching, and syncs with both
 * the local store and backend database.
 */
const useProgressTracker = ({
  userId,
  lessonId,
  courseId,
  initialPosition = 0,
  initialPercentage = 0,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  isVisible = true
}: ProgressTrackerProps) => {
  const supabase = getBrowserClient();
  const { updateLessonProgress } = useStudentDashboardStore();
  
  // Local state tracking
  const [progress, setProgress] = useState<number>(initialPercentage);
  const [position, setPosition] = useState<number>(initialPosition);
  const [isCompleted, setIsCompleted] = useState<boolean>(initialPercentage >= 95);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Time tracking
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0);
  const accumulatingTime = useRef<boolean>(false);
  const lastUpdateTime = useRef<number | null>(null);
  const pendingTimeUpdates = useRef<number>(0);
  const lastActive = useRef<number | null>(null);
  const savedPosition = useRef<number | null>(null);
  const savedProgress = useRef<number | null>(null);
  
  // Track when video is actually being watched (playing and visible)
  const isActivelyWatching = isPlaying && isVisible;
  
  // Update local state based on player state
  useEffect(() => {
    if (currentTime !== undefined) {
      setPosition(currentTime);
    }
    
    if (currentTime !== undefined && duration && duration > 0) {
      const newProgress = Math.round((currentTime / duration) * 100);
      setProgress(newProgress);
      
      // Check for completion (95% or more)
      if (newProgress >= 95 && !isCompleted) {
        setIsCompleted(true);
      }
    }
  }, [currentTime, duration, isCompleted]);
  
  // Track accumulated time when actively watching
  useEffect(() => {
    if (!isActivelyWatching) {
      // Reset last update time when not actively watching
      lastUpdateTime.current = null;
      return;
    }
    
    // Start tracking
    lastUpdateTime.current = Date.now();
    
    const intervalId = setInterval(() => {
      if (lastUpdateTime.current && isActivelyWatching) {
        const now = Date.now();
        const delta = (now - lastUpdateTime.current) / 1000; // convert ms to seconds
        
        // Only count reasonable time increments (avoid huge jumps after tab switch)
        if (delta > 0 && delta < 5) {
          setAccumulatedTime(prev => prev + delta);
          pendingTimeUpdates.current += delta;
        }
        
        lastUpdateTime.current = now;
      }
    }, 1000); // Update every second
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isActivelyWatching]);
  
  // Save progress to database with throttling
  useEffect(() => {
    if (!userId || !lessonId) return;
    
    const saveIntervalId = setInterval(() => {
      // Save if there's meaningful progress and we're not currently saving
      if (progress > 0 && !isSaving) {
        saveProgress();
      }
      
      // Save accumulated time if we have a reasonable amount
      if (pendingTimeUpdates.current >= 5) { // Save after 5+ seconds of accumulated time
        saveTimeSpent();
        pendingTimeUpdates.current = 0;
      }
    }, 15000); // Save every 15 seconds
    
    return () => {
      clearInterval(saveIntervalId);
      
      // Final save on unmount
      if ((progress > 0 && !isSaving) || pendingTimeUpdates.current > 0) {
        saveProgress();
        saveTimeSpent();
      }
    };
  }, [userId, lessonId, progress, isSaving]);
  
  // Save progress to database
  const saveProgress = useCallback(async () => {
    if (!userId || !lessonId || isSaving) return;
    
    // Skip saving if not enough has changed since last save
    if (
      savedPosition.current !== null &&
      savedProgress.current !== null &&
      Math.abs(currentTime - savedPosition.current) < 3 && // Less than 3 seconds difference
      Math.abs(progress - savedProgress.current) < 2 // Less than 2% progress difference
    ) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          progress_percentage: progress,
          last_position: currentTime,
          status: isCompleted ? 'completed' : progress > 0 ? 'in_progress' : 'started',
          completed_at: isCompleted ? new Date().toISOString() : null,
        }, { onConflict: 'user_id,lesson_id' });
        
      if (error) throw error;
      
      // Update the store
      updateLessonProgress(userId, lessonId, {
        status: isCompleted ? 'completed' : progress > 0 ? 'in_progress' : 'started',
        progress,
        lastPosition: currentTime
      });
      
      setLastSavedAt(new Date());
      savedPosition.current = currentTime;
      savedProgress.current = progress;
      
      // If this is a completion and we have a courseId, update course-level metrics
      if (isCompleted && courseId && progress === 100) {
        updateProgressMetrics(userId, courseId, lessonId).catch(err => 
          console.error('Error updating course metrics:', err)
        );
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, [userId, lessonId, courseId, progress, currentTime, isCompleted, updateLessonProgress, supabase]);
  
  // Save time spent to database
  const saveTimeSpent = async () => {
    if (!userId || !lessonId || pendingTimeUpdates.current <= 0) return;
    
    try {
      const timeToSave = pendingTimeUpdates.current;
      pendingTimeUpdates.current = 0;
      
      const { error } = await supabase
        .from('user_time_spent')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          duration_seconds: timeToSave,
          created_at: new Date().toISOString(),
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error saving time spent:', error);
    }
  };
  
  // Mark as complete
  const markComplete = useCallback(async () => {
    setProgress(100);
    setIsCompleted(true);
    await saveProgress();
    
    // Ensure course metrics are updated after manual completion
    if (userId && courseId && lessonId) {
      await updateProgressMetrics(userId, courseId, lessonId);
    }
    
    return true; // Return success flag
  }, [userId, courseId, lessonId, saveProgress]);
  
  // Event handlers for video playback
  const handlePlay = useCallback(() => {
    if (!accumulatingTime.current) {
      accumulatingTime.current = true;
      lastActive.current = Date.now();
    }
  }, []);
  
  const handlePause = useCallback(() => {
    if (accumulatingTime.current) {
      accumulatingTime.current = false;
      saveProgress();
    }
  }, [saveProgress]);
  
  const handleEnded = useCallback(() => {
    if (accumulatingTime.current) {
      accumulatingTime.current = false;
      setIsCompleted(true);
      setProgress(100);
      saveProgress(); // This will trigger course metrics update via saveProgress
    }
  }, [saveProgress]);
  
  return {
    progress,
    isCompleted,
    accumulatedTime,
    currentTime,
    duration,
    lastSavedAt,
    handlePlay,
    handlePause,
    handleEnded,
    markComplete,
    saveProgress, // Expose saveProgress for manual saving if needed
  };
};

export default useProgressTracker;
