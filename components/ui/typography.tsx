import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  variant?: 
    | 'h1' 
    | 'h2' 
    | 'h3' 
    | 'h4' 
    | 'p' 
    | 'blockquote' 
    | 'small' 
    | 'muted' 
    | 'lead';
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const typographyVariants = {
  h1: "font-serif text-4xl font-semibold tracking-tight lg:text-5xl",
  h2: "font-serif text-3xl font-semibold tracking-tight",
  h3: "font-serif text-2xl font-semibold tracking-tight",
  h4: "font-serif text-xl font-semibold tracking-tight",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  blockquote: "mt-6 border-l-2 border-primary pl-6 italic",
  small: "text-sm font-medium leading-none",
  muted: "text-sm text-muted-foreground",
  lead: "text-xl text-muted-foreground",
};

export function Typography({
  variant = 'p',
  children,
  className,
  as,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLElement>) {
  const Component = as || getDefaultElement(variant);

  return (
    <Component
      className={cn(typographyVariants[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Helper to map variant to default HTML element
function getDefaultElement(variant: TypographyProps['variant']) {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'blockquote':
      return 'blockquote';
    case 'small':
      return 'small';
    case 'muted':
      return 'p';
    case 'lead':
      return 'p';
    default:
      return 'p';
  }
} 