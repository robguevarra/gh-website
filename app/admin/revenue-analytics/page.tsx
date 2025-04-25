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

  // Fetch data on initial load and when SHARED date range or local filters change
  useEffect(() => {
    // Check if the shared date range is valid before fetching
    if (sharedDateRange?.from) {
      console.log('Revenue filters or shared date changed, fetching...', { sharedDateRange, granularity, sourcePlatform });
      fetchAllRevenueData();
    } else {
      console.log('Skipping revenue fetch: Shared date range is invalid.', sharedDateRange);
    }
    // Dependency array includes shared date range AND local filters
  }, [sharedDateRange, granularity, sourcePlatform, fetchAllRevenueData]);

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