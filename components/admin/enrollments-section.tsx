import { useState } from 'react';
import { MetricCard } from './metric-card';
import { ChartContainer } from './chart-container';
import { DataTable } from './data-table';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { FilterDropdown } from './filter-dropdown';
import { Users } from 'lucide-react';

/**
 * EnrollmentsSection - Placeholder for dashboard enrollments analytics.
 * Uses MetricCard, ChartContainer, DataTable, DateRangePicker, and FilterDropdown.
 * Ready for future expansion.
 */
export function EnrollmentsSection() {
  // Update state to use DateRange from react-day-picker
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [status, setStatus] = useState('all');

  // Example columns and data for DataTable
  const columns = [
    { header: 'User', accessor: 'user' },
    { header: 'Course', accessor: 'course' },
    { header: 'Status', accessor: 'status' },
    { header: 'Enrolled At', accessor: 'enrolledAt' },
  ];
  const data: any[] = [];

  return (
    <div className="space-y-6">
      {/* Example metric card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          title="Total Enrollments"
          value={0}
          description="Demo only"
        />
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <FilterDropdown
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Expired', value: 'expired' },
            { label: 'Pending', value: 'pending' },
          ]}
        />
      </div>
      {/* Chart placeholder */}
      <ChartContainer title="Enrollment Trends">
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Enrollment Trends Chart Coming Soon
        </div>
      </ChartContainer>
      {/* Data table placeholder */}
      <DataTable columns={columns} data={data} emptyState={<span>No enrollments found.</span>} />
    </div>
  );
} 