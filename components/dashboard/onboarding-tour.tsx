"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, ArrowLeft, Sparkles, Target, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OnboardingTourProps {
  onComplete: () => void
  onSkip?: () => void
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const tourSteps = [
    {
      target: "[data-tour='course-progress']",
      title: "Your Learning Journey",
      content: "Track your course progress and continue where you left off. Your personalized dashboard shows exactly where you are in your entrepreneurial journey.",
      position: "bottom" as const,
      icon: <Target className="h-5 w-5" />,
      highlight: "Continue learning from your last lesson",
    },
    {
      target: "[data-tour='templates']",
      title: "Free Template Library",
      content: "Access and download your exclusive collection of templates. These professionally designed resources will help you create stunning paper products.",
      position: "bottom" as const,
      icon: <Sparkles className="h-5 w-5" />,
      highlight: "Download unlimited templates",
    },
    {
      target: "[data-tour='live-classes']",
      title: "Live Learning Sessions",
      content: "Join Grace for interactive live classes where you can ask questions, get feedback, and learn alongside other entrepreneurs.",
      position: "left" as const,
      icon: <Target className="h-5 w-5" />,
      highlight: "Direct access to Grace",
    },
    {
      target: "[data-tour='community']",
      title: "Student Community",
      content: "Connect with fellow students, share your progress, get inspiration, and build lasting relationships in our exclusive Facebook group.",
      position: "left" as const,
      icon: <Sparkles className="h-5 w-5" />,
      highlight: "Join 4000+ entrepreneurs",
    },
  ]

  const updateTargetRect = useCallback(() => {
    const targetElement = document.querySelector(tourSteps[currentStep].target)
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      setTargetRect(rect)
      
      // Improved scrolling to ensure element is properly centered
      const elementTop = rect.top + window.scrollY
      const elementHeight = rect.height
      const windowHeight = window.innerHeight
      
      // Calculate the ideal scroll position to center the element
      const idealScrollTop = elementTop - (windowHeight / 2) + (elementHeight / 2)
      
      // Smooth scroll to center the element
      window.scrollTo({
        top: Math.max(0, idealScrollTop),
        behavior: "smooth"
      })
      
      // Update rect after a short delay to account for scroll
      setTimeout(() => {
        const updatedRect = targetElement.getBoundingClientRect()
        setTargetRect(updatedRect)
      }, 500)
    }
  }, [currentStep])

  useEffect(() => {
    updateTargetRect()
    
    const handleResize = () => updateTargetRect()
    const handleScroll = () => {
      // Update target rect position when scrolling
      const targetElement = document.querySelector(tourSteps[currentStep].target)
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        setTargetRect(rect)
      }
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [updateTargetRect, currentStep])

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const skipTour = () => {
    setIsVisible(false)
    setTimeout(() => {
      if (onSkip) {
        onSkip()
      }
      onComplete()
    }, 300)
  }

  const getTooltipPosition = (position: string, rect: DOMRect | null, width: number, height: number) => {
    if (!rect) return { top: 100, left: 100 }
    
    const margin = 20
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const isMobile = windowWidth < 768 // Mobile breakpoint
    
    let top = 0
    let left = 0
    let preferredPosition = position
    
    // On mobile, prefer bottom positioning for better UX
    if (isMobile) {
      preferredPosition = "bottom"
    }
    
    // Calculate initial position
    switch (preferredPosition) {
      case "top":
        top = rect.top - height - margin
        left = rect.left + rect.width / 2 - width / 2
        break
      case "bottom":
        top = rect.top + rect.height + margin
        left = rect.left + rect.width / 2 - width / 2
        break
      case "left":
        if (isMobile) {
          // On mobile, fall back to bottom for left positions
          top = rect.top + rect.height + margin
          left = rect.left + rect.width / 2 - width / 2
        } else {
          top = rect.top + rect.height / 2 - height / 2
          left = rect.left - width - margin
        }
        break
    }
    
    // Smart repositioning if tooltip would go outside viewport
    if (top + height > windowHeight - 20) {
      // If bottom would overflow, try top position
      const topPosition = rect.top - height - margin
      if (topPosition >= 20) {
        top = topPosition
        preferredPosition = "top"
      } else {
        // If neither top nor bottom work, center vertically
        top = Math.max(20, Math.min(windowHeight - height - 20, rect.top + rect.height / 2 - height / 2))
      }
    }
    
    if (top < 20) {
      // If top would overflow, try bottom position
      const bottomPosition = rect.top + rect.height + margin
      if (bottomPosition + height <= windowHeight - 20) {
        top = bottomPosition
        preferredPosition = "bottom"
      } else {
        // Center vertically if needed
        top = 20
      }
    }
    
    // Handle horizontal overflow
    if (left + width > windowWidth - 20) {
      left = windowWidth - width - 20
    }
    if (left < 20) {
      left = 20
    }
    
    return { top, left }
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative w-full h-full">
            {/* Remove the blurred backdrop - we'll handle darkness with the clip-path overlay */}
            
            {/* Dark overlay with rectangular spotlight cutout */}
            {targetRect && (
              <motion.div
                className="fixed inset-0 pointer-events-none z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "rgba(0, 0, 0, 0.8)",
                  clipPath: `polygon(
                    0% 0%, 
                    0% 100%, 
                    ${targetRect.left - 8}px 100%, 
                    ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                    ${targetRect.left + targetRect.width + 8}px ${targetRect.top - 8}px, 
                    ${targetRect.left + targetRect.width + 8}px ${targetRect.top + targetRect.height + 8}px, 
                    ${targetRect.left - 8}px ${targetRect.top + targetRect.height + 8}px, 
                    ${targetRect.left - 8}px 100%, 
                    100% 100%, 
                    100% 0%
                  )`,
                }}
              />
            )}

            {/* Clean border around highlighted element */}
            {targetRect && (
              <motion.div
                className="fixed pointer-events-none z-50"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{
                  top: targetRect.top - 4,
                  left: targetRect.left - 4,
                  width: targetRect.width + 8,
                  height: targetRect.height + 8,
                }}
              >
                {/* Main highlight border - removed backdrop-blur-sm */}
                <div className="absolute inset-0 rounded-lg border-2 border-brand-purple/80 shadow-lg" />
                
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-lg border border-white/30" />
                
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-brand-purple rounded-tl-md" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-brand-purple rounded-tr-md" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-brand-purple rounded-bl-md" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-brand-purple rounded-br-md" />
              </motion.div>
            )}

            {/* Enhanced tooltip */}
            <motion.div
              className="fixed z-[60] pointer-events-auto w-80 max-w-[calc(100vw-2rem)] sm:w-80 md:w-96"
              style={getTooltipPosition(
                tourSteps[currentStep].position,
                targetRect,
                window.innerWidth < 768 ? Math.min(320, window.innerWidth - 32) : 320, // Mobile responsive width
                window.innerWidth < 768 ? 240 : 280  // Mobile responsive height
              )}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-brand-purple via-brand-pink to-brand-purple p-3 sm:p-4 relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-white/10 rounded-full -translate-y-8 sm:-translate-y-10 translate-x-8 sm:translate-x-10" />
                  <div className="absolute bottom-0 left-0 w-12 sm:w-16 h-12 sm:h-16 bg-white/5 rounded-full translate-y-6 sm:translate-y-8 -translate-x-6 sm:-translate-x-8" />
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        {tourSteps[currentStep].icon}
                      </div>
                      <div className="text-white">
                        <div className="text-xs sm:text-sm font-medium opacity-90">Step {currentStep + 1} of {tourSteps.length}</div>
                        <h3 className="text-base sm:text-lg font-bold">{tourSteps[currentStep].title}</h3>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors w-8 h-8 sm:w-10 sm:h-10"
                      onClick={skipTour}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 text-brand-purple text-xs sm:text-sm font-medium">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-brand-purple rounded-full"></div>
                      {tourSteps[currentStep].highlight}
                    </div>
                    
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                      {tourSteps[currentStep].content}
                    </p>
                  </div>

                  {/* Progress indicators */}
                  <div className="flex justify-center mt-4 sm:mt-6 gap-1.5 sm:gap-2">
                    {tourSteps.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                          index <= currentStep
                            ? "bg-gradient-to-r from-brand-purple to-brand-pink w-6 sm:w-8"
                            : "bg-gray-200 w-1.5 sm:w-2"
                        }`}
                        animate={{
                          width: index <= currentStep ? (window.innerWidth < 640 ? 24 : 32) : (window.innerWidth < 640 ? 6 : 8)
                        }}
                      />
                    ))}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex justify-between items-center mt-4 sm:mt-6 gap-3">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="flex-1 sm:flex-none h-10 sm:h-11 text-sm sm:text-base"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Back
                    </Button>

                    <Button
                      onClick={nextStep}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-brand-purple to-brand-pink hover:from-brand-purple/90 hover:to-brand-pink/90 h-10 sm:h-11 text-sm sm:text-base px-4 sm:px-6"
                    >
                      {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
                      {currentStep !== tourSteps.length - 1 && (
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
