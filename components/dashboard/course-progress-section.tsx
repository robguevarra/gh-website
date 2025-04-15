"use client"

// React imports
import React, { useEffect, useMemo } from "react"
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
  id: number
  title: string
  module: string
  moduleId?: string
  duration: string
  thumbnail: string
  progress: number
  current?: boolean
}

export interface LiveClass {
  id: number
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

  // Get lesson progress data from the store
  const lessonProgress = useStudentDashboardStore(state => state.lessonProgress)
  const enrollments = useStudentDashboardStore(state => state.enrollments)
  const storeProgress = useStudentDashboardStore(state =>
    propCourseProgress.courseId ? state.courseProgress[propCourseProgress.courseId] : null
  )

  // State to track validated course progress
  const [courseProgress, setCourseProgress] = React.useState(propCourseProgress)

  // Calculate course progress from lessonProgress data
  const calculatedProgress = useMemo(() => {
    // Skip if no course ID or no enrollments
    if (!propCourseProgress.courseId || !enrollments.length) {
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
    const completedLessons = allLessons.filter(lesson => {
      const progress = lessonProgress[lesson.id]
      return progress?.status === 'completed' || progress?.progress >= 100
    }).length

    // Calculate progress percentage
    const progressPercentage = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    // Use calculated values or fall back to props
    return {
      ...propCourseProgress,
      progress: progressPercentage,
      completedLessons,
      totalLessons
    }
  }, [propCourseProgress, enrollments, lessonProgress])

  // Use store progress if available, then calculated progress, then props
  useEffect(() => {
    if (storeProgress) {
      // Use the store's course progress data
      console.log('Using store progress data:', {
        storeProgress,
        progress: storeProgress.progress,
        completedLessonsCount: storeProgress.completedLessonsCount,
        totalLessonsCount: storeProgress.totalLessonsCount
      })

      setCourseProgress({
        ...propCourseProgress,
        progress: storeProgress.progress,
        completedLessons: storeProgress.completedLessonsCount,
        totalLessons: storeProgress.totalLessonsCount
      })
    } else if (calculatedProgress) {
      // Fall back to calculated progress
      console.log('Using calculated progress data:', calculatedProgress)
      setCourseProgress(calculatedProgress)
    } else {
      // Use props as a last resort
      console.log('Using prop progress data:', propCourseProgress)
      setCourseProgress(propCourseProgress)
    }
  }, [propCourseProgress, storeProgress, calculatedProgress])

  // If course progress still shows 0 completed but store has lesson progress entries, verify directly from database
  useEffect(() => {
    // Skip if we have completion data already or no course ID
    if (courseProgress.completedLessons > 0 || !courseProgress.courseId || !user?.id) {
      return
    }

    // We used to check for completed lessons here, but now we always verify from database
    // This ensures we have the most accurate data regardless of the store state

    // Always verify from database if we have a courseId but no completed lessons
    // This ensures we have the most accurate data
    const verifyFromDatabase = async () => {
      try {
        console.log('Verifying course progress from database for course:', courseProgress.courseId)

        // Use browser client for client-side data fetching
        const supabase = getBrowserClient()

        // First, check the course_progress table directly
        const { data: courseProgressData, error: courseProgressError } = await supabase
          .from('course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseProgress.courseId)
          .single()

        if (courseProgressError && courseProgressError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching course progress:', courseProgressError)
        }

        if (courseProgressData) {
          console.log('Found course progress in database:', courseProgressData)

          // Get the course structure to count total lessons
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select(`
              id, title,
              modules:modules (id, title, lessons:lessons (id, title))
            `)
            .eq('id', courseProgress.courseId)
            .single()

          if (courseError) {
            console.error('Error fetching course structure:', courseError)
            return
          }

          // Count total lessons in the course
          let totalLessons = 0
          if (courseData?.modules) {
            courseData.modules.forEach(module => {
              if (module.lessons) {
                totalLessons += module.lessons.length
              }
            })
          }

          // Calculate completed lessons based on progress percentage
          const completedLessons = Math.round((courseProgressData.progress_percentage / 100) * totalLessons)

          console.log('Updating course progress from database:', {
            progress: courseProgressData.progress_percentage,
            completedLessons,
            totalLessons
          })

          setCourseProgress(prev => ({
            ...prev,
            completedLessons: completedLessons,
            totalLessons: totalLessons || prev.totalLessons,
            progress: courseProgressData.progress_percentage
          }))

          // Also update the store to ensure consistency
          useStudentDashboardStore.setState(state => {
            const updatedCourseProgress = {
              ...state.courseProgress
            }

            // Make sure courseId is not undefined
            const courseId = courseProgress.courseId || ''

            if (!courseId || !updatedCourseProgress[courseId]) {
              if (courseId) {
                // Get the course data from the store if available
                const courseData = state.enrollments?.find(e => e.course?.id === courseId)?.course

                updatedCourseProgress[courseId] = {
                  courseId: courseId,
                  progress: courseProgressData.progress_percentage,
                  completedLessonsCount: completedLessons,
                  totalLessonsCount: totalLessons,
                  course: courseData || {
                    id: courseId,
                    title: '',
                    description: '',
                    slug: '',
                    modules: []
                  }
                }
              }
            } else {
              updatedCourseProgress[courseId] = {
                ...updatedCourseProgress[courseId],
                progress: courseProgressData.progress_percentage,
                completedLessonsCount: completedLessons,
                totalLessonsCount: totalLessons
              }
            }

            return {
              courseProgress: updatedCourseProgress
            }
          })

          return
        }

        // If no course progress found, check for completed lessons
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')

        if (error) {
          console.error('Error fetching completed lessons:', error)
          return
        }

        // If we have completed lessons in the database, update the count
        if (data && data.length > 0) {
          console.log('Found completed lessons in database:', data.length)

          // Get the course structure to count total lessons
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select(`
              id, title,
              modules:modules (id, title, lessons:lessons (id, title))
            `)
            .eq('id', courseProgress.courseId)
            .single()

          if (courseError) {
            console.error('Error fetching course structure:', courseError)
            return
          }

          // Count total lessons in the course
          let totalLessons = 0
          if (courseData?.modules) {
            courseData.modules.forEach(module => {
              if (module.lessons) {
                totalLessons += module.lessons.length
              }
            })
          }

          console.log('Total lessons in course:', totalLessons)

          // Calculate progress percentage
          const progressPercentage = totalLessons > 0
            ? Math.round((data.length / totalLessons) * 100)
            : 0

          setCourseProgress(prev => ({
            ...prev,
            completedLessons: data.length,
            totalLessons: totalLessons || prev.totalLessons,
            progress: progressPercentage
          }))

          // Also update the store to ensure consistency
          useStudentDashboardStore.setState(state => {
            const updatedCourseProgress = {
              ...state.courseProgress
            }

            // Make sure courseId is not undefined
            const courseId = courseProgress.courseId || ''

            if (!courseId || !updatedCourseProgress[courseId]) {
              if (courseId) {
                // Get the course data from the store if available
                const courseData = state.enrollments?.find(e => e.course?.id === courseId)?.course

                updatedCourseProgress[courseId] = {
                  courseId: courseId,
                  progress: progressPercentage,
                  completedLessonsCount: data.length,
                  totalLessonsCount: totalLessons,
                  course: courseData || {
                    id: courseId,
                    title: '',
                    description: '',
                    slug: '',
                    modules: []
                  }
                }
              }
            } else {
              updatedCourseProgress[courseId] = {
                ...updatedCourseProgress[courseId],
                progress: progressPercentage,
                completedLessonsCount: data.length,
                totalLessonsCount: totalLessons
              }
            }

            return {
              courseProgress: updatedCourseProgress
            }
          })
        }
      } catch (err) {
        console.error('Error verifying completion count:', err)
      }
    }

    // Always verify from database if we have a courseId
    if (courseProgress.courseId) {
      verifyFromDatabase()
    }
  }, [courseProgress.completedLessons, courseProgress.courseId, courseProgress.totalLessons, lessonProgress, user?.id])

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  // Ensure we have valid data with fallbacks
  const safeRecentLessons = recentLessons || []

  // Debug log for course progress data
  React.useEffect(() => {
    console.log('CourseProgressSection received progress data:', {
      progress: courseProgress.progress,
      completedLessons: courseProgress.completedLessons,
      totalLessons: courseProgress.totalLessons,
      courseId: courseProgress.courseId
    });
  }, [courseProgress]);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
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
                      {calculateTimeRemaining({
                        currentProgress: courseProgress.progress,
                        totalDurationMinutes: courseProgress.totalLessons * 15 // Estimate based on lesson count (15 min per lesson)
                      })} mins remaining
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
                    <Link href={`/dashboard/course?courseId=${courseProgress.courseId || ''}&moduleId=${safeRecentLessons[0]?.moduleId || ''}&lessonId=${safeRecentLessons[0]?.id || ''}`} prefetch={true}>
                      <Button className="w-full bg-brand-purple hover:bg-brand-purple/90">
                        {safeRecentLessons[0]?.progress > 0 ? "Continue Lesson" : "Start Learning"}
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
                      Join Zoom
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
