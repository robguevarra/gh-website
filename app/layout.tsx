import type React from "react"
import { Inter } from "next/font/google"
import { Playfair_Display } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { CustomCursorToggle } from "@/components/custom-cursor-toggle"
import Script from "next/script"
import { SkipLink } from "@/components/ui/skip-link"
import SupabaseProvider from "@/components/providers/supabase-provider"
import { AuthProvider } from "@/context/auth-context"

// Import critical CSS first for priority loading
import './critical.css'
// Import non-critical CSS after
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata = {
  title: "Graceful Homeschooling",
  description:
    "Empowering homeschooling parents with tools, resources, and insights to enhance their educational journey.",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://gracefulhomeschooling.blob.core.windows.net" />
        <link rel="preconnect" href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="https://gracefulhomeschooling.blob.core.windows.net" />
        <link rel="dns-prefetch" href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com" />
        
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <SupabaseProvider>
          <AuthProvider>
            <ThemeProvider>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <CustomCursorToggle />
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </SupabaseProvider>
        
        <Script
          src="/scripts/analytics.js"
          strategy="lazyOnload"
          id="analytics-script"
        />
      </body>
    </html>
  )
}



import './globals.css'