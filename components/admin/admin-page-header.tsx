import React from "react";

interface AdminPageHeaderProps {
  heading: string;
  description?: string;
  children?: React.ReactNode;
}

export function AdminPageHeader({
  heading,
  description,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
