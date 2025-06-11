'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Download, 
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  AlertCircle,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

// Import server actions
import { 
  getPayoutHistory,
  exportPayoutData,
  getAdminAffiliatePayoutBatchStats
} from '@/lib/actions/admin/payout-actions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';
import { PayoutStatusType, AdminAffiliatePayout } from '@/types/admin/affiliate';

// Report interfaces
interface PayoutReport {
  period: string;
  totalPayouts: number;
  totalAmount: number;
  averageAmount: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
}

interface AffiliatePayoutSummary {
  affiliate_id: string;
  affiliate_name: string;
  total_payouts: number;
  total_amount: number;
  average_payout: number;
  success_rate: number;
  last_payout_date?: string;
}

interface PaymentMethodSummary {
  payment_method: string;
  total_payouts: number;
  total_amount: number;
  success_rate: number;
  average_processing_time: number;
}

export default function PayoutReportsPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Report data
  const [timeSeriesReport, setTimeSeriesReport] = useState<PayoutReport[]>([]);
  const [affiliateReport, setAffiliateReport] = useState<AffiliatePayoutSummary[]>([]);
  const [paymentMethodReport, setPaymentMethodReport] = useState<PaymentMethodSummary[]>([]);
  const [rawPayoutData, setRawPayoutData] = useState<AdminAffiliatePayout[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [statusFilter, setStatusFilter] = useState<PayoutStatusType | 'all'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [affiliateSearch, setAffiliateSearch] = useState<string>('');

  /**
   * Load report data based on current filters
   */
  const loadReportData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // Build filters
      const filters = {
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(dateRange?.from && { dateFrom: format(dateRange.from, 'yyyy-MM-dd') }),
        ...(dateRange?.to && { dateTo: format(dateRange.to, 'yyyy-MM-dd') }),
        ...(paymentMethodFilter && paymentMethodFilter !== 'all' && { payoutMethod: paymentMethodFilter }),
      };

      // Fetch all payout data for analysis
      const payoutResult = await getPayoutHistory({
        filters,
        pagination: { page: 1, pageSize: 10000 }, // Large page for full data
        sort: { sortBy: 'created_at', sortDirection: 'desc' }
      });

      if (payoutResult.error) {
        throw new Error(payoutResult.error);
      }

      const payouts = payoutResult.data;
      setRawPayoutData(payouts);

      // Generate time series report
      const timeSeriesData = generateTimeSeriesReport(payouts, reportType);
      setTimeSeriesReport(timeSeriesData);

      // Generate affiliate summary report
      const affiliateData = generateAffiliateReport(payouts);
      setAffiliateReport(affiliateData);

      // Generate payment method report
      const paymentMethodData = generatePaymentMethodReport(payouts);
      setPaymentMethodReport(paymentMethodData);

      // Log report access
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: 'Generated payout reports',
        details: {
          filters,
          report_type: reportType,
          total_payouts: payouts.length,
          date_range: {
            from: dateRange?.from,
            to: dateRange?.to
          }
        }
      });

    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Generate time series report data
   */
  const generateTimeSeriesReport = (payouts: AdminAffiliatePayout[], type: 'daily' | 'weekly' | 'monthly'): PayoutReport[] => {
    const groups: { [key: string]: AdminAffiliatePayout[] } = {};

    payouts.forEach(payout => {
      let period: string;
      const date = new Date(payout.created_at);

      switch (type) {
        case 'daily':
          period = format(date, 'yyyy-MM-dd');
          break;
        case 'weekly':
          period = format(date, 'yyyy-\'Week\'w');
          break;
        case 'monthly':
          period = format(date, 'yyyy-MM');
          break;
      }

      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(payout);
    });

    return Object.entries(groups)
      .map(([period, periodPayouts]) => {
        const completedPayouts = periodPayouts.filter(p => p.status === 'sent');
        const failedPayouts = periodPayouts.filter(p => p.status === 'failed');
        const totalAmount = periodPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
          period,
          totalPayouts: periodPayouts.length,
          totalAmount,
          averageAmount: totalAmount / periodPayouts.length,
          completedCount: completedPayouts.length,
          failedCount: failedPayouts.length,
          successRate: periodPayouts.length > 0 ? (completedPayouts.length / periodPayouts.length) * 100 : 0
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  /**
   * Generate affiliate summary report
   */
  const generateAffiliateReport = (payouts: AdminAffiliatePayout[]): AffiliatePayoutSummary[] => {
    const groups: { [key: string]: AdminAffiliatePayout[] } = {};

    payouts.forEach(payout => {
      const key = payout.affiliate_id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(payout);
    });

    return Object.entries(groups)
      .map(([affiliateId, affiliatePayouts]) => {
        const completedPayouts = affiliatePayouts.filter(p => p.status === 'sent');
        const totalAmount = affiliatePayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        const latestPayout = affiliatePayouts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          affiliate_id: affiliateId,
          affiliate_name: latestPayout.affiliate_name || 'Unknown',
          total_payouts: affiliatePayouts.length,
          total_amount: totalAmount,
          average_payout: totalAmount / affiliatePayouts.length,
          success_rate: (completedPayouts.length / affiliatePayouts.length) * 100,
          last_payout_date: latestPayout.created_at
        };
      })
      .sort((a, b) => b.total_amount - a.total_amount);
  };

  /**
   * Generate payment method report
   */
  const generatePaymentMethodReport = (payouts: AdminAffiliatePayout[]): PaymentMethodSummary[] => {
    const groups: { [key: string]: AdminAffiliatePayout[] } = {};

    payouts.forEach(payout => {
      const method = payout.payout_method || 'Unknown';
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(payout);
    });

    return Object.entries(groups).map(([method, methodPayouts]) => {
      const completedPayouts = methodPayouts.filter(p => p.status === 'sent');
      const totalAmount = methodPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Calculate average processing time for completed payouts
      const processingTimes = completedPayouts
        .filter(p => p.processed_at)
        .map(p => {
          const created = new Date(p.created_at).getTime();
          const processed = new Date(p.processed_at!).getTime();
          return (processed - created) / (1000 * 60 * 60); // Hours
        });
      
      const avgProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      return {
        payment_method: method,
        total_payouts: methodPayouts.length,
        total_amount: totalAmount,
        success_rate: (completedPayouts.length / methodPayouts.length) * 100,
        average_processing_time: avgProcessingTime
      };
    });
  };

  /**
   * Handle report export
   */
  const handleExport = async (format: 'csv' | 'json', reportData: 'timeseries' | 'affiliate' | 'paymentmethod' | 'raw') => {
    setExporting(true);
    
    try {
      let dataToExport: any[] = [];
      let filename = '';

      switch (reportData) {
        case 'timeseries':
          dataToExport = timeSeriesReport;
          filename = `payout-timeseries-report-${format}`;
          break;
        case 'affiliate':
          dataToExport = affiliateReport;
          filename = `affiliate-payout-summary-${format}`;
          break;
        case 'paymentmethod':
          dataToExport = paymentMethodReport;
          filename = `payment-method-report-${format}`;
          break;
        case 'raw':
          dataToExport = rawPayoutData;
          filename = `raw-payout-data-${format}`;
          break;
      }

      const result = await exportPayoutData({
        payouts: dataToExport,
        format,
        filename,
        includeMetadata: true
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Create download link
      const blob = new Blob([result.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported successfully as ${format.toUpperCase()}`);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Format currency values
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  /**
   * Format percentage values
   */
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType, statusFilter, paymentMethodFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payout Reports</h1>
          <p className="text-muted-foreground">
            Detailed analytics and reports for affiliate payout processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadReportData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select value={reportType} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={(value: PayoutStatusType | '') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="timeseries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeseries" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Time Series
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            By Affiliate
          </TabsTrigger>
          <TabsTrigger value="methods" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            By Payment Method
          </TabsTrigger>
        </TabsList>

        {/* Time Series Report */}
        <TabsContent value="timeseries" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Time Series Analysis</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv', 'timeseries')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json', 'timeseries')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Total Payouts</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Average Amount</TableHead>
                      <TableHead>Success Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSeriesReport.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.period}</TableCell>
                        <TableCell>{report.totalPayouts}</TableCell>
                        <TableCell>{formatCurrency(report.totalAmount)}</TableCell>
                        <TableCell>{formatCurrency(report.averageAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={report.successRate >= 95 ? 'default' : report.successRate >= 85 ? 'secondary' : 'destructive'}>
                            {formatPercentage(report.successRate)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliate Report */}
        <TabsContent value="affiliates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Affiliate Summary</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv', 'affiliate')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json', 'affiliate')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Total Payouts</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Average Payout</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Last Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliateReport.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.affiliate_name}</TableCell>
                        <TableCell>{report.total_payouts}</TableCell>
                        <TableCell>{formatCurrency(report.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(report.average_payout)}</TableCell>
                        <TableCell>
                          <Badge variant={report.success_rate >= 95 ? 'default' : report.success_rate >= 85 ? 'secondary' : 'destructive'}>
                            {formatPercentage(report.success_rate)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.last_payout_date ? format(new Date(report.last_payout_date), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Report */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Method Analysis</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv', 'paymentmethod')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json', 'paymentmethod')}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Total Payouts</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Avg Processing Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodReport.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.payment_method}</TableCell>
                        <TableCell>{report.total_payouts}</TableCell>
                        <TableCell>{formatCurrency(report.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={report.success_rate >= 95 ? 'default' : report.success_rate >= 85 ? 'secondary' : 'destructive'}>
                            {formatPercentage(report.success_rate)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.average_processing_time > 0 
                            ? `${report.average_processing_time.toFixed(1)}h` 
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 