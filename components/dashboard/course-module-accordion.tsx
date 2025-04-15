"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Play,
  Lock
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { getBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"

interface CourseModuleAccordionProps {
  course: any
  currentModuleId: string
  currentLessonId: string
  onLessonClick: (lesson: any, moduleId: string) => void
  lessonProgress: Record<string, { status: string; progress: number; lastPosition: number }>
}

export function CourseModuleAccordion({
  course,
  currentModuleId,
  currentLessonId,
  onLessonClick,
  lessonProgress: propLessonProgress
}: CourseModuleAccordionProps) {
  // Get current user
  const { user } = useAuth()
  
  // Local state for expanded modules
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    [currentModuleId]: true // Initially expand the current module
  })
  
  // Local state for lesson progress to ensure we have complete data
  const [lessonProgress, setLessonProgress] = useState(propLessonProgress)
  
  // Data loading state
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  
  // Ref to track which lessons we've already tried to load
  const attemptedLoadLessonsRef = useRef<Record<string, boolean>>({})
  
  // Effect to update local state when props change
  useEffect(() => {
    setLessonProgress(prevProgress => ({
      ...prevProgress,
      ...propLessonProgress
    }))
  }, [propLessonProgress])
  
  // Effect to ensure we have complete progress data for all lessons
  useEffect(() => {
    // Skip if no course data or no user
    if (!course?.modules || !user?.id) return
    
    // Skip if already loading
    if (isLoadingProgress) return
    
    // Find all lessons in this course
    const allLessons = course.modules.flatMap((m: any) => m.lessons || [])
    
    // Find lessons that are missing progress data and we haven't tried to load yet
    const lessonsMissingProgress = allLessons.filter((lesson: any) => 
      !lessonProgress[lesson.id] && !attemptedLoadLessonsRef.current[lesson.id]
    )
    
    // If we have progress data for all lessons or have already tried to load them, we're done
    if (lessonsMissingProgress.length === 0) {
      return
    }
    
    // Otherwise, load progress data for missing lessons
    const loadMissingProgressData = async () => {
      setIsLoadingProgress(true)
      
      try {
        // Get database client
        const supabase = getBrowserClient()
        
        // Get IDs of lessons missing progress data
        const missingLessonIds = lessonsMissingProgress.map((lesson: any) => lesson.id)
        
        // Mark these lessons as attempted to load
        missingLessonIds.forEach((id: string) => {
          attemptedLoadLessonsRef.current[id] = true
        })
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Loading progress data for ${missingLessonIds.length} lessons...`)
        }
        
        // Query database for progress data
        const { data: progressData, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('lesson_id', missingLessonIds)
        
        if (error) {
          console.error('Error loading lesson progress:', error)
          return
        }
        
        // Update local state with fetched data
        if (progressData && progressData.length > 0) {
          const newProgressData: Record<string, any> = {}
          
          progressData.forEach(progress => {
            newProgressData[progress.lesson_id] = {
              status: progress.status || 'not_started',
              progress: progress.progress_percentage || 0,
              lastPosition: progress.last_position || 0,
              lastAccessedAt: progress.updated_at
            }
          })
          
          // Merge with existing progress data
          setLessonProgress(prevProgress => ({
            ...prevProgress,
            ...newProgressData
          }))
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Loaded progress data for ${progressData.length} lessons`)
          }
        }
      } catch (error) {
        console.error('Error loading lesson progress:', error)
      } finally {
        setIsLoadingProgress(false)
      }
    }
    
    // Load missing progress data
    loadMissingProgressData()
  }, [course?.modules, user?.id, isLoadingProgress])
  
  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }
  
  // Check if a module is expanded
  const isModuleExpanded = (moduleId: string) => {
    return !!expandedModules[moduleId]
  }
  
  // Calculate module progress
  const calculateModuleProgress = (moduleId: string, lessons: any[]) => {
    if (!lessons || lessons.length === 0) return 0
    
    const completedLessons = lessons.filter(lesson => 
      lessonProgress[lesson.id]?.progress >= 100 || 
      lessonProgress[lesson.id]?.status === 'completed'
    ).length
    
    return Math.round((completedLessons / lessons.length) * 100)
  }
  
  // Sort modules by order
  const sortedModules = course.modules ? 
    [...course.modules].sort((a, b) => a.order - b.order) : 
    []
  
  return (
    <div className="divide-y">
      {sortedModules.map(module => {
        // Sort lessons by order
        const sortedLessons = module.lessons ? 
          [...module.lessons].sort((a, b) => a.order - b.order) : 
          []
        
        // Calculate module progress
        const moduleProgress = calculateModuleProgress(module.id, sortedLessons)
        
        return (
          <div key={module.id} className="divide-y">
            {/* Module header */}
            <div 
              className={cn(
                "p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-start gap-3",
                module.id === currentModuleId && "bg-brand-purple/5"
              )}
              onClick={() => toggleModule(module.id)}
            >
              <div className="mt-0.5">
                {isModuleExpanded(module.id) ? (
                  <ChevronDown className="h-4 w-4 text-[#6d4c41]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#6d4c41]" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[#5d4037]">{module.title}</h3>
                  <span className="text-xs text-[#6d4c41]">
                    {sortedLessons.length} {sortedLessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                </div>
                
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#6d4c41]">
                    <span>Progress</span>
                    <span>{moduleProgress}%</span>
                  </div>
                  <Progress value={moduleProgress} className="h-1.5 bg-gray-100" />
                </div>
              </div>
            </div>
            
            {/* Lessons */}
            <AnimatePresence>
              {isModuleExpanded(module.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y">
                    {sortedLessons.map(lesson => {
                      const lessonProgressData = lessonProgress[lesson.id] || { progress: 0, status: 'not_started' }
                      
                      // Consider a lesson complete if either status is 'completed' or progress is 100%
                      const isCompleted = lessonProgressData.progress >= 100 || 
                                         lessonProgressData.status === 'completed'
                      
                      // Log for debugging
                      if (process.env.NODE_ENV === 'development' && 
                          (lessonProgressData.progress >= 100 || lessonProgressData.status === 'completed')) {
                        console.log(`Lesson ${lesson.id} (${lesson.title}) completion state:`, {
                          progress: lessonProgressData.progress,
                          status: lessonProgressData.status,
                          isMarkedComplete: isCompleted
                        })
                      }
                      
                      const isActive = lesson.id === currentLessonId
                      
                      return (
                        <div 
                          key={lesson.id}
                          className={cn(
                            "p-4 pl-11 cursor-pointer hover:bg-gray-50 transition-colors",
                            isActive && "bg-brand-purple/5"
                          )}
                          onClick={() => onLessonClick(lesson, module.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : isActive ? (
                                <Play className="h-4 w-4 text-brand-purple" />
                              ) : (
                                <Clock className="h-4 w-4 text-[#6d4c41]" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className={cn(
                                  "text-sm",
                                  isActive ? "font-medium text-brand-purple" : "text-[#5d4037]"
                                )}>
                                  {lesson.title}
                                </h4>
                                <span className="text-xs text-[#6d4c41]">
                                  {lesson.duration || "15 min"}
                                </span>
                              </div>
                              
                              {lessonProgressData.progress > 0 && lessonProgressData.progress < 100 && (
                                <div className="mt-2">
                                  <Progress 
                                    value={lessonProgressData.progress} 
                                    className="h-1 bg-gray-100" 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
