"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { verifyPayoutBatch } from "@/lib/actions/admin/payout-actions";

interface BatchVerificationFormProps {
  batchId: string;
}

export function BatchVerificationForm({ batchId }: BatchVerificationFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [checkedItems, setCheckedItems] = useState({
    bankAccounts: false,
    amounts: false,
    compliance: false,
    fraudChecks: false,
  });

  const allChecked = Object.values(checkedItems).every(Boolean);

  const handleCheckboxChange = (key: keyof typeof checkedItems) => {
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleVerify = async () => {
    if (!allChecked) return;
    
    setIsVerifying(true);
    try {
      const result = await verifyPayoutBatch({
        batchId,
        verificationNotes: verificationNotes.trim() || undefined
      });
      
      if (result.success) {
        // Page will revalidate and show the verified state
        window.location.reload();
      } else {
        alert(`Verification failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to verify batch');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-amber-700">
        Please complete all verification steps before approving this batch for processing.
      </div>

      {/* Verification Checklist */}
      <div className="space-y-4">
        <h4 className="font-medium text-amber-800">Verification Checklist</h4>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="bankAccounts" 
              checked={checkedItems.bankAccounts}
              onCheckedChange={() => handleCheckboxChange('bankAccounts')}
            />
            <Label htmlFor="bankAccounts" className="text-sm">
              Bank account information verified for all affiliates
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="amounts" 
              checked={checkedItems.amounts}
              onCheckedChange={() => handleCheckboxChange('amounts')}
            />
            <Label htmlFor="amounts" className="text-sm">
              Payout amounts and calculations confirmed
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="compliance" 
              checked={checkedItems.compliance}
              onCheckedChange={() => handleCheckboxChange('compliance')}
            />
            <Label htmlFor="compliance" className="text-sm">
              Compliance requirements met (tax forms, KYC)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="fraudChecks" 
              checked={checkedItems.fraudChecks}
              onCheckedChange={() => handleCheckboxChange('fraudChecks')}
            />
            <Label htmlFor="fraudChecks" className="text-sm">
              Fraud detection checks passed
            </Label>
          </div>
        </div>
      </div>

      {/* Verification Notes */}
      <div className="space-y-2">
        <Label htmlFor="verificationNotes" className="text-sm font-medium">
          Verification Notes (Optional)
        </Label>
        <Textarea
          id="verificationNotes"
          placeholder="Add any notes about the verification process..."
          value={verificationNotes}
          onChange={(e) => setVerificationNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Status Message */}
      {allChecked ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">All verification items completed. Ready to approve batch.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Please complete all verification items before approving.</span>
        </div>
      )}

      {/* Verify Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleVerify}
          disabled={!allChecked || isVerifying}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          {isVerifying ? "Verifying..." : "Verify & Approve Batch"}
        </Button>
      </div>
    </div>
  );
} 