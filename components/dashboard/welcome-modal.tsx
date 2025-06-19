"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { X, ChevronRight, ChevronLeft, BookOpen, Download, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function WelcomeModal({ isOpen, onClose, onComplete }: WelcomeModalProps) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Papers to Profits!",
      description:
        "We're excited to have you join our community of paper product entrepreneurs. Let's get you started on your journey!",
      image: "/Grace Edited.png?height=200&width=300&text=Welcome",
      icon: <BookOpen className="h-6 w-6 text-brand-purple" />,
    },
    {
      title: "Access Your Course Content",
      description:
        "Your course is ready for you to start learning. Track your progress and continue where you left off.",
      image: "/course-content.png?height=200&width=300&text=Course",
      icon: <BookOpen className="h-6 w-6 text-brand-purple" />,
    },
    {
      title: "Download Free Templates",
      description: "Access your library of free templates to help you create beautiful paper products.",
      image: "/gh-resources.png?height=200&width=300&text=Templates",
      icon: <Download className="h-6 w-6 text-brand-blue" />,
    },
    {
      title: "Join Live Classes",
      description: "Participate in weekly live classes to learn directly from Grace and ask questions.",
      image: "/live-class.png?height=200&width=300&text=Live+Classes",
      icon: <Calendar className="h-6 w-6 text-brand-pink" />,
    },
    {
      title: "Connect with the Community",
      description: "Join our Facebook group to connect with other students and share your journey.",
      image: "/gh-fbgroup.png?height=200&width=300&text=Community",
      icon: <Users className="h-6 w-6 text-[#1877F2]" />,
    },
  ]

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      // When completing the final step
      if (onComplete) {
        onComplete()
      }
      onClose()
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-xs sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden border border-white/20"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="relative flex flex-col h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg w-8 h-8 sm:w-10 sm:h-10"
              onClick={onClose}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <div className="h-48 sm:h-64 lg:h-72 bg-gradient-to-br from-brand-purple via-brand-pink to-brand-purple relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="absolute top-0 left-0 w-20 h-20 sm:w-32 sm:h-32 bg-white/5 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-full blur-lg"></div>
              
              <div className={`${step === 0 ? 'absolute inset-0 flex items-center justify-center p-3 sm:p-6' : 'absolute inset-0 flex items-center justify-center py-1 sm:py-1.5 px-3 sm:px-6'}`}>
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-xl sm:rounded-2xl blur-lg scale-105"></div>
                    <Image
                      src={steps[step].image || "/placeholder.svg"}
                      alt={steps[step].title}
                      width={step === 0 ? 160 : step === 3 ? 180 : 220}
                      height={step === 0 ? 130 : step === 3 ? 140 : 180}
                      className="object-contain max-w-full max-h-full rounded-xl sm:rounded-2xl shadow-2xl relative z-10 sm:scale-110"
                      priority={step === 0}
                      sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 300px"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-brand-purple/20 to-brand-pink/20 rounded-full p-2 sm:p-3 shadow-lg flex-shrink-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6">
                    {steps[step].icon}
                  </div>
                </div>
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-[#5d4037] leading-tight">{steps[step].title}</h2>
              </div>

              <p className="text-[#6d4c41] text-sm sm:text-lg lg:text-xl leading-relaxed mb-6 sm:mb-8 lg:mb-10">{steps[step].description}</p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1 sm:gap-2">
                  {steps.map((_, i) => (
                    <motion.div
                      key={i}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        i === step 
                          ? "bg-gradient-to-r from-brand-purple to-brand-pink w-6 sm:w-8 shadow-lg" 
                          : "bg-gray-200 w-1.5 sm:w-2"
                      }`}
                      initial={false}
                      animate={{
                        scale: i === step ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  ))}
                </div>

                <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                  {step > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={prevStep}
                      className="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-2 border-brand-purple/20 hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all duration-200"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Back</span>
                    </Button>
                  )}
                  <Button 
                    onClick={nextStep}
                    className="px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-semibold bg-gradient-to-r from-brand-purple to-brand-pink hover:from-brand-purple/90 hover:to-brand-pink/90 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {step < steps.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Get Started</span>
                        <span className="sm:hidden">Start</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
