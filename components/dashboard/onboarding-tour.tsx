"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OnboardingTourProps {
  onComplete: () => void
  onSkip?: () => void
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const tourSteps = [
    {
      target: "[data-tour='course-progress']",
      content: "Track your course progress and continue where you left off.",
      position: "bottom",
    },
    {
      target: "[data-tour='templates']",
      content: "Access and download your free templates here.",
      position: "bottom",
    },
    {
      target: "[data-tour='live-classes']",
      content: "Join upcoming live classes with Grace.",
      position: "left",
    },
    {
      target: "[data-tour='community']",
      content: "Connect with other students in our Facebook community.",
      position: "top",
    },
  ]

  useEffect(() => {
    // Scroll to the target element
    const targetElement = document.querySelector(tourSteps[currentStep].target)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [currentStep, tourSteps])

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsVisible(false)
      setTimeout(() => {
        onComplete()
      }, 300)
    }
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

  const getTargetPosition = () => {
    const targetElement = document.querySelector(tourSteps[currentStep].target)
    if (!targetElement) return { top: 0, left: 0, width: 0, height: 0 }

    const rect = targetElement.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    }
  }

  const getTooltipPosition = () => {
    const targetPos = getTargetPosition()
    const position = tourSteps[currentStep].position
    const tooltipWidth = 350
    const tooltipHeight = 150
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768
    const viewportMargin = 20
    
    // Default positions based on requested position
    let top = 0
    let left = 0
    
    switch (position) {
      case "top":
        top = targetPos.top - tooltipHeight - 20
        left = targetPos.left + targetPos.width / 2 - tooltipWidth / 2
        break
      case "bottom":
        top = targetPos.top + targetPos.height + 20
        left = targetPos.left + targetPos.width / 2 - tooltipWidth / 2
        break
      case "left":
        top = targetPos.top + targetPos.height / 2 - tooltipHeight / 2
        left = targetPos.left - tooltipWidth - 20
        break
      case "right":
        top = targetPos.top + targetPos.height / 2 - tooltipHeight / 2
        left = targetPos.left + targetPos.width + 20
        break
      default:
        top = targetPos.top + targetPos.height + 20
        left = targetPos.left + targetPos.width / 2 - tooltipWidth / 2
    }
    
    // Adjust if tooltip would go outside viewport
    if (left < viewportMargin) {
      left = viewportMargin
    } else if (left + tooltipWidth > windowWidth - viewportMargin) {
      left = windowWidth - tooltipWidth - viewportMargin
    }
    
    if (top < viewportMargin) {
      // If position was top and there's not enough space, move to bottom
      if (position === 'top') {
        top = targetPos.top + targetPos.height + 20
      } else {
        top = viewportMargin
      }
    } else if (top + tooltipHeight > windowHeight - viewportMargin) {
      // If position was bottom and there's not enough space, move to top
      if (position === 'bottom') {
        top = targetPos.top - tooltipHeight - 20
      } else {
        top = windowHeight - tooltipHeight - viewportMargin
      }
    }
    
    return { top, left }
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-[350px] rounded-md bg-white p-4 shadow-xl border border-brand-purple/20"
            style={{
              top: getTooltipPosition().top,
              left: getTooltipPosition().left,
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <Button onClick={skipTour} variant="ghost" className="absolute right-2 top-2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold text-brand-purple">
              {currentStep + 1}/{tourSteps.length}
            </div>
            <p className="mt-2 text-sm">{tourSteps[currentStep].content}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button variant="outline" onClick={skipTour} className="flex-1">
                Skip Tour
              </Button>
              <Button className="flex-1 bg-brand-purple hover:bg-brand-purple/90" onClick={nextStep}>
                {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
