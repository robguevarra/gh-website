import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * MetricCard - A reusable card for dashboard metrics.
 * Props:
 * - icon: ReactNode (icon component)
 * - title: string (metric label)
 * - value: string | number (main metric value)
 * - description?: string (optional subtext)
 * - intent?: visual tone (neutral | success | warning | info | revenue)
 * - accent?: subtle color accent (indigo | violet | emerald | teal | cyan | sky | blue | amber | rose | fuchsia)
 *
 * Visual updates:
 * - Clear hierarchy (label/title, value, description)
 * - Subtle micro-interactions (hover lift, calm shadow)
 * - Accessible focus-visible ring
 * - Intent-tinted icon container with soft ring
 * - Optional accent top bar for added color without hurting readability
 * - GPU-friendly transforms, respects reduced motion
 */
export interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  description?: string;
  intent?: 'neutral' | 'success' | 'warning' | 'info' | 'revenue';
  accent?: 'indigo' | 'violet' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'amber' | 'rose' | 'fuchsia';
}

function iconTone(intent?: MetricCardProps['intent']) {
  // Map intents to light/dark safe tones
  switch (intent) {
    case 'success':
      return 'bg-emerald-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'warning':
      return 'bg-amber-500/10 ring-amber-500/20 text-amber-600 dark:text-amber-400';
    case 'info':
      return 'bg-blue-500/10 ring-blue-500/20 text-blue-600 dark:text-blue-400';
    case 'revenue':
      return 'bg-indigo-500/10 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400';
    case 'neutral':
    default:
      return 'bg-muted/50 ring-border/50 text-muted-foreground';
  }
}

function iconAccent(accent?: MetricCardProps['accent']) {
  switch (accent) {
    case 'indigo':
      return 'bg-indigo-500/10 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400';
    case 'violet':
      return 'bg-violet-500/10 ring-violet-500/20 text-violet-600 dark:text-violet-400';
    case 'emerald':
      return 'bg-emerald-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    case 'teal':
      return 'bg-teal-500/10 ring-teal-500/20 text-teal-600 dark:text-teal-400';
    case 'cyan':
      return 'bg-cyan-500/10 ring-cyan-500/20 text-cyan-600 dark:text-cyan-400';
    case 'sky':
      return 'bg-sky-500/10 ring-sky-500/20 text-sky-600 dark:text-sky-400';
    case 'blue':
      return 'bg-blue-500/10 ring-blue-500/20 text-blue-600 dark:text-blue-400';
    case 'amber':
      return 'bg-amber-500/10 ring-amber-500/20 text-amber-600 dark:text-amber-400';
    case 'rose':
      return 'bg-rose-500/10 ring-rose-500/20 text-rose-600 dark:text-rose-400';
    case 'fuchsia':
      return 'bg-fuchsia-500/10 ring-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400';
    default:
      return '';
  }
}

function topBarTone(accent?: MetricCardProps['accent'], intent?: MetricCardProps['intent']) {
  if (accent) {
    switch (accent) {
      case 'indigo':
        return 'bg-indigo-500/30 dark:bg-indigo-400/30';
      case 'violet':
        return 'bg-violet-500/30 dark:bg-violet-400/30';
      case 'emerald':
        return 'bg-emerald-500/30 dark:bg-emerald-400/30';
      case 'teal':
        return 'bg-teal-500/30 dark:bg-teal-400/30';
      case 'cyan':
        return 'bg-cyan-500/30 dark:bg-cyan-400/30';
      case 'sky':
        return 'bg-sky-500/30 dark:bg-sky-400/30';
      case 'blue':
        return 'bg-blue-500/30 dark:bg-blue-400/30';
      case 'amber':
        return 'bg-amber-500/30 dark:bg-amber-400/30';
      case 'rose':
        return 'bg-rose-500/30 dark:bg-rose-400/30';
      case 'fuchsia':
        return 'bg-fuchsia-500/30 dark:bg-fuchsia-400/30';
      default:
        return '';
    }
  }
  // Fallback from intent if accent not provided
  switch (intent) {
    case 'revenue':
      return 'bg-indigo-500/30 dark:bg-indigo-400/30';
    case 'info':
      return 'bg-blue-500/30 dark:bg-blue-400/30';
    case 'success':
      return 'bg-emerald-500/30 dark:bg-emerald-400/30';
    case 'warning':
      return 'bg-amber-500/30 dark:bg-amber-400/30';
    case 'neutral':
    default:
      return 'bg-muted/60';
  }
}

export function MetricCard({ icon, title, value, description, intent, accent }: MetricCardProps) {
  return (
    <Card
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 transform-gpu hover:-translate-y-[1px] hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {/* Subtle top accent bar to add color without reducing readability */}
      <div className={"absolute inset-x-0 top-0 h-0.5 rounded-t-xl " + topBarTone(accent, intent)} aria-hidden />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={
            'p-2 rounded-lg ring-1 ring-inset transition-transform duration-200 group-hover:scale-[1.02] ' +
            (iconAccent(accent) || iconTone(intent))
          }
          aria-hidden
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold tabular-nums tracking-tight mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}