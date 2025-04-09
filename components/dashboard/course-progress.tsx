"use client"
import { Clock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

interface CourseProgressProps {
  course: {
    title: string
    progress: number
    completedLessons: number
    totalLessons: number
    nextLesson: string
    timeSpent: string
  }
}

export function CourseProgress({ course }: CourseProgressProps) {
  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-brand-purple to-brand-pink text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif">{course.title}</CardTitle>
          <div className="text-2xl font-bold">{course.progress}%</div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              {course.completedLessons} of {course.totalLessons} lessons completed
            </div>
            <div className="text-sm font-medium">
              <Clock className="h-3 w-3 inline mr-1" />
              {course.timeSpent} total time spent
            </div>
          </div>
          <Progress value={course.progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Next Lesson</div>
            <div className="text-muted-foreground">{course.nextLesson}</div>
          </div>
          <Button>Continue</Button>
        </div>
      </CardContent>
    </Card>
  )
}
