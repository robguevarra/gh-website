"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

// UI Components
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
// Toast is now handled by the ToasterProvider in the root layout
import { Skeleton } from "@/components/ui/skeleton"

// Dashboard components
import { CourseModuleAccordion } from "@/components/dashboard/course-module-accordion"
import { LessonPlayer } from "@/components/dashboard/lesson-player"
import { LessonNotes } from "@/components/dashboard/lesson-notes"
import { LessonResources } from "@/components/dashboard/lesson-resources"
import { LessonComments } from "@/components/dashboard/lesson-comments"

// Auth and store
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"
import { useAuth } from "@/context/auth-context"
import { formatLessonDuration } from "@/lib/utils/progress-helpers"

// Icons
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Paperclip,
  Play
} from "lucide-react"

// Utilities
import { getBrowserClient } from "@/lib/supabase/client"
import { getLessonVideoId, getLessonVideoUrl } from "@/lib/stores/course/types/lesson"

// Define types for our course data structure
type CourseResource = {
  id: string
  title: string
  url: string
  type: string
}

type CourseLesson = {
  id: string
  title: string
  order: number
  duration?: string
  videoUrl?: string
  videoId?: string
  videoType?: 'vimeo' | 'youtube' | 'other'
  description?: string
  content_json?: any
  videoDuration?: number // Real duration from Vimeo player in seconds
  metadata?: {
    type?: string
    videoUrl?: string
    videoId?: string
    videoType?: string
    duration?: number
    [key: string]: any
  }
  resources?: CourseResource[]
  moduleId?: string
}

type CourseModule = {
  id: string
  title: string
  order: number
  lessons?: CourseLesson[]
}

type ExtendedCourse = {
  id: string
  title: string
  modules?: CourseModule[]
}

// Consolidated state object type
type CourseViewerState = {
  activeTab: string
  videoProgress: number
  isLoading: boolean
  error: string | null
  currentLesson: (CourseLesson & {
    videoId?: string | null
    videoUrl?: string | null
    videoType?: string
  }) | null
  currentModule: CourseModule | null
  currentCourse: ExtendedCourse | null
  nextLesson: CourseLesson | null
  prevLesson: CourseLesson | null
}

