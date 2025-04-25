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

interface Filters {
  dateRange?: DateRange; // Keep the type for future use
  granularity?: Granularity;
  sourcePlatform?: SourcePlatformFilter;
}

interface Props {
  onChange: (filters: Filters) => void;
  // Pass initial values from the parent (Zustand store)
  initialFilters?: Filters;
}

const RevenueFilters: React.FC<Props> = ({ onChange, initialFilters }) => {
  // Use initial values from props if provided, otherwise use defaults
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(initialFilters?.dateRange);
  const [granularity, setGranularity] = React.useState<Granularity>(initialFilters?.granularity || 'daily');
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatformFilter>(initialFilters?.sourcePlatform || 'all');

  // Update local state if initialFilters prop changes (optional, depends on desired behavior)
  React.useEffect(() => {
    setDateRange(initialFilters?.dateRange);
    setGranularity(initialFilters?.granularity || 'daily');
    setSourcePlatform(initialFilters?.sourcePlatform || 'all');
  }, [initialFilters]);

  // Notify parent component when any filter changes
  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range); // Update local state
    onChange({ dateRange: range, granularity, sourcePlatform }); // Notify parent
  };

  const handleGranularityChange = (value: string) => {
    const newGranularity = value as Granularity;
    setGranularity(newGranularity); // Update local state
    onChange({ dateRange, granularity: newGranularity, sourcePlatform }); // Notify parent
  };

  const handlePlatformChange = (value: string) => {
    const newPlatform = value as SourcePlatformFilter;
    setSourcePlatform(newPlatform); // Update local state
    onChange({ dateRange, granularity, sourcePlatform: newPlatform }); // Notify parent
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Date Range Picker */}
      <div>
        <Label htmlFor="date-range" className="text-sm font-medium mb-1 block">Date Range</Label>
        {/* Use the actual DateRangePicker component */}
        <DateRangePicker
          value={dateRange}
          onChange={handleDateChange}
        />
        {/* Remove the placeholder div */}
        {/* <div className="p-2 border rounded-md bg-muted text-muted-foreground">Date Picker Placeholder</div> */}
      </div>

      {/* Granularity Selector */}
      <div>
        <Label htmlFor="granularity" className="text-sm font-medium mb-1 block">Granularity</Label>
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