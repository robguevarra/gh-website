'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: () => Promise<void>; // The actual send function
  isSending: boolean; // Loading state for the send button
  audienceSize: number | null;
  campaignName: string | null;
  campaignStatus: string; // Added campaignStatus prop
}

export function SendConfirmationModal({
  isOpen,
  onClose,
  onConfirmSend,
  isSending,
  audienceSize,
  campaignName,
  campaignStatus, // Destructure new prop
}: SendConfirmationModalProps) {
  const { toast } = useToast();

  const handleConfirm = async () => {
    toast({
      title: "Initiating Campaign Send...",
      description: `Your campaign "${campaignName || 'Selected Campaign'}" is being prepared for sending.`,
    });

    await onConfirmSend(); 
    // Parent should handle closing on success/failure if desired, or toast display.
    // Modal could close itself if onConfirmSend is guaranteed to finish before unmount, 
    // but usually parent controls this for better flow.
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">Confirm Campaign Send</DialogTitle>
          <DialogDescription className="text-center">
            You are about to send the campaign "<span className="font-semibold">{campaignName || 'this campaign'}</span>" 
            to approximately <span className="font-semibold">{audienceSize?.toLocaleString() || '0'}</span> recipients.
            <br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSending || campaignStatus === 'sending' || campaignStatus === 'sent' || campaignStatus === 'completed'}
            variant="destructive" // Or primary action color if preferred
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 