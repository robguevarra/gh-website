"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getLessonVideoId, getLessonVideoUrl } from "@/lib/stores/course/types/lesson"
import { motion } from "framer-motion"
import { getBrowserClient } from "@/lib/supabase/client"

// UI Components
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

// Dashboard components
import { StudentHeader } from "@/components/dashboard/student-header"
import { CourseModuleAccordion } from "@/components/dashboard/course-module-accordion"
import { LessonPlayer } from "@/components/dashboard/lesson-player"
import { LessonNotes } from "@/components/dashboard/lesson-notes"
import { LessonResources } from "@/components/dashboard/lesson-resources"
import { LessonComments } from "@/components/dashboard/lesson-comments"

// Store and hooks
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"
import { useAuth } from "@/context/auth-context"
import { useEnrollmentData } from "@/lib/hooks/optimized/use-enrollment-data"

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

  // Use optimized hooks for better performance
  const {
    enrollments,
    loadEnrollments
  } = useEnrollmentData()

  // Get only the specific data needed from the store to prevent unnecessary re-renders
  const courseProgress = useStudentDashboardStore(state => state.courseProgress)
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const updateLessonProgress = useStudentDashboardStore(state => state.updateLessonProgress)

  // Load user data if needed
  const loadUserProgress = useStudentDashboardStore(state => state.loadUserProgress)

  // Initial state
  const initialState: CourseViewerState = {
    activeTab: "content",
    videoProgress: 0,
    isLoading: true,
    currentLesson: null,
    currentModule: null,
    currentCourse: null,
    nextLesson: null,
    prevLesson: null
  }

  // Use a single state object instead of multiple state variables
  const [courseViewerState, setCourseViewerState] = useState<CourseViewerState>(initialState)

  // Load course data
  // Using a ref to prevent multiple loads
  const dataLoadedRef = useRef(false)

  // Prepare for student view and clear any conflicting caches
  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import('@/lib/utils/view-transition').then(({ prepareForStudentView }) => {
      prepareForStudentView();
    });
  }, []);

  useEffect(() => {
    if (!user?.id || dataLoadedRef.current) return

    const loadData = async () => {
      // Set the ref to true to prevent multiple loads
      dataLoadedRef.current = true

      setCourseViewerState(prevState => ({
        ...prevState,
        isLoading: true
      }))

      // Load enrollments if not already loaded
      if (enrollments.length === 0) {
        await loadEnrollments(user.id)
      }

      // Always load the latest progress data for all lessons when viewing a course
      // This ensures the module accordion shows the correct completion status for all lessons
      console.log('Loading latest progress data for course view...')
      await loadUserProgress(user.id)
      
      setCourseViewerState(prevState => ({
        ...prevState,
        isLoading: false
      }))
    }

    loadData()
  }, [user?.id, loadEnrollments, loadUserProgress, enrollments.length])

  // Use useMemo to derive course data from enrollments
  const courseData = useMemo(() => {
    if (enrollments.length === 0 || !courseId) return null

    // Find the current course
    const course = enrollments.find((e: any) => e.course?.id === courseId)?.course as ExtendedCourse | undefined
    if (!course) return null

    // Return the course with properly typed modules and lessons
    return course
  }, [enrollments, courseId])

  // When course data is available, ensure we load progress for all lessons
  useEffect(() => {
    // Skip if no course data or no user
    if (!courseData?.modules || !user?.id) return

    // Find all lessons in this course
    const allLessons = courseData.modules.flatMap(m => m.lessons || [])
    console.log(`Course has ${allLessons.length} lessons, checking progress data...`)

    // Check if we have progress data for any lesson that's marked as complete
    // This helps detect if progress state data is stale or incomplete
    const anyCompleteLessonsMissingProgress = allLessons.some(lesson => {
      // For any lesson that might be complete, verify we have its progress data
      const hasProgressData = !!lessonProgress[lesson.id]
      const needsProgressCheck = !hasProgressData
      if (needsProgressCheck) {
        console.log(`Missing progress data for lesson: ${lesson.id} (${lesson.title})`)
      }
      return needsProgressCheck
    })

    // If we're missing progress data for any lessons, reload all progress
    if (anyCompleteLessonsMissingProgress) {
      console.log('Found lessons missing progress data, reloading progress...')
      loadUserProgress(user.id)
    }
  }, [courseData, user?.id, lessonProgress, loadUserProgress])

  // Use useMemo to derive sorted modules from course data
  const sortedModules = useMemo(() => {
    if (!courseData?.modules) return []
    return [...courseData.modules].sort((a, b) => a.order - b.order)
  }, [courseData])

  // Use useMemo to find the target module
  const targetModule = useMemo(() => {
    if (sortedModules.length === 0) return null

    // Find the current module by ID
    const foundModule = sortedModules.find(m => m.id === moduleId)

    // If no module ID is provided or not found, use the first module
    return foundModule || sortedModules[0]
  }, [sortedModules, moduleId])

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
    if (courseData && targetModule && targetLesson) {
      // Extract video metadata from the lesson
      const videoId = targetLesson.metadata?.videoId ||
                     (targetLesson.metadata?.type === 'video' ?
                      getLessonVideoId(targetLesson as any) : undefined)

      const videoUrl = targetLesson.metadata?.videoUrl ||
                      (targetLesson.metadata?.type === 'video' ?
                       getLessonVideoUrl(targetLesson as any) : undefined)

      // Create an enhanced lesson with video metadata
      const enhancedLesson = {
        ...targetLesson,
        videoId: videoId || undefined,
        videoUrl: videoUrl || undefined,
        videoType: targetLesson.metadata?.videoType || 'vimeo'
      } as CourseViewerState['currentLesson']

      setCourseViewerState(prevState => ({
        ...prevState,
        currentCourse: courseData,
        currentModule: targetModule,
        currentLesson: enhancedLesson,
        prevLesson,
        nextLesson
      }))
    }
  }, [courseData, targetModule, targetLesson, prevLesson, nextLesson])

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
        console.log('Initializing progress for lesson:', targetLesson.id)
        
        // First check if this is a first visit or returning to a lesson with existing progress
        const supabase = getBrowserClient()
        
        // Check database for existing progress before initializing
        supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('lesson_id', targetLesson.id)
          .maybeSingle()
          .then(({ data: existingProgress, error }: { 
            data: { 
              status: string; 
              progress_percentage: number; 
              last_position: number; 
            } | null; 
            error: any 
          }) => {
            if (error) {
              console.error('Error checking existing progress:', error)
              return
            }
            
            // If progress exists in the database, use those values
            // Otherwise initialize with defaults
            if (existingProgress) {
              console.log('Found existing progress in database:', existingProgress)
              updateLessonProgress(user.id, targetLesson.id, {
                status: existingProgress.status,
                progress: existingProgress.progress_percentage,
                lastPosition: existingProgress.last_position
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
    if (user?.id && courseViewerState.currentLesson?.id) {
      const lessonId = courseViewerState.currentLesson.id

      // Check if we've already marked this lesson as complete in this session
      if (completedLessonsRef.current[lessonId]) return

      // Mark this lesson as completed in our ref
      completedLessonsRef.current[lessonId] = true

      // Add debug logging
      console.log('Marking lesson as complete:', {
        userId: user.id,
        lessonId,
        currentStatus: lessonProgress[lessonId]?.status || 'unknown'
      })

      // Update the lesson progress in the store
      updateLessonProgress(user.id, lessonId, {
        status: "completed",
        progress: 100,
        lastPosition: 0
      })
      .then(() => {
        console.log('Lesson marked as complete successfully');
        
        // Find course ID for this lesson to ensure we get the right progress
        const currentCourseId = courseId || courseViewerState.currentCourse?.id;
        if (currentCourseId) {
          console.log('Current course progress:', {
            courseId: currentCourseId,
            progress: courseProgress[currentCourseId]
          });
        }
        
        // Show success message
        alert('Lesson marked as complete!');
      })
      .catch(error => {
        console.error('Failed to mark lesson as complete:', error);
        alert('Failed to mark lesson as complete. Please try again.');
      });
    }
  }, [courseViewerState.currentLesson, user?.id, updateLessonProgress, lessonProgress, courseId, courseProgress, courseViewerState.currentCourse?.id])

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

  // Loading state
  if (courseViewerState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader />
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

  // No course or lesson found
  if (!courseViewerState.currentCourse || !courseViewerState.currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader />
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
              We couldn't find the course or lesson you're looking for.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Calculate progress for current lesson
  const currentLessonProgress = lessonProgress[courseViewerState.currentLesson.id] || {
    progress: 0,
    lastPosition: 0,
    status: 'not-started'
  }

  // Main course viewer UI
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <StudentHeader />

      <main className="flex-1 container py-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Course sidebar */}
          <div className="order-2 md:order-1">
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h2 className="text-lg font-medium mb-4">
                {courseViewerState.currentCourse.title || "Course Content"}
              </h2>

              {/* Course modules accordion */}
              <CourseModuleAccordion
                course={courseViewerState.currentCourse}
                currentModuleId={courseViewerState.currentModule?.id || ''}
                currentLessonId={courseViewerState.currentLesson.id}
                onLessonClick={navigateToLesson}
                lessonProgress={lessonProgress}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className="order-1 md:order-2 md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Video player */}
              <div className="aspect-video bg-black relative">
                {/* Check for video in metadata first, then fallback to legacy videoUrl */}
                {courseViewerState.currentLesson.videoId ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${courseViewerState.currentLesson.videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={`Video: ${courseViewerState.currentLesson.title}`}
                  />
                ) : courseViewerState.currentLesson.videoUrl ? (
                  <iframe
                    src={courseViewerState.currentLesson.videoUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
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
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-medium">
                    {courseViewerState.currentLesson.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markLessonComplete}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Complete
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {courseViewerState.currentLesson.duration || "10 mins"}
                  </div>

                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {courseViewerState.currentModule?.title || "Module"}
                  </div>
                </div>

                {courseViewerState.currentLesson.description && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {courseViewerState.currentLesson.description}
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
                  {courseViewerState.currentLesson.content_json?.content ? (
                    <div className="lesson-content" dangerouslySetInnerHTML={{ __html: courseViewerState.currentLesson.content_json.content as string }} />
                  ) : courseViewerState.currentLesson.description ? (
                    <div>
                      <p className="text-base">{courseViewerState.currentLesson.description}</p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Content Available</h3>
                      <p className="text-muted-foreground">This lesson doesn't have any additional content.</p>
                    </div>
                  )}
                </div>

                {courseViewerState.currentLesson.resources && courseViewerState.currentLesson.resources.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-3">Resources</h3>
                    <div className="space-y-2">
                      {courseViewerState.currentLesson.resources.map((resource: CourseResource) => (
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
                      {courseViewerState.currentCourse.modules?.reduce(
                        (total: number, module: CourseModule) => {
                          return total + (module.lessons?.length || 0)
                        }, 0
                      ) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Modules</p>
                    <p className="font-medium">
                      {courseViewerState.currentCourse.modules?.length || 0}
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
