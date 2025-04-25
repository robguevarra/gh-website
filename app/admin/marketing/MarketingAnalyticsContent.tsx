'use client';

import React, { useEffect, useMemo } from 'react';
// Adjust component import paths relative to the new location
import MarketingMetricCards from './components/MarketingMetricCards';
import MarketingChannelComparison from './components/MarketingChannelComparison';
import FacebookAdsDetailTable from './components/FacebookAdsDetailTable';
import MarketingFilters from './components/MarketingFilters';
import { useMarketingAnalyticsStore } from '@/lib/stores/admin/marketingAnalyticsStore';
import { DateRange } from 'react-day-picker';

// Renamed export to reflect it's content for a tab
export default function MarketingAnalyticsContent() {
  // Store usage remains the same
  const {
    dateRange,
    setDateRange,
    summaryData,
    channelData,
    facebookDetailsData,
    loadingStates,
    errorStates,
    fetchAllMarketingData,
  } = useMarketingAnalyticsStore();

  const currentFilters = useMemo(() => ({ dateRange }), [dateRange]);

  useEffect(() => {
    fetchAllMarketingData(currentFilters);
  }, [currentFilters, fetchAllMarketingData]);

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

  // Return the content structure directly, no need for outer container/title here
  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <MarketingFilters filters={filtersForComponent} setFilters={handleSetFilters} />

      {/* Summary Metrics */}
      <MarketingMetricCards data={summaryData} isLoading={loadingStates.summary} error={errorStates.summary} />

      {/* Channel Comparison */}
      <MarketingChannelComparison data={channelData} isLoading={loadingStates.channel} error={errorStates.channel} />

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