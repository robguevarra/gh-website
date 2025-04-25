'use client';

import React from 'react';
import { DateRange } from 'react-day-picker';
// Import the newly created component
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type SourcePlatformFilter = 'all' | 'xendit' | 'shopify';

// UPDATE: onChange only handles non-date filters
interface Filters {
  granularity?: Granularity;
  sourcePlatform?: SourcePlatformFilter;
}

// UPDATE: Add props for shared date range state 
// REMOVE: dateRange from initialFilters
interface Props {
  dateRange: DateRange | undefined; // Controlled by parent
  onDateRangeChange: (range: DateRange | undefined) => void; // Notify parent of date change
  granularity: Granularity; // Controlled by parent store
  sourcePlatform: SourcePlatformFilter; // Controlled by parent store
  onChange: (filters: Filters) => void; // Notify parent of non-date filter changes
}

const RevenueFilters: React.FC<Props> = ({ 
  dateRange, 
  onDateRangeChange, 
  granularity, 
  sourcePlatform,
  onChange 
}) => {
  // REMOVE: Local state for dateRange is replaced by props
  // const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialFilters?.dateRange);
  // REMOVE: Local state for granularity/platform, controlled by parent
  // const [granularity, setGranularity] = React.useState<Granularity>(initialFilters?.granularity || 'daily');
  // const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatformFilter>(initialFilters?.sourcePlatform || 'all');

  // REMOVE: Effect for initialFilters is no longer needed as props control state directly
  // React.useEffect(() => {
  //   setDateRange(initialFilters?.dateRange);
  //   setGranularity(initialFilters?.granularity || 'daily');
  //   setSourcePlatform(initialFilters?.sourcePlatform || 'all');
  // }, [initialFilters]);

  // REMOVE: handleDateChange is replaced by directly passing onDateRangeChange prop
  // const handleDateChange = (range: DateRange | undefined) => {
  //   setDateRange(range); // Update local state
  //   onChange({ dateRange: range, granularity, sourcePlatform }); // Notify parent
  // };

  // UPDATE: handleGranularityChange only calls onChange with granularity
  const handleGranularityChange = (value: string) => {
    const newGranularity = value as Granularity;
    // REMOVE: setGranularity(newGranularity); // No local state
    onChange({ granularity: newGranularity }); // Notify parent of granularity change only
  };

  // UPDATE: handlePlatformChange only calls onChange with sourcePlatform
  const handlePlatformChange = (value: string) => {
    const newPlatform = value as SourcePlatformFilter;
    // REMOVE: setSourcePlatform(newPlatform); // No local state
    onChange({ sourcePlatform: newPlatform }); // Notify parent of platform change only
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Date Range Picker */}
      <div>
        <Label htmlFor="date-range" className="text-sm font-medium mb-1 block">Date Range</Label>
        {/* Use props directly from parent (shared store) */}
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange} // Directly use the handler passed from parent
        />
      </div>

      {/* Granularity Selector */}
      <div>
        <Label htmlFor="granularity" className="text-sm font-medium mb-1 block">Granularity</Label>
        {/* Value comes from props, onChange calls updated handler */}
        <Select value={granularity} onValueChange={handleGranularityChange}>
          <SelectTrigger id="granularity" className="w-[180px]">
            <SelectValue placeholder="Select Granularity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Source Platform Filter */}
      <div>
        <Label htmlFor="source-platform" className="text-sm font-medium mb-1 block">Source Platform</Label>
        {/* Value comes from props, onChange calls updated handler */}
        <Select value={sourcePlatform} onValueChange={handlePlatformChange}>
          <SelectTrigger id="source-platform" className="w-[180px]">
            <SelectValue placeholder="Select Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="xendit">Xendit</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RevenueFilters; 