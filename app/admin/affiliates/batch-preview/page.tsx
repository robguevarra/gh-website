'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/ui/pagination";
import { 
  ArrowLeft,
  Users,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Activity
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect, useMemo } from "react";
import { getBatchPreviewData } from "@/lib/actions/admin/conversion-actions";
import { approveBatch } from "@/lib/actions/admin/payout-actions";
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
import { toast } from "sonner";

function BatchPreviewContent() {
  const [batch, setBatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [existingBatch, setExistingBatch] = useState<any>(null);
  const [forceMode, setForceMode] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ineligiblePage, setIneligiblePage] = useState(1);
  const itemsPerPage = 20; // Show 20 affiliates per page

  useEffect(() => {
    async function loadBatchData() {
      try {
        const result = await getBatchPreviewData();
        if (result.error) {
          setError(result.error);
        } else {
          setBatch(result.batch);
          
          // Check if batch already exists for this period
          if (result.batch?.month) {
            await checkExistingBatch(result.batch.month);
          }
        }
      } catch (err) {
        setError('Failed to load batch data');
      } finally {
        setLoading(false);
      }
    }
    
    loadBatchData();
  }, []);

  async function checkExistingBatch(month: string) {
    try {
      const { getAdminAffiliatePayoutBatches } = await import('@/lib/actions/admin/payout-actions');
      const { batches } = await getAdminAffiliatePayoutBatches();
      
      if (batches) {
                 const existingForMonth = batches.find(b => 
           (b.batch_name || (b as any).name)?.includes(month) && 
           ['pending', 'verified', 'processing'].includes(b.status)
         );
        
        if (existingForMonth) {
          setExistingBatch(existingForMonth);
        }
      }
    } catch (err) {
      console.error('Error checking existing batches:', err);
    }
  }

  // Paginated eligible affiliates
  const paginatedEligibleAffiliates = useMemo(() => {
    if (!batch?.affiliate_payouts) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return batch.affiliate_payouts.slice(startIndex, startIndex + itemsPerPage);
  }, [batch?.affiliate_payouts, currentPage, itemsPerPage]);

  // Paginated ineligible affiliates
  const paginatedIneligibleAffiliates = useMemo(() => {
    if (!batch?.ineligible_affiliates) return [];
    const startIndex = (ineligiblePage - 1) * itemsPerPage;
    return batch.ineligible_affiliates.slice(startIndex, startIndex + itemsPerPage);
  }, [batch?.ineligible_affiliates, ineligiblePage, itemsPerPage]);

  const totalEligiblePages = Math.ceil((batch?.affiliate_payouts?.length || 0) / itemsPerPage);
  const totalIneligiblePages = Math.ceil((batch?.ineligible_affiliates?.length || 0) / itemsPerPage);

  const handleApproveBatch = async () => {
    if (!batch) return;
    
    setApproving(true);
    try {
      const adminUserId = '8f8f67ff-7a2c-4515-82d1-214bb8807932'; // Rob's admin ID - TODO: Get from session
      const result = await approveBatch({ adminUserId });
      
      if (result.success) {
        toast.success("✅ Batch Approved Successfully!", {
          description: `Payout batch for ₱${batch.total_amount.toLocaleString()} has been processed for ${batch.total_affiliates} affiliates.`,
        });
        
        // Refresh data to show updated state
        const refreshResult = await getBatchPreviewData();
        if (refreshResult.batch) {
          setBatch(refreshResult.batch);
        }
      } else {
        toast.error("Batch Approval Failed", {
          description: result.error || "Failed to approve batch",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred during batch approval",
      });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
      </div>
    );
  }
  
  if (error || !batch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error Loading Batch</h2>
          <p className="text-muted-foreground">{error || 'No batch data available'}</p>
          <Link href="/admin/affiliates/monthly-preview">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Monthly Preview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
          <Link href="/admin/affiliates/monthly-preview">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
              Back
          </Button>
        </Link>
          <div>
          <h1 className="text-2xl font-bold">Batch Preview - {batch.month}</h1>
          <p className="text-muted-foreground">
              Final review before processing payouts
          </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          {batch.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.total_affiliates}</div>
            <p className="text-xs text-muted-foreground">
              ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₱{batch.total_amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              in commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{batch.cleared_conversions}</div>
            <p className="text-xs text-muted-foreground">
              cleared this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {batch.requires_manual_review ? (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${batch.requires_manual_review ? 'text-orange-600' : 'text-green-600'}`}>
              {batch.requires_manual_review ? 'Review' : 'Ready'}
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.requires_manual_review ? 'needs attention' : 'for approval'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Force Mode Toggle - Testing Only */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="h-5 w-5" />
              Testing Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="forceMode"
                checked={forceMode}
                onChange={(e) => setForceMode(e.target.checked)}
                className="rounded border-yellow-300"
              />
              <label htmlFor="forceMode" className="text-sm text-yellow-800">
                Enable Force Approval (bypasses existing batch checks)
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Section */}
      {/* Show approval section ONLY if no existing batch exists AND all validations pass OR force mode enabled */}
      {(forceMode || (!existingBatch && batch.total_affiliates > 0 && batch.flagged_conversions === 0)) && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="h-5 w-5" />
              {forceMode ? 'Force Approval Mode' : 'Ready for Approval'}
            </CardTitle>
            <p className="text-sm text-green-800">
              {forceMode 
                ? '⚠️ TESTING: This will create a new batch even if one exists for this period.'
                : 'This batch is ready to be processed. All affiliates have been validated and are eligible for payout.'
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">
                  ₱{batch.total_amount.toLocaleString()} for {batch.total_affiliates} affiliates
                </p>
                <p className="text-sm text-green-700">
                  Payments will be processed via GCash to their registered payment methods
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={approving}
                  >
                    {approving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve Batch
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Batch for ₱{batch.total_amount.toLocaleString()}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will process payouts for {batch.total_affiliates} affiliates. 
                      Payments will be sent immediately via GCash. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleApproveBatch}
                      disabled={approving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approving ? "Processing..." : "Approve Batch"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Batch Warning - Industry Best Practice */}
      {existingBatch && !forceMode && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Batch Already Exists for {batch.month}
            </CardTitle>
            <p className="text-sm text-orange-800">
              A payout batch for this period has already been created and cannot be duplicated.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                                     <p className="font-medium text-gray-900">
                     {existingBatch.batch_name || (existingBatch as any).name} - {existingBatch.status.toUpperCase()}
                   </p>
                   <p className="text-sm text-gray-600">
                     ₱{existingBatch.total_amount?.toLocaleString()} • {existingBatch.payout_count || (existingBatch as any).affiliate_count} payouts
                   </p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(existingBatch.created_at || '').toLocaleDateString()}
                    {existingBatch.processed_at && (
                      <> • Processed: {new Date(existingBatch.processed_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <Link href="/admin/affiliates/payouts/monitoring">
                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    <Activity className="mr-2 h-4 w-4" />
                    View Status
                  </Button>
                </Link>
              </div>
              <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded-lg">
                <strong>Industry Best Practice:</strong> Only one batch per period is allowed to prevent duplicate payments 
                and maintain financial integrity. Review the existing batch status before creating new ones.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flagged Conversions Warning */}
      {batch.flagged_conversions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Cannot Approve Batch
            </CardTitle>
            <p className="text-sm text-orange-800">
              This batch cannot be processed until flagged conversions are reviewed and resolved.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg text-orange-900">
                  {batch.flagged_conversions} flagged conversion{batch.flagged_conversions > 1 ? 's' : ''} require review
                </p>
                <p className="text-sm text-orange-700">
                  Review each flagged conversion and approve or reject them before processing the batch.
                </p>
                  </div>
              <Link href="/admin/affiliates/conversions/list?status=flagged">
                <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                      Review Flags
                    </Button>
                  </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affiliate List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payout Recipients ({batch.total_affiliates})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batch.affiliate_payouts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEligibleAffiliates.map((affiliate: any) => (
                    <TableRow 
                      key={affiliate.affiliate_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/admin/affiliates/${affiliate.affiliate_id}`}
                    >
                      <TableCell>
                      <div>
                          <div className="font-medium">{affiliate.affiliate_name}</div>
                          <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                      </div>
                      </TableCell>
                      <TableCell className="text-right">{affiliate.conversions_count}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{affiliate.total_commission.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {affiliate.payout_method === 'gcash' ? 'GCash' : 'Bank Transfer'}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/admin/affiliates/${affiliate.affiliate_id}`}>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination for eligible affiliates */}
              {totalEligiblePages > 1 && (
                <div className="mt-4">
                  <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalEligiblePages}
                    onPageChange={setCurrentPage}
                  />
          </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No affiliates in this batch</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ineligible Affiliates (if any) */}
      {batch.ineligible_affiliates && batch.ineligible_affiliates.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Ineligible Affiliates ({batch.ineligible_affiliates.length})
          </CardTitle>
            <p className="text-sm text-orange-800">
              ₱{batch.validation_summary?.total_ineligible_amount.toLocaleString()} will rollover to next month
          </p>
        </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paginatedIneligibleAffiliates.map((affiliate: any) => (
                <Link 
                  key={affiliate.affiliate_id} 
                  href={`/admin/affiliates/${affiliate.affiliate_id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50 transition-colors cursor-pointer">
                    <div>
                      <div className="font-medium">{affiliate.affiliate_name}</div>
                      <div className="text-sm text-muted-foreground">{affiliate.rejection_reasons[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₱{affiliate.total_commission.toLocaleString()}</div>
                      <div className="text-sm text-orange-600">Will rollover</div>
            </div>
          </div>
                </Link>
              ))}
              
              {/* Pagination for ineligible affiliates */}
              {totalIneligiblePages > 1 && (
                <div className="mt-4">
                  <SimplePagination
                    currentPage={ineligiblePage}
                    totalPages={totalIneligiblePages}
                    onPageChange={setIneligiblePage}
                  />
              </div>
              )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

export default function BatchPreviewPage() {
  return (
      <div className="flex-1 space-y-6 p-6">
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      }>
        <BatchPreviewContent />
      </Suspense>
      </div>
  );
} 