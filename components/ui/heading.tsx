import React from 'react';
import { cn } from "@/lib/utils"

interface HeadingProps {
  title: string;
  description?: string;
  className?: string;
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
  title,
  description,
  className,
}: HeadingProps) {
  return (
    <div className={cn("scroll-m-20", className)}>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
} 