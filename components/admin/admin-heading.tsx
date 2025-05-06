import React from 'react';

interface AdminHeadingProps {
  title: string;
  description?: string;
  backHref?: string;
  className?: string;
}

export function AdminHeading({
  title,
  description,
  backHref,
  className,
}: AdminHeadingProps) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
} 