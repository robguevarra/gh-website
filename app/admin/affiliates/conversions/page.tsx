import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Package, Archive } from "lucide-react";
import Link from "next/link";
import { getAdminConversions, getConversionStats } from "@/lib/actions/admin/conversion-actions";
import { ConversionsTable } from "@/components/admin/affiliates/conversions/conversions-table";
import { ConversionStatsCards } from "@/components/admin/affiliates/conversions/conversion-stats-cards";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Conversion Management | Admin",
  description: "Review and verify affiliate conversions for payout eligibility",
};

interface ConversionsPageProps {
  searchParams?: Promise<{
    status?: string;
    affiliate?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
  }>;
}

async function ConversionsContent({ searchParams }: ConversionsPageProps) {
  // Await searchParams before destructuring (Next.js 15 requirement)
  const params = await (searchParams || Promise.resolve({
    status: 'pending',
    page: '1',
    pageSize: '20',
    sortBy: 'created_at',
    sortDirection: 'desc'
  }));
  
  const {
    status = 'pending',
    affiliate,
    page = '1',
    pageSize = '20',
    sortBy = 'created_at',
    sortDirection = 'desc',
    dateFrom,
    dateTo,
    minAmount,
    maxAmount
  } = params;

  // Fetch conversion statistics
  const { stats, error: statsError } = await getConversionStats();
  
  // Fetch conversions with filters
  const { data: conversions, totalCount, error: conversionsError } = await getAdminConversions({
    filters: {
      status: status as any,
      affiliateId: affiliate,
      dateFrom,
      dateTo,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    },
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    },
    sort: {
      sortBy,
      sortDirection: sortDirection as 'asc' | 'desc',
    },
  });

  if (statsError || conversionsError) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error loading conversion data: {statsError || conversionsError}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <ConversionStatsCards stats={stats} />

      {/* Main Conversions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Conversion Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and verify affiliate conversions. Approved conversions become eligible for payouts.
          </p>
        </CardHeader>
        <CardContent>
          <ConversionsTable
            conversions={conversions || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConversionsPage(props: ConversionsPageProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        heading="Conversion Management"
        description="Review and verify affiliate conversions for payout eligibility"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/affiliates/payouts/preview">
            <Button size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Preview Payouts
            </Button>
          </Link>
          <Link href="/admin/affiliates/payouts">
            <Button variant="outline" size="sm">
              <Package className="mr-2 h-4 w-4" />
              Manage Payouts
            </Button>
          </Link>
          <Link href="/admin/affiliates/payouts/batches">
            <Button variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" />
              View Batches
            </Button>
          </Link>
        </div>
      </AdminPageHeader>
      
      <Suspense fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      }>
        <ConversionsContent {...props} />
      </Suspense>
    </div>
  );
} 