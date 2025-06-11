import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArrowLeft, Calculator, Users, DollarSign } from "lucide-react";
import Link from "next/link";
import { getEligiblePayouts } from "@/lib/actions/admin/payout-actions";
import { formatPrice } from "@/lib/utils";
import { PayoutPreviewTable } from "@/components/admin/affiliates/payouts/payout-preview-table";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Preview Payouts | Admin",
  description: "Review eligible conversions before creating payout batches",
};

export default async function PayoutPreviewPage() {
  // Fetch eligible payouts for all affiliates
  const { affiliates: eligibleAffiliates, error: eligibleError } = await getEligiblePayouts();
  
  if (eligibleError) {
    console.error("Error fetching eligible payouts:", eligibleError);
    // Handle error appropriately - could redirect or show error state
  }

  const totalEligiblePayouts = eligibleAffiliates?.reduce((sum, affiliate) => sum + affiliate.conversion_count, 0) || 0;
  const totalAmount = eligibleAffiliates?.reduce((sum, affiliate) => sum + affiliate.total_amount, 0) || 0;
  const uniqueAffiliates = eligibleAffiliates?.length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link 
            href="/admin/affiliates/payouts" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payouts
          </Link>
        </div>
      </div>

      <AdminPageHeader
        heading="Preview Payouts"
        description="Review eligible conversions and create payout batches"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Eligible Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueAffiliates}</div>
            <p className="text-xs text-muted-foreground">with cleared conversions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calculator className="mr-2 h-4 w-4" />
              Total Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEligiblePayouts}</div>
            <p className="text-xs text-muted-foreground">ready for payout</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">before fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {totalEligiblePayouts > 0 ? (
        <Suspense fallback={<div>Loading payout preview...</div>}>
          <PayoutPreviewTable eligibleAffiliates={eligibleAffiliates || []} />
        </Suspense>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <Calculator className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Eligible Payouts</h3>
              <p className="text-sm text-muted-foreground">
                There are currently no conversions with "cleared" status ready for payout.
              </p>
              <div className="mt-4">
                <Link href="/admin/affiliates/conversions">
                  <Button variant="outline">
                    Review Conversions
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 