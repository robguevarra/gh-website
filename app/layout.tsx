import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Playfair_Display } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// ... other imports
import { CustomCursorToggle } from "@/components/custom-cursor-toggle"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
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
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <ThemeProvider>
          {children}
          <CustomCursorToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'