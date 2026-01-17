"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

// Import the main student dashboard header
import { StudentHeader } from "@/components/dashboard/student-header"

// Import onboarding components
// Import onboarding components
// Removed duplicate imports handled in page.tsx

// Import UserContextFetcher
import { UserContextFetcher } from "@/lib/components/providers/user-context-fetcher"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // --- Loading State --- 
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Simulate loading or wait for auth/data if needed
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 300) // Shorten delay slightly

    return () => clearTimeout(timer)
  }, [])

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
    </div>
  )
}
