import PageHeader from '@/components/common/page-header';
import { getAdminAffiliatePayouts } from '@/lib/actions/admin/payout-actions';
import { PayoutsList } from '@/components/admin/affiliates/payouts/payouts-list';
import PayoutNavTabs from '@/components/admin/affiliates/payouts/payout-nav-tabs';
import { Button } from '@/components/ui/button';
import { CalendarPlus, FileSpreadsheet, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { checkAdminAccess } from '@/lib/auth/check-admin-access';
import { redirect } from 'next/navigation';
import { AdminAffiliatePayoutItem, PayoutStatusType } from '@/types/admin/affiliate';

export default async function AffiliatePayoutsPage() {
  // Check for admin access
  const { isAdmin } = await checkAdminAccess();
  if (!isAdmin) {
    redirect('/auth/signin?error=unauthorized&returnUrl=/admin/affiliates/payouts');
  }

  // Fetch payout data
  const {
    data: payoutsData,
    error,
    totalCount
  } = await getAdminAffiliatePayouts({
    pagination: {
      page: 1,
      pageSize: 50
    },
    // Note: removed includeAffiliateDetails since it's not in the interface
  });
  
  // Map the AdminAffiliatePayout objects to AdminAffiliatePayoutItem objects
  const payouts: AdminAffiliatePayoutItem[] = payoutsData.map(payout => ({
    id: payout.payout_id,
    affiliate_id: payout.affiliate_id,
    affiliate_name: payout.affiliate_name,
    amount: payout.amount,
    status: payout.status,
    payout_method: payout.payout_method, // Using actual payout method from DB
    reference: payout.reference, // Using actual reference from DB
    transaction_date: payout.transaction_date, // Using actual transaction_date from DB
    created_at: payout.created_at,
    xendit_disbursement_id: payout.xendit_disbursement_id,
    processed_at: payout.processed_at,
    processing_notes: payout.processing_notes,
    fee_amount: payout.fee_amount,
    net_amount: payout.net_amount
    // scheduled_at removed as it doesn't exist in the database schema
  }));

  // Calculate summary totals
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const processingPayouts = payouts.filter(p => p.status === 'processing');
  const completedPayouts = payouts.filter(p => p.status === 'sent'); // Using 'sent' as it's the actual DB value for completed payouts

  const pendingPayoutsTotal = pendingPayouts.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const processingPayoutsTotal = processingPayouts.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const completedPayoutsTotal = completedPayouts.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="mb-0"> {/* Wrapper div with margin class instead */}
          <PageHeader
            title="Affiliate Payouts"
            description="Manage and process affiliate commission payouts."
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button asChild>
            <Link href="/admin/affiliates/payouts/preview">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate Payout Preview
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/affiliates/conversions">
              <PlusCircle className="mr-2 h-4 w-4" /> Manage Conversions
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/affiliates/payouts/calendar">
              <CalendarPlus className="mr-2 h-4 w-4" /> View Calendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Payout Navigation Tabs */}
      <PayoutNavTabs />

      {/* Conditional error message */}
      {error && (
        <div className="p-4 bg-destructive/15 text-destructive rounded-md">
          <p className="font-medium">Error loading payouts</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Payout Management UI */}
      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <PayoutsList
              payouts={payouts}
              pendingPayoutsTotal={pendingPayoutsTotal}
              processingPayoutsTotal={processingPayoutsTotal}
              completedPayoutsTotal={completedPayoutsTotal}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
