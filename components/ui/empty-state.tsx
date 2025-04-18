import { ReactNode } from 'react';

/**
 * EmptyState - A reusable empty state for dashboard/app.
 * Props:
 * - icon: ReactNode (icon or illustration)
 * - title: string
 * - description: string
 * - action?: ReactNode (optional action button or link)
 */
export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <div className="mb-2">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      {action}
    </div>
  );
} 