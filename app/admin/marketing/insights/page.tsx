import React from 'react';
import { InsightsClient } from '@/components/admin/marketing/insights/insights-client';

export const dynamic = 'force-dynamic';

export default async function MarketingInsightsPage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Marketing AI Insights</h1>
        <p className="text-muted-foreground">Generate and review AI-driven analyses of your marketing KPIs.</p>
      </div>
      <InsightsClient />
    </div>
  );
}
