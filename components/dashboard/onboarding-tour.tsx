"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OnboardingTourProps {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
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

    switch (position) {
      case "top":
        return {
          top: targetPos.top - 80,
          left: targetPos.left + targetPos.width / 2 - 150,
        }
      case "bottom":
        return {
          top: targetPos.top + targetPos.height + 20,
          left: targetPos.left + targetPos.width / 2 - 150,
        }
      case "left":
        return {
          top: targetPos.top + targetPos.height / 2 - 40,
          left: targetPos.left - 320,
        }
      case "right":
        return {
          top: targetPos.top + targetPos.height / 2 - 40,
          left: targetPos.left + targetPos.width + 20,
        }
      default:
        return {
          top: targetPos.top + targetPos.height + 20,
          left: targetPos.left + targetPos.width / 2 - 150,
        }
    }
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
            className="relative w-[350px] rounded-md bg-white p-4 shadow-xl"
            style={{
              top: getTooltipPosition().top,
              left: getTooltipPosition().left,
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <Button onClick={skipTour} variant="ghost" className="absolute right-2 top-2 h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">
              {currentStep + 1}/{tourSteps.length}
            </div>
            <p className="mt-2 text-sm">{tourSteps[currentStep].content}</p>
            <Button className="mt-4 w-full" onClick={nextStep}>
              {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
