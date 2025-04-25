'use client'; // This main page will coordinate fetching and display, likely needing client-side interaction

import React, { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import RevenueMetricCards from './components/RevenueMetricCards';
import RevenueTrendsChart from './components/RevenueTrendsChart';
import RevenueByProductChart from './components/RevenueByProductChart';
import RevenueByPaymentMethodChart from './components/RevenueByPaymentMethodChart';
import RevenueFilters, { Granularity, SourcePlatformFilter } from './components/RevenueFilters';
// Import Zustand store hook
import { useRevenueAnalyticsStore } from '@/lib/stores/admin/revenueAnalyticsStore';

/**
 * Main page component for the Revenue Analytics section.
 * Handles fetching data based on filters and passing it to display components.
 * Uses Zustand for state management.
 */
export default function RevenueAnalyticsPage() {
  // Get state and actions from Zustand store
  const {
    summary,
    trends,
    byProduct,
    byPaymentMethod,
    isLoading,
    error,
    dateRange,
    granularity,
    sourcePlatform,
    setFilters,
    fetchAllRevenueData,
  } = useRevenueAnalyticsStore();

  // Fetch data on initial load and when filters change
  useEffect(() => {
    // Fetch immediately on mount
    fetchAllRevenueData();
    // Note: Dependency array includes filters. If setFilters triggered
    // fetchAllRevenueData directly (e.g., via queueMicrotask in store),
    // you might only need to fetch on mount.
    // However, explicitly fetching when filters change here is clearer.
  }, [dateRange, granularity, sourcePlatform, fetchAllRevenueData]);

  // Handler remains simple, just calls setFilters
  const handleFiltersChange = (filters: {
    dateRange?: DateRange;
    granularity?: Granularity;
    sourcePlatform?: SourcePlatformFilter;
  }) => {
    setFilters(filters);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Revenue Analytics</h1>

      {/* Pass filter state to RevenueFilters if needed for controlled inputs */}
      <RevenueFilters onChange={handleFiltersChange} /* initialFilters={{ dateRange, granularity, sourcePlatform }} */ />

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