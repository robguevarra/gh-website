import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Calendar,
  DollarSign,
  Users,
  Activity,
  Shield,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { getAdminConversions, getConversionStats, getBatchPreviewData } from "@/lib/actions/admin/conversion-actions";

export const metadata: Metadata = {
  title: "Conversions & Payouts | Admin",
  description: "Review auto-created payout batches, fraud flags, and approve monthly payouts",
};

interface ConversionsPageProps {
  searchParams?: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

// Industry best practice: Monthly batch review workflow
async function BatchPreviewSection() {
  // Get real batch data instead of mock data
  const { batch } = await getBatchPreviewData();
  
  // Fallback to default values if no batch data
  const currentBatch = batch ? {
    month: batch.month,
    totalAffiliates: batch.total_affiliates,
    totalAmount: batch.total_amount,
    clearedConversions: batch.cleared_conversions,
    flaggedConversions: batch.flagged_conversions,
    status: batch.status,
    createdDate: batch.created_date,
    scheduledPayoutDate: batch.scheduled_payout_date
  } : {
    month: "June 2025",
    totalAffiliates: 0,
    totalAmount: 0,
    clearedConversions: 0,
    flaggedConversions: 0,
    status: "no_data",
    createdDate: new Date().toISOString().split('T')[0],
    scheduledPayoutDate: new Date().toISOString().split('T')[0]
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Package className="h-5 w-5" />
          Current Batch Preview - {currentBatch.month}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentBatch.totalAffiliates}</div>
            <p className="text-sm text-muted-foreground">Affiliates</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">₱{currentBatch.totalAmount.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Payout</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentBatch.clearedConversions}</div>
            <p className="text-sm text-muted-foreground">Cleared</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{currentBatch.flaggedConversions}</div>
            <p className="text-sm text-muted-foreground">Flagged</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Batch automatically created on {currentBatch.createdDate}</p>
              <p className="text-sm text-muted-foreground">
                Scheduled payout date: {currentBatch.scheduledPayoutDate}
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Ready for Review
            </Badge>
          </div>
        </div>

        {currentBatch.flaggedConversions > 0 && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-900">Action Required</span>
            </div>
            <p className="text-sm text-orange-800">
              {currentBatch.flaggedConversions} conversions need review before batch approval
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/admin/affiliates/batch-preview" className="flex-1">
            <Button className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              Preview Full Batch Details
            </Button>
          </Link>
          <Link 
            href="/admin/affiliates/conversions?status=flagged" 
            className={`flex-1 ${currentBatch.flaggedConversions === 0 ? 'pointer-events-none' : ''}`}
          >
            <Button 
              variant={currentBatch.flaggedConversions > 0 ? "outline" : "default"}
              disabled={currentBatch.flaggedConversions > 0}
              className="w-full"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {currentBatch.flaggedConversions > 0 ? "Review Flags First" : "Approve Batch"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

async function ConversionStatusStats() {
  const { stats } = await getConversionStats();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_pending || 0}</div>
          <p className="text-xs text-muted-foreground">
            New conversions awaiting processing
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Flagged for Review</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats?.total_flagged || 0}</div>
          <p className="text-xs text-muted-foreground">
            Fraud detection alerts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cleared for Payout</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats?.total_cleared || 0}</div>
          <p className="text-xs text-muted-foreground">
            Ready for batch processing
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats?.total_paid || 0}</div>
          <p className="text-xs text-muted-foreground">
            Successfully processed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ConversionsListProps {
  status?: 'pending' | 'cleared' | 'paid' | 'flagged';
  currentPage: number;
  pageSize: number;
}

async function ConversionsList({ status, currentPage, pageSize }: ConversionsListProps) {
  const result = await getAdminConversions({
    filters: status ? { status } : {},
    pagination: { page: currentPage, pageSize }
  });

  if (result.error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading conversions: {result.error}</p>
      </div>
    );
  }

  if (!result.data || result.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {status || ''} conversions found
      </div>
    );
  }

  const totalPages = Math.ceil((result.totalCount || 0) / pageSize);

  return (
    <div className="space-y-4">
      {/* Conversations List */}
      <div className="space-y-2">
        {result.data.map((conversion) => (
          <Link 
            key={conversion.conversion_id} 
            href={`/admin/affiliates/conversions/${conversion.conversion_id}`}
            className="block"
          >
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Badge variant={
                  conversion.status === 'pending' ? 'secondary' :
                  conversion.status === 'flagged' ? 'destructive' :
                  conversion.status === 'cleared' ? 'default' : 'outline'
                }>
                  {conversion.status}
                </Badge>
                <div>
                  <p className="font-medium">{conversion.affiliate_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Order #{conversion.order_id} • ₱{conversion.commission_amount} commission
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">₱{conversion.commission_amount}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conversion.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, result.totalCount || 0)} of {result.totalCount || 0} conversions
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={`?status=${status || ''}&page=${currentPage - 1}&pageSize=${pageSize}`}
              className={currentPage === 1 ? 'pointer-events-none' : ''}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            </Link>
            
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            
            <Link 
              href={`?status=${status || ''}&page=${currentPage + 1}&pageSize=${pageSize}`}
              className={currentPage >= totalPages ? 'pointer-events-none' : ''}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ConversionsPayoutsPage(props: ConversionsPageProps) {
  // Await searchParams and extract values
  const searchParams = await props.searchParams;
  const status = searchParams?.status as 'pending' | 'cleared' | 'paid' | 'flagged' | undefined;
  const currentPage = parseInt(searchParams?.page || '1');
  const pageSize = parseInt(searchParams?.pageSize || '20');

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversions & Payouts</h1>
        <p className="text-muted-foreground">
          Review auto-created payout batches and manage monthly affiliate payments
        </p>
      </div>

      {/* Current Batch Preview - Most Important Section */}
      <Suspense fallback={<div className="h-48 rounded-lg bg-muted animate-pulse" />}>
        <BatchPreviewSection />
      </Suspense>

      {/* Status Overview */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      }>
        <ConversionStatusStats />
      </Suspense>

      {/* Detailed Conversion Management */}
      <Tabs value={status || "flagged"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flagged" asChild>
            <Link href="?status=flagged&page=1" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged
            </Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="?status=pending&page=1" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </Link>
          </TabsTrigger>
          <TabsTrigger value="cleared" asChild>
            <Link href="?status=cleared&page=1" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Cleared
            </Link>
          </TabsTrigger>
          <TabsTrigger value="paid" asChild>
            <Link href="?status=paid&page=1" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Paid
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                Fraud Detection Alerts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review flagged conversions before approving the current batch. Click any conversion for detailed review.
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <ConversionsList status="flagged" currentPage={currentPage} pageSize={pageSize} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Pending Conversions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                New conversions being processed by automated fraud detection. Click any conversion for details.
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <ConversionsList status="pending" currentPage={currentPage} pageSize={pageSize} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleared" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Cleared for Payout
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Conversions ready for inclusion in the next payout batch. Click any conversion for details.
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <ConversionsList status="cleared" currentPage={currentPage} pageSize={pageSize} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Paid Conversions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Successfully processed and paid to affiliates. Click any conversion for payment details.
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                <ConversionsList status="paid" currentPage={currentPage} pageSize={pageSize} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 