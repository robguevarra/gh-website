'use client';

import React, { useEffect, useMemo, useState } from 'react';
// Adjust component import paths relative to the new location
import CampaignPerformanceTable from './components/CampaignPerformanceTable';
import MarketingVsVisitorChart from './components/MarketingVsVisitorChart';
import MarketingMetricCards from './components/MarketingMetricCards';
import MarketingChannelComparison from './components/MarketingChannelComparison';
import FacebookAdsDetailTable from './components/FacebookAdsDetailTable';
import MarketingFilters from './components/MarketingFilters';
import { useMarketingAnalyticsStore } from '@/lib/stores/admin/marketingAnalyticsStore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Renamed export to reflect it's content for a tab
export default function MarketingAnalyticsContent() {
  // Store usage remains the same
  const {
    dateRange,
    setDateRange,
    summaryData,
    channelData,
    facebookDetailsData,
    comparisonData,
    loadingStates,
    errorStates,
    fetchAllMarketingData,
  } = useMarketingAnalyticsStore();

  const currentFilters = useMemo(() => ({ dateRange }), [dateRange]);
  const [bounds, setBounds] = useState<{ minDate: string | null; maxDate: string | null; source?: string } | null>(null);

  // Ensure a sensible default window on first load based on actual data bounds
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/marketing/data-bounds', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) setBounds(json);
        if (res.ok && json?.maxDate) {
          const end = new Date(`${json.maxDate}T23:59:59.999Z`);
          const start = new Date(end);
          start.setUTCDate(end.getUTCDate() - 29);
          start.setUTCHours(0, 0, 0, 0);
          setDateRange({ from: start, to: end });
          return;
        }
      } catch { }
      // Fallback: last 30 days relative to today
      const end = new Date();
      end.setUTCHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 29);
      start.setUTCHours(0, 0, 0, 0);
      setDateRange({ from: start, to: end });
    })();
  }, [dateRange, setDateRange]);

  // Fetch only once the dateRange is established
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    fetchAllMarketingData(currentFilters);
  }, [currentFilters, fetchAllMarketingData, dateRange]);

  const handleSetFilters = (filters: { startDate: string | null; endDate: string | null }) => {
    setDateRange({
      from: filters.startDate ? new Date(filters.startDate) : undefined,
      to: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  };

  const filtersForComponent = {
    startDate: dateRange?.from?.toISOString() ?? null,
    endDate: dateRange?.to?.toISOString() ?? null,
  };

  const outOfBounds = useMemo(() => {
    if (!bounds?.minDate || !bounds?.maxDate || !dateRange?.from || !dateRange?.to) return false;
    const min = new Date(`${bounds.minDate}T00:00:00.000Z`).getTime();
    const max = new Date(`${bounds.maxDate}T23:59:59.999Z`).getTime();
    const from = dateRange.from.getTime();
    const to = dateRange.to.getTime();
    return to < min || from > max;
  }, [bounds, dateRange]);

  const resetToLatestWindow = () => {
    if (!bounds?.maxDate) return;
    const end = new Date(`${bounds.maxDate}T23:59:59.999Z`);
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 29);
    start.setUTCHours(0, 0, 0, 0);
    setDateRange({ from: start, to: end });
  };

  // Return the content structure directly, no need for outer container/title here
  return (
    <div className="space-y-6">
      {/* Header / Actions */}
      <div className="flex items-center justify-between">
        <div />
        <Link href="/admin/marketing/insights" className="inline-block">
          <Button variant="secondary">Open AI Insights</Button>
        </Link>
      </div>

      {/* Filters Section */}
      <MarketingFilters filters={filtersForComponent} setFilters={handleSetFilters} />

      {/* Dataset coverage notice */}
      {outOfBounds && (
        <div className="p-4 border border-yellow-400 bg-yellow-50 rounded-md text-yellow-800">
          <p className="font-semibold mb-1">No data in the selected range</p>
          <p className="text-sm">Available data spans {bounds?.minDate} to {bounds?.maxDate}. Try the latest 30-day window.</p>
          <div className="mt-2">
            <Button variant="outline" onClick={resetToLatestWindow}>Use latest 30 days</Button>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <MarketingMetricCards data={summaryData} isLoading={loadingStates.summary} error={errorStates.summary} />

      {/* Channel Comparison */}
      <MarketingChannelComparison data={channelData} isLoading={loadingStates.channel} error={errorStates.channel} />

      {/* Traffic Quality & Attribution Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Traffic Quality & Attribution</h2>

        {/* Clicks vs Visits Chart */}
        <MarketingVsVisitorChart
          data={comparisonData}
          isLoading={loadingStates.comparison}
          error={errorStates.comparison}
        />

        {/* Campaign Performance Table */}
        <CampaignPerformanceTable
          data={comparisonData}
          isLoading={loadingStates.comparison}
          error={errorStates.comparison}
        />
      </div>

      {/* Facebook Ads Details */}
      <FacebookAdsDetailTable data={facebookDetailsData} isLoading={loadingStates.details} error={errorStates.details} />

      {/* Note about blocked metrics */}
      <div className="mt-8 p-4 border border-yellow-400 bg-yellow-50 rounded-md text-yellow-800">
        <p className="font-semibold">Note:</p>
        <p>Metrics like Ad-Attributed Revenue, ROAS (Return On Ad Spend), and CPA (Cost Per Acquisition) are currently unavailable.</p>
        <p>These metrics depend on the completion of the ad attribution linking process (Phase 4-1, Step 4).</p>
      </div>
    </div>
  );
} 