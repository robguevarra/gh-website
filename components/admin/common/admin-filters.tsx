'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Filter definition interface (shared with AdminDataTable)
export interface AdminTableFilter {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'dateRange';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface AdminFiltersProps {
  // Search functionality
  searchable?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filters
  filters?: AdminTableFilter[];
  filterValues?: Record<string, any>;
  onFilterChange?: (values: Record<string, any>) => void;
  
  // Layout
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function AdminFilters({
  searchable = true,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  layout = 'horizontal',
  className = '',
}: AdminFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle filter value changes
  const handleFilterChange = (key: string, value: any) => {
    if (!onFilterChange) return;
    
    const newValues = { ...filterValues, [key]: value };
    onFilterChange(newValues);
  };

  // Clear all filters
  const clearFilters = () => {
    if (!onFilterChange) return;
    onFilterChange({});
    if (onSearchChange) onSearchChange('');
  };

  // Count active filters
  const activeFilterCount = Object.values(filterValues).filter(
    value => value && value !== 'all' && value !== ''
  ).length + (searchTerm ? 1 : 0);

  // Render individual filter
  const renderFilter = (filter: AdminTableFilter) => {
    const value = filterValues[filter.key] || '';

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium">{filter.label}</label>
            <Select
              value={value}
              onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        const dateValue = value ? new Date(value) : null;
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium">{filter.label}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateValue && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateValue ? format(dateValue, 'PPP') : filter.placeholder || 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateValue || undefined}
                  onSelect={(date) => 
                    handleFilterChange(filter.key, date ? date.toISOString().split('T')[0] : '')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'dateRange':
        // For date range, expect filter.key to be something like 'dateRange'
        // and we'll use startDate and endDate keys
        const startDate = filterValues[`${filter.key}Start`] ? new Date(filterValues[`${filter.key}Start`]) : null;
        const endDate = filterValues[`${filter.key}End`] ? new Date(filterValues[`${filter.key}End`]) : null;
        
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium">{filter.label}</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                                   <Calendar
                   mode="single"
                   selected={startDate || undefined}
                   onSelect={(date) => 
                     handleFilterChange(`${filter.key}Start`, date ? date.toISOString().split('T')[0] : '')
                   }
                   initialFocus
                 />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                                   <Calendar
                   mode="single"
                   selected={endDate || undefined}
                   onSelect={(date) => 
                     handleFilterChange(`${filter.key}End`, date ? date.toISOString().split('T')[0] : '')
                   }
                   initialFocus
                 />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 'search':
      default:
        return (
          <div key={filter.key} className="space-y-2">
            <label className="text-sm font-medium">{filter.label}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        );
    }
  };

  // Render active filter badges
  const renderActiveFilters = () => {
    const badges = [];
    
    // Search term badge
    if (searchTerm) {
      badges.push(
        <Badge key="search" variant="secondary" className="gap-1">
          Search: {searchTerm}
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => onSearchChange?.('')}
          />
        </Badge>
      );
    }
    
    // Filter badges
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        const filter = filters.find(f => f.key === key || key.startsWith(f.key));
        if (filter) {
          let displayValue = value;
          
          // For select filters, find the option label
          if (filter.type === 'select' && filter.options) {
            const option = filter.options.find(opt => opt.value === value);
            displayValue = option?.label || value;
          }
          
          // For date filters, format the date
          if (filter.type === 'date' || key.includes('Date')) {
            try {
              displayValue = format(new Date(value), 'PP');
            } catch {
              // Keep original value if date parsing fails
            }
          }
          
          badges.push(
            <Badge key={key} variant="secondary" className="gap-1">
              {filter.label}: {displayValue}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange(key, '')}
              />
            </Badge>
          );
        }
      }
    });
    
    return badges;
  };

  const containerClass = layout === 'horizontal' 
    ? 'flex flex-col md:flex-row gap-4'
    : 'space-y-4';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main filters row */}
      <div className={containerClass}>
        {/* Search */}
        {searchable && (
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        
        {/* Basic filters (first few filters) */}
        {filters.slice(0, 3).map(renderFilter)}
        
        {/* Advanced filters toggle */}
        {filters.length > 3 && (
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            More Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
        
        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="shrink-0">
            Clear All
          </Button>
        )}
      </div>
      
      {/* Advanced filters */}
      {showAdvanced && filters.length > 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
          {filters.slice(3).map(renderFilter)}
        </div>
      )}
      
      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {renderActiveFilters()}
        </div>
      )}
    </div>
  );
} 