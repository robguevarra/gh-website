"use client"

import { useState } from "react"
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
  lessonProgress
}: CourseModuleAccordionProps) {
  // Local state for expanded modules
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    [currentModuleId]: true // Initially expand the current module
  })
  
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
      lessonProgress[lesson.id]?.progress >= 100
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
                      const lessonProgressData = lessonProgress[lesson.id] || { progress: 0 }
                      const isCompleted = lessonProgressData.progress >= 100
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
