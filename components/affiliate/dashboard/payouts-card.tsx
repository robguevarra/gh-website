'use client';

import { useState } from 'react';
import { DollarSign, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayoutsData } from '@/lib/hooks/use-affiliate-dashboard';

export function PayoutsCard() {
  const { 
    payouts, 
    payoutSummary, 
    isLoadingPayouts, 
    loadPayoutTransactions,
    payoutsLastUpdated
  } = usePayoutsData();

  const handleRefresh = () => {
    loadPayoutTransactions();
  };

  const formatLastUpdated = () => {
    if (!payoutsLastUpdated) return 'Never updated';
    
    const now = new Date();
    const updated = new Date(payoutsLastUpdated);
    const diffMinutes = Math.round((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Earnings & Payouts</CardTitle>
          <CardDescription>Track your affiliate earnings and payout history</CardDescription>
        </div>
        <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={isLoadingPayouts}>
          <RefreshCcw className={`h-4 w-4 ${isLoadingPayouts ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingPayouts ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-800">Available Balance</p>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-blue-900">
                    {formatCurrency(payoutSummary?.availableBalance)}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Ready to be paid out on next cycle
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-800">Total Paid</p>
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-green-900">
                    {formatCurrency(payoutSummary?.totalPaid)}
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    All time earnings paid out
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-purple-800">Pending Earnings</p>
                    <DollarSign className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-purple-900">
                    {formatCurrency(payoutSummary?.pendingEarnings)}
                  </p>
                  <p className="mt-1 text-xs text-purple-700">
                    Still in clearance period
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Transaction History</h3>
              
              {payouts && payouts.length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {formatDate(payout.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {payout.reference || `Payout #${payout.id.slice(0, 8)}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(payout.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payout.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No payout history yet</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your payout transactions will appear here once you start earning commissions.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800">Next Payout Information</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p><strong>Next Payout Date:</strong> {payoutSummary?.nextPayoutDate || 'Not scheduled'}</p>
                <p><strong>Minimum Threshold:</strong> {formatCurrency(payoutSummary?.minimumThreshold || 100)}</p>
                <p><strong>Payment Method:</strong> {payoutSummary?.paymentMethod || 'Not set'}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
        <div>Last updated: {formatLastUpdated()}</div>
        <div>Transactions: {payouts?.length || 0}</div>
      </CardFooter>
    </Card>
  );
}
