'use client';

import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Package,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  Download,
  FileText,
  Shield
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { getBatchPreviewData } from "@/lib/actions/admin/conversion-actions";
import { 
  payAffiliateNow, 
  overrideFraudFlags, 
  emergencyDisbursement,
  exportBatchReport,
  generatePaymentFiles,
  approveBatch
} from "@/lib/actions/admin/payout-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast, ToastProvider } from "@/hooks/use-toast";

// Remove metadata export since we're now client-side
// export const metadata: Metadata = {
//   title: "Batch Preview | Admin",
//   description: "Preview the auto-created monthly payout batch before approval",
// };

function ConfirmationDialog({ 
  children, 
  title, 
  description, 
  onConfirm, 
  destructive = false,
  disabled = false 
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      // Close dialog after successful operation
      setIsOpen(false);
    } catch (error) {
      // Keep dialog open on error so user can see what happened
      console.error('Operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={destructive ? "text-red-600" : ""}>
            {isLoading ? "Processing..." : title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLoading ? "Please wait while we process your request..." : description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isLoading}
            className={destructive ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BatchPreviewContent() {
  const [batch, setBatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadBatchData() {
      try {
        const result = await getBatchPreviewData();
        if (result.error) {
          setError(result.error);
        } else {
          setBatch(result.batch);
        }
      } catch (err) {
        setError('Failed to load batch data');
      } finally {
        setLoading(false);
      }
    }
    
    loadBatchData();
  }, []);

  const handlePayAffiliate = async (affiliateId: string, affiliateName: string) => {
    const adminUserId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from session
    
    try {
      const result = await payAffiliateNow({ affiliateId, adminUserId });
      
      if (result.success) {
        // Calculate payout amount from current batch data
        const affiliate = batch.affiliate_payouts.find((a: any) => a.affiliate_id === affiliateId);
        const payoutAmount = affiliate?.total_commission || 0;
        
        toast({
          title: "💰 Payout Processed Successfully!",
          description: `₱${payoutAmount.toLocaleString()} has been sent to ${affiliateName} via Xendit. Payment ID: ${(result as any).xenditId || result.payoutId || 'Generated'}`,
        });
        
        // Refresh data to show updated UI state
        setLoading(true);
        const refreshResult = await getBatchPreviewData();
        if (refreshResult.batch) {
          setBatch(refreshResult.batch);
        }
        setLoading(false);
      } else {
        // Handle specific error cases
        const isAlreadyPaid = result.error?.includes('No eligible conversions found');
        
        if (isAlreadyPaid) {
          toast({
            title: "Already Processed",
            description: `${affiliateName} has no eligible conversions. They may have already been paid or have no cleared conversions.`,
            variant: "destructive",
          });
          
          // Refresh data to update UI state
          setLoading(true);
          const refreshResult = await getBatchPreviewData();
          if (refreshResult.batch) {
            setBatch(refreshResult.batch);
          }
          setLoading(false);
        } else {
          toast({
            title: "Payout Failed",
            description: result.error || "Failed to process payout",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during payout processing",
        variant: "destructive",
      });
    }
  };

  const handleOverrideFlags = async () => {
    const adminUserId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from session
    
    try {
      const result = await overrideFraudFlags({ 
        adminUserId, 
        overrideReason: 'Manual override from batch preview' 
      });
      
      if (result.success) {
        toast({
          title: "🛡️ Fraud Flags Overridden",
          description: `Successfully cleared ${result.overriddenCount} fraud flags. All conversions are now eligible for payout.`,
        });
        
        // Refresh data to show cleared flags
        setLoading(true);
        const refreshResult = await getBatchPreviewData();
        if (refreshResult.batch) {
          setBatch(refreshResult.batch);
        }
        setLoading(false);
      } else {
        toast({
          title: "Override Failed",
          description: result.error || "Failed to override fraud flags",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during flag override",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyDisbursement = async () => {
    const adminUserId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from session
    
    try {
      const result = await emergencyDisbursement({ 
        adminUserId, 
        reason: 'Emergency full disbursement from batch preview' 
      });
      
      if (result.success) {
        toast({
          title: "🚨 Emergency Disbursement Complete!",
          description: `Successfully processed ₱${result.amount?.toLocaleString()} to ${batch.total_affiliates} affiliates. All cleared conversions have been paid.`,
        });
        
        // Refresh data to show updated payout states
        setLoading(true);
        const refreshResult = await getBatchPreviewData();
        if (refreshResult.batch) {
          setBatch(refreshResult.batch);
        }
        setLoading(false);
      } else {
        toast({
          title: "Emergency Disbursement Failed",
          description: result.error || "Failed to process emergency disbursement",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during emergency disbursement",
        variant: "destructive",
      });
    }
  };

  const handleExportReport = async () => {
    try {
      const result = await exportBatchReport({ format: 'csv' });
      
      if (result.data && !result.error) {
        // Create download
        const blob = new Blob([result.data], { type: result.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: `Downloaded ${result.filename}`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to export report",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePaymentFiles = async () => {
    try {
      const result = await generatePaymentFiles();
      
      if (result.data && !result.error) {
        // Create download
        const blob = new Blob([result.data], { type: result.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Payment Files Generated",
          description: `Downloaded ${result.filename}`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate payment files",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleApproveBatch = async () => {
    const adminUserId = '00000000-0000-0000-0000-000000000000'; // TODO: Get from session
    
    try {
      const result = await approveBatch({ adminUserId });
      
      if (result.success) {
        toast({
          title: "✅ Batch Approved Successfully!",
          description: `Batch ${result.batchId} approved for ₱${batch.total_amount.toLocaleString()}. Ready for payment processing.`,
        });
        
        // Refresh data to show approved batch status
        setLoading(true);
        const refreshResult = await getBatchPreviewData();
        if (refreshResult.batch) {
          setBatch(refreshResult.batch);
        }
        setLoading(false);
      } else {
        toast({
          title: "Approval Failed",
          description: result.error || "Failed to approve batch",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during batch approval",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }
  
  if (error || !batch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error Loading Batch Data</h2>
          <p className="text-muted-foreground">{error || 'No batch data available'}</p>
        </div>
      </div>
    );
  }
  
  const flaggedAffiliates = batch.affiliate_payouts.filter((a: any) => a.flagged_count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/affiliates/conversions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversions
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Batch Preview - {batch.month}</h1>
          <p className="text-muted-foreground">
            Auto-created on {new Date(batch.created_date).toLocaleDateString()} • 
            Scheduled payout: {new Date(batch.scheduled_payout_date).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          {batch.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.total_affiliates}</div>
            <p className="text-xs text-muted-foreground">
              {batch.summary.new_affiliates_this_month} new, {batch.summary.repeat_affiliates} returning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{batch.total_amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ₱{batch.summary.average_payout_per_affiliate.toFixed(0)} per affiliate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.total_conversions}</div>
            <p className="text-xs text-muted-foreground">
              {batch.cleared_conversions} cleared, {batch.flagged_conversions} flagged, {batch.pending_conversions} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Status</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {batch.requires_manual_review ? 'Manual' : 'Auto'}
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.flagged_conversions > 0 ? 'Fraud flags require review' : 'Auto-approved eligible'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Flags Alert */}
      {batch.flagged_conversions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Action Required: {batch.flagged_conversions} Flagged Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800 mb-4">
              The following affiliates have flagged conversions that need review before batch approval:
            </p>
            <div className="space-y-2">
              {flaggedAffiliates.map((affiliate: any) => (
                <div key={affiliate.affiliate_id} className="flex items-center justify-between bg-white p-3 rounded border">
                  <div>
                    <span className="font-medium">{affiliate.affiliate_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {affiliate.flagged_count} flagged conversion{affiliate.flagged_count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link href={`/admin/affiliates/conversions?status=flagged&affiliate=${affiliate.affiliate_id}`}>
                    <Button size="sm" variant="outline">
                      Review Flags
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affiliate Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Affiliate Payout Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of commissions for each affiliate in this batch
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Affiliate</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Conversions</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Total Commission</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Average</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batch.affiliate_payouts.map((affiliate: any) => (
                  <tr key={affiliate.affiliate_id} className="border-b">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{affiliate.affiliate_name}</p>
                        <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(affiliate.join_date).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-medium">{affiliate.conversions_count}</span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium">₱{affiliate.total_commission.toLocaleString()}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm">₱{affiliate.average_commission.toFixed(0)}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap">
                        {affiliate.cleared_count > 0 && (
                          <Badge variant="default" className="text-xs">
                            {affiliate.cleared_count} Cleared
                          </Badge>
                        )}
                        {affiliate.flagged_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {affiliate.flagged_count} Flagged
                          </Badge>
                        )}
                        {affiliate.pending_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {affiliate.pending_count} Pending
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Link href={`/admin/affiliates/${affiliate.affiliate_id}`}>
                          <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                            View Profile
                          </Button>
                        </Link>
                        {affiliate.flagged_count > 0 && (
                          <Link href={`/admin/affiliates/conversions?status=flagged&affiliate=${affiliate.affiliate_id}`}>
                            <Button size="sm" variant="outline" className="text-xs px-2 py-1 text-orange-600">
                              Review Flags
                            </Button>
                          </Link>
                        )}
                        {affiliate.cleared_count > 0 && (
                          <ConfirmationDialog
                            title={`Pay ${affiliate.affiliate_name} Now?`}
                            description={`This will immediately process a payout of ₱${affiliate.total_commission.toLocaleString()} to ${affiliate.affiliate_name}. This action cannot be undone.`}
                            onConfirm={() => handlePayAffiliate(affiliate.affiliate_id, affiliate.affiliate_name)}
                            destructive={true}
                          >
                            <Button size="sm" variant="secondary" className="text-xs px-2 py-1">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Pay Now
                            </Button>
                          </ConfirmationDialog>
                        )}
                        {affiliate.cleared_count === 0 && affiliate.conversions_count > 0 && (
                          <Button size="sm" variant="outline" disabled className="text-xs px-2 py-1 opacity-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Already Paid
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performer Highlight */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle2 className="h-5 w-5" />
            Top Performer This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-lg">{batch.summary.highest_earning_affiliate}</p>
              <p className="text-sm text-green-800">
                Earned ₱{batch.summary.highest_earning_amount.toLocaleString()} in commissions
              </p>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Top Earner
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Manual Disbursement Section */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <DollarSign className="h-5 w-5" />
            Manual Disbursement Options
          </CardTitle>
          <p className="text-sm text-purple-700">
            Override normal batch processing for special cases or emergency payments
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium mb-2">Individual Affiliate Payout</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Pay specific affiliates immediately, bypassing batch processing
              </p>
              <Link href="/admin/affiliates/payouts">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Select Affiliates to Pay
                </Button>
              </Link>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium mb-2">Override Fraud Flags</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Manually approve flagged conversions and include in immediate payout
              </p>
              <ConfirmationDialog
                title={`Override ${batch.flagged_conversions} Fraud Flags?`}
                description={`This will permanently approve all ${batch.flagged_conversions} flagged conversions and mark them as cleared. This action cannot be undone and bypasses fraud protection.`}
                onConfirm={handleOverrideFlags}
                destructive={true}
                disabled={batch.flagged_conversions === 0}
              >
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={batch.flagged_conversions === 0}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Override {batch.flagged_conversions} Flags
                </Button>
              </ConfirmationDialog>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Emergency Full Disbursement</h4>
                <p className="text-sm text-muted-foreground">
                  Process all cleared conversions immediately (₱{batch.total_amount.toLocaleString()})
                </p>
              </div>
              <ConfirmationDialog
                title="Emergency Full Disbursement?"
                description={`This will immediately process ₱${batch.total_amount.toLocaleString()} to ALL affiliates, bypassing all normal approval workflows. This is an irreversible financial operation.`}
                onConfirm={handleEmergencyDisbursement}
                destructive={true}
                disabled={batch.cleared_conversions === 0}
              >
                <Button 
                  variant="destructive" 
                  disabled={batch.cleared_conversions === 0}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Disburse All
                </Button>
              </ConfirmationDialog>
            </div>
            <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
              ⚠️ This will bypass all normal approval workflows and process payments immediately
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Batch Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Standard Batch Processing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Normal monthly batch approval workflow
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Batch Report
            </Button>
            
            <Button onClick={handleGeneratePaymentFiles} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Payment Files
            </Button>
            
            {batch.flagged_conversions === 0 ? (
              <ConfirmationDialog
                title={`Approve Batch for ₱${batch.total_amount.toLocaleString()}?`}
                description={`This will approve the batch for ${batch.total_affiliates} affiliates and create official payout records. The batch will then be ready for processing.`}
                onConfirm={handleApproveBatch}
              >
                <Button className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Batch (₱{batch.total_amount.toLocaleString()})
                </Button>
              </ConfirmationDialog>
            ) : (
              <Button disabled variant="outline" className="text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Review Flags First ({batch.flagged_conversions} pending)
              </Button>
            )}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground bg-blue-50 p-3 rounded">
            <strong>Industry Standard Workflow:</strong> Review flags → Approve/Reject conversions → Approve batch → Process payments
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BatchPreviewPage() {
  return (
    <ToastProvider>
      <div className="flex-1 space-y-6 p-6">
        <BatchPreviewContent />
      </div>
    </ToastProvider>
  );
} 