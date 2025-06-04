'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { OverviewCard } from '@/components/affiliate/dashboard/overview-card';
import { PerformanceMetricsCard } from '@/components/affiliate/dashboard/performance-metrics-card';
import { ReferralLinksCard } from '@/components/affiliate/dashboard/referral-links-card';
import { PayoutsCard } from '@/components/affiliate/dashboard/payouts-card';

export default function AffiliatePortalPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <OverviewCard />
        <ReferralLinksCard />
      </div>
    </DashboardLayout>
  );
}
