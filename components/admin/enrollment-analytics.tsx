'use client';

import React, { useEffect, useState, useCallback } from 'react';
// Import the standard shadcn date range picker and type
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MetricCard } from '@/components/admin/metric-card';
import { Users, TrendingUp, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/admin/chart-container';
import { EnrollmentTrendsChart } from '@/components/admin/enrollment-trends-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { DataTable, DataTableColumn } from '@/components/admin/data-table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { debounce } from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnrollmentAnalyticsStore } from '@/lib/stores/admin/enrollmentAnalyticsStore'; // Import the store
import { useSharedDashboardFiltersStore } from '@/lib/stores/admin/sharedDashboardFiltersStore';

// Type for the summary data fetched from API
interface EnrollmentSummaryData {
  totalEnrollments: number;
  activeEnrollments: number;
  totalEnrollmentsPrevPeriod: number;
  activeEnrollmentsPrevPeriod: number;
  totalTrendPercentage: number | null;
  activeTrendPercentage: number | null;
}

// Type for the trends data fetched from API
interface TrendDataPoint {
  date: string;
  count: number;
}

// Type for the funnel data fetched from API
interface FunnelStage {
  stageName: string;
  count: number;
}
interface EnrollmentFunnelData {
  source: string;
  stages: FunnelStage[];
}

// Type for the segmentation data fetched from API
interface SegmentationGroup {
  segmentName: string;
  count: number;
}
interface EnrollmentSegmentationData {
  dateRange: { startDate: string; endDate: string };
  segmentationType: string;
  groups: SegmentationGroup[];
}

// Type for the details data fetched from API
interface EnrollmentDetail {
  enrollmentId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  enrolledAt: string;
  status: string;
  sourceTags: string[] | null;
}
interface EnrollmentDetailsApiResponse {
  enrollments: EnrollmentDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
}

type Granularity = 'day' | 'week' | 'month';
type FunnelSource = 'all' | 'organic_tag'; // Extend as needed

