'use client'; // This main page will coordinate fetching and display, likely needing client-side interaction

import React, { useState, useEffect } from 'react';
import RevenueMetricCards from './components/RevenueMetricCards';
import RevenueTrendsChart from './components/RevenueTrendsChart';
import RevenueByProductChart from './components/RevenueByProductChart';
import RevenueByPaymentMethodChart from './components/RevenueByPaymentMethodChart';
import RevenueFilters, { Granularity, SourcePlatformFilter } from './components/RevenueFilters';
// Import Revenue Zustand store hook
import { useRevenueAnalyticsStore } from '@/lib/stores/admin/revenueAnalyticsStore';
// IMPORT: Shared store for date range
import { useSharedDashboardFiltersStore } from '@/lib/stores/admin/sharedDashboardFiltersStore';

/**
 * Main page component for the Revenue Analytics section.
 * Handles fetching data based on filters and passing it to display components.
 * Uses Zustand for state management.
 */
export default function RevenueAnalyticsPage() {
  // Get state and actions from Revenue Zustand store
  const {
    summary,
    trends,
    byProduct,
    byPaymentMethod,
    isLoading,
    error,
    granularity,
    sourcePlatform,
    setFilters, // Keep this for granularity/sourcePlatform
    fetchAllRevenueData,
  } = useRevenueAnalyticsStore();

  // GET: Date range state and setter from the SHARED store
  const { dateRange: sharedDateRange, setDateRange: setSharedDateRange } = useSharedDashboardFiltersStore();

  // Fetch data: Check if data exists before fetching
  useEffect(() => {
    if (sharedDateRange?.from) {
        // Get current data state
        const state = useRevenueAnalyticsStore.getState();
        // Check if any essential data is missing
        if (
            state.summary === null ||
            state.trends.length === 0 ||
            state.byProduct.length === 0 ||
            state.byPaymentMethod.length === 0
        ) {
            console.log('Revenue filters/date changed, fetching missing data...', { sharedDateRange, granularity, sourcePlatform });
            fetchAllRevenueData();
        } else {
            console.log('Revenue filters/date changed, but data exists. Consider adding staleness logic.');
            // Potentially still need to fetch if granularity/sourcePlatform changed, 
            // even if *some* data exists. The current fetchAllRevenueData fetches everything.
            // For simplicity now, we only fetch if *any* data is missing.
            // A more complex approach would track filters per data slice.
            // Let's add a specific check: if granularity or sourcePlatform actually changed, refetch.
            if (state.granularity !== granularity || state.sourcePlatform !== sourcePlatform) {
                console.log('Revenue granularity or sourcePlatform changed, refetching all data...');
                fetchAllRevenueData();
            }
        }
    } else {
      console.log('Skipping revenue fetch: Shared date range is invalid.', sharedDateRange);
    }
  }, [sharedDateRange, granularity, sourcePlatform, fetchAllRevenueData]); // Keep dependencies

  // UPDATE: handleFiltersChange no longer includes dateRange
  const handleFiltersChange = (filters: {
    granularity?: Granularity;
    sourcePlatform?: SourcePlatformFilter;
  }) => {
    // Only pass granularity and sourcePlatform to setFilters
    setFilters(filters);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Revenue Analytics</h1>

      {/* Pass SHARED date range and its setter to RevenueFilters 
          Also pass local filters and the updated change handler */}
      <RevenueFilters 
        dateRange={sharedDateRange} 
        onDateRangeChange={setSharedDateRange} 
        granularity={granularity}
        sourcePlatform={sourcePlatform}
        onChange={handleFiltersChange} 
      />

      {isLoading && <div>Loading revenue data...</div>} {/* Use isLoading from store */}
      {error && <div className="text-red-600">Error loading data: {error}</div>} {/* Use error from store */}

      {!isLoading && !error && (
        <>
          {/* Pass data from store to components */}
          <RevenueMetricCards data={summary ?? undefined} isLoading={isLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueTrendsChart data={trends} granularity={granularity} isLoading={isLoading} />
            <RevenueByPaymentMethodChart data={byPaymentMethod} isLoading={isLoading} />
          </div>

          <RevenueByProductChart data={byProduct} isLoading={isLoading} />

          {/* TODO: Add Revenue Goals section if implemented */}
        </>
      )}
    </div>
  );
} 