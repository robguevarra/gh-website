"use client"

// React imports
import React, { useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Play,
  BookOpen,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Video,
  ExternalLink
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatProgress, calculateTimeRemaining } from "@/lib/utils/progress-utils"
import { motion } from "framer-motion"
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"
import { getBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"

export interface CourseLesson {
  id: string | number
  title: string
  module: string
  moduleId?: string
  duration: string
  thumbnail: string
  progress: number
  current?: boolean
}

export interface LiveClass {
  id: string
  title: string
  date: string
  time: string
  host: {
    name: string
    avatar: string
  }
  zoomLink: string
}

export interface CourseProgressProps {
  courseProgress: {
    title: string
    courseId?: string
    progress: number
    completedLessons: number // Maps to completedLessonsCount in store
    totalLessons: number // Maps to totalLessonsCount in store
    nextLesson: string
    timeSpent: string
    nextLiveClass: string
    totalCourseDuration?: number // Total duration of all lessons in seconds
    instructor: {
      name: string
      avatar: string
    }
  }
  recentLessons: CourseLesson[]
  upcomingClasses: LiveClass[]
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
}

export const CourseProgressSection = React.memo(function CourseProgressSection({
  courseProgress: propCourseProgress,
  recentLessons,
  upcomingClasses,
  isSectionExpanded,
  toggleSection
}: CourseProgressProps) {
  // Get current user
  const { user } = useAuth()

  // Get data from the store
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const enrollments = useStudentDashboardStore(state => state.enrollments)
  const storeProgress = useStudentDashboardStore(state =>
    propCourseProgress.courseId ? state.courseProgress[propCourseProgress.courseId] : null
  )
  const continueLearningLesson = useStudentDashboardStore(state => state.continueLearningLesson)
  const loadContinueLearningLesson = useStudentDashboardStore(state => state.loadContinueLearningLesson)

  // State to track validated course progress
  const [courseProgress, setCourseProgress] = React.useState(propCourseProgress)

  // INDUSTRY BEST PRACTICE: Use the store's course progress data as the single source of truth
  // This ensures consistency across the application
  const calculatedProgress = useMemo(() => {
    // Skip if no course ID
    if (!propCourseProgress.courseId) {
      return propCourseProgress
    }

    // If we have store progress, use it directly
    if (storeProgress) {
      return {
        ...propCourseProgress,
        progress: storeProgress.progress,
        completedLessons: storeProgress.completedLessonsCount,
        totalLessons: storeProgress.totalLessonsCount
      }
    }

    // If no store progress, fall back to enrollment data
    if (!enrollments.length) {
      return propCourseProgress
    }

    // Find course in enrollments
    const course = enrollments.find(e => e.course?.id === propCourseProgress.courseId)?.course
    if (!course || !course.modules) {
      return propCourseProgress
    }

    // Get all lessons from the course
    const allLessons = course.modules.flatMap(m => m.lessons || [])
    if (!allLessons.length) {
      return propCourseProgress
    }

    // Count total and completed lessons
    const totalLessons = allLessons.length

    // INDUSTRY BEST PRACTICE: Use a strict definition of completed lessons
    // ONLY count lessons that are explicitly marked as 'completed'
    const completedLessons = allLessons.filter(lesson => {
      const progress = lessonProgress[lesson.id]
      return progress?.status === 'completed'
    }).length

    // Calculate progress percentage
    const progressPercentage = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    // Return calculated values
    return {
      ...propCourseProgress,
      progress: progressPercentage,
      completedLessons,
      totalLessons
    }
  }, [propCourseProgress, storeProgress, enrollments, lessonProgress])

  // INDUSTRY BEST PRACTICE: Simplify state management by using a single source of truth
  // Use calculated progress which already prioritizes store progress
  useEffect(() => {
    // Set course progress based on calculated values
    setCourseProgress(calculatedProgress)
  }, [calculatedProgress])

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  // Load continue learning lesson when component mounts
  useEffect(() => {
    if (user?.id) {
      loadContinueLearningLesson(user.id)
    }
  }, [user?.id, loadContinueLearningLesson])

  // Create a combined list of lessons, prioritizing the continue learning lesson
  const safeRecentLessons = useMemo(() => {
    // If we have a continue learning lesson, add it to the top of the list
    if (continueLearningLesson && continueLearningLesson.courseId === courseProgress.courseId) {
      // Find the actual lesson data to get accurate duration
      let actualDuration = "--:--";
      
      // Look for the lesson in enrollments to get its actual duration
      if (enrollments && continueLearningLesson.lessonId) {
        const currentCourse = enrollments.find(
          (e) => e.course?.id === continueLearningLesson.courseId
        )?.course;
        
        if (currentCourse?.modules) {
          // Find the lesson in the modules
          for (const module of currentCourse.modules) {
            if (module.lessons) {
              // We need to cast to any to access all possible properties
              const lesson = module.lessons.find(l => l.id === continueLearningLesson.lessonId) as any;
              if (lesson) {
                // Get accurate duration based on available data
                if (typeof lesson.videoDuration === 'number') {
                  // Format video duration (seconds) to minutes
                  const minutes = Math.ceil(lesson.videoDuration / 60);
                  actualDuration = `${minutes} min${minutes !== 1 ? 's' : ''}`;
                } else if (lesson.metadata?.duration) {
                  // Use metadata duration with proper formatting
                  const durationValue = lesson.metadata.duration;
                  if (lesson.metadata.durationUnit) {
                    actualDuration = `${durationValue} ${lesson.metadata.durationUnit}`;
                  } else if (durationValue < 60) { // Assumed to be minutes if small number
                    actualDuration = `${durationValue} min${durationValue !== 1 ? 's' : ''}`;
                  } else { // Seconds
                    const minutes = Math.ceil(durationValue / 60);
                    actualDuration = `${minutes} min${minutes !== 1 ? 's' : ''}`;
                  }
                } else if (typeof lesson.duration === 'string') {
                  actualDuration = lesson.duration; // Use existing string format
                } else if (typeof lesson.duration === 'number') {
                  // Format number to minutes
                  const minutes = Math.ceil(lesson.duration / 60);
                  actualDuration = `${minutes} min${minutes !== 1 ? 's' : ''}`;
                }
                break;
              }
            }
          }
        }
      }
      
      // Convert the continue learning lesson to the CourseLesson format
      const continueLessonFormatted: CourseLesson = {
        id: continueLearningLesson.lessonId,
        title: continueLearningLesson.lessonTitle,
        module: continueLearningLesson.moduleTitle,
        moduleId: continueLearningLesson.moduleId,
        duration: actualDuration,
        thumbnail: '/placeholder.svg?height=80&width=120&text=Lesson',
        progress: continueLearningLesson.progress,
        current: true
      }

      // Add the continue learning lesson to the top if it's not already in the list
      const existingIndex = recentLessons?.findIndex(lesson => lesson.id === continueLearningLesson.lessonId)

      if (existingIndex === -1) {
        return [continueLessonFormatted, ...(recentLessons || [])]
      } else if (existingIndex > 0) {
        // If it exists but not at the top, move it to the top
        const updatedLessons = [...(recentLessons || [])]
        updatedLessons.splice(existingIndex, 1)
        return [continueLessonFormatted, ...updatedLessons]
      }
    }

    return recentLessons || []
  }, [continueLearningLesson, recentLessons, courseProgress.courseId])

  // Course progress data is now properly tracked and displayed

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" data-tour="course-progress">
        {/* Section Header - Mobile Toggle */}
        <div
          className="md:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleSection("course")}
        >
          <div className="flex items-center gap-2">
            <div className="bg-brand-purple/10 rounded-full p-2">
              <BookOpen className="h-5 w-5 text-brand-purple" />
            </div>
            <h2 className="text-lg font-medium text-[#5d4037]">Continue Learning</h2>
          </div>
          {isSectionExpanded("course") ? (
            <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
          )}
        </div>

        {/* Section Content */}
        <div className={`${isSectionExpanded("course") ? "block" : "hidden"} md:block`}>
          <div className="p-6 pt-0 md:pt-6">
            <div className="md:flex md:items-center md:justify-between mb-6 hidden">
              <div className="flex items-center gap-2">
                <div className="bg-brand-purple/10 rounded-full p-2">
                  <BookOpen className="h-5 w-5 text-brand-purple" />
                </div>
                <h2 className="text-xl font-medium text-[#5d4037]">Continue Learning</h2>
              </div>
              <Link
                href={`/dashboard/course?courseId=${courseProgress.courseId || ''}`}
                className="text-brand-purple hover:underline text-sm flex items-center"
                prefetch={true}
              >
                View All Lessons
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#5d4037]">{courseProgress.title}</span>
                    <Badge className="bg-brand-purple/10 text-brand-purple border-brand-purple/20">
                      {formatProgress(courseProgress.progress)}
                    </Badge>
                  </div>
                  <span className="text-xs text-[#6d4c41]">
                    {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons •
                    <span className="ml-1">
                      {/* Get total course duration from store */}
                      {(() => {
                        // Use pre-calculated duration from dashboard if available
                        let totalCourseSeconds = courseProgress.totalCourseDuration || 0;
                        
                        // If not available, calculate it (legacy fallback)
                        if (!totalCourseSeconds && enrollments && storeProgress?.courseId) {
                          // Get current course data from enrollments
                          const currentCourse = enrollments.find(
                            (e) => e.course?.id === storeProgress.courseId
                          )?.course;
                          
                          if (currentCourse?.modules) {
                            currentCourse.modules.forEach((module) => {
                              if (module.lessons) {
                                module.lessons.forEach((lesson: any) => {
                                  let lessonDuration = 0;
                                  
                                  if (typeof lesson.videoDuration === 'number') {
                                    // Video duration is in seconds
                                    lessonDuration = lesson.videoDuration;
                                  } else if (lesson.metadata?.duration) {
                                    // Check if duration needs conversion from minutes
                                    if (lesson.metadata.duration < 60 && !lesson.metadata.durationUnit) {
                                      lessonDuration = lesson.metadata.duration * 60;
                                    } else {
                                      lessonDuration = lesson.metadata.duration;
                                    }
                                  } else if (typeof lesson.duration === 'number') {
                                    lessonDuration = lesson.duration;
                                  }
                                  
                                  totalCourseSeconds += lessonDuration;
                                });
                              }
                            });
                          }
                        }
                        
                        // Convert to minutes for display and remaining calculation
                        const totalCourseMinutes = Math.ceil(totalCourseSeconds / 60);
                        
                        // Calculate remaining time based on actual course duration
                        const remainingMinutes = calculateTimeRemaining({
                          currentProgress: courseProgress.progress,
                          totalDurationMinutes: totalCourseMinutes || 0 // Use actual calculated duration, no fallback
                        });
                        
                        console.log('[CourseProgressSection] Using actual course duration for calculation:', {
                          totalCourseSeconds,
                          totalCourseMinutes,
                          progress: courseProgress.progress,
                          remainingMinutes
                        });
                        
                        return `${remainingMinutes} mins remaining`;
                      })()} 
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-full"
                    style={{ width: `${courseProgress.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Loading State */}
              {safeRecentLessons.length === 0 && (
                <div className="bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 rounded-xl p-5 border border-brand-purple/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-brand-purple" />
                    <h3 className="text-sm font-medium text-brand-purple">
                      Loading your learning progress...
                    </h3>
                  </div>

                  <div className="flex gap-4 mt-3">
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 animate-pulse">
                    </div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#6d4c41]">Progress</span>
                          <span className="text-xs font-medium">0%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-200 rounded-full animate-pulse" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button className="w-full bg-brand-purple hover:bg-brand-purple/90" disabled>
                      Loading...
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Current Lesson */}
              {safeRecentLessons.length > 0 && (
                <div className="bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 rounded-xl p-5 border border-brand-purple/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-brand-purple" />
                    <h3 className="text-sm font-medium text-brand-purple">
                      {safeRecentLessons[0]?.progress > 0 ? "Pick up where you left off" : "Continue your learning journey"}
                    </h3>
                  </div>

                  <div className="flex gap-4 mt-3">
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={safeRecentLessons[0]?.thumbnail || "/placeholder.svg"}
                        alt={safeRecentLessons[0]?.title || "Lesson"}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#5d4037] line-clamp-1">{safeRecentLessons[0]?.title || "Continue your lesson"}</h4>
                      <div className="flex items-center text-xs text-[#6d4c41] mt-1">
                        <span className="bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full">
                          {safeRecentLessons[0]?.module || "Current Module"}
                        </span>
                        <span className="mx-2">•</span>
                        <Clock className="h-3 w-3 mr-1" />
                        {safeRecentLessons[0]?.duration || "--:--"}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#6d4c41]">Progress</span>
                          <span className="text-xs font-medium">{safeRecentLessons[0]?.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-purple rounded-full"
                            style={{ width: `${safeRecentLessons[0]?.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/dashboard/course?courseId=${courseProgress.courseId || ''}&moduleId=${safeRecentLessons[0]?.moduleId || ''}&lessonId=${safeRecentLessons[0]?.id || ''}`}
                      prefetch={true}
                    >
                      <Button className="w-full bg-brand-purple hover:bg-brand-purple/90">
                        {continueLearningLesson && continueLearningLesson.courseId === courseProgress.courseId
                          ? (continueLearningLesson.progress > 0 ? "Continue Your Learning Journey" : "Start Your Learning Journey")
                          : (safeRecentLessons[0]?.progress > 0 ? "Continue Lesson" : "Start Learning")
                        }
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Next Live Class */}
              {upcomingClasses.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="h-4 w-4 text-brand-pink" />
                    <h3 className="text-sm font-medium text-[#5d4037]">Next Live Class</h3>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[#5d4037]">{upcomingClasses[0].title}</h4>
                      <div className="text-xs text-[#6d4c41] mt-1">
                        <p>{upcomingClasses[0].date}</p>
                        <p>{upcomingClasses[0].time}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-brand-pink hover:bg-brand-pink/90"
                      onClick={() => window.open(upcomingClasses[0].zoomLink, '_blank')}
                    >
                      Join Community
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t text-center md:hidden">
              <Link
                href={`/dashboard/course?courseId=${courseProgress.courseId || ''}`}
                className="text-brand-purple hover:underline text-sm flex items-center justify-center"
                prefetch={true}
              >
                View All Lessons
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
