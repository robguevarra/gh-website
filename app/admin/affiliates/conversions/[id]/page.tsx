import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  DollarSign,
  Shield,
  Calendar,
  Package,
  User,
  ExternalLink,
  Flag,
  FileText
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

interface ConversionDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: ConversionDetailsPageProps): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Conversion ${params.id} | Admin`,
    description: `Detailed view of conversion ${params.id} including fraud flags and affiliate information`,
  };
}

import { getConversionDetails, updateConversionStatus } from "@/lib/actions/admin/conversion-actions";

// Server action to handle conversion approval
async function handleApproveConversion(conversionId: string) {
  'use server';
  
  console.log('Approving conversion:', conversionId);
  const result = await updateConversionStatus({
    conversionId,
    status: 'cleared',
    notes: 'Approved by admin after manual review'
  });
  
  console.log('Approval result:', result);
  
  if (!result.success) {
    console.error('Failed to approve conversion:', result.error);
  }
  
  // The updateConversionStatus function already calls revalidatePath
  // No redirect needed - page will refresh with new data
}

// Server action to handle conversion rejection  
async function handleRejectConversion(conversionId: string) {
  'use server';
  
  console.log('Rejecting conversion:', conversionId);
  
  // Industry best practice: Rejected conversions should NOT remain flagged
  // They should be excluded from batch processing (moved to pending status)
  const result = await updateConversionStatus({
    conversionId,
    status: 'pending', // Move to pending to remove from flagged list and exclude from batch
    notes: 'REJECTED by admin after manual review - excluded from current batch processing due to fraud concerns'
  });
  
  console.log('Rejection result:', result);
  
  if (!result.success) {
    console.error('Failed to reject conversion:', result.error);
  }
  
  // The updateConversionStatus function already calls revalidatePath
  // No redirect needed - page will refresh with new data
}

async function getConversionDetailsWrapper(conversionId: string) {
  const { conversion, error } = await getConversionDetails(conversionId);
  
  if (error) {
    console.error('Error fetching conversion details:', error);
    return null;
  }
  
  return conversion;
}

async function ConversionDetailsContent({ conversionId }: { conversionId: string }) {
  const conversion = await getConversionDetailsWrapper(conversionId);

  if (!conversion) {
    notFound();
  }

  const totalRiskScore = conversion.fraud_flags?.reduce((sum: number, flag: any) => sum + flag.risk_score, 0) || 0;
  
  // Check if conversion has been manually reviewed (approved or rejected)
  const hasBeenReviewed = conversion.admin_verifications?.some((v: any) => 
    v.verification_type === 'status_change'
  );
  
  // Check if conversion was rejected (has rejection note)
  const wasRejected = conversion.admin_verifications?.some((v: any) => 
    v.notes?.includes('REJECTED')
  );
  
  // Get the latest admin action
  const latestVerification = conversion.admin_verifications?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/affiliates/conversions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversions
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Conversion #{conversion.conversion_id}</h1>
          <p className="text-muted-foreground">Order #{conversion.order_id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={
            conversion.status === 'flagged' ? 'destructive' :
            conversion.status === 'cleared' ? 'default' :
            conversion.status === 'pending' ? 'secondary' : 'outline'
          } className="text-sm">
            {conversion.status.toUpperCase()}
          </Badge>
          {wasRejected && (
            <Badge variant="outline" className="text-sm border-red-300 text-red-700">
              REJECTED
            </Badge>
          )}
        </div>
      </div>

      {/* Fraud Flags Alert */}
      {conversion.fraud_flags && conversion.fraud_flags.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Fraud Detection Alerts ({conversion.fraud_flags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Risk Score:</span>
              <Badge variant={totalRiskScore > 50 ? 'destructive' : totalRiskScore > 25 ? 'secondary' : 'outline'}>
                {totalRiskScore}/100
              </Badge>
            </div>
            
            <div className="space-y-3">
              {conversion.fraud_flags.map((flag: any) => (
                <div key={flag.flag_id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{flag.rule_name}</span>
                    <Badge variant={flag.severity === 'high' ? 'destructive' : flag.severity === 'medium' ? 'secondary' : 'outline'}>
                      Risk: {flag.risk_score}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Flagged on {new Date(flag.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Show rejection notice if conversion was rejected */}
            {wasRejected && latestVerification && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-900">Conversion Rejected</span>
                </div>
                <p className="text-sm text-red-700">{latestVerification.notes}</p>
                <p className="text-xs text-red-600 mt-1">
                  Rejected on {new Date(latestVerification.created_at).toLocaleString()}
                </p>
              </div>
            )}

            {/* Show action buttons only if flagged and not yet reviewed */}
            {conversion.status === 'flagged' && !hasBeenReviewed && (
              <div className="flex gap-2 pt-2">
                <form action={handleApproveConversion.bind(null, conversion.conversion_id)}>
                  <Button type="submit" size="sm" variant="default">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Conversion
                  </Button>
                </form>
                <form action={handleRejectConversion.bind(null, conversion.conversion_id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    <Flag className="h-4 w-4 mr-2" />
                    Reject Conversion
                  </Button>
                </form>
              </div>
            )}

            {/* Show review status if already reviewed but still flagged */}
            {conversion.status === 'flagged' && hasBeenReviewed && !wasRejected && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Conversion Reviewed</span>
                </div>
                <p className="text-sm text-blue-700">This conversion has been reviewed by an administrator.</p>
                {latestVerification?.notes && (
                  <p className="text-sm text-blue-700 mt-1">Notes: {latestVerification.notes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Commission Amount:</span>
              <span className="font-medium">₱{conversion.commission_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Gross Merchandise Value:</span>
              <span className="font-medium">₱{conversion.gmv.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction Amount:</span>
              <span className="font-medium">₱{conversion.transaction_amount?.toLocaleString() || conversion.gmv.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Commission Rate:</span>
              <span className="font-medium">{(conversion.commission_rate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Product:</span>
              <span className="font-medium text-sm">{conversion.product_name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Affiliate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="font-medium">{conversion.affiliate_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="font-medium text-sm">{conversion.affiliate_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Join Date:</span>
              <span className="font-medium">{new Date(conversion.affiliate_join_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Days Active:</span>
              <span className="font-medium">
                {Math.floor((new Date().getTime() - new Date(conversion.affiliate_join_date).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Conversion Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Click Time:</span>
              <span className="font-medium text-sm">{new Date(conversion.click_timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Time:</span>
              <span className="font-medium text-sm">{new Date(conversion.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Window:</span>
              <span className="font-medium">
                {conversion.conversion_window_minutes 
                  ? `${conversion.conversion_window_minutes} minutes (${conversion.conversion_window_hours} hours)`
                  : `${conversion.conversion_window_hours} hours`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Status:</span>
              <Badge variant={
                conversion.payment_status === 'completed' ? 'default' : 
                conversion.payment_status === 'pending' ? 'secondary' : 
                'outline'
              }>
                {conversion.payment_status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <span className="font-medium">{conversion.payment_method}</span>
            </div>
          </CardContent>
        </Card>

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">IP Address:</span>
              <span className="font-mono text-sm">{conversion.ip_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Click ID:</span>
              <span className="font-mono text-sm">{conversion.click_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-sm">{conversion.transaction_id}</span>
            </div>
            {conversion.utm_params && (
              <div>
                <span className="text-sm text-muted-foreground">UTM Parameters:</span>
                <div className="text-xs mt-1 space-y-1">
                  {Object.entries(conversion.utm_params).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Referrer:</span>
              <p className="font-mono text-xs mt-1 break-all">{conversion.referrer_url}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Landing Page:</span>
              <p className="font-mono text-xs mt-1 break-all">{conversion.landing_page}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View Full Audit Log
            </Button>
            <Button size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Affiliate Profile
            </Button>
            <Button size="sm" variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Run Additional Fraud Checks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ConversionDetailsPage(props: ConversionDetailsPageProps) {
  const params = await props.params;
  
  return (
    <div className="flex-1 space-y-6 p-6">
      <Suspense fallback={
        <div className="space-y-6">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-40 bg-muted animate-pulse rounded" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      }>
        <ConversionDetailsContent conversionId={params.id} />
      </Suspense>
    </div>
  );
} 