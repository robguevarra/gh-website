'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useUserProfileData, useCourseProgressData } from '@/lib/hooks/use-dashboard-store'
import { EnrollmentStatus } from './enrollment-status'

type VideoPlayerProps = {
  videoUrl: string
  autoPlay?: boolean
  initialPosition?: number
  onProgressUpdate: (progress: number, position: number) => void
  onComplete: () => void
}

/**
 * Video player component that tracks progress and updates the store
 */
function VideoPlayer({ 
  videoUrl, 
  autoPlay = false, 
  initialPosition = 0,
  onProgressUpdate,
  onComplete 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Set initial position when component mounts
  useEffect(() => {
    if (videoRef.current && initialPosition) {
      videoRef.current.currentTime = initialPosition
    }
  }, [initialPosition])
  
  // Setup event listeners for the video player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleTimeUpdate = () => {
      const current = video.currentTime
      const total = video.duration
      setCurrentTime(current)
      
      // Calculate progress percentage
      const progressPercentage = (current / total) * 100
      setProgress(progressPercentage)
      
      // Track every 5 seconds of playback
      if (Math.floor(current) % 5 === 0) {
        onProgressUpdate(progressPercentage, current)
      }
      
      // Mark as complete when 95% watched
      if (progressPercentage >= 95 && !video.paused) {
        onComplete()
      }
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      onComplete()
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      
      // Update progress one last time when component unmounts
      if (currentTime > 0) {
        onProgressUpdate(progress, currentTime)
      }
    }
  }, [onProgressUpdate, onComplete, progress, currentTime])
  
  // Format time display (MM:SS)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }
  
  return (
    <div className="rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full aspect-video"
        src={videoUrl}
        controls
        autoPlay={autoPlay}
        playsInline
      />
      <div className="p-3 bg-gray-900 text-white text-sm flex items-center justify-between">
        <div>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="flex-1 mx-4">
          <Progress value={progress} className="h-1" />
        </div>
        <div>
          {progress >= 95 ? (
            <span className="flex items-center text-green-400 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Completed
            </span>
          ) : (
            `${Math.round(progress)}%`
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main lesson player component that integrates with the dashboard store
 */
export function LessonPlayer() {
  const { courseId, moduleId, lessonId } = useParams<{ 
    courseId: string, 
    moduleId: string, 
    lessonId: string 
  }>()
  const { userId } = useUserProfileData()
  const { 
    lessonProgress, 
    updateLessonProgress 
  } = useCourseProgressData()
  
  const [lesson, setLesson] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch lesson data and check enrollment
  useEffect(() => {
    async function fetchLessonData() {
      if (!userId || !courseId || !moduleId || !lessonId) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        // We would normally fetch this from the API
        // For now, let's simulate it with a timeout
        setTimeout(() => {
          // Simulate lesson data (in real app, this would come from the API)
          setLesson({
            id: lessonId,
            moduleId,
            title: "Understanding Financial Markets",
            description: "Learn the fundamentals of how financial markets work and key strategies for investing.",
            videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", // Sample video
            order: 1,
            duration: 1200, // 20 minutes
          })
          setIsLoading(false)
        }, 1000)
      } catch (err) {
        console.error('Error fetching lesson:', err)
        setError('Failed to load the lesson. Please try again.')
        setIsLoading(false)
      }
    }
    
    fetchLessonData()
  }, [userId, courseId, moduleId, lessonId])
  
  // Handle progress updates
  const handleProgressUpdate = (progress: number, position: number) => {
    if (!userId || !lessonId) return
    
    const parsedLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId
    
    // Update progress in the store
    updateLessonProgress(userId, parsedLessonId, {
      status: progress >= 95 ? 'completed' : 'in-progress',
      progress: Math.round(progress),
      lastPosition: Math.floor(position)
    })
  }
  
  // Handle lesson completion
  const handleLessonComplete = () => {
    if (!userId || !lessonId) return
    
    const parsedLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId
    
    // Mark as completed in the store
    updateLessonProgress(userId, parsedLessonId, {
      status: 'completed',
      progress: 100
    })
  }
  
  // Get the current lesson progress from the store
  const currentProgress = lessonId 
    ? lessonProgress[Array.isArray(lessonId) ? lessonId[0] : lessonId] 
    : null
  
  if (isLoading) {
    return <LessonPlayerSkeleton />
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  if (!lesson) {
    return (
      <Alert>
        <AlertTitle>Lesson not found</AlertTitle>
        <AlertDescription>
          The requested lesson could not be found. Please try selecting a different lesson.
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Enrollment verification */}
      <EnrollmentStatus />
      
      {/* Lesson content */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
        <p className="text-muted-foreground mb-6">{lesson.description}</p>
        
        {/* Video player */}
        <VideoPlayer 
          videoUrl={lesson.videoUrl}
          initialPosition={currentProgress?.lastPosition || 0}
          onProgressUpdate={handleProgressUpdate}
          onComplete={handleLessonComplete}
        />
        
        {/* Lesson navigation */}
        <div className="flex justify-between mt-6">
          <Link 
            href={`/courses/${courseId}/modules/${moduleId}`} 
            passHref
          >
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Module
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleLessonComplete()}
          >
            <BookOpen className="h-4 w-4 mr-1" /> 
            {currentProgress?.status === 'completed' ? 'Already Completed' : 'Mark as Complete'}
          </Button>
          
          <Link 
            href={`/courses/${courseId}/modules/${moduleId}/lessons/${parseInt(Array.isArray(lessonId) ? lessonId[0] : lessonId) + 1}`} 
            passHref
          >
            <Button>
              Next Lesson <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function LessonPlayerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-lg" />
      
      <div>
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-full max-w-2xl mb-6" />
        
        <Skeleton className="w-full aspect-video rounded-lg" />
        
        <div className="flex justify-between mt-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  )
}
