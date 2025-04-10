"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [showTour, setShowTour] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisitedBefore = localStorage.getItem("hasVisitedDashboard")
    if (hasVisitedBefore) {
      setIsFirstVisit(false)
      setShowWelcomeModal(false)
    } else {
      // Mark as visited for future
      localStorage.setItem("hasVisitedDashboard", "true")
    }

    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false)
    // Start the tour after welcome modal closes
    setShowTour(true)
  }

  const handleTourComplete = () => {
    setShowTour(false)
  }

  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: isLoaded ? 1 : 0 }} transition={{ duration: 0.5 }}>
        {children}

        {isFirstVisit && showWelcomeModal && <WelcomeModal onClose={handleWelcomeClose} />}

        {isFirstVisit && showTour && <OnboardingTour onComplete={handleTourComplete} />}
      </motion.div>
    </div>
  )
}
