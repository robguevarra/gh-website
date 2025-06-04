'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { PayoutsCard } from '@/components/affiliate/dashboard/payouts-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Banknote, CalendarDays, DollarSign, FileText, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePayoutsData } from '@/lib/hooks/use-affiliate-dashboard';

export default function PayoutsPage() {
  const { payoutTransactions, payoutProjection, isLoadingPayouts } = usePayoutsData();

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
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
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Earnings & Payouts</h1>
          <p className="text-muted-foreground">
            Track your earnings and manage payment information
          </p>
        </div>
        
        <PayoutsCard />

        <Tabs defaultValue="history" className="w-full">
          <TabsList>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="projections">Earnings Projections</TabsTrigger>
            <TabsTrigger value="settings">Payment Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Transaction History</CardTitle>
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
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No transaction history yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Your transactions will appear here once you start earning commissions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="projections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Projected Earnings</CardTitle>
                <CardDescription>
                  Estimated upcoming earnings based on your current performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPayouts ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading projections...</p>
                  </div>
                ) : payoutProjection ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-muted-foreground">This Month</p>
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(payoutProjection.thisMonth)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Projected for current month
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-muted-foreground">Next Month</p>
                            <CalendarDays className="h-4 w-4 text-purple-500" />
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(payoutProjection.nextMonth)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Projected for next month
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-muted-foreground">Next Payout</p>
                            <Banknote className="h-4 w-4 text-green-500" />
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(payoutProjection.nextPayout)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expected on {payoutProjection.nextPayoutDate || 'N/A'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>About Projections</AlertTitle>
                      <AlertDescription>
                        Projections are based on your historical performance and current trends. Actual earnings may vary.
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Growth Trends</h3>
                      <div className="border rounded-md p-6 flex items-center justify-center">
                        <div className="text-center">
                          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Detailed earnings trends charts will be available in the next update
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No projections available</h3>
                    <p className="text-muted-foreground mt-2">
                      Start generating affiliate sales to see earnings projections.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Manage your payment preferences and information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Payment Settings</h3>
                  <p className="text-muted-foreground mt-2 mb-6">
                    Payment preferences management will be available in a future update
                  </p>
                  <Alert className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Need to update payment info?</AlertTitle>
                    <AlertDescription>
                      Please contact support to update your payment details for now.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
