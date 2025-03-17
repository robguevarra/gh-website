import * as React from "react"
import { cn } from "@/lib/utils"

interface SkipLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

/**
 * SkipLink Component
 * 
 * This component creates an accessible skip link that allows keyboard users
 * to bypass navigation and jump directly to the main content.
 * The link is visually hidden until it receives focus.
 * 
 * @example
 * <SkipLink href="#main-content">Skip to main content</SkipLink>
 */
export function SkipLink({ href, children, className, ...props }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
} 