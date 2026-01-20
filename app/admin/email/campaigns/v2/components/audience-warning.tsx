import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';

export type AudienceWarningType = 'small' | 'large' | null;

export function getAudienceSizeWarning(size: number): { type: AudienceWarningType; message: string } | null {
  if (typeof size !== 'number' || isNaN(size)) return null;
  if (size <= 5) {
    return {
      type: 'small',
      message: 'Warning: Audience is very small. Double-check your segment selection.'
    };
  }
  if (size >= 5000) {
    return {
      type: 'large',
      message: 'Warning: Audience is very large! Consider narrowing your segments to avoid accidental mass sends.'
    };
  }
  return null;
}

export function AudienceWarning({ size }: { size: number | undefined }) {
  const warning = typeof size === 'number' ? getAudienceSizeWarning(size) : null;
  if (!warning) return null;
  return (
    <Alert variant={warning.type === 'large' ? 'destructive' : 'default'} className="mt-2">
      <AlertTitle className="flex items-center gap-2">
        {warning.type === 'large' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Info className="w-5 h-5 text-yellow-500" />}
        {warning.type === 'large' ? 'Large Audience' : 'Small Audience'}
      </AlertTitle>
      <AlertDescription>{warning.message}</AlertDescription>
    </Alert>
  );
}
