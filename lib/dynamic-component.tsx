"use client"

import dynamic from 'next/dynamic'
import React from 'react'

/**
 * Creates a dynamically imported component with customizable loading state
 * 
 * @param importFunc - Function that imports the component
 * @param options - Configuration options
 * @returns Dynamically loaded component
 */
export function createDynamicComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: {
    ssr?: boolean
    loading?: React.ReactNode
    displayName?: string
  } = {}
) {
  const {
    ssr = false,
    loading = <div className="min-h-[100px] animate-pulse bg-muted rounded-md"></div>,
    displayName
  } = options

  const DynamicComponent = dynamic(importFunc, {
    ssr,
    loading: () => <>{loading}</>,
  })

  if (displayName) {
    DynamicComponent.displayName = displayName
  }

  return DynamicComponent
}

/**
 * Example usage:
 * 
 * const HeavyChart = createDynamicComponent(
 *   () => import('@/components/heavy-chart'),
 *   { 
 *     ssr: false,
 *     loading: <div>Loading chart...</div>,
 *     displayName: 'DynamicHeavyChart'
 *   }
 * )
 */ 