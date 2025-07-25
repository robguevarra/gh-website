import type React from "react"
import { Inter } from "next/font/google"
import { Playfair_Display } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ToasterProvider } from "@/components/providers/toaster-provider"

import Script from "next/script"
import { SkipLink } from "@/components/ui/skip-link"
import SupabaseProvider from "@/components/providers/supabase-provider"
import { AuthProvider } from "@/context/auth-context"
// Enhanced auth functionality is now directly incorporated into the main auth context
import { AuthCoordinationProvider } from "@/components/providers/auth-coordination-provider"
import GlobalAffiliateTracker from "@/components/affiliate/global-affiliate-tracker"

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
  metadataBase: new URL('https://gracefulhomeschooling.com'),
  title: "Graceful Homeschooling",
  description:
    "Empowering homeschooling parents with tools, resources, and insights to enhance their educational journey.",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
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
        {/* Facebook SDK meta tag - 2025 best practice */}
        <meta property="fb:app_id" content="380843334043779" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        {/* Facebook SDK root element - REQUIRED for Facebook plugins */}
        <div id="fb-root"></div>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <SupabaseProvider>
          <AuthProvider>
            <AuthCoordinationProvider>
              <ThemeProvider>
                <main id="main-content" tabIndex={-1}>
                  {children}
                </main>

                <ToasterProvider />
              </ThemeProvider>
            </AuthCoordinationProvider>
          </AuthProvider>
        </SupabaseProvider>

        <Script
          src="/scripts/analytics.js"
          strategy="lazyOnload"
          id="analytics-script"
        />
        {/* Add site-wide affiliate tracking */}
        <GlobalAffiliateTracker debug={true} />
      </body>
    </html>
  )
}



import './globals.css'