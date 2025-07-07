'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import { ChartContainer } from './chart-container';
import { DataTable } from './data-table';
import { FilterDropdown } from './filter-dropdown';
import { Users, UserPlus, TrendingUp, Activity, Calendar, Target } from 'lucide-react';
import { useSharedDashboardFiltersStore } from '@/lib/stores/admin/sharedDashboardFiltersStore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type EnrollmentMetrics = {
  summary: {
    totalEnrollmentsToday: number;
    totalEnrollmentsThisMonth: number;
    totalEnrollmentsInRange: number;
    previousPeriodEnrollments: number;
    trendPercentage: number;
  };
  todayBySource: Array<{
    acquisition_source: string;
    enrollments_today: number;
  }>;
  monthlyBySource: Array<{
    acquisition_source: string;
    enrollments_this_month: number;
  }>;
  recentEnrollments: Array<{
    enrollment_id: string;
    enrolled_at: string;
    status: string;
    user_id: string;
    email: string;
    acquisition_source: string;
    course_title: string;
    userName: string;
  }>;
};

/**
 * EnrollmentsSection - Enhanced enrollments analytics with acquisition source tracking.
 * Shows today's enrollments, monthly enrollments by source, and detailed insights.
 */
export function EnrollmentsSection() {
  const { dateRange } = useSharedDashboardFiltersStore();
  const [acquisitionSource, setAcquisitionSource] = useState('all');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const formatPercent = (value: number | null) => {
    if (value === null || isNaN(value)) return "-";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}% vs prev. period`;
  };

  // Fetch enrollment data
  useEffect(() => {
    const fetchEnrollmentData = async () => {
      if (!dateRange?.from) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.append('startDate', dateRange.from.toISOString());
        const endDate = dateRange.to || dateRange.from;
        params.append('endDate', endDate.toISOString());

        const response = await fetch(`/api/admin/dashboard/enrollment-metrics?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch enrollment metrics (${response.status})`);
        }
        
        const data: EnrollmentMetrics = await response.json();
        setEnrollmentData(data);
      } catch (err: any) {
        console.error('Error fetching enrollment data:', err);
        setError(err.message || 'Failed to load enrollment data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollmentData();
  }, [dateRange]);

  // Filter data based on acquisition source
  const filteredEnrollments = enrollmentData?.recentEnrollments.filter(enrollment => 
    acquisitionSource === 'all' || enrollment.acquisition_source === acquisitionSource
  ) || [];

  // Prepare table data
  const columns = [
    { header: 'User', accessor: 'userName' },
    { header: 'Email', accessor: 'email' },
    { header: 'Course', accessor: 'course_title' },
    { header: 'Source', accessor: 'acquisition_source' },
    { header: 'Enrolled At', accessor: 'enrolledAtFormatted' },
  ];
  
  const tableData = filteredEnrollments.map(item => ({
    ...item,
    enrolledAtFormatted: item.enrolled_at ? format(new Date(item.enrolled_at), 'PPpp') : '-',
  }));

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        Error loading enrollment data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : (
          <>
            <MetricCard
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              title="Enrolled Today"
              value={enrollmentData?.summary.totalEnrollmentsToday || 0}
              description="New enrollments today"
            />
            <MetricCard
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="Enrolled This Month"
              value={enrollmentData?.summary.totalEnrollmentsThisMonth || 0}
              description="Monthly enrollments"
            />
            <MetricCard
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              title="Period Enrollments"
              value={enrollmentData?.summary.totalEnrollmentsInRange || 0}
              description={formatPercent(enrollmentData?.summary.trendPercentage || null)}
            />
            <MetricCard
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              title="Recent Activity"
              value={filteredEnrollments.length}
              description="Displayed entries"
            />
          </>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <FilterDropdown
          label="Acquisition Source"
          value={acquisitionSource}
          onChange={setAcquisitionSource}
          options={[
            { label: 'All Sources', value: 'all' },
            { label: 'Payment Flow', value: 'payment_flow' },
            { label: 'Migrated', value: 'migrated' },
            { label: 'Manual', value: 'MANUAL' },
            { label: 'Admin Import', value: 'admin_import' },
          ]}
        />
      </div>
      
      {/* Enrollment Sources Overview */}
      <ChartContainer title="Enrollments by Acquisition Source">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !enrollmentData ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No enrollment data available
          </div>
        ) : (
          <div className="space-y-6 p-4">
            <div>
              <h4 className="font-medium text-lg mb-4">Today's Enrollments by Source</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {enrollmentData.todayBySource.map((source, idx) => (
                  <div key={idx} className="text-center p-4 bg-muted rounded-lg">
                    <h5 className="font-medium">{source.acquisition_source}</h5>
                    <p className="text-2xl font-bold text-primary">{source.enrollments_today}</p>
                    <p className="text-sm text-muted-foreground">enrollments today</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-lg mb-4">This Month's Enrollments by Source</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {enrollmentData.monthlyBySource.slice(0, 6).map((source, idx) => (
                  <div key={idx} className="text-center p-4 bg-muted rounded-lg">
                    <h5 className="font-medium">{source.acquisition_source}</h5>
                    <p className="text-2xl font-bold text-primary">{source.enrollments_this_month}</p>
                    <p className="text-sm text-muted-foreground">enrollments this month</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ChartContainer>
      
      {/* Enrollments Data Table */}
      <DataTable 
        columns={columns} 
        data={tableData} 
        emptyState={
          <span>
            {isLoading ? 'Loading...' : 'No enrollments found for the selected filters.'}
          </span>
        } 
      />
    </div>
  );
} 