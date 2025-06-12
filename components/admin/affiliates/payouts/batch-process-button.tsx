"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { processPayoutBatch } from "@/lib/actions/admin/payout-actions";

interface BatchProcessButtonProps {
  batchId: string;
}

export function BatchProcessButton({ batchId }: BatchProcessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    if (isProcessing) return;
    
    // Confirm the action
    const confirmed = confirm(
      "Are you sure you want to process this batch?\n\n" +
      "This will send all payouts to Xendit for disbursement. " +
      "This action cannot be undone."
    );
    
    if (!confirmed) return;
    
    setIsProcessing(true);
    try {
      const result = await processPayoutBatch(batchId);
      
      if (result.success) {
        // Page will revalidate and show the processing state
        window.location.reload();
      } else {
        alert(`Processing failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process batch');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleProcess}
      disabled={isProcessing}
      className="gap-2"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Process Batch
        </>
      )}
    </Button>
  );
} 