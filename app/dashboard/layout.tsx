"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

// Import the main student dashboard header
import { StudentHeader } from "@/components/dashboard/student-header"

// Import onboarding components
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"

// Import UserContextFetcher
import { UserContextFetcher } from "@/lib/components/providers/user-context-fetcher"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // --- Onboarding/Welcome State --- 
  const [isFirstVisit, setIsFirstVisit] = useState(false) // Default to false, check localStorage
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  // --- Loading State --- 
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check localStorage sync after mount
    const hasVisitedBefore = localStorage.getItem("hasVisitedDashboard")
    if (!hasVisitedBefore) {
      setIsFirstVisit(true)
      setShowWelcomeModal(true)
      localStorage.setItem("hasVisitedDashboard", "true") // Mark visited
    }

    // Simulate loading or wait for auth/data if needed
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 300) // Shorten delay slightly

    return () => clearTimeout(timer)
  }, [])

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false)
    // Conditionally start the tour only if it was the first visit
    if (isFirstVisit) { 
      setShowTour(true)
    }
  }

  const handleTourComplete = () => {
    setShowTour(false)
  }

  return (
    // Use flex column to structure header and main content
    <div className="min-h-screen flex flex-col bg-background">
      <UserContextFetcher />
      {/* Render the main student header */} 
      <StudentHeader />
      
      {/* Main content area */}
      <main className="flex-1">
        {/* Use motion for fade-in effect of the page content */} 
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: isLoaded ? 1 : 0 }} 
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          {children} 
        </motion.div>
      </main>

      {/* Onboarding elements rendered on top */}
      {/* Ensure they only show on actual first visit */}
      {/* Pass the required isOpen prop to WelcomeModal */}
      {isFirstVisit && <WelcomeModal isOpen={showWelcomeModal} onClose={handleWelcomeClose} />}
      {/* Assuming OnboardingTour might also need similar props if refactored */}
      {isFirstVisit && showTour && <OnboardingTour onComplete={handleTourComplete} />}
    </div>
  )
}
