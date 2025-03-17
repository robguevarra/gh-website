"use client"

import { useEffect, useRef, useState } from "react"

type KeyboardNavigationOptions = {
  /**
   * The selector for focusable elements
   * Default: 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
   */
  selector?: string
  /**
   * Whether to trap focus within the container
   * Default: false
   */
  trapFocus?: boolean
  /**
   * Whether to auto-focus the first element when the component mounts
   * Default: false
   */
  autoFocus?: boolean
}

/**
 * Hook for managing keyboard navigation within a container
 * 
 * This hook helps implement accessible keyboard navigation by:
 * - Managing focus within a container
 * - Optionally trapping focus (for modals, dialogs)
 * - Supporting arrow key navigation
 * - Providing methods to programmatically control focus
 * 
 * @example
 * const { containerRef, focusFirst, focusLast } = useKeyboardNavigation({
 *   trapFocus: true,
 *   autoFocus: true
 * });
 * 
 * return (
 *   <div ref={containerRef}>
 *     <button>First button</button>
 *     <button>Second button</button>
 *     <button onClick={focusFirst}>Focus first</button>
 *   </div>
 * );
 */
export function useKeyboardNavigation({
  selector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
  trapFocus = false,
  autoFocus = false,
}: KeyboardNavigationOptions = {}) {
  const containerRef = useRef<HTMLElement | null>(null)
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([])

  // Update focusable elements when the container changes
  useEffect(() => {
    if (!containerRef.current) return

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(selector)
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)

    setFocusableElements(elements)

    // Auto-focus the first element if enabled
    if (autoFocus && elements.length > 0) {
      elements[0].focus()
    }
  }, [selector, autoFocus])

  // Handle tab key navigation
  useEffect(() => {
    if (!trapFocus || !containerRef.current || focusableElements.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      // Get the first and last focusable elements
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // If shift+tab on first element, move to last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // If tab on last element, move to first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    containerRef.current.addEventListener('keydown', handleKeyDown)
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [trapFocus, focusableElements])

  // Handle arrow key navigation
  useEffect(() => {
    if (!containerRef.current || focusableElements.length === 0) return

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

      // Find the current focused element index
      const currentIndex = focusableElements.findIndex(el => el === document.activeElement)
      if (currentIndex === -1) return

      e.preventDefault()
      let nextIndex = currentIndex

      // Determine the next index based on the arrow key
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1
          break
        case 'ArrowDown':
        case 'ArrowRight':
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0
          break
      }

      // Focus the next element
      focusableElements[nextIndex].focus()
    }

    containerRef.current.addEventListener('keydown', handleArrowKeys)
    return () => {
      containerRef.current?.removeEventListener('keydown', handleArrowKeys)
    }
  }, [focusableElements])

  // Focus the first element
  const focusFirst = () => {
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  // Focus the last element
  const focusLast = () => {
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus()
    }
  }

  // Focus a specific element by index
  const focusByIndex = (index: number) => {
    if (index >= 0 && index < focusableElements.length) {
      focusableElements[index].focus()
    }
  }

  return {
    containerRef,
    focusableElements,
    focusFirst,
    focusLast,
    focusByIndex,
  }
} 