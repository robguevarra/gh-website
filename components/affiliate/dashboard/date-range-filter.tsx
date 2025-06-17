'use client';

import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAffiliateDashboardStore } from '@/lib/stores/affiliate-dashboard';
import { DateRangeFilter as DateRangeFilterType } from '@/lib/stores/affiliate-dashboard/types';
import { useEffect, useState } from 'react';

interface DateRangeFilterProps {
  onFilterChange?: () => void;
}

export function DateRangeFilter({ onFilterChange }: DateRangeFilterProps) {
  // Use explicit selectors to ensure proper re-rendering
  const filterState = useAffiliateDashboardStore((state) => state.filterState);
  const dateRangeOptions = useAffiliateDashboardStore((state) => state.dateRangeOptions);
  const setFilterDateRange = useAffiliateDashboardStore((state) => state.setFilterDateRange);
  
  // Local state to force re-render if needed
  const [currentDateRange, setCurrentDateRange] = useState(filterState.dateRange);
  
  // Sync local state with store state
  useEffect(() => {
    setCurrentDateRange(filterState.dateRange);
  }, [filterState.dateRange]);

  const handlePresetChange = (dateRange: DateRangeFilterType) => {
    setFilterDateRange(dateRange);
    setCurrentDateRange(dateRange); // Update local state immediately
    onFilterChange?.();
  };

  // Get the current label by finding the option that matches the current dateRange
  const currentLabel = dateRangeOptions.find(option => option.id === currentDateRange)?.label || 'All Time';

  return (
    <div className="flex items-center gap-2">
      {/* Date Range Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {currentLabel}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {dateRangeOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handlePresetChange(option.id)}
              className={cn(
                "cursor-pointer",
                currentDateRange === option.id && "bg-accent"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 