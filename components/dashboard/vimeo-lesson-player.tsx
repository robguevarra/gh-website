'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useVimeoPlayer } from '@/lib/hooks/use-vimeo-player';
import useProgressTracker from '@/lib/hooks/use-progress-tracker';
import { storeVideoDuration } from '@/lib/utils/video-metadata';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export interface VimeoLessonPlayerProps {
  videoId: string;
  lessonId: string;
  initialPosition?: number;
  initialPercentage?: number;
  autoplay?: boolean;
  showControls?: boolean;
  className?: string;
  onComplete?: () => void;
}

/**
 * Enhanced Vimeo lesson player with accurate progress tracking
 * 
 * This component integrates the Vimeo Player SDK with our progress tracking system
 * to provide accurate watch time reporting and progress updates.
 */
export const VimeoLessonPlayer = ({
  videoId,
  lessonId,
  initialPosition = 0,
  initialPercentage = 0,
  autoplay = false,
  showControls = true,
  className = '',
  onComplete
}: VimeoLessonPlayerProps) => {
  const { user } = useAuth();
  const { updateLessonProgress } = useStudentDashboardStore();
  const userId = user?.id || null;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store the video duration when received
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Player instance and state
  const {
    playerState,
    isVisible
  } = useVimeoPlayer(containerRef, videoId, {
    autoplay,
    initialPosition,
    // Pass the lessonId for storing video duration in the database
    lessonId,
    events: {
      onPlay: () => progressTracker.handlePlay(),
      onPause: () => progressTracker.handlePause(),
      onEnded: () => {
        progressTracker.handleEnded();
        onComplete?.();
      },
      onTimeUpdate: (data) => {
        // Store duration if it's changed
        if (data.duration && data.duration !== videoDuration) {
          handleDurationChange(data.duration);
        }
      }
    }
  });
  
  // Progress tracking
  const progressTracker = useProgressTracker({
    userId,
    lessonId,
    initialPosition,
    initialPercentage,
    currentTime: playerState.currentTime,
    duration: playerState.duration,
    isPlaying: playerState.isPlaying,
    isVisible: isVisible()
  });
  
  // Notify parent component when lesson is completed
  useEffect(() => {
    if (progressTracker.isCompleted && onComplete) {
      onComplete();
    }
  }, [progressTracker.isCompleted, onComplete]);
  
  // Update UI and store duration when we get it from the player
  useEffect(() => {
    if (playerState.duration && playerState.duration !== videoDuration) {
      handleDurationChange(playerState.duration);
    }
  }, [playerState.duration]);
  
  // Handle duration changes from Vimeo
  const handleDurationChange = (duration: number) => {
    if (!duration || duration === videoDuration) return;
    
    console.log(`[VimeoPlayer] Got duration from Vimeo: ${duration}s for lesson: ${lessonId}`);
    
    // Update our local state
    setVideoDuration(duration);
    
    // Store to database for future use
    storeVideoDuration(lessonId, duration, { debug: true });
    
    // Update custom data attribute for debugging
    if (containerRef.current) {
      containerRef.current.setAttribute('data-video-duration', duration.toString());
    }
    
    // Try to find parent lesson viewer and update it
    try {
      // Create custom event to notify parent components
      const durationEvent = new CustomEvent('vimeo-duration-loaded', {
        bubbles: true,
        detail: {
          lessonId,
          duration
        }
      });
      
      // Dispatch event from container
      containerRef.current?.dispatchEvent(durationEvent);
      
      console.log(`[VimeoPlayer] Dispatched duration update event: ${duration}s`);
    } catch (e) {
      console.error('[VimeoPlayer] Error dispatching duration event:', e);
    }
  };

  // Format time display (MM:SS)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle manual completion
  const handleMarkComplete = async () => {
    await progressTracker.markComplete();
    onComplete?.();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Vimeo Player Container */}
      <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
        {/* Player container */}
        <div 
          ref={containerRef} 
          className="w-full h-full"
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-center text-white p-4">
              <p className="text-red-400 font-bold mb-2">Error loading video</p>
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Progress bar and controls */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </div>
          {progressTracker.isCompleted && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Completed</span>
            </div>
          )}
        </div>
        
        <Progress 
          value={progressTracker.progress} 
          className="h-1" 
        />
      </div>
      
      {/* Manual completion button */}
      {showControls && !progressTracker.isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkComplete}
          className="mt-2"
        >
          Mark as Complete
        </Button>
      )}
      
      {/* Last saved indicator (helpful for debugging) */}
      {process.env.NODE_ENV === 'development' && progressTracker.lastSavedAt && (
        <p className="text-xs text-muted-foreground mt-1">
          Last saved: {progressTracker.lastSavedAt.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

/**
 * Skeleton loading state for the Vimeo player
 */
export const VimeoLessonPlayerSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="aspect-video bg-gray-200 animate-pulse rounded-lg" />
      <div className="h-1 bg-gray-200 animate-pulse rounded-full" />
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-20 bg-gray-200 animate-pulse rounded" />
      </div>
    </div>
  );
};
