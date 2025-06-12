import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Eye, DollarSign, Users, Calendar, AlertCircle, CheckCircle2, Shield, CreditCard, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { formatPrice } from "@/lib/utils";
import { getAdminAffiliatePayoutBatches } from "@/lib/actions/admin/payout-actions";
import { BatchVerificationForm } from "@/components/admin/affiliates/payouts/batch-verification-form";
import { BatchProcessButton } from "@/components/admin/affiliates/payouts/batch-process-button";

interface BatchDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper function for formatting dates
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to get status badge variant
function getStatusVariant(status: string) {
  switch (status) {
    case 'pending': return 'secondary';
    case 'verified': return 'default';
    case 'processing': return 'default';
    case 'completed': return 'default';
    case 'failed': return 'destructive';
    default: return 'secondary';
  }
}

// Helper function to get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'verified': return <Shield className="h-4 w-4" />;
    case 'processing': return <Clock className="h-4 w-4" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'failed': return <AlertCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
}

async function getBatchDetails(batchId: string) {
  const { batches, error } = await getAdminAffiliatePayoutBatches();
  
  if (error || !batches) {
    return { batch: null, error: error || 'Failed to fetch batch details' };
  }
  
  const batch = batches.find(b => b.id === batchId);
  return { batch: batch || null, error: batch ? null : 'Batch not found' };
}

async function getBatchPayouts(batchId: string) {
  // This would fetch individual payouts in the batch
  // For now, returning empty array as this would need to be implemented
  return { payouts: [], error: null };
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = await params;

  // Fetch batch details
  const { batch, error: batchError } = await getBatchDetails(id);

  if (batchError || !batch) {
    notFound();
  }

  const { payouts, error: payoutsError } = await getBatchPayouts(id);

  if (payoutsError) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error loading batch payouts: {payoutsError}
        </div>
      </div>
    );
  }

  const totalAmount = batch.total_amount || 0;
  const payoutCount = batch.payout_count || 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        heading={`Batch ${batch.batch_name || id.slice(0, 8)}`}
        description="Review and manage payout batch details"
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/affiliates/payouts/batches">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batches
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Details
          </Button>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Batch Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{formatPrice(totalAmount)}</div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{payoutCount}</div>
                  <div className="text-sm text-muted-foreground">Payouts</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-sm font-medium">{formatDate(batch.created_at || null)}</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Badge variant={getStatusVariant(batch.status)} className="flex items-center gap-1">
                    {getStatusIcon(batch.status)}
                    {batch.status}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Section */}
          {batch.status === 'pending' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Shield className="h-5 w-5" />
                  Verification Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BatchVerificationForm batchId={id} />
              </CardContent>
            </Card>
          )}

          {/* Processing Section */}
          {batch.status === 'verified' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <CreditCard className="h-5 w-5" />
                  Ready for Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Batch has been verified and approved</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Bank account information validated</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Amounts and calculations confirmed</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Process this batch?</p>
                      <p className="text-sm text-muted-foreground">
                        This will send the payouts to Xendit for disbursement.
                      </p>
                    </div>
                    <BatchProcessButton batchId={id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {batch.status === 'processing' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" />
                  Processing in Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">This batch is currently being processed through Xendit.</p>
                  <p className="text-sm text-muted-foreground">
                    Processing started: {formatDate(batch.processed_at || null)}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    <span className="text-sm">Sending to payment provider...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Status */}
          {batch.status === 'completed' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Batch Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">All payouts in this batch have been successfully processed.</p>
                  <p className="text-sm text-muted-foreground">
                    Completed: {formatDate(batch.processed_at || null)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Batch Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Batch Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Batch ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="text-sm text-muted-foreground">{formatDate(batch.created_at || null)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={getStatusVariant(batch.status)} className="flex items-center gap-1 w-fit mt-1">
                  {getStatusIcon(batch.status)}
                  {batch.status}
                </Badge>
              </div>
              {batch.processed_at && (
                <div>
                  <Label className="text-sm font-medium">Processed</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(batch.processed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/admin/affiliates/payouts/batches/${id}/payouts`}>
                  <Users className="mr-2 h-4 w-4" />
                  View Payouts
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/affiliates/payouts/monitoring">
                  <Eye className="mr-2 h-4 w-4" />
                  Monitoring Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 