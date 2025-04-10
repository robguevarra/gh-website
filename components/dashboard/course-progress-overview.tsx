'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Clock, BookOpen, CheckCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourseProgressData, useUserProfileData } from '@/lib/hooks/use-dashboard-store'

export function CourseProgressOverview() {
  const { userId } = useUserProfileData()
  const { 
    courseProgress: storeProgress,
    isLoadingProgress,
    hasProgressError,
    loadUserProgress,
    continueLearningLesson: storeContinueLearning,
    loadContinueLearningLesson
  } = useCourseProgressData()

  // Fetch progress data when component mounts
  useEffect(() => {
    if (userId) {
      loadUserProgress(userId)
      loadContinueLearningLesson(userId)
    }
  }, [userId, loadUserProgress, loadContinueLearningLesson])

  // If loading, show skeleton UI
  if (isLoadingProgress) {
    return <CourseProgressSkeleton />
  }

  // If error, show error message
  if (hasProgressError) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Unable to load course progress</CardTitle>
          <CardDescription className="text-red-600">
            We encountered an issue loading your course progress. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="secondary" 
            onClick={() => userId && loadUserProgress(userId)}
            className="bg-red-100 hover:bg-red-200 text-red-700"
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Convert store data to component-friendly format
  const courseIds = Object.keys(storeProgress)
  const courseProgress: CourseProgressData[] = courseIds.map(id => {
    // Use type assertion to work with the actual data structure
    // This is a temporary solution until we align all the types
    const courseData = storeProgress[id] as any
    
    return {
      courseId: id,
      courseTitle: courseData?.title || 'Untitled Course',
      progress: courseData?.progress || 0,
      totalLessonsCount: courseData?.totalLessons || 0,
      completedLessonsCount: courseData?.completedLessons || 0
    }
  })
  
  // Map continueLearningLesson to our component format
  const continueLearningLesson = storeContinueLearning ? {
    lessonId: (storeContinueLearning as any).lessonId || '',
    moduleId: (storeContinueLearning as any).moduleId || '',
    courseId: (storeContinueLearning as any).courseId || '',
    lessonTitle: (storeContinueLearning as any).lessonTitle || 'Continue Learning',
    courseTitle: (storeContinueLearning as any).courseTitle || '',
    progress: (storeContinueLearning as any).progress || 0
  } : null
  
  // If no courses with progress, show empty state
  if (!courseIds.length) {
    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>Your Course Progress</CardTitle>
          <CardDescription>
            You haven't started any courses yet. Enroll in a course to begin your learning journey.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/courses" passHref>
            <Button>Browse Courses</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Continue Learning Section */}
      {continueLearningLesson && (
        <Card className="bg-brand-blue/5 border border-brand-blue/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-brand-blue">Continue Learning</CardTitle>
            <CardDescription>
              Pick up where you left off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-md p-2 shadow-sm">
                <Clock className="h-8 w-8 text-brand-blue/70" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{continueLearningLesson.lessonTitle}</h4>
                <p className="text-sm text-muted-foreground">{continueLearningLesson.courseTitle}</p>
                <Progress 
                  value={continueLearningLesson.progress} 
                  className="h-2 mt-2"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Link 
              href={`/courses/${continueLearningLesson.courseId}/modules/${continueLearningLesson.moduleId}/lessons/${continueLearningLesson.lessonId}`} 
              passHref
            >
              <Button size="sm" className="w-full sm:w-auto">
                Continue Learning
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}

      {/* Course Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courseProgress.map(progress => (
          <CourseProgressCard 
            key={progress.courseId} 
            courseProgress={progress} 
          />
        ))}
      </div>
    </div>
  )
}

// We need to create a local type that matches what we're rendering
// This will serve as an adapter between our store data and our UI
interface CourseProgressData {
  courseId: string;
  courseTitle: string;
  progress: number;
  totalLessonsCount: number;
  completedLessonsCount: number;
}

interface ContinueLearningData {
  lessonId: string;
  moduleId: string;
  courseId: string;
  lessonTitle: string;
  courseTitle: string;
  progress: number;
}

type CourseProgressCardProps = {
  courseProgress: CourseProgressData
}

function CourseProgressCard({ courseProgress }: CourseProgressCardProps) {
  // Extract properties with default values for safety
  const {
    courseId,
    courseTitle: title,
    progress,
    totalLessonsCount,
    completedLessonsCount
  } = courseProgress

  return (
    <Card className="border border-gray-200 hover:border-brand-blue/30 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        <CardDescription>
          <div className="flex items-center justify-between">
            <span>{Math.round(progress)}% complete</span>
            <span className="text-xs text-muted-foreground">
              {completedLessonsCount}/{totalLessonsCount} lessons
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress 
          value={progress} 
          className="h-2 mb-4"
        />
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{totalLessonsCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{completedLessonsCount} completed</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/courses/${courseId}`} passHref>
          <Button variant="outline" size="sm" className="w-full">
            Go to Course
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

function CourseProgressSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-40" />
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
              <div className="flex items-center justify-between mt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
