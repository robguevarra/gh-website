import { Metadata } from 'next';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  ArrowUpDown
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Financial Reports | Admin',
  description: 'Revenue and transaction metrics',
};

export default async function FinancialReportsPage() {
  const supabase = createServiceRoleClient();
  
  // Get payment data from Xendit
  const { data: recentTransactions } = await supabase
    .from('xendit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Count total payments
  const { count: totalPayments } = await supabase
    .from('xendit')
    .select('*', { count: 'exact', head: true });
  
  // Count successful payments
  const { count: successfulPayments } = await supabase
    .from('xendit')
    .select('*', { count: 'exact', head: true })
    .eq('Status', 'PAID');
  
  // Calculate success rate
  const successRate = totalPayments ? (successfulPayments || 0) / totalPayments * 100 : 0;
  
  // Calculate total revenue
  const { data: revenueData } = await supabase
    .from('xendit')
    .select('Amount')
    .eq('Status', 'PAID');
  
  const totalRevenue = revenueData?.reduce((sum: number, item: { Amount: number | null }) => 
    sum + (Number(item.Amount) || 0), 0) || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-muted-foreground">
            View and analyze revenue and payment data
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {successfulPayments || 0} successful payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {successfulPayments || 0} of {totalPayments || 0} payments successful
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Transaction
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{successfulPayments ? (totalRevenue / successfulPayments).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average successful payment amount
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="failed">Failed Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                The most recent payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">
                        {transaction.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>₱{Number(transaction.Amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {transaction.Status === 'PAID' ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span className="text-green-600">Paid</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4 text-red-500" />
                              <span className="text-red-600">{transaction.Status}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.created_at
                          ? new Date(transaction.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{transaction.PaymentMethod || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                  {!recentTransactions?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" size="sm">
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>
                Revenue by product and time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">
                  Revenue breakdown charts will be implemented in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed Payments Analysis</CardTitle>
              <CardDescription>
                Analysis of payment failures and reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">
                  Failed payment analysis will be implemented in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 