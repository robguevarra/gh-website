"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { cn } from '@/lib/utils'

interface DynamicImportProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
  loadImmediately?: boolean
}

export function DynamicImport({
  children,
  fallback = <div className="min-h-[100px] animate-pulse bg-muted rounded-md"></div>,
  threshold = 0.1,
  rootMargin = '200px',
  className,
  loadImmediately = false,
}: DynamicImportProps) {
  const [isVisible, setIsVisible] = useState(loadImmediately)
  const [hasLoaded, setHasLoaded] = useState(false)
  const id = React.useId()

  useEffect(() => {
    if (loadImmediately) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    const currentElement = document.getElementById(`dynamic-import-${id}`)
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [id, loadImmediately, rootMargin, threshold])

  useEffect(() => {
    if (isVisible) {
      // Add a small delay to ensure smooth transitions
      const timer = setTimeout(() => {
        setHasLoaded(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  return (
    <div 
      id={`dynamic-import-${id}`}
      className={cn('transition-opacity duration-300', 
        hasLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  )
} 