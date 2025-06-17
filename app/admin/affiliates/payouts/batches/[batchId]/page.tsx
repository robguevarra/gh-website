'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  ChevronLeft,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Activity
} from "lucide-react";
import { 
  getPayoutHistory,
  syncXenditPayoutStatus 
} from "@/lib/actions/admin/payout-actions";
import { AdminAffiliatePayout } from "@/types/admin/affiliate";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface BatchDetails {
  id: string;
  name: string;
  status: string;
  total_amount: number;
  fee_amount: number;
  net_amount: number;
  affiliate_count: number;
  conversion_count: number;
  payout_method: string;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
}

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  
  const [payouts, setPayouts] = useState<AdminAffiliatePayout[]>([]);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingPayout, setSyncingPayout] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch payouts for this batch
      const payoutsResult = await getPayoutHistory({
        filters: { batchId },
        pagination: { page: 1, pageSize: 100 }
      });

      if (payoutsResult.error) {
        setError(payoutsResult.error);
        return;
      }

      setPayouts(payoutsResult.data || []);
      
      // Calculate batch details from payouts
      if (payoutsResult.data && payoutsResult.data.length > 0) {
        const firstPayout = payoutsResult.data[0];
        const totalAmount = payoutsResult.data.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalFeeAmount = payoutsResult.data.reduce((sum, p) => sum + Number(p.fee_amount || 0), 0);
        const totalNetAmount = payoutsResult.data.reduce((sum, p) => sum + Number(p.net_amount || 0), 0);
        const uniqueAffiliates = new Set(payoutsResult.data.map(p => p.affiliate_id)).size;
        
               setBatchDetails({
         id: batchId,
         name: `Batch ${batchId.substring(0, 8)}...`,
         status: firstPayout.status || 'unknown',
         total_amount: totalAmount,
         fee_amount: totalFeeAmount,
         net_amount: totalNetAmount,
         affiliate_count: uniqueAffiliates,
         conversion_count: payoutsResult.data.length,
         payout_method: firstPayout.payout_method || 'gcash',
         created_at: firstPayout.created_at || '',
         processed_at: firstPayout.processed_at || null,
         completed_at: null
       });
      }
      
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  const syncSinglePayout = async (payoutId: string) => {
    const payout = payouts.find(p => p.payout_id === payoutId);
    if (!payout?.xendit_disbursement_id) {
      toast.error('No Xendit disbursement ID found for this payout');
      return;
    }

    setSyncingPayout(payoutId);
    try {
      const result = await syncXenditPayoutStatus({
        payoutIds: [payoutId],
        adminUserId: '8f8f67ff-7a2c-4515-82d1-214bb8807932' // Rob's admin ID
      });
      
      if (result.error) {
        toast.error(`Failed to sync status: ${result.error}`);
      } else if (result.updated.length > 0) {
        const update = result.updated[0];
        toast.success(`Status updated: ${update.oldStatus} → ${update.newStatus}`);
        
        // Optimistic update: Update only this specific payout in state
        setPayouts(prevPayouts => 
          prevPayouts.map(p => 
            p.payout_id === payoutId 
              ? { 
                  ...p, 
                  status: update.newStatus as any,
                  processed_at: update.newStatus === 'paid' ? new Date().toISOString() : p.processed_at,
                  updated_at: new Date().toISOString()
                }
              : p
          )
        );

        // Also update batch details if needed (e.g., if all payouts are now completed)
        const updatedPayouts = payouts.map(p => 
          p.payout_id === payoutId 
            ? { ...p, status: update.newStatus as any }
            : p
        );
        
        // Check if batch status should be updated
        const allCompleted = updatedPayouts.every(p => p.status === 'paid' || p.status === 'completed');
        const hasProcessing = updatedPayouts.some(p => p.status === 'processing' || p.status === 'sent');
        
        if (batchDetails) {
          setBatchDetails(prev => prev ? {
            ...prev,
            status: allCompleted ? 'completed' : hasProcessing ? 'processing' : prev.status
          } : null);
        }
      } else {
        toast.success('Status is already up to date');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync payout status');
    } finally {
      setSyncingPayout(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200" variant="outline">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading batch details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
             <div className="container mx-auto p-6">
         <AdminPageHeader 
           heading="Batch Details" 
           description="Error loading batch information"
         />
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Batch</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Recalculate counts from current state for real-time updates
  const statusCounts = payouts.reduce((acc, payout) => {
    acc[payout.status] = (acc[payout.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const processingPayouts = payouts.filter(p => p.xendit_disbursement_id);
  const pendingPayouts = payouts.filter(p => !p.xendit_disbursement_id);

  return (
         <div className="container mx-auto p-6 space-y-6">
       <AdminPageHeader 
         heading={`Batch Details`} 
         description={`Detailed view of payout batch ${batchId.substring(0, 8)}...`}
       >
         <Button variant="outline" asChild>
           <Link href="/admin/affiliates/payouts/monitoring">
             <ChevronLeft className="h-4 w-4 mr-2" />
             Back to Monitoring
           </Link>
         </Button>
       </AdminPageHeader>

      {/* Batch Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{Number(batchDetails?.total_amount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Fees: ₱{Number(batchDetails?.fee_amount || 0).toLocaleString()} | 
              Net: ₱{Number(batchDetails?.net_amount || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts.length}</div>
            <p className="text-xs text-muted-foreground">
              {batchDetails?.affiliate_count || 0} affiliates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(batchDetails?.status || 'unknown')}
              {getStatusBadge(batchDetails?.status || 'unknown')}
            </div>
            <p className="text-xs text-muted-foreground">
              {batchDetails?.processed_at ? format(new Date(batchDetails.processed_at), "MMM d, HH:mm") : 'Not processed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingPayouts.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayouts.length} pending
              {syncingPayout && <span className="text-blue-600 animate-pulse"> • Syncing</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Current status of all payouts in this batch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="font-medium capitalize">{status}</span>
                </div>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Payouts</CardTitle>
          <CardDescription>
            Detailed breakdown of all payouts in this batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Xendit ID</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.payout_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payout.affiliate_name}</div>
                        <div className="text-sm text-muted-foreground">{payout.affiliate_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">₱{Number(payout.amount).toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Fee: ₱{Number(payout.fee_amount || 0).toLocaleString()} | 
                          Net: ₱{Number(payout.net_amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {syncingPayout === payout.payout_id ? (
                          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : (
                          getStatusIcon(payout.status)
                        )}
                        {syncingPayout === payout.payout_id ? (
                          <Badge variant="secondary" className="animate-pulse">
                            Syncing...
                          </Badge>
                        ) : (
                          getStatusBadge(payout.status)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payout.xendit_disbursement_id ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {payout.xendit_disbursement_id.substring(0, 20)}...
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(payout.xendit_disbursement_id!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not sent</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payout.payout_method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.created_at ? 
                        format(new Date(payout.created_at), "MMM d, HH:mm") : 
                        'N/A'}
                    </TableCell>
                    <TableCell>
                      {payout.processed_at ? 
                        format(new Date(payout.processed_at), "MMM d, HH:mm") : 
                        '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {payout.xendit_disbursement_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncSinglePayout(payout.payout_id)}
                            disabled={syncingPayout === payout.payout_id}
                            className="gap-1"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingPayout === payout.payout_id ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                        )}
                        {payout.xendit_disbursement_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://dashboard.xendit.co/disbursements/${payout.xendit_disbursement_id}`, '_blank')}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No payouts found in this batch
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 