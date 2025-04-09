"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { X, ChevronRight, ChevronLeft, BookOpen, Download, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Papers to Profits!",
      description:
        "We're excited to have you join our community of paper product entrepreneurs. Let's get you started on your journey!",
      image: "/placeholder.svg?height=200&width=300&text=Welcome",
      icon: <BookOpen className="h-6 w-6 text-brand-purple" />,
    },
    {
      title: "Access Your Course Content",
      description:
        "Your course is ready for you to start learning. Track your progress and continue where you left off.",
      image: "/placeholder.svg?height=200&width=300&text=Course",
      icon: <BookOpen className="h-6 w-6 text-brand-purple" />,
    },
    {
      title: "Download Free Templates",
      description: "Access your library of free templates to help you create beautiful paper products.",
      image: "/placeholder.svg?height=200&width=300&text=Templates",
      icon: <Download className="h-6 w-6 text-brand-blue" />,
    },
    {
      title: "Join Live Classes",
      description: "Participate in weekly live classes to learn directly from Grace and ask questions.",
      image: "/placeholder.svg?height=200&width=300&text=Live+Classes",
      icon: <Calendar className="h-6 w-6 text-brand-pink" />,
    },
    {
      title: "Connect with the Community",
      description: "Join our Facebook group to connect with other students and share your journey.",
      image: "/placeholder.svg?height=200&width=300&text=Community",
      icon: <Users className="h-6 w-6 text-[#1877F2]" />,
    },
  ]

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="h-40 bg-gradient-to-r from-brand-purple to-brand-pink relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src={steps[step].image || "/placeholder.svg"}
                  alt={steps[step].title}
                  width={300}
                  height={200}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-brand-purple/10 rounded-full p-2">{steps[step].icon}</div>
                <h2 className="text-xl font-medium text-[#5d4037]">{steps[step].title}</h2>
              </div>

              <p className="text-[#6d4c41] mb-8">{steps[step].description}</p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-6 rounded-full ${i === step ? "bg-brand-purple" : "bg-gray-200"}`}
                    ></div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="outline" onClick={prevStep}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button onClick={nextStep}>
                    {step < steps.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      "Get Started"
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
