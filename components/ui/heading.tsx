import * as React from "react"
import { cn } from "@/lib/utils"

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6
  as?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
}

/**
 * Accessible Heading component
 * 
 * This component allows for semantic heading levels (level) while allowing visual styling of a different level (as).
 * This helps maintain proper document outline/hierarchy while allowing design flexibility.
 * 
 * @example
 * // Semantically an h2, but styled like an h1
 * <Heading level={2} as={1}>My Heading</Heading>
 * 
 * // Regular h3 with default styling
 * <Heading level={3}>Section Title</Heading>
 */
export function Heading({
  level,
  as,
  children,
  className,
  ...props
}: HeadingProps) {
  const visualLevel = as || level
  
  const styles = {
    1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    2: "scroll-m-20 text-3xl font-semibold tracking-tight",
    3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    4: "scroll-m-20 text-xl font-semibold tracking-tight",
    5: "scroll-m-20 text-lg font-semibold tracking-tight",
    6: "scroll-m-20 text-base font-semibold tracking-tight",
  }

  // Create the appropriate heading element based on level
  const HeadingTag = `h${level}` as React.ElementType
  
  return (
    <HeadingTag
      className={cn(styles[visualLevel], className)}
      {...props}
    >
      {children}
    </HeadingTag>
  )
} 