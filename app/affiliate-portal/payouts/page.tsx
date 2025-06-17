'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ShoppingCart, Receipt, WalletCards, CreditCard, RefreshCcw, TrendingUp, Calendar } from 'lucide-react';
import { usePayoutsData, useAffiliateDashboard } from '@/lib/hooks/use-affiliate-dashboard';
import { useAffiliateConversions } from '@/lib/hooks/use-affiliate-conversions';
import { formatCurrencyPHP } from '@/lib/utils/formatting';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { DateRangeFilter } from '@/components/affiliate/dashboard/date-range-filter';

export default function PayoutsPage() {
  const { user } = useAuth();
  const { payoutTransactions, isLoadingPayouts, loadPayoutTransactions } = usePayoutsData();
  const { conversions, isLoading: isLoadingConversions } = useAffiliateConversions();
  const [conversionFilter, setConversionFilter] = useState('all');
  
  // Auto-load affiliate dashboard data - INDUSTRY BEST PRACTICE
  useAffiliateDashboard(user?.id || null);
  
  // Auto-load data on component mount - INDUSTRY BEST PRACTICE
  useEffect(() => {
    if (user?.id) {
      // Load payouts data automatically when user is available
      loadPayoutTransactions(user.id);
    }
  }, [user?.id, loadPayoutTransactions]);
  
  // Calculate meaningful stats from actual data
  const payoutStats = useMemo(() => {
    if (!payoutTransactions || payoutTransactions.length === 0) {
      return {
        totalPayouts: 0,
        lastPayoutDate: null,
        lastPayoutAmount: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalPaid: 0
      };
    }
    
    const paidTransactions = payoutTransactions.filter(t => t.status === 'paid' || t.status === 'sent');
    const pendingTransactions = payoutTransactions.filter(t => t.status === 'pending' || t.status === 'processing');
    
    const totalPaid = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingBalance = pendingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Get last payout (most recent paid transaction)
    const lastPayout = paidTransactions
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0];
    
    return {
      totalPayouts: paidTransactions.length,
      lastPayoutDate: lastPayout?.created_at || null,
      lastPayoutAmount: lastPayout?.amount || 0,
      availableBalance: 0, // This would come from cleared conversions not yet paid
      pendingBalance,
      totalPaid
    };
  }, [payoutTransactions]);
  
  const handleRefresh = async () => {
    if (user?.id) {
      await loadPayoutTransactions(user.id, true); // Force refresh
    }
  };

  // Filter conversions based on selected filter
  const filteredConversions = useMemo(() => {
    if (!conversions) return [];
    
    switch (conversionFilter) {
      case 'paid':
        return conversions.filter(c => c.status === 'cleared' || c.status === 'paid');
      case 'pending':
        return conversions.filter(c => c.status === 'pending');
      case 'flagged':
        return conversions.filter(c => c.status === 'flagged');
      default:
        return conversions;
    }
  }, [conversions, conversionFilter]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return formatCurrencyPHP(0);
    return formatCurrencyPHP(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sent</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case 'scheduled':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Scheduled</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
      case 'flagged':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Flagged</Badge>;
      case 'cleared':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Cleared</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Earnings & Payouts</h1>
            <p className="text-muted-foreground">
              Track your earnings, payouts, and conversion history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeFilter onFilterChange={handleRefresh} />
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoadingPayouts}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoadingPayouts ? 'animate-spin' : ''}`} />
              {isLoadingPayouts ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {/* Enhanced Summary Cards - Industry Best Practice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                <div className="bg-green-100 rounded-full p-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1 text-green-600">
                {formatCurrencyPHP(payoutStats.totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground">
                {payoutStats.totalPayouts} total payouts
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                <div className="bg-blue-100 rounded-full p-1">
                  <WalletCards className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">
                {formatCurrencyPHP(payoutStats.availableBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-amber-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-muted-foreground">Pending Balance</p>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrencyPHP(payoutStats.pendingBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                In processing period
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-muted-foreground">Last Payout</p>
                <div className="bg-purple-100 rounded-full p-1">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="text-lg font-bold mb-1">
                {payoutStats.lastPayoutDate ? formatDate(payoutStats.lastPayoutDate) : 'No payouts yet'}
              </div>
              <p className="text-xs text-muted-foreground">
                {payoutStats.lastPayoutAmount > 0 ? formatCurrencyPHP(payoutStats.lastPayoutAmount) : 'Amount: ₱0.00'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History with Refresh Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoadingPayouts}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoadingPayouts ? 'animate-spin' : ''}`} />
            {isLoadingPayouts ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        <Tabs defaultValue="payouts" className="w-full">
          <TabsList>
            <TabsTrigger value="payouts">
              <Receipt className="h-4 w-4 mr-2" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger value="conversions">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Conversions History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payout Transaction History</CardTitle>
                <CardDescription>
                  Complete record of all your payout transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutTransactions && payoutTransactions.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {formatDate(transaction.created_at)}
                            </TableCell>
                            <TableCell>
                              {transaction.reference || `Payout #${transaction.id.slice(0, 8)}`}
                            </TableCell>
                            <TableCell>
                              {transaction.type || "Payment"}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transaction.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No payout history yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Your payout transactions will appear here once you start earning commissions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="conversions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Conversion History</CardTitle>
                    <CardDescription>
                      Detailed record of your affiliate conversions and their status
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filter:</span>
                    <Select value={conversionFilter} onValueChange={setConversionFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid Only</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="flagged">Flagged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingConversions ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading conversions...</p>
                  </div>
                ) : filteredConversions && filteredConversions.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConversions.map((conversion) => (
                          <TableRow key={conversion.id}>
                            <TableCell className="font-medium">
                              {formatDate(conversion.created_at)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {conversion.order_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(conversion.commission_amount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(conversion.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                      {conversionFilter === 'all' ? 'No conversions yet' : `No ${conversionFilter} conversions`}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      {conversionFilter === 'all' 
                        ? 'Your affiliate conversions will appear here once customers make purchases through your links.'
                        : `No conversions with ${conversionFilter} status found. Try changing the filter to see other conversions.`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
