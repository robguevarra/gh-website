import React from 'react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker'; // Corrected import name
import { Button } from '@/components/ui/button';

interface MarketingFiltersProps {
  filters: { startDate: string | null; endDate: string | null };
  setFilters: (filters: { startDate: string | null; endDate: string | null }) => void;
  // Add other filter setters as needed
}

const MarketingFilters: React.FC<MarketingFiltersProps> = ({ filters, setFilters }) => {

  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from ? dateRange.from.toISOString() : null,
      endDate: dateRange?.to ? dateRange.to.toISOString() : null,
    });
  };

  // Convert ISO strings back to Date objects for the picker
  const dateRangeValue: DateRange | undefined = {
    from: filters.startDate ? new Date(filters.startDate) : undefined,
    to: filters.endDate ? new Date(filters.endDate) : undefined,
  };

  return (
    <div className="mb-6 p-4 bg-card rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Date Range Picker */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Date Range</label>
          <DateRangePicker value={dateRangeValue} onChange={handleDateChange} />
        </div>

        {/* Placeholder for other filters (e.g., Channel selector) */}
        {/*
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Channel</label>
          <Select ... > ... </Select>
        </div>
        */}

        {/* Apply Button (optional - could trigger on change) */}
        {/*
        <div className="self-end">
          <Button>Apply Filters</Button>
        </div>
        */}
      </div>
    </div>
  );
};

export default MarketingFilters; 