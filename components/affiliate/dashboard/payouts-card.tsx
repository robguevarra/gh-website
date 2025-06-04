'use client';

import { DollarSign, RefreshCcw, CreditCard, Calendar, ArrowRight, WalletCards, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayoutsData } from '@/lib/hooks/use-affiliate-dashboard';
import { useAffiliateDashboardStore, AffiliateDashboardStore } from '@/lib/stores/affiliate-dashboard';

export function PayoutsCard() {
  const { 
    payouts, 
    payoutSummary, 
    isLoadingPayouts, 
    loadPayoutTransactions,
    payoutsLastUpdated
  } = usePayoutsData();
  
  // Get affiliate profile to access membership level using a stable selector
  const affiliateProfile = useAffiliateDashboardStore((state: AffiliateDashboardStore) => state.affiliateProfile);

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
    if (amount === null || amount === undefined) return '₱0.00';
    return `₱${amount.toFixed(2)}`;
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline" className="border-blue-200 text-blue-800">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-blue-500" />
              Payouts
            </CardTitle>
            <CardDescription>Your earnings and transaction history</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingPayouts}
            className="h-8 gap-1"
          >
            <RefreshCcw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingPayouts ? (
          <div className="space-y-3">
            <Skeleton className="h-[125px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Card className="border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                    <div className="bg-blue-100 rounded-full p-1">
                      <WalletCards className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-2">
                    {formatCurrency(payoutSummary?.availableBalance || 0)}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Ready for withdrawal
                    </p>
                    {affiliateProfile?.membershipLevel && (
                      <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        <Award className="h-3 w-3" />
                        <span>{affiliateProfile.membershipLevel.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Pending Balance</p>
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(payoutSummary?.pendingBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In processing period
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Transaction History
              </h3>
              
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
                <div className="text-center py-10 border rounded-md bg-gray-50">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No payout history yet</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    Your payout transactions will appear here once you start earning commissions.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Card className="border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Next Payout Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Payout Date:</span>
                      <span className="font-medium">{payoutSummary?.nextPayoutDate || 'Not scheduled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum Threshold:</span>
                      <span className="font-medium">{formatCurrency(payoutSummary?.minimumThreshold || 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span className="font-medium">{payoutSummary?.paymentMethod || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission Rate:</span>
                      <span className="font-medium">
                        {affiliateProfile?.membershipLevel 
                          ? `${(affiliateProfile.membershipLevel.commissionRate * 100).toFixed(0)}%` 
                          : `${(affiliateProfile?.commissionRate || 0) * 100}%`}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button variant="ghost" size="sm" className="w-full justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <span>Payment Settings</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <RefreshCcw className="h-3 w-3" />
          Last updated: {formatLastUpdated()}
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Transactions: {payouts?.length || 0}
        </div>
      </CardFooter>
    </Card>
  );
}
