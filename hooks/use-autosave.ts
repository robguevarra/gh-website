import { useEffect, useRef } from 'react'

interface AutosaveOptions<T> {
  data: T
  onSave: () => Promise<void>
  interval?: number
  enabled?: boolean
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 3000,
  enabled = true,
}: AutosaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const previousDataRef = useRef<T>(data)

  useEffect(() => {
    if (!enabled) return

    // Check if data has changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave()
        previousDataRef.current = data
      } catch (error) {
        console.error('Autosave failed:', error)
      }
    }, interval)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, onSave, interval, enabled])
} 