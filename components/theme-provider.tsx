'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Force light theme to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false)

  // After mounting, we have access to the client
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <NextThemesProvider 
      {...props} 
      enableSystem={false} 
      forcedTheme="light" // Force light theme to avoid hydration issues
      attribute="class"
    >
      {/* Add suppressHydrationWarning to the div to prevent hydration warnings */}
      <div suppressHydrationWarning>
        {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
      </div>
    </NextThemesProvider>
  )
}
