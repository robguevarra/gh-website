"use client"

import { useState } from "react"
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

export interface CourseLesson {
  id: number
  title: string
  module: string
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
    progress: number
    completedLessons: number
    totalLessons: number
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
  isMobile?: boolean
  isSectionExpanded: (section: string) => boolean
  toggleSection: (section: string) => void
}

export function CourseProgressSection({
  courseProgress,
  recentLessons,
  upcomingClasses,
  isMobile = false,
  isSectionExpanded,
  toggleSection
}: CourseProgressProps) {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

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
                href="/dashboard/course"
                className="text-brand-purple hover:underline text-sm flex items-center"
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
                        totalDurationMinutes: 600 // Default to 10 hours (600 minutes) total course time
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

              {/* Current Lesson */}
              {recentLessons.length > 0 && (
                <div className="bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 rounded-xl p-5 border border-brand-purple/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-brand-purple" />
                    <h3 className="text-sm font-medium text-brand-purple">Pick up where you left off</h3>
                  </div>

                  <div className="flex gap-4 mt-3">
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={recentLessons[0].thumbnail || "/placeholder.svg"}
                        alt={recentLessons[0].title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#5d4037] line-clamp-1">{recentLessons[0].title}</h4>
                      <div className="flex items-center text-xs text-[#6d4c41] mt-1">
                        <span className="bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full">
                          {recentLessons[0].module}
                        </span>
                        <span className="mx-2">•</span>
                        <Clock className="h-3 w-3 mr-1" />
                        {recentLessons[0].duration}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#6d4c41]">Progress</span>
                          <span className="text-xs font-medium">{recentLessons[0].progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-purple rounded-full"
                            style={{ width: `${recentLessons[0].progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button className="w-full bg-brand-purple hover:bg-brand-purple/90">
                      Continue Lesson
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
                href="/dashboard/course"
                className="text-brand-purple hover:underline text-sm flex items-center justify-center"
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
}
