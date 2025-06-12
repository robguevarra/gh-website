import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, User, DollarSign, Calendar, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/common/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/common/admin-status-badge";
import { formatPrice } from "@/lib/utils";

// Client component for the payouts table
import { BatchPayoutsTable } from "./batch-payouts-table";

interface BatchPayoutsPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper function for formatting dates
function formatDate(date: string | null): string {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Batch and payout data types
interface BatchData {
  id: string;
  name: string;
  status: string;
  total_amount: number;
  fee_amount: number;
  net_amount: number;
  affiliate_count: number;
  conversion_count: number;
  payout_method: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

interface PayoutData {
  id: string;
  batch_id: string;
  affiliate_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  payout_method: string;
  reference?: string;
  xendit_disbursement_id?: string;
  transaction_date?: string;
  processed_at?: string;
  created_at: string;
  affiliates: {
    slug: string;
    commission_rate: number;
    unified_profiles: {
      first_name?: string;
      last_name?: string;
      email: string;
    };
  };
}

// Fetch batch details and payouts from real database
async function getBatchWithPayouts(batchId: string): Promise<{
  batch: BatchData | null;
  payouts: PayoutData[] | null;
  error: string | null;
}> {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();
    
    // Get batch details
    const { data: batch, error: batchError } = await supabase
      .from('affiliate_payout_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      console.error('Error fetching batch:', batchError);
      return { batch: null, payouts: null, error: batchError?.message || 'Batch not found' };
    }

    // Get payouts for this batch with affiliate information
    // First get the payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      return { 
        batch: batch as BatchData, 
        payouts: null, 
        error: payoutsError.message 
      };
    }

    // Then get affiliate information separately to avoid auth.users issues
    const affiliateIds = payouts?.map(p => p.affiliate_id) || [];
    const { data: affiliatesData, error: affiliatesError } = await supabase
      .from('affiliates')
      .select(`
        id,
        slug,
        commission_rate,
        user_id,
        unified_profiles!affiliates_user_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .in('id', affiliateIds);

    if (affiliatesError) {
      console.error('Error fetching affiliates:', affiliatesError);
      return { 
        batch: batch as BatchData, 
        payouts: payouts as PayoutData[], 
        error: null // Continue with payouts but without affiliate details
      };
    }

    // Combine the data
    const affiliatesMap = new Map(affiliatesData?.map(a => [a.id, a]));
    const enrichedPayouts = payouts?.map(payout => ({
      ...payout,
      affiliates: affiliatesMap.get(payout.affiliate_id) || {
        slug: 'unknown',
        commission_rate: 0,
        unified_profiles: {
          first_name: 'Unknown',
          last_name: 'User',
          email: 'unknown@example.com'
        }
      }
    }));

    return { 
      batch: batch as unknown as BatchData, 
      payouts: (enrichedPayouts || []) as unknown as PayoutData[], 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching batch with payouts:', error);
    return { batch: null, payouts: null, error: 'Failed to fetch batch data' };
  }
}

export default async function BatchPayoutsPage({ params }: BatchPayoutsPageProps) {
  const { id } = await params;

  const { batch, payouts, error } = await getBatchWithPayouts(id);

  if (error || !batch) {
    notFound();
  }

  // Transform payouts for the data table
  const tableData = payouts?.map((payout: any) => ({
    id: payout.id,
    affiliate_name: `${payout.affiliates.unified_profiles.first_name || ''} ${payout.affiliates.unified_profiles.last_name || ''}`.trim() || 'Unknown',
    affiliate_email: payout.affiliates.unified_profiles.email,
    affiliate_slug: payout.affiliates.slug,
    amount: payout.amount,
    fee_amount: payout.fee_amount,
    net_amount: payout.net_amount,
    status: payout.status,
    payout_method: payout.payout_method,
    reference: payout.reference,
    xendit_disbursement_id: payout.xendit_disbursement_id,
    transaction_date: payout.transaction_date,
    processed_at: payout.processed_at,
    created_at: payout.created_at
  })) || [];

  // Calculate totals
  const totalAmount = payouts?.reduce((sum: number, payout: any) => sum + (parseFloat(payout.amount) || 0), 0) || 0;
  const totalFees = payouts?.reduce((sum: number, payout: any) => sum + (parseFloat(payout.fee_amount) || 0), 0) || 0;
  const totalNet = payouts?.reduce((sum: number, payout: any) => sum + (parseFloat(payout.net_amount) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        heading={`Batch Payouts: ${batch.name || id.slice(0, 8)}`}
        description="Individual affiliate payouts within this batch"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/affiliates/payouts/batches/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batch
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </AdminPageHeader>

      {/* Batch Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{payouts?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Affiliates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{formatPrice(totalAmount)}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{formatPrice(totalFees)}</div>
                <div className="text-sm text-muted-foreground">Total Fees</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{formatPrice(totalNet)}</div>
                <div className="text-sm text-muted-foreground">Net Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Batch Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="mt-1">
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-sm">{formatDate(batch.created_at)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Processed</div>
              <div className="text-sm">{formatDate(batch.processed_at || null)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchPayoutsTable data={tableData} />
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateMetadata({ params }: BatchPayoutsPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Batch Payouts - ${id.slice(0, 8)}`,
    description: 'View individual affiliate payouts within this batch',
  };
} 