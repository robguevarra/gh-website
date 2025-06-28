'use client';

import { useState, useRef, useEffect } from 'react';
import Player from '@vimeo/player';
import { storeVideoDuration } from '@/lib/utils/video-metadata';

// Types for hook return values
export interface VimeoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  percent: number;
  isBuffering: boolean;
  volume: number;
  playbackRate: number;
}

export interface VimeoPlayerEvents {
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onTimeUpdate: (data: { seconds: number; percent: number; duration: number }) => void;
  onSeeked: (data: { seconds: number }) => void;
}

/**
 * Hook for Vimeo Player integration
 * 
 * This hook initializes and manages the lifecycle of a Vimeo Player instance.
 * It handles player events and manages player state, providing a clean interface
 * for components to interact with the Vimeo Player.
 */
export const useVimeoPlayer = (
  elementRef: React.RefObject<HTMLElement>,
  videoId: string,
  options: {
    autoplay?: boolean;
    initialPosition?: number;
    responsive?: boolean;
    events?: Partial<VimeoPlayerEvents>;
    lessonId?: string; // The ID of the lesson for storing metadata
  } = {}
) => {
  // Player instance and state
  const playerRef = useRef<Player | null>(null);
  const eventsAttached = useRef<boolean>(false);
  
  // Track visibility state
  const isVisible = useRef<boolean>(true);
  
  // Store last known position before tab visibility change
  const lastKnownPosition = useRef<number>(options.initialPosition || 0);
  
  // Track player state
  const [playerState, setPlayerState] = useState<VimeoPlayerState>({
    isPlaying: false,
    currentTime: options.initialPosition || 0,
    duration: 0,
    percent: 0,
    isBuffering: false,
    volume: 1,
    playbackRate: 1
  });

  // Initialize player when elementRef and videoId are available
  useEffect(() => {
    if (!elementRef.current || !videoId) return;
    
    // Create Vimeo Player instance
    const playerOptions = {
      id: parseInt(videoId),  // Vimeo requires numeric ID
      responsive: options.responsive ?? true,
      autoplay: options.autoplay ?? false,
    };

    try {
      // Initialize the player
      playerRef.current = new Player(elementRef.current, playerOptions);
      
      // Set initial position if provided
      if (options.initialPosition && options.initialPosition > 0) {
        playerRef.current.setCurrentTime(options.initialPosition);
      }
      
      // Get initial player state and store duration in the database
      playerRef.current.getDuration().then(duration => {
        setPlayerState(prev => ({ ...prev, duration }));
        
        // Store the video duration in the database for future reference
        // Extract lessonId from options if available or from a data attribute
        const lessonId = options.lessonId || 
                         (elementRef.current?.getAttribute('data-lesson-id') || '');
                         
        if (lessonId && duration > 0) {
          // Store duration in the database to persist for future uses
          storeVideoDuration(lessonId, duration, { 
            debug: process.env.NODE_ENV === 'development'
          });
        }
      });
      
      // Setup event handlers
      setupEventHandlers();
      
      // Setup page visibility detection
      setupVisibilityDetection();
    } catch (error) {
      console.error('Error initializing Vimeo player:', error);
    }
    
    // Cleanup player on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.off('play');
        playerRef.current.off('pause');
        playerRef.current.off('ended');
        playerRef.current.off('timeupdate');
        playerRef.current.off('seeked');
        playerRef.current.off('bufferstart');
        playerRef.current.off('bufferend');
        playerRef.current.off('volumechange');
        playerRef.current.off('playbackratechange');
        
        // Destroy player
        playerRef.current.destroy();
        playerRef.current = null;
      }
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [elementRef, videoId]);

  // Setup event handlers
  const setupEventHandlers = () => {
    if (!playerRef.current || eventsAttached.current) return;
    
    // Standard events
    playerRef.current.on('play', () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
      options.events?.onPlay?.();
    });
    
    playerRef.current.on('pause', () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      options.events?.onPause?.();
    });
    
    playerRef.current.on('ended', () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false, percent: 100 }));
      options.events?.onEnded?.();
    });
    
    playerRef.current.on('timeupdate', (data) => {
      // Update our state with current time
      setPlayerState(prev => ({
        ...prev,
        currentTime: data.seconds,
        percent: Math.round(data.percent * 100)
      }));
      
      // Store the last known position for visibility change handling
      lastKnownPosition.current = data.seconds;
      
      options.events?.onTimeUpdate?.({
        seconds: data.seconds,
        percent: Math.round(data.percent * 100),
        duration: data.duration
      });
    });
    
    playerRef.current.on('seeked', (data) => {
      setPlayerState(prev => ({ ...prev, currentTime: data.seconds }));
      options.events?.onSeeked?.(data);
    });
    
    // Additional state tracking
    playerRef.current.on('bufferstart', () => {
      setPlayerState(prev => ({ ...prev, isBuffering: true }));
    });
    
    playerRef.current.on('bufferend', () => {
      setPlayerState(prev => ({ ...prev, isBuffering: false }));
    });
    
    playerRef.current.on('volumechange', ({ volume }) => {
      setPlayerState(prev => ({ ...prev, volume }));
    });
    
    playerRef.current.on('playbackratechange', ({ playbackRate }) => {
      setPlayerState(prev => ({ ...prev, playbackRate }));
    });
    
    eventsAttached.current = true;
  };
  
  // Track page visibility to pause counting when tab is hidden
  const setupVisibilityDetection = () => {
    isVisible.current = document.visibilityState === 'visible';
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };
  
  const handleVisibilityChange = () => {
    const wasVisible = isVisible.current;
    isVisible.current = document.visibilityState === 'visible';
    
    // When tab becomes hidden, save the current position
    if (wasVisible && !isVisible.current) {
      // Store current time in our ref
      lastKnownPosition.current = playerState.currentTime;
      
      console.log(`[Vimeo] Tab hidden, stored position: ${lastKnownPosition.current.toFixed(2)}s`);
    }
    
    // When tab becomes visible again, ensure we're at the saved position
    if (!wasVisible && isVisible.current) {
      console.log(`[Vimeo] Tab visible again, restoring to: ${lastKnownPosition.current.toFixed(2)}s`);
      
      // There's a delay needed here to let the player reconnect
      setTimeout(() => {
        if (playerRef.current && lastKnownPosition.current > 0) {
          // Explicitly tell player to go to the last known position
          playerRef.current.setCurrentTime(lastKnownPosition.current).then(() => {
            console.log(`[Vimeo] Position restored successfully to ${lastKnownPosition.current.toFixed(2)}s`);
          }).catch(err => {
            console.error('[Vimeo] Error restoring position:', err);
          });
        }
      }, 300); // Small delay to ensure player is ready
    }
  };

  // Player control methods
  const play = () => playerRef.current?.play();
  const pause = () => playerRef.current?.pause();
  const seekTo = (time: number) => playerRef.current?.setCurrentTime(time);
  const setVolume = (volume: number) => playerRef.current?.setVolume(volume);
  const setPlaybackRate = (rate: number) => playerRef.current?.setPlaybackRate(rate);
  
  return {
    // State
    playerState,
    isVisible: () => isVisible.current,
    
    // Controls
    play,
    pause,
    seekTo,
    setVolume,
    setPlaybackRate,
    
    // Player instance (for advanced use cases)
    getPlayer: () => playerRef.current
  };
};
