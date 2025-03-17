import * as React from "react"
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

/**
 * VisuallyHidden Component
 * 
 * This component hides content visually while keeping it accessible to screen readers.
 * Use this for content that should be announced by screen readers but not visible on screen.
 * 
 * @example
 * <button>
 *   <Icon name="trash" />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({ children, className, ...props }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "clip-rect-0",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
} 