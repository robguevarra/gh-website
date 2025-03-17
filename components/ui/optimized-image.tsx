"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends React.ComponentPropsWithoutRef<typeof Image> {
  lowQualitySrc?: string
  containerClassName?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lowQualitySrc,
  className,
  containerClassName,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    // Only set up intersection observer if not priority
    if (priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // Start loading when image is 200px from viewport
    )

    const currentElement = document.getElementById(`image-container-${alt?.replace(/\s+/g, '-').toLowerCase()}`)
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [alt, priority])

  return (
    <div 
      id={`image-container-${alt?.replace(/\s+/g, '-').toLowerCase()}`}
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Low quality placeholder */}
      {lowQualitySrc && !isLoaded && (
        <Image
          src={lowQualitySrc}
          alt={alt || ""}
          fill={!width || !height}
          width={width}
          height={height}
          className={cn('transition-opacity duration-500 blur-sm', className)}
          style={{ objectFit: 'cover' }}
          {...props}
        />
      )}

      {/* Main image - only load when in view */}
      {isInView && (
        <Image
          src={src}
          alt={alt || ""}
          fill={!width || !height}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            'transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          priority={priority}
          {...props}
        />
      )}
    </div>
  )
} 