// Helper to format percentage with sign
const formatPercent = (value: number | null) => {
  if (value === null || isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}% vs prev. period`;
};

// Main component for Enrollment Analytics section
export function EnrollmentAnalytics() {
  const {
    // Filters
    granularity,
    funnelSource,
    // RESTORE: Destructure necessary state for rendering and local logic
    detailsSearchTerm,
    detailsPage,
    detailsPageSize,
    checkEmail,
    summaryData, 
    trendsData, 
    funnelData, 
    segmentationData,
    detailsData,
    detailsTotalCount, // Needed for pagination calculation
    checkResult, // Needed for check tool UI
    // Loading states are needed for UI
    isLoadingSummary,
    isLoadingTrends,
    isLoadingFunnel,
    isLoadingSegmentation,
    isLoadingDetails, 
    isLoadingCheck, 
    // Error states are needed for UI
    summaryError,
    trendsError,
    funnelError,
    segmentationError,
    detailsError,
    checkError,
    // Actions
    setGranularity,
    setFunnelSource,
    // RESTORE: Setters needed for inputs/pagination
    setDetailsSearchTerm,
    setDetailsPage,
    setDetailsPageSize,
    setCheckEmail,
    performCheck, // Needed for check tool button
    // Fetch actions needed for main effect
    fetchSummary,
    fetchTrends,
    fetchFunnel,
    fetchSegmentation,
    // fetchDetails // Still not called from the main effect
  } = useEnrollmentAnalyticsStore();

  const { dateRange: sharedDateRange, setDateRange: setSharedDateRange } = useSharedDashboardFiltersStore();

  // Local state ONLY for debouncing search input 
  const [localSearchTerm, setLocalSearchTerm] = useState(detailsSearchTerm); // Needs initial value

  // Debounce handler that calls the store action
  const debouncedSetStoreSearch = useCallback(debounce((value: string) => {
      // Uses setDetailsSearchTerm from store
      setDetailsSearchTerm(value);
    }, 500),
    [setDetailsSearchTerm] 
  );

  // Sync local search input state with store state 
   useEffect(() => {
      // Needs detailsSearchTerm from store
      if (localSearchTerm !== detailsSearchTerm) {
          setLocalSearchTerm(detailsSearchTerm);
      }
   }, [detailsSearchTerm]); 

  // Primary Effect: Call fetch actions when relevant filters change.
  // The store actions themselves will decide if an API call is needed.
  useEffect(() => {
    // Ensure shared date range is valid before calling fetches that depend on it
    if (sharedDateRange?.from) {
        console.log("EnrollmentAnalytics: Filters changed, triggering store fetch actions...");
        fetchSummary();
        fetchTrends();
        fetchFunnel();
        fetchSegmentation();
        // fetchDetails is triggered by pagination/search setters in the store directly
    } else {
        console.warn("EnrollmentAnalytics: Skipping primary fetches, date range invalid.");
    }
    // Depend on the filters this component controls/uses + shared date range
  }, [sharedDateRange, granularity, funnelSource, 
      fetchSummary, fetchTrends, fetchFunnel, fetchSegmentation]); // Include fetch actions in deps array

  // Calculate total pages based on store state
  const totalPages = Math.ceil(detailsTotalCount / detailsPageSize);

  // Define columns for the DataTable (No change needed)
  const columns: DataTableColumn[] = [
    { header: 'User Name', accessor: 'userName' },
    { header: 'Email', accessor: 'userEmail' },
    { header: 'Enrolled At', accessor: 'enrolledAtFormatted' }, // Use formatted date
    { header: 'Status', accessor: 'status' },
    { header: 'Source Tags', accessor: 'sourceTagsFormatted' }, // Use formatted tags
  ];

  // Prepare data for the table, including formatting (derived from store state)
  const tableData = detailsData.map(item => ({
    ...item,
    // Format date safely checking if enrolledAt exists
    enrolledAtFormatted: item.enrolledAt ? format(new Date(item.enrolledAt), 'PPpp') : '-',
    // Format source tags safely
    sourceTagsFormatted: item.sourceTags?.join(', ') || '-',
  }));

  return (
    <div className="space-y-8">
      {/* Top Controls: Use the standard DateRangePicker */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-semibold">Enrollment Overviewx</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity Selector */}
          <Select value={granularity} onValueChange={setGranularity}>
            <SelectTrigger className="w-auto sm:w-[120px]">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Funnel Source Selector */}    
          <Select value={funnelSource} onValueChange={setFunnelSource}>
            <SelectTrigger className="w-auto sm:w-[160px]">
              <SelectValue placeholder="Funnel Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="organic_tag">'squeeze' Tag</SelectItem>
              {/* Add more sources as they become available */}
            </SelectContent>
          </Select>

          {/* Date Range Picker - Use the SHARED store's state and setter */}
          <DateRangePicker
             value={sharedDateRange} // Pass the DateRange | undefined from the SHARED store
             onChange={setSharedDateRange} // Pass the SHARED store action directly
          />
        </div>
      </div>

      {/* Metric Cards Section: Use store state for loading/error/data */} 
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingSummary ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : summaryError ? (
           <div className="col-span-full p-4 text-red-600 border border-red-300 rounded-md bg-red-50">
             Error loading summary: {summaryError}
           </div>
        ) : summaryData ? (
          <>
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="Total Enrollments"
              value={summaryData.totalEnrollments}
              description={formatPercent(summaryData.totalTrendPercentage)}
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-green-500" />}
              title="Active Enrollments (in Period)"
              value={summaryData.activeEnrollments}
              description={formatPercent(summaryData.activeTrendPercentage)}
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-gray-400" />} 
              title="Total (Prev. Period)"
              value={summaryData.totalEnrollmentsPrevPeriod}
            />
             <MetricCard
              icon={<Users className="h-4 w-4 text-gray-400" />} 
              title="Active (Prev. Period)"
              value={summaryData.activeEnrollmentsPrevPeriod}
            />
          </>
        ) : (
          <div className="col-span-full p-4 text-muted-foreground">No summary data available.</div>
        )}
      </div>

      {/* Trends Chart Section: Use store state */} 
       <ChartContainer title="Enrollment Trends">
        {isLoadingTrends ? (
          <Skeleton className="h-64 w-full" />
        ) : trendsError ? (
           <div className="h-64 flex items-center justify-center p-4 text-red-600 border border-red-300 rounded-md bg-red-50">
             Error loading trends: {trendsError}
           </div>
        ) : trendsData && trendsData.length > 0 ? (
          <EnrollmentTrendsChart data={trendsData} granularity={granularity} />
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">No trends data available for selected period.</div>
        )}
      </ChartContainer>

      {/* Funnel & Segmentation Section: Use store state */} 
      <div className="grid gap-4 md:grid-cols-2">
        <ChartContainer title={`Enrollment Funnel (${funnelSource === 'all' ? 'All Sources' : 'Squeeze Tag'})`}>
          {isLoadingFunnel ? (
            <Skeleton className="h-64 w-full" />
          ) : funnelError ? (
             <div className="h-64 flex items-center justify-center p-4 text-red-600 border border-red-300 rounded-md bg-red-50">
               Error loading funnel: {funnelError}
             </div>
          ) : funnelData && funnelData.stages.length > 0 ? (
             <div className="space-y-2 p-4 min-h-[16rem] flex flex-col justify-center">
                {funnelData.stages.map((stage, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{index + 1}. {stage.stageName}</span>
                    <span className="font-semibold">{stage.count.toLocaleString()}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">Note: Detailed source attribution (e.g., specific ads) is pending.</p>
             </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No funnel data available.</div>
          )}
        </ChartContainer>
        
        <ChartContainer title="Enrollment Segmentation (by Source Tag)">
          {isLoadingSegmentation ? (
             <Skeleton className="h-64 w-full" />
          ) : segmentationError ? (
             <div className="h-64 flex items-center justify-center p-4 text-red-600 border border-red-300 rounded-md bg-red-50">
               Error loading segmentation: {segmentationError}
             </div>
          ) : segmentationData && segmentationData.groups.length > 0 ? (
             <ResponsiveContainer width="100%" height={256}> 
               <BarChart data={segmentationData.groups} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis type="number" />
                 <YAxis 
                   dataKey="segmentName" 
                   type="category" 
                   width={100} // Adjusted width for longer labels
                   tick={{ fontSize: 12 }} 
                   interval={0} 
                  />
                 <Tooltip formatter={(value: any) => value.toLocaleString()} />
                 <Bar dataKey="count" fill="#8884d8" barSize={30}>
                   {segmentationData.groups.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8884d8' : '#82ca9d'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No segmentation data available.</div>
          )}
        </ChartContainer>
      </div>

      {/* Enrollment Check Tool Section: Use store state and actions */}
      <Card>
        <CardHeader>
           <CardTitle className="text-lg">Check Enrollment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Input 
              type="email"
              placeholder="Enter student email..."
              value={checkEmail} // Use store state
              onChange={(e) => setCheckEmail(e.target.value)} // Use store action
              className="max-w-xs"
              disabled={isLoadingCheck}
            />
            <Button onClick={performCheck} disabled={isLoadingCheck || !checkEmail}> {/* Use store action */} 
              {isLoadingCheck ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              ) : (
                 <Search className="mr-2 h-4 w-4" />
              )}
              Check Status
            </Button>
          </div>
          {checkError && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Error: {checkError}</span>
            </div>
          )}
          {checkResult !== null && (
             <div className={`flex items-center gap-2 p-3 rounded-md border ${checkResult.isEnrolled ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-700'} text-sm`}>
              {checkResult.isEnrolled ? (
                 <CheckCircle className="h-4 w-4 flex-shrink-0" /> 
              ) : (
                 <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>
                {checkResult.isEnrolled 
                  ? `Enrolled. Payment Date: ${checkResult.paymentDate ? format(new Date(checkResult.paymentDate), 'PPP') : 'Not Found'}`
                  : 'Not Enrolled.'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Table Section: Use store state and actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Enrollment Details</h3>
        {/* Search Input: Use local state for input value, store state for debounced value */}
        <div className="mb-4 flex justify-end">
           <div className="relative w-full max-w-sm">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input
               type="search"
               placeholder="Search name or email..."
               className="pl-8"
               value={localSearchTerm} // Use local state for immediate input feedback
               onChange={(e) => setLocalSearchTerm(e.target.value)} // Update local state
             />
           </div>
        </div>
        
        {isLoadingDetails ? (
           <Skeleton className="h-64 w-full" />
        ) : detailsError ? (
           <div className="p-4 text-center text-red-600 border border-red-300 rounded-md bg-red-50">
              Error loading details: {detailsError}
           </div>
        ) : (
          <>
             <DataTable 
               columns={columns} 
               data={tableData} 
               emptyState={<span>No enrollments found for the selected criteria.</span>} 
             />
             {/* Pagination Controls: Use store state and actions */}
             {totalPages > 1 && (
               <div className="flex items-center justify-end space-x-2 py-4">
                 <span className="text-sm text-muted-foreground">
                   Page {detailsPage} of {totalPages}
                 </span>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setDetailsPage(detailsPage - 1)}
                   disabled={detailsPage <= 1}
                 >
                   <ChevronLeft className="h-4 w-4 mr-1" />
                   Previous
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setDetailsPage(detailsPage + 1)}
                   disabled={detailsPage >= totalPages}
                 >
                   Next
                   <ChevronRight className="h-4 w-4 ml-1" />
                 </Button>
               </div>
             )}
          </>
        )}
      </div>
    </div>
  );
} 