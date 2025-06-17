'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  ChevronLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Users,
  Zap,
  Play,
  Eye
} from "lucide-react";
import { 
  getAdminAffiliatePayoutBatches,
  getAdminAffiliatePayoutBatchStats 
} from "@/lib/actions/admin/payout-actions";
import { AdminPayoutBatch, PayoutBatchStats } from "@/types/admin/affiliate";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface ProcessingQueue {
  pending_batches: number;
  processing_batches: number;
  failed_batches: number;
  avg_processing_time: string;
  last_processed_at: string | null;
  queue_health: 'healthy' | 'warning' | 'critical';
}

interface SystemMetrics {
  auto_clearing_enabled: boolean;
  last_auto_clear: string | null;
  next_auto_clear: string | null;
  pending_conversions: number;
  cleared_today: number;
  flagged_today: number;
}

export default function PayoutMonitoringPage() {
  const [batches, setBatches] = useState<AdminPayoutBatch[]>([]);
  const [stats, setStats] = useState<PayoutBatchStats | null>(null);
  const [queue, setQueue] = useState<ProcessingQueue | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [testingCron, setTestingCron] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [verificationBatch, setVerificationBatch] = useState<string | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [syncingBatch, setSyncingBatch] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [batchResult, statsResult] = await Promise.all([
        getAdminAffiliatePayoutBatches(),
        getAdminAffiliatePayoutBatchStats()
      ]);

      if (batchResult.error || statsResult.error) {
        setError(batchResult.error || statsResult.error || 'Failed to load data');
      } else {
        setBatches(batchResult.batches || []);
        setStats(statsResult.stats);
        
                 // Calculate queue metrics from batch data
         const recentBatches = (batchResult.batches || []).filter(b => 
           b.created_at && new Date(b.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
         );
        
                 const processingTimes = recentBatches
           .filter(b => b.processed_at && b.created_at)
           .map(b => new Date(b.processed_at!).getTime() - new Date(b.created_at!).getTime());
        
        const avgTime = processingTimes.length > 0 
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0;
        
        const queueData: ProcessingQueue = {
          pending_batches: (batchResult.batches || []).filter(b => b.status === 'pending').length,
          processing_batches: (batchResult.batches || []).filter(b => b.status === 'processing').length,
          failed_batches: (batchResult.batches || []).filter(b => b.status === 'failed').length,
          avg_processing_time: avgTime > 0 ? `${Math.round(avgTime / (1000 * 60))} min` : 'N/A',
                     last_processed_at: recentBatches.length > 0 ? (recentBatches[0].processed_at || null) : null,
          queue_health: recentBatches.filter(b => b.status === 'failed').length > 2 ? 'critical' : 
                       recentBatches.filter(b => b.status === 'processing').length > 5 ? 'warning' : 'healthy'
        };
        
        setQueue(queueData);
        
        // Mock system metrics (would be fetched from actual API)
        setMetrics({
          auto_clearing_enabled: true,
          last_auto_clear: '2024-12-19T02:00:00Z',
          next_auto_clear: '2024-12-20T02:00:00Z',
          pending_conversions: 45,
          cleared_today: 28,
          flagged_today: 2
        });
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getQueueHealthColor = () => {
    if (!queue) return 'text-gray-500';
    switch (queue.queue_health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getQueueHealthIcon = () => {
    if (!queue) return <Clock className="h-4 w-4" />;
    switch (queue.queue_health) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const testAutoClearingCron = async () => {
    setTestingCron(true);
    try {
      const response = await fetch('/api/cron/auto-clear-conversions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-secret'}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Auto-clearing test completed!\n\nResults:\n- Processed: ${result.results?.total_processed || 0}\n- Cleared: ${result.results?.cleared_count || 0}\n- Flagged: ${result.results?.flagged_count || 0}\n- Errors: ${result.results?.errors?.length || 0}`);
        // Refresh data after test
        loadData();
      } else {
        const error = await response.json();
        alert(`Test failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Test failed: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setTestingCron(false);
    }
  };

  const verifyBatch = async (batchId: string) => {
    setVerificationBatch(batchId);
    setIsVerificationDialogOpen(true);
  };

  const processBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to process this batch? This will trigger actual disbursements via Xendit.')) {
      return;
    }

    setProcessingBatch(true);
    try {
      const { processPayoutBatch } = await import('@/lib/actions/admin/payout-actions');
      const result = await processPayoutBatch(batchId, '8f8f67ff-7a2c-4515-82d1-214bb8807932'); // Rob's admin ID
      
      if (result.success) {
        toast.success('Batch processed successfully');
        loadData();
      } else {
        toast.error(`Failed to process batch: ${result.error}`);
      }
    } catch (error) {
      console.error('Process batch error:', error);
      toast.error('Failed to process batch');
    } finally {
      setProcessingBatch(false);
    }
  };

  // New function to manually sync Xendit status
  const syncPayoutStatus = async (batchId: string) => {
    if (!confirm('Sync payout statuses with Xendit? This will check the current status of all payouts in this batch.')) {
      return;
    }

    setSyncingBatch(true);
    try {
      // First, fetch payouts for this batch directly using getPayoutHistory which supports batchId
      const { getPayoutHistory } = await import('@/lib/actions/admin/payout-actions');
      const payoutsResult = await getPayoutHistory({
        filters: { batchId },
        pagination: { page: 1, pageSize: 100 } // Get all payouts for this batch
      });

      if (payoutsResult.error) {
        toast.error(`Failed to fetch payouts: ${payoutsResult.error}`);
        return;
      }

      if (!payoutsResult.data || payoutsResult.data.length === 0) {
        toast.error('No payouts found for this batch');
        return;
      }

      // Filter payouts that have Xendit disbursement IDs
      const payoutIdsWithXendit = payoutsResult.data
        .filter(p => p.xendit_disbursement_id)
        .map(p => p.payout_id);

      if (payoutIdsWithXendit.length === 0) {
        toast.error('No payouts found with Xendit disbursement IDs');
        return;
      }

      const { syncXenditPayoutStatus } = await import('@/lib/actions/admin/payout-actions');
      const result = await syncXenditPayoutStatus({
        payoutIds: payoutIdsWithXendit,
        adminUserId: '8f8f67ff-7a2c-4515-82d1-214bb8807932' // Rob's admin ID
      });
      
      if (result.error) {
        toast.error(`Failed to sync status: ${result.error}`);
      } else {
        const updatedCount = result.updated.length;
        const errorCount = result.errors.length;
        
        if (updatedCount > 0) {
          toast.success(`Successfully synced ${updatedCount} payout(s). ${errorCount > 0 ? `${errorCount} errors.` : ''}`);
        } else {
          toast.success('All payouts are already synchronized with Xendit');
        }
        
        // Log detailed results for debugging
        console.log('Sync results:', {
          updated: result.updated,
          errors: result.errors
        });
        
        loadData(); // Refresh the data
      }
    } catch (error) {
      console.error('Sync status error:', error);
      toast.error('Failed to sync payout status');
    } finally {
      setSyncingBatch(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/affiliates/conversions">
            <ChevronLeft className="h-4 w-4" />
            Back to Conversions & Payouts
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        heading="Batch Processing Monitor"
        description="Real-time monitoring of payout batch processing and system health"
      >
        <div className="flex items-center gap-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="text-xs text-muted-foreground">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </div>
        </div>
      </AdminPageHeader>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
          Error: {error}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing Queue</TabsTrigger>
          <TabsTrigger value="automation">Automation Status</TabsTrigger>
        </TabsList>

        {/* System Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
                {getQueueHealthIcon()}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getQueueHealthColor()}`}>
                  {queue?.queue_health?.toUpperCase() || 'Loading...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {queue?.processing_batches || 0} processing now
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Batches</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {queue?.pending_batches || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.totalBatches || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Batches</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {queue?.failed_batches || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Batch Activity
              </CardTitle>
              <CardDescription>
                Latest payout batches and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.slice(0, 10).map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-sm">
                          {batch.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          ₱{Number(batch.total_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {batch.status === "pending" && (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          {batch.status === "processing" && (
                            <Badge variant="secondary">Processing</Badge>
                          )}
                          {batch.status === "completed" && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200" variant="outline">
                              Completed
                            </Badge>
                          )}
                          {batch.status === "failed" && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.created_at ? 
                            format(new Date(batch.created_at), "MMM d, HH:mm") :
                            "N/A"}
                        </TableCell>
                        <TableCell>
                          {batch.processed_at ? 
                            format(new Date(batch.processed_at), "MMM d, HH:mm") :
                            "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {batch.status === "verified" && (
                              <Button
                                size="sm"
                                onClick={() => processBatch(batch.id)}
                                disabled={processingBatch}
                                className="gap-1"
                              >
                                <Play className="h-3 w-3" />
                                Process
                              </Button>
                            )}
                            {batch.status === "processing" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => syncPayoutStatus(batch.id)}
                                disabled={syncingBatch}
                                className="gap-1"
                              >
                                <RefreshCw className={`h-3 w-3 ${syncingBatch ? 'animate-spin' : ''}`} />
                                Sync Status
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="gap-1"
                            >
                              <Link href={`/admin/affiliates/payouts/batches/${batch.id}`}>
                                <Eye className="h-3 w-3" />
                                View Details
                              </Link>
                            </Button>
                            {batch.status === "pending" && (
                              <span className="text-xs text-muted-foreground">
                                Needs verification
                              </span>
                            )}
                            {batch.status === "completed" && (
                              <span className="text-xs text-muted-foreground">
                                Complete
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {batches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No batches found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Queue */}
        <TabsContent value="processing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Processing Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                  <span className="text-sm font-medium">{queue?.avg_processing_time || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Processed</span>
                  <span className="text-sm font-medium">
                    {queue?.last_processed_at ? 
                      format(new Date(queue.last_processed_at), "MMM d, HH:mm") : 
                      'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Queue Status</span>
                  <span className={`text-sm font-medium ${getQueueHealthColor()}`}>
                    {queue?.queue_health?.toUpperCase() || 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Processing Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-sm font-medium text-blue-600">{queue?.pending_batches || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Processing</span>
                  <span className="text-sm font-medium text-yellow-600">{queue?.processing_batches || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <span className="text-sm font-medium text-red-600">{queue?.failed_batches || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">System Load</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Processes</span>
                  <span className="text-sm font-medium">{queue?.processing_batches || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Queue Length</span>
                  <span className="text-sm font-medium">{queue?.pending_batches || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Capacity</span>
                  <span className="text-sm font-medium text-green-600">Normal</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processing Queue Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Processing Queue</CardTitle>
              <CardDescription>
                Batches currently in the processing pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Affiliates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.filter(b => b.status === 'processing' || b.status === 'pending').map((batch) => {
                      const processingTime = batch.status === 'processing' && batch.created_at
                        ? Math.round((new Date().getTime() - new Date(batch.created_at).getTime()) / (1000 * 60))
                        : 0;
                      
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono text-sm">
                            {batch.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="font-medium">
                            ₱{Number(batch.total_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {batch.payout_count || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {batch.status === "pending" && (
                              <Badge variant="outline">Pending</Badge>
                            )}
                            {batch.status === "processing" && (
                              <Badge variant="secondary">Processing</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {batch.status === 'processing' ? `${processingTime} min` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {batches.filter(b => b.status === 'processing' || b.status === 'pending').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No batches currently processing
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Status */}
        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto-Clearing Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto-Clearing System
                </CardTitle>
                <CardDescription>
                  Automated conversion clearing status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge variant={metrics?.auto_clearing_enabled ? "default" : "secondary"}>
                    {metrics?.auto_clearing_enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Run</span>
                  <span className="text-sm font-medium">
                    {metrics?.last_auto_clear ? 
                      format(new Date(metrics.last_auto_clear), "MMM d, HH:mm") : 
                      'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Run</span>
                  <span className="text-sm font-medium">
                    {metrics?.next_auto_clear ? 
                      format(new Date(metrics.next_auto_clear), "MMM d, HH:mm") : 
                      'Not scheduled'}
                  </span>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Conversions</span>
                    <span className="text-sm font-medium">{metrics?.pending_conversions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cleared Today</span>
                    <span className="text-sm font-medium text-green-600">{metrics?.cleared_today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Flagged Today</span>
                    <span className="text-sm font-medium text-red-600">{metrics?.flagged_today || 0}</span>
                  </div>
                </div>
                
                {/* Manual Test Button */}
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testAutoClearingCron}
                    disabled={testingCron}
                    className="w-full gap-2"
                  >
                    <Play className={`h-4 w-4 ${testingCron ? 'animate-spin' : ''}`} />
                    {testingCron ? 'Running Test...' : 'Test Auto-Clearing Now'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Manually trigger the auto-clearing process for testing
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Batch Automation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Batch Automation
                </CardTitle>
                <CardDescription>
                  Automated batch creation and processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Monthly Batches</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Auto-Create</span>
                  <span className="text-sm font-medium">5 days before month-end</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Auto-Approve</span>
                  <span className="text-sm font-medium">Under ₱10,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Processing</span>
                  <span className="text-sm font-medium">Manual approval required</span>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Next batch creation estimated for: <br />
                    <span className="font-medium text-foreground">
                      {format(new Date(2024, 11, 26), "MMMM d, yyyy")} (End of December)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cron Jobs Status */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>
                Status of all automated background processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-Clear Conversions</h4>
                    <p className="text-sm text-muted-foreground">Daily at 2:00 AM UTC</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Active</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {metrics?.last_auto_clear ? format(new Date(metrics.last_auto_clear), "MMM d, HH:mm") : 'Never'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Batch Creation</h4>
                    <p className="text-sm text-muted-foreground">Monthly, 5 days before month-end</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Active</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next: Dec 26, 2024
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Verification Cleanup</h4>
                    <p className="text-sm text-muted-foreground">Weekly cleanup of expired verifications</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Active</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: Dec 15, 2024
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 