import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons or breadcrumbs
}

export default function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6 border-b pb-4">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-serif">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-gray-600 font-sans">
          {description}
        </p>
      )}
      {children && <div className="mt-4 flex items-center space-x-2">{children}</div>}
    </div>
  );
}
