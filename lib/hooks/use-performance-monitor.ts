/**
 * Performance monitoring utilities for React components and Zustand stores
 */

import { useEffect, useRef } from 'react'

type PerformanceMetrics = {
  renderCount: number
  lastRenderTime: number
  renderDuration: number
  averageRenderDuration: number
  totalRenderDuration: number
  componentName: string
}

/**
 * Hook to monitor component render performance
 * 
 * @param componentName - The name of the component being monitored
 * @returns Performance metrics for the component
 */
export const useRenderMonitor = (componentName: string): PerformanceMetrics => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    renderDuration: 0,
    averageRenderDuration: 0,
    totalRenderDuration: 0,
    componentName
  })
  
  // Increment render count on each render
  const renderStartTime = performance.now()
  const metrics = metricsRef.current
  metrics.renderCount++
  
  // Calculate render duration after initial mounting
  useEffect(() => {
    // Skip first render for more accurate measurements
    if (metrics.renderCount > 1) {
      const renderEndTime = performance.now()
      const renderDuration = renderEndTime - renderStartTime
      
      metrics.renderDuration = renderDuration
      metrics.totalRenderDuration += renderDuration
      metrics.averageRenderDuration = metrics.totalRenderDuration / (metrics.renderCount - 1)
      metrics.lastRenderTime = renderEndTime
      
      // Log metrics in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `%c[${componentName}] Render #${metrics.renderCount - 1}`,
          'color: #6d28d9; font-weight: bold;',
          `\nDuration: ${renderDuration.toFixed(2)}ms`,
          `\nAverage: ${metrics.averageRenderDuration.toFixed(2)}ms`
        )
      }
    }
  })
  
  return metrics
}

/**
 * Hook that monitors Zustand store updates and logs selector performance
 * 
 * @param selector - Function that returns the selected state slice
 * @param selectorName - Name to identify this selector in logs
 * @param state - The current state from the store
 */
export const useStoreMonitor = <T, S>(
  selector: (state: T) => S,
  selectorName: string,
  state: T
): void => {
  // Only run in development mode
  if (process.env.NODE_ENV !== 'development') return
  
  const prevStateRef = useRef<S>(selector(state))
  
  useEffect(() => {
    const selectedState = selector(state)
    const prevSelectedState = prevStateRef.current
    
    // Check if the selected state has changed
    const hasChanged = JSON.stringify(selectedState) !== JSON.stringify(prevSelectedState)
    
    if (hasChanged) {
      console.group(`%c[Store Update: ${selectorName}]`, 'color: #0891b2; font-weight: bold;')
      console.log('Previous:', prevSelectedState)
      console.log('Current:', selectedState)
      console.log('Parent State:', state)
      console.groupEnd()
      
      // Update the ref for the next comparison
      prevStateRef.current = selectedState
    }
  }, [selector, selectorName, state])
}

/**
 * Tracks selector execution count and helps identify over-rendering issues
 */
export const createSelectorMonitor = () => {
  // Only enable in development mode
  if (process.env.NODE_ENV !== 'development') {
    return {
      trackSelector: (name: string, fn: Function) => fn,
      getSelectorStats: () => ({})
    }
  }
  
  const selectorStats: Record<string, { count: number, lastCalledAt: number }> = {}
  
  const trackSelector = <T, R>(name: string, fn: (state: T) => R) => {
    return (state: T): R => {
      if (!selectorStats[name]) {
        selectorStats[name] = { count: 0, lastCalledAt: 0 }
      }
      
      selectorStats[name].count++
      selectorStats[name].lastCalledAt = Date.now()
      
      return fn(state)
    }
  }
  
  const getSelectorStats = () => ({ ...selectorStats })
  
  return { trackSelector, getSelectorStats }
}

// Create a global instance of the selector monitor
export const selectorMonitor = createSelectorMonitor()