export default function CourseViewer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Get course and lesson IDs from URL params
  const courseId = searchParams.get("courseId") || ""
  const lessonId = searchParams.get("lessonId") || ""
  const moduleId = searchParams.get("moduleId") || ""

  // Get the targeted enrollment loader function
  const loadSpecificEnrollment = useStudentDashboardStore(state => state.loadSpecificEnrollment)

  // Progress related hooks - use Zustand store with memoized selectors
  const courseProgress = useStudentDashboardStore(state => state.courseProgress)
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const updateLessonProgress = useStudentDashboardStore(state => state.updateLessonProgress)
  const loadUserProgress = useStudentDashboardStore(state => state.loadUserProgress)
  
  // Function to handle navigation back to dashboard with revalidation
  const navigateToDashboard = useCallback(() => {
    // Force course progress revalidation if user?.id is available
    if (user?.id && loadUserProgress) {
      loadUserProgress(user.id)
        .then(() => {
          console.log('Progress data reloaded before navigation');
          // Navigate back to dashboard
          router.push('/dashboard');
        })
        .catch(err => {
          console.error('Failed to reload progress before navigation:', err);
          // Navigate anyway
          router.push('/dashboard');
        });
    } else {
      // Fallback navigation if no user ID
      router.push('/dashboard');
    }
  }, [user, loadUserProgress, router]);

  // Initial state
  const initialState: CourseViewerState = {
    activeTab: "content",
    videoProgress: 0,
    isLoading: true,
    error: null,
    currentLesson: null,
    currentModule: null,
    currentCourse: null,
    nextLesson: null,
    prevLesson: null
  }

  // Use a single state object instead of multiple state variables
  const [courseViewerState, setCourseViewerState] = useState<CourseViewerState>(initialState)

  // Define state variables
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCourseStructure, setIsLoadingCourseStructure] = useState(false)
  const [fullCourseData, setFullCourseData] = useState<ExtendedCourse | null>(null)

  // Load enrollment and course data via store
  useEffect(() => {
    if (!user?.id || !courseId) return;
    setCourseViewerState(prev => ({ ...prev, isLoading: true }));
    loadSpecificEnrollment(user.id, courseId)
      .then(enrollment => {
        if (!enrollment) {
          setCourseViewerState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Course not found. You are not enrolled in this course.'
          }));
          return;
        }
        const processedCourse = enrollment.course as ExtendedCourse; // Explicit type cast to fix TypeScript error
        setCourseViewerState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
          currentCourse: processedCourse,
        }));
        if (loadUserProgress) {
          loadUserProgress(user.id);
        }
      })
      .catch(err =>
        setCourseViewerState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'An unknown error occurred'
        }))
      );
  }, [user?.id, courseId, loadSpecificEnrollment, loadUserProgress]);

  // When course data is available, ensure we load progress for all lessons
  useEffect(() => {
    // Skip if no course data or no user
    if (!courseViewerState.currentCourse?.modules || !user?.id) return

    // Find all lessons in this course
    const allLessons = courseViewerState.currentCourse.modules.flatMap(m => m.lessons || [])
    // Check if we have progress data for any lesson that's marked as complete
    // This helps detect if progress state data is stale or incomplete
    const anyCompleteLessonsMissingProgress = allLessons.some(lesson => {
      // For any lesson that might be complete, verify we have its progress data
      const hasProgressData = !!lessonProgress[lesson.id]
      const needsProgressCheck = !hasProgressData
      return needsProgressCheck
    })

    // If we're missing progress data for any lessons, reload all progress
    if (anyCompleteLessonsMissingProgress) {
      loadUserProgress(user.id)
    }
  }, [courseViewerState.currentCourse, user?.id, lessonProgress, loadUserProgress])

  // Use useMemo to derive sorted modules from course data
  const sortedModules = useMemo(() => {
    if (!courseViewerState.currentCourse?.modules) return [];
    
    // Add some debug information
    console.log('Course modules:', courseViewerState.currentCourse.modules);
    
    // Make sure all modules have the order property, default to 0 if missing
    const modulesWithOrder = courseViewerState.currentCourse.modules.map(module => ({
      ...module,
      order: module.order ?? 0 // Default to 0 if order is missing
    }));
    
    return [...modulesWithOrder].sort((a, b) => a.order - b.order);
  }, [courseViewerState.currentCourse]);

  // Find the target module
  const targetModule = useMemo(() => {
    if (sortedModules.length === 0) {
      console.log('No modules available to select');
      return null;
    }
    
    // Find the module by ID
    const foundModule = sortedModules.find(m => m.id === moduleId);
    
    // If no module ID is provided or the module is not found, use the first module
    const selectedModule = foundModule || sortedModules[0];
    console.log('Selected module:', selectedModule);
    return selectedModule;
  }, [sortedModules, moduleId]);

  // Use useMemo to derive sorted lessons from the target module
  const sortedLessons = useMemo(() => {
    if (!targetModule?.lessons) return []
    return [...targetModule.lessons].sort((a, b) => a.order - b.order)
  }, [targetModule])

  // Use useMemo to find the target lesson
  const targetLesson = useMemo(() => {
    if (sortedLessons.length === 0) return null

    // Find the current lesson by ID
    const foundLesson = sortedLessons.find(l => l.id === lessonId)

    // If no lesson ID is provided or not found, use the first lesson
    return foundLesson || sortedLessons[0]
  }, [sortedLessons, lessonId])

  // Use useMemo to calculate previous and next lessons
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!targetLesson || !targetModule) return { prevLesson: null, nextLesson: null }

    const currentIndex = sortedLessons.findIndex(l => l.id === targetLesson.id)
    let prev = null
    let next = null

    // Calculate previous lesson
    if (currentIndex > 0) {
      // Previous lesson in the same module
      prev = sortedLessons[currentIndex - 1]
    } else {
      // Look for the last lesson of the previous module
      const currentModuleIndex = sortedModules.findIndex(m => m.id === targetModule.id)
      if (currentModuleIndex > 0) {
        const prevModule = sortedModules[currentModuleIndex - 1]
        if (prevModule.lessons && prevModule.lessons.length > 0) {
          const prevModuleLessons = [...prevModule.lessons].sort((a, b) => a.order - b.order)
          prev = {
            ...prevModuleLessons[prevModuleLessons.length - 1],
            moduleId: prevModule.id
          }
        }
      }
    }

    // Calculate next lesson
    if (currentIndex < sortedLessons.length - 1) {
      // Next lesson in the same module
      next = sortedLessons[currentIndex + 1]
    } else {
      // Look for the first lesson of the next module
      const currentModuleIndex = sortedModules.findIndex(m => m.id === targetModule.id)
      if (currentModuleIndex < sortedModules.length - 1) {
        const nextModule = sortedModules[currentModuleIndex + 1]
        if (nextModule.lessons && nextModule.lessons.length > 0) {
          const nextModuleLessons = [...nextModule.lessons].sort((a, b) => a.order - b.order)
          next = {
            ...nextModuleLessons[0],
            moduleId: nextModule.id
          }
        }
      }
    }

    return { prevLesson: prev, nextLesson: next }
  }, [targetLesson, targetModule, sortedLessons, sortedModules])

  // Update course viewer state when data changes
  useEffect(() => {
    // Only update state if we have valid data
    if (courseViewerState.currentCourse && targetModule && targetLesson) {
      // Debug: inspect raw metadata and duration values at different stages
      console.log('[CourseViewer] Lesson metadata raw:', targetLesson.metadata);
      
      // Convert metadata duration from minutes to seconds if needed
      let convertedMetadataDuration = targetLesson.metadata?.duration;
      
      // If duration is a small number (< 60) and not explicitly marked as seconds,
      // it's likely in minutes, so convert to seconds for consistency
      if (convertedMetadataDuration && 
          convertedMetadataDuration < 60 && 
          !targetLesson.metadata?.durationUnit && 
          !targetLesson.metadata?.videoDuration) {
        // Convert from minutes to seconds (e.g., 42 minutes → 2520 seconds)
        convertedMetadataDuration = convertedMetadataDuration * 60;
        console.log(`[CourseViewer] Converting metadata duration from minutes to seconds: ${targetLesson.metadata?.duration} min → ${convertedMetadataDuration} sec`);
      }
      
      console.log('[CourseViewer] Lesson duration sources:', {
        videoDuration: targetLesson.videoDuration,
        rawMetadataDuration: targetLesson.metadata?.duration,
        convertedMetadataDuration,
        staticDuration: targetLesson.duration
      });
      // Use helper to parse Vimeo ID or metadata videoId
      const videoId = getLessonVideoId(targetLesson as any) || undefined

      // Use helper to build embed URL or fallback to metadata
      const videoUrl = getLessonVideoUrl(targetLesson as any) || undefined

      // Create an enhanced lesson with video metadata
      const enhancedLesson = {
        ...targetLesson,
        videoId: videoId || undefined,
        videoUrl: videoUrl || undefined,
        videoType: targetLesson.metadata?.videoType || 'vimeo',
        // Explicitly preserve duration values, with metadata duration converted if needed
        videoDuration: targetLesson.videoDuration,
        metadata: {
          ...targetLesson.metadata,
          // Use converted duration if available, otherwise keep the original
          duration: convertedMetadataDuration || targetLesson.metadata?.duration
        }
      } as CourseViewerState['currentLesson'];
      
      // Debug: Check enhanced lesson's duration values
      if (enhancedLesson) {
        console.log('[CourseViewer] Enhanced lesson duration sources:', {
          videoDuration: enhancedLesson.videoDuration,
          metadataDuration: enhancedLesson.metadata?.duration,
          staticDuration: enhancedLesson.duration,
          formattedDuration: formatLessonDuration(
            enhancedLesson.videoDuration || 
            enhancedLesson.metadata?.duration || 
            enhancedLesson.duration
          )
        });
      }

      setCourseViewerState(prevState => ({
        ...prevState,
        currentModule: targetModule,
        currentLesson: enhancedLesson,
        prevLesson,
        nextLesson
      }))
    }
  }, [courseViewerState.currentCourse, targetModule, targetLesson, prevLesson, nextLesson])

  // Initialize lesson progress when lesson changes
  // Using a ref to track which lessons we've already initialized
  const initializedLessonsRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (targetLesson && user?.id &&
        !initializedLessonsRef.current[targetLesson.id]) {
      // Mark this lesson as initialized to prevent duplicate initialization
      initializedLessonsRef.current[targetLesson.id] = true

      // Only initialize new progress records if no progress exists in the store
      // This prevents resetting progress that exists in the database but hasn't been loaded yet
      if (!lessonProgress[targetLesson.id]) {
        // First check if this is a first visit or returning to a lesson with existing progress
        const supabase = getBrowserClient()

        // Check database for existing progress before initializing
        supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('lesson_id', targetLesson.id)
          .maybeSingle()
          .then((response) => {
            // Properly type the response using destructuring
            const { data: existingProgress, error } = response;

            if (error) {
              console.error('Error checking existing progress:', error)
              return
            }

            // If progress exists in the database, use those values
            // Otherwise initialize with defaults
            if (existingProgress) {
              updateLessonProgress(user.id, targetLesson.id, {
                status: existingProgress.status || 'not-started',
                progress: existingProgress.progress_percentage !== null ? existingProgress.progress_percentage : 0,
                lastPosition: existingProgress.last_position !== null ? existingProgress.last_position : 0
              })
            } else {
              // No existing progress, initialize with defaults
              updateLessonProgress(user.id, targetLesson.id, {
                status: 'in-progress',
                progress: 0,
                lastPosition: 0
              })
            }
          })
      }
    }
  }, [targetLesson, user?.id, lessonProgress, updateLessonProgress])

  // Update video progress - this function is used by the LessonPlayer component
  // We're keeping it here for future reference, but it's not currently used
  /*
  const handleVideoProgress = useCallback((progress: number, currentTime: number) => {
    setCourseViewerState(prevState => ({
      ...prevState,
      videoProgress: progress
    }))

    // Update lesson progress in the database
    if (user?.id && courseViewerState.currentLesson?.id) {
      updateLessonProgress(user.id, courseViewerState.currentLesson.id, {
        status: progress >= 95 ? "completed" : "in-progress",
        progress: Math.min(progress, 100),
        lastPosition: currentTime
      })
    }
  }, [user?.id, courseViewerState.currentLesson, updateLessonProgress])
  */

  // Handle navigation to another lesson
  const navigateToLesson = useCallback((lesson: any, moduleId: string) => {
    // Construct the URL with the necessary parameters
    const url = `/dashboard/course?courseId=${courseId}&lessonId=${lesson.id}&moduleId=${moduleId}`
    router.push(url)
  }, [courseId, router])

  // Handle next lesson click
  const handleNextLesson = useCallback(() => {
    if (!courseViewerState.nextLesson) return

    // If current lesson is not complete, mark it as complete
    if (user?.id && courseViewerState.currentLesson?.id) {
      const currentProgress = lessonProgress[courseViewerState.currentLesson.id]?.progress || 0
      if (currentProgress < 100) {
        updateLessonProgress(user.id, courseViewerState.currentLesson.id, {
          status: "completed",
          progress: 100,
          lastPosition: 0
        })
      }
    }

    // Navigate to next lesson
    navigateToLesson(
      courseViewerState.nextLesson,
      courseViewerState.nextLesson.moduleId || courseViewerState.currentModule?.id || ''
    )
  }, [courseViewerState, navigateToLesson, user?.id, lessonProgress, updateLessonProgress])

  // Handle previous lesson click
  const handlePrevLesson = useCallback(() => {
    if (!courseViewerState.prevLesson) return

    navigateToLesson(
      courseViewerState.prevLesson,
      courseViewerState.prevLesson.moduleId || courseViewerState.currentModule?.id || ''
    )
  }, [courseViewerState, navigateToLesson])

  // Mark lesson as complete
  // Using a ref to track which lessons we've already marked as complete
  const completedLessonsRef = useRef<Record<string, boolean>>({})

  const markLessonComplete = useCallback(() => {
    const currentLesson = courseViewerState.currentLesson
    if (!currentLesson || !user?.id || !updateLessonProgress) return

    // Check if this lesson was already marked as complete in this session
    if (completedLessonsRef.current[currentLesson.id]) {
      toast.info("Already Completed", {
        description: "This lesson is already marked as complete."
      })
      return
    }

    // Mark lesson as complete in Supabase
    updateLessonProgress(user.id, currentLesson.id, {
      status: "completed",
      progress: 100,
      lastPosition: 0 // Position isn't really relevant when marking as complete
    })
      .then(() => {
        // Set our local tracking to prevent duplicate marks
        completedLessonsRef.current[currentLesson.id] = true
        
        // Show success message with toast instead of alert
        toast.success("Lesson Completed", {
          description: "Your progress has been updated!"
        })
        
        // Force course progress revalidation to update the progress bar
        if (loadUserProgress) {
          loadUserProgress(user.id)
            .then(() => {
              console.log('Progress data reloaded after marking lesson complete');
            })
            .catch(err => {
              console.error('Failed to reload progress after completion:', err);
            });
        }
      })
      .catch(error => {
        console.error("Error marking lesson complete:", error)
        toast.error("Error", {
          description: "Failed to mark lesson complete. Please try again."
        })
      })
  }, [courseViewerState.currentLesson, user?.id, courseId, updateLessonProgress, loadUserProgress])

  // Handle tab change - this function is used by the Tabs component
  // We're keeping it here for future reference, but it's not currently used
  /*
  const handleTabChange = useCallback((value: string) => {
    setCourseViewerState(prevState => ({
      ...prevState,
      activeTab: value
    }))
  }, [])
  */

  // Determine different states for better UX using simplified conditionals
  const showInitialLoading = courseViewerState.isLoading;
  const noCourseId = !courseId;
  const hasError = courseViewerState.error !== null;
  const courseNotFound = (!courseViewerState.currentCourse && !showInitialLoading && courseId) || hasError;

  // Handle case where no courseId is provided
  if (noCourseId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-medium mb-2">Course ID Required</h2>
            <p className="text-muted-foreground mb-6">
              Please select a course from your dashboard to view it.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Show loading skeletons while data is being fetched
  if (showInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="w-full h-[400px] rounded-xl mb-4" />
              <Skeleton className="w-3/4 h-8 mb-2" />
              <Skeleton className="w-1/2 h-6 mb-6" />

              <div className="border-b mb-4">
                <Skeleton className="w-[300px] h-10 mb-4" />
              </div>

              <Skeleton className="w-full h-[200px]" />
            </div>

            <div>
              <Skeleton className="w-full h-[500px] rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Check if we found a course but it doesn't have modules
  const courseFoundButNoModules = courseViewerState.currentCourse && (!courseViewerState.currentCourse.modules || courseViewerState.currentCourse.modules.length === 0);
  
  // Render the course not found message if no course data is found after loading
  if (courseNotFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-medium mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {courseViewerState.error ? (
                // Show specific error message when available for better debugging
                <>
                  {courseViewerState.error}
                  <br/>
                  <code className="text-xs bg-gray-100 p-1 rounded mt-2 inline-block">{courseId}</code>
                </>
              ) : (
                // Default message when no specific error is provided
                <>
                  We couldn't find the course with ID: <code>{courseId}</code>
                  <br/>
                  <span className="text-sm text-gray-500 mt-2 inline-block">
                    {courseProgress && Object.keys(courseProgress).length > 0 
                      ? "You're enrolled in courses, but not this specific one." 
                      : "You don't appear to be enrolled in any courses yet."}
                  </span>
                </>
              )}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }
  
  // Render a special message for courses that don't have modules
  if (courseFoundButNoModules) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-medium mb-2">{courseViewerState.currentCourse.title || 'Course'}</h2>
            <p className="text-muted-foreground mb-6">
              This course doesn't have any content modules yet.
              <br/>
              <span className="text-sm text-gray-500 mt-2 inline-block">
                Content for this course is coming soon! Check back later for lessons and materials.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={navigateToDashboard}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }
  
  // No lesson found but course exists
  if (courseViewerState.currentCourse && !targetLesson) {
    // Course exists but lesson not found
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-medium mb-2">Lesson Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We found your course "{courseViewerState.currentCourse.title}", but couldn't find the specific lesson.
              <br/>
              <span className="text-sm text-gray-500 mt-2 inline-block">
                Please select a lesson from the course menu.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push(`/dashboard/course?courseId=${courseViewerState.currentCourse.id}`)}>
                View Course
              </Button>
              <Button variant="outline" onClick={navigateToDashboard}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // At this point in the code, we've already gone through all the null checks
  // Both course and lesson must exist for the code to reach here
  // We need to create the course viewer state object now that we've validated the data
  const currentCourse = courseViewerState.currentCourse!; // Verified by previous checks
  const currentLesson = targetLesson!; // Verified by previous checks
  
  // Calculate progress for current lesson
  const currentLessonProgress = lessonProgress[currentLesson.id] || {
    progress: 0,
    lastPosition: 0,
    status: 'not-started'
  }

  // Main course viewer UI
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 container py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={navigateToDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Course sidebar */}
          <div className="order-2 md:order-1">
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h2 className="text-lg font-medium mb-4">
                {currentCourse.title || "Course Content"}
              </h2>

              {/* Course modules accordion */}
              <CourseModuleAccordion
                course={currentCourse}
                currentModuleId={targetModule?.id || ''}
                currentLessonId={currentLesson.id}
                onLessonClick={navigateToLesson}
                lessonProgress={lessonProgress}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className="order-1 md:order-2 md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Video player */}
              <div className="aspect-video bg-black relative overflow-hidden rounded-sm"
                   ref={(el) => {
                     // Add event listener for duration updates from Vimeo player
                     if (el) {
                       const handleDurationLoaded = (e: Event) => {
                         // Type assertion for custom event
                         const event = e as CustomEvent<{lessonId: string, duration: number}>;
                         console.log(`[CourseViewer] Received duration update event:`, event.detail);
                         
                         // Only update if this is for our current lesson
                         if (event.detail.lessonId === currentLesson.id) {
                           // Update our current lesson with the new duration
                           setCourseViewerState(prevState => ({
                             ...prevState,
                             currentLesson: {
                               ...prevState.currentLesson!,
                               videoDuration: event.detail.duration,
                               // Also update in metadata for consistency
                               metadata: {
                                 ...prevState.currentLesson?.metadata,
                                 duration: event.detail.duration
                               }
                             }
                           }));
                           console.log(`[CourseViewer] Updated lesson ${currentLesson.id} duration to ${event.detail.duration}s`);
                         }
                       };
                       
                       // Add event listener
                       el.addEventListener('vimeo-duration-loaded', handleDurationLoaded);
                       
                       // Return cleanup function
                       return () => {
                         el.removeEventListener('vimeo-duration-loaded', handleDurationLoaded);
                       };
                     }
                   }}
              >
                {currentLesson.metadata?.videoUrl ? (
                  // Render private embed snippet as-is
                  <div
                    className="absolute inset-0 w-full h-full"
                    data-lesson-id={currentLesson.id}
                    data-debug-duration={formatLessonDuration(
                      currentLesson.videoDuration || 
                      currentLesson.metadata?.duration || 
                      currentLesson.duration
                    )}
                    dangerouslySetInnerHTML={{ __html: currentLesson.metadata.videoUrl as string }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-800 text-white">
                    <div className="text-center p-6">
                      <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No video available for this lesson</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson info */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-medium">
                    {currentLesson.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={lessonProgress[courseViewerState.currentLesson?.id || '']?.status === 'completed' ? "outline" : "default"}
                      size="sm"
                      onClick={markLessonComplete}
                      className="flex items-center gap-1"
                      disabled={lessonProgress[courseViewerState.currentLesson?.id || '']?.status === 'completed'}
                    >
                      <CheckCircle className={`h-4 w-4 ${lessonProgress[courseViewerState.currentLesson?.id || '']?.status === 'completed' ? "text-green-500" : ""}`} />
                      {lessonProgress[courseViewerState.currentLesson?.id || '']?.status === 'completed' ? "Completed" : "Mark as Complete"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 group">
                    <Clock className="h-4 w-4" />
                    {/* Debug when rendering duration */}
                    {(() => {
                      // Log duration values at render time
                      console.log('[CourseViewer] Rendering duration values:', {
                        videoDuration: currentLesson.videoDuration,
                        metadataDuration: currentLesson.metadata?.duration,
                        staticDuration: currentLesson.duration
                      });
                      
                      // Check if metadata duration is in minutes and needs conversion
                      let durationToShow = currentLesson.videoDuration || currentLesson.metadata?.duration || currentLesson.duration;
                      
                      // If metadata duration is a small number (< 60) and not from Vimeo (videoDuration),
                      // it's likely in minutes, so make sure formatLessonDuration knows it's minutes
                      if (!currentLesson.videoDuration && 
                          currentLesson.metadata?.duration && 
                          currentLesson.metadata.duration < 60 && 
                          !currentLesson.metadata?.durationUnit) {
                        console.log(`[CourseViewer] Explicitly formatting ${currentLesson.metadata.duration} as minutes`);
                        
                        // Pass as string with 'min' suffix to ensure formatLessonDuration treats it as minutes
                        return formatLessonDuration(`${currentLesson.metadata.duration} min`);
                      }
                      
                      // Format the duration with priority order
                      return formatLessonDuration(durationToShow);
                    })()}
                  </div>

                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {courseViewerState.currentModule?.title || "Module"}
                  </div>
                </div>

                {currentLesson.description && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {currentLesson.description}
                  </p>
                )}
              </div>

              {/* Progress indicator */}
              <div className="px-4 py-2 border-b">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{currentLessonProgress.progress}%</span>
                </div>
                <Progress value={currentLessonProgress.progress} className="h-1.5" />
              </div>

              {/* Lesson content */}
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-4">Lesson Content</h2>

                <div className="prose max-w-none">
                  {currentLesson.content_json?.content ? (
                    <div className="lesson-content" dangerouslySetInnerHTML={{ __html: currentLesson.content_json.content as string }} />
                  ) : currentLesson.description ? (
                    <div>
                      <p className="text-base">{currentLesson.description}</p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Content Available</h3>
                      <p className="text-muted-foreground">This lesson doesn't have any additional content.</p>
                    </div>
                  )}
                </div>

                {currentLesson.resources && currentLesson.resources.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-3">Resources</h3>
                    <div className="space-y-2">
                      {currentLesson.resources.map((resource: CourseResource) => (
                        <div key={resource.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                          <Paperclip className="h-4 w-4 mr-3 text-muted-foreground" />
                          <div className="flex-1">
                            <h4 className="font-medium">{resource.title}</h4>
                            <p className="text-xs text-muted-foreground">{resource.type}</p>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" /> Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lesson navigation */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevLesson}
                  disabled={!courseViewerState.prevLesson}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous Lesson
                </Button>

                <Button
                  onClick={handleNextLesson}
                  disabled={!courseViewerState.nextLesson}
                  className="flex items-center gap-2"
                >
                  Next Lesson
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Course progress */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h3 className="text-sm font-medium mb-2">Course Progress</h3>
              <Progress
                value={courseProgress[courseId]?.progress || 0}
                className="h-2 mb-2"
              />
              <p className="text-xs text-muted-foreground">
                {Math.round(courseProgress[courseId]?.progress || 0)}% complete
              </p>

              <div className="mt-4">
                <h4 className="text-xs font-medium mb-1">Course Stats</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total Lessons</p>
                    <p className="font-medium">
                      {courseViewerState.currentCourse?.modules?.reduce(
                        (total: number, module: CourseModule) => {
                          return total + (module.lessons?.length || 0)
                        }, 0
                      ) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Modules</p>
                    <p className="font-medium">
                      {courseViewerState.currentCourse?.modules?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
