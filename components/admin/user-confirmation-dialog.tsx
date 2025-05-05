'use client';

import { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface UserConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
  severity?: 'warning' | 'danger' | 'info';
}

/**
 * A reusable confirmation dialog for sensitive user operations
 * Used for confirming role changes, status changes, and other sensitive operations
 */
export function UserConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  children,
  severity = 'warning',
}: UserConfirmationDialogProps) {
  // Get icon and colors based on severity
  const getIcon = () => {
    switch (severity) {
      case 'danger':
        return <AlertTriangle className="h-5 w-5 text-destructive mr-2" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />;
      case 'info':
        return <AlertTriangle className="h-5 w-5 text-blue-500 mr-2" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />;
    }
  };

  // Get button variant based on severity
  const getButtonVariant = () => {
    switch (severity) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {children}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={getButtonVariant()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * A specialized component for displaying field changes in confirmation dialogs
 */
export function FieldChangeDisplay({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue: string;
  newValue: string;
}) {
  return (
    <div className="mt-2">
      <span className="font-semibold">{label}:</span> Changing from{' '}
      <Badge variant="outline">{oldValue}</Badge> to{' '}
      <Badge variant="outline">{newValue}</Badge>
    </div>
  );
}
