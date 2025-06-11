'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Activity,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  BarChart3,
  Users,
  CreditCard,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Import server actions for monitoring data
import { 
  getAdminAffiliatePayoutBatchStats,
  exportPayoutData
} from '@/lib/actions/admin/payout-actions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';
import { PayoutStatusType, AdminAffiliatePayout } from '@/types/admin/affiliate';
import PayoutNavTabs from '@/components/admin/affiliates/payouts/payout-nav-tabs';

// Monitoring metrics interface
interface PayoutMonitoringMetrics {
  totalPayouts: number;
  pendingPayouts: number;
  processingPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  pendingAmount: number;
  processingAmount: number;
  completedAmount: number;
  failedAmount: number;
  averageProcessingTime: number;
  successRate: number;
}

// Real-time status interface
interface PayoutStatus {
  id: string;
  affiliate_name: string;
  amount: number;
  status: PayoutStatusType;
  created_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export default function PayoutMonitoringPage() {
  // State management for dashboard data
  const [metrics, setMetrics] = useState<PayoutMonitoringMetrics | null>(null);
  const [recentPayouts, setRecentPayouts] = useState<AdminAffiliatePayout[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<AdminAffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [statusFilter, setStatusFilter] = useState<PayoutStatusType | 'all'>('all');
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  /**
   * Load monitoring metrics and dashboard data
   */
  const loadMonitoringData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Build filters for API calls
      const filters = {
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(dateRange?.from && { dateFrom: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { dateTo: format(dateRange.to, 'yyyy-MM-dd') }),
        ...(paymentMethodFilter && paymentMethodFilter !== 'all' && { payoutMethod: paymentMethodFilter }),
      };

      // Fetch payout history with current filters
      const historyParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy: 'created_at',
        sortDirection: 'desc',
        ...filters
      });

      const historyResponse = await fetch(`/api/admin/affiliate/payouts?${historyParams}`);
      const historyResult = await historyResponse.json();

      if (!historyResponse.ok || historyResult.error) {
        throw new Error(historyResult.error || 'Failed to fetch payout history');
      }

      setPayoutHistory(historyResult.data);
      setTotalCount(historyResult.totalCount);

      // Fetch recent payouts (last 24 hours) for real-time monitoring
      const recentParams = new URLSearchParams({
        page: '1',
        pageSize: '20',
        sortBy: 'created_at',
        sortDirection: 'desc',
        dateFrom: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
        dateTo: format(new Date(), 'yyyy-MM-dd')
      });

      const recentResponse = await fetch(`/api/admin/affiliate/payouts?${recentParams}`);
      const recentResult = await recentResponse.json();

      if (!recentResponse.ok || recentResult.error) {
        console.error('Error fetching recent payouts:', recentResult.error);
      } else {
        setRecentPayouts(recentResult.data);
      }

      // Calculate metrics from all history data (no pagination)
      const allHistoryParams = new URLSearchParams({
        page: '1',
        pageSize: '10000', // Large page for metrics calculation
        sortBy: 'created_at',
        sortDirection: 'desc',
        ...filters
      });

      const allHistoryResponse = await fetch(`/api/admin/affiliate/payouts?${allHistoryParams}`);
      const allHistoryResult = await allHistoryResponse.json();

      if (allHistoryResponse.ok && !allHistoryResult.error) {
        const allPayouts = allHistoryResult.data;
        const calculatedMetrics = calculateMetrics(allPayouts);
        setMetrics(calculatedMetrics);
      }

      // Log monitoring access for audit trail
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: 'Accessed payout monitoring dashboard',
        details: { 
          filters,
          total_payouts_viewed: historyResult.totalCount
        }
      });

    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error('Failed to load monitoring data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Calculate monitoring metrics from payout data
   */
  const calculateMetrics = (payouts: AdminAffiliatePayout[]): PayoutMonitoringMetrics => {
    const metrics = {
      totalPayouts: payouts.length,
      pendingPayouts: 0,
      processingPayouts: 0,
      completedPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      pendingAmount: 0,
      processingAmount: 0,
      completedAmount: 0,
      failedAmount: 0,
      averageProcessingTime: 0,
      successRate: 0
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    payouts.forEach(payout => {
      metrics.totalAmount += payout.amount || 0;

      switch (payout.status) {
        case 'pending':
          metrics.pendingPayouts++;
          metrics.pendingAmount += payout.amount || 0;
          break;
        case 'processing':
          metrics.processingPayouts++;
          metrics.processingAmount += payout.amount || 0;
          break;
        case 'sent':
        case 'completed':
          metrics.completedPayouts++;
          metrics.completedAmount += payout.amount || 0;
          
          // Calculate processing time for completed payouts
          if (payout.created_at && payout.processed_at) {
            const created = new Date(payout.created_at);
            const processed = new Date(payout.processed_at);
            const processingTime = processed.getTime() - created.getTime();
            totalProcessingTime += processingTime;
            processedCount++;
          }
          break;
        case 'failed':
          metrics.failedPayouts++;
          metrics.failedAmount += payout.amount || 0;
          break;
      }
    });

    // Calculate averages and rates
    metrics.averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount / (1000 * 60 * 60) : 0; // Hours
    metrics.successRate = metrics.totalPayouts > 0 ? 
      ((metrics.completedPayouts) / metrics.totalPayouts) * 100 : 0;

    return metrics;
  };

  /**
   * Export payout data with current filters
   */
  const handleExport = async (exportFormat: 'csv' | 'json' = 'csv') => {
    setExporting(true);
    try {
      const filters = {
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(dateRange?.from && { dateFrom: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { dateTo: format(dateRange.to, 'yyyy-MM-dd') }),
        ...(paymentMethodFilter && paymentMethodFilter !== 'all' && { payoutMethod: paymentMethodFilter }),
      };

      const result = await exportPayoutData({
        format: exportFormat,
        filters,
        includeDetails: true
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Create download blob and trigger download
      const blob = new Blob([result.data!], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Payout data exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Refresh dashboard data
   */
  const handleRefresh = () => {
    loadMonitoringData(true);
  };

  /**
   * Apply filters and reload data
   */
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters change
    loadMonitoringData();
  };

  // Load initial data
  useEffect(() => {
    loadMonitoringData();
  }, [currentPage]); // Reload when page changes

  // Auto-refresh every 30 seconds for real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        loadMonitoringData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, refreshing]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format processing time helper
  const formatProcessingTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: PayoutStatusType }) => {
    const variants: Record<PayoutStatusType, { variant: any; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      processing: { variant: 'default', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      sent: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
    };

    const config = variants[status];
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/affiliates">Affiliates</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/affiliates/payouts">Payouts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Monitoring</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/affiliates/payouts">
            <ChevronLeft className="h-4 w-4" />
            Back to Payouts
          </Link>
        </Button>
      </div>

      {/* Payout Navigation Tabs */}
      <PayoutNavTabs />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payout Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for affiliate payout operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('json')}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker 
                value={dateRange} 
                onChange={(date) => setDateRange(date || { from: undefined, to: undefined })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PayoutStatusType | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="xendit">Xendit</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Affiliate Search</label>
              <Input
                placeholder="Search by affiliate name..."
                value={affiliateSearch}
                onChange={(e) => setAffiliateSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={applyFilters} className="w-full md:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      {loading && !metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.totalAmount)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.pendingPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.pendingAmount)} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.processingPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.processingAmount)} processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.completedPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.completedAmount)} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failedPayouts}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.failedAmount)} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Processing success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatProcessingTime(metrics.averageProcessingTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average completion time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Affiliates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(payoutHistory.map(p => p.affiliate_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique affiliates with payouts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="errors">Errors & Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Payouts (Last 24 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentPayouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent payouts in the last 24 hours
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPayouts.map((payout) => (
                    <div key={payout.payout_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={payout.status} />
                        <div>
                          <p className="font-medium">{payout.affiliate_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payout.amount || 0)}</p>
                        <p className="text-sm text-muted-foreground">{payout.payout_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Payout History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array(10).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : payoutHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payouts found with the current filters
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutHistory.map((payout) => (
                    <div key={payout.payout_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={payout.status} />
                        <div>
                          <p className="font-medium">{payout.affiliate_name}</p>
                          <p className="text-sm text-muted-foreground">{payout.affiliate_email}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payout.amount || 0)}</p>
                        <p className="text-sm text-muted-foreground">{payout.payout_method}</p>
                        {payout.processed_at && (
                          <p className="text-xs text-muted-foreground">
                            Processed: {format(new Date(payout.processed_at), 'MMM dd HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} payouts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage * pageSize >= totalCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error Analysis & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Failed payouts section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Failed Payouts</h3>
                  {payoutHistory.filter(p => p.status === 'failed').length === 0 ? (
                    <div className="text-center py-6 text-green-600">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      No failed payouts found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payoutHistory.filter(p => p.status === 'failed').map((payout) => (
                        <div key={payout.payout_id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-medium">{payout.affiliate_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Failed: {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                              {payout.processing_notes && (
                                <p className="text-sm text-red-600 mt-1">
                                  Error: {payout.processing_notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-red-600">{formatCurrency(payout.amount || 0)}</p>
                            <Badge variant="destructive">Action Required</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processing alerts */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Processing Alerts</h3>
                  {payoutHistory.filter(p => p.status === 'processing').length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No payouts currently processing
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payoutHistory.filter(p => p.status === 'processing').map((payout) => (
                        <div key={payout.payout_id} className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                            <div>
                              <p className="font-medium">{payout.affiliate_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Processing since: {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(payout.amount || 0)}</p>
                            <Badge>In Progress</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 