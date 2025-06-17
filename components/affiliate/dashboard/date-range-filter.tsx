'use client';

import { useState } from 'react';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAffiliateDashboardStore } from '@/lib/stores/affiliate-dashboard';
import { DateRangeFilter as DateRangeFilterType } from '@/lib/stores/affiliate-dashboard/types';
import { format } from 'date-fns';

interface DateRangeFilterProps {
  onFilterChange?: () => void;
}

export function DateRangeFilter({ onFilterChange }: DateRangeFilterProps) {
  const {
    filterState,
    dateRangeOptions,
    setFilterDateRange,
    setFilterCustomDateRange,
    getCurrentDateRangeLabel,
  } = useAffiliateDashboardStore();

  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    filterState.customStartDate ? new Date(filterState.customStartDate) : undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    filterState.customEndDate ? new Date(filterState.customEndDate) : undefined
  );
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetChange = (dateRange: DateRangeFilterType) => {
    setFilterDateRange(dateRange);
    onFilterChange?.();
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      setFilterCustomDateRange(
        customStartDate.toISOString().split('T')[0],
        customEndDate.toISOString().split('T')[0]
      );
      setIsCustomOpen(false);
      onFilterChange?.();
    }
  };

  const isCustomRange = filterState.dateRange === 'custom';

  return (
    <div className="flex items-center gap-2">
      {/* Preset Date Range Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {getCurrentDateRangeLabel()}
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
                filterState.dateRange === option.id && "bg-accent"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Date Range Picker */}
      {isCustomRange && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {customStartDate && customEndDate ? (
                `${format(customStartDate, 'MMM dd')} - ${format(customEndDate, 'MMM dd')}`
              ) : (
                'Select dates'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  disabled={(date) => date > new Date() || Boolean(customEndDate && date > customEndDate)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => date > new Date() || Boolean(customStartDate && date < customStartDate)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleCustomDateChange}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsCustomOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
} 