"use client"

import { useState, useEffect } from "react"

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window !== "undefined") {
      // Initial check
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }

      // Set initial value
      checkMobile()

      // Add event listener for window resize
      window.addEventListener("resize", checkMobile)

      // Cleanup
      return () => {
        window.removeEventListener("resize", checkMobile)
      }
    }
  }, [])

  return isMobile
}

