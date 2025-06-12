'use client';

import { useState, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { AdminStatusBadge } from './admin-status-badge';
import { AdminFilters } from './admin-filters';

// Generic column definition interface
export interface AdminTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
  width?: string;
}

// Generic filter definition interface
export interface AdminTableFilter {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'dateRange';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

// Action menu item interface
export interface AdminTableAction<T = any> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  disabled?: (item: T) => boolean;
  variant?: 'default' | 'destructive';
}

// Tab configuration interface
export interface AdminTableTab {
  key: string;
  label: string;
  count?: number;
  filter?: (item: any) => boolean;
}

// Main props interface
export interface AdminDataTableProps<T = any> {
  // Data
  data: T[];
  columns: AdminTableColumn<T>[];
  
  // Identification
  idField: string; // Field to use as unique identifier
  
  // Navigation
  onRowClick?: (item: T) => void;
  
  // Selection
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // Actions
  actions?: AdminTableAction<T>[];
  bulkActions?: AdminTableAction<T[]>[];
  
  // Filtering & Search
  searchable?: boolean;
  searchFields?: string[]; // Fields to search in
  filters?: AdminTableFilter[];
  
  // Tabs
  tabs?: AdminTableTab[];
  
  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
  
  // Sorting
  sortable?: boolean;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  
  // Loading & Empty states
  loading?: boolean;
  emptyState?: ReactNode;
  
  // Styling
  className?: string;
}

export function AdminDataTable<T extends Record<string, any>>({
  data,
  columns,
  idField,
  onRowClick,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  actions = [],
  bulkActions = [],
  searchable = true,
  searchFields = [],
  filters = [],
  tabs = [],
  pagination,
  sortable = true,
  defaultSort,
  onSortChange,
  loading = false,
  emptyState,
  className = '',
}: AdminDataTableProps<T>) {
  const router = useRouter();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'all');
  const [sortField, setSortField] = useState(defaultSort?.field || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSort?.direction || 'desc');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchable && searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }

    // Apply tab filter
    if (tabs.length > 0 && activeTab !== 'all') {
      const activeTabConfig = tabs.find(tab => tab.key === activeTab);
      if (activeTabConfig?.filter) {
        filtered = filtered.filter(activeTabConfig.filter);
      }
    }

    // Apply custom filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          const itemValue = item[key];
          return itemValue === value;
        });
      }
    });

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, searchFields, activeTab, tabs, filterValues, sortField, sortDirection]);

  // Selection helpers
  const allSelected = useMemo(() => {
    return processedData.length > 0 && 
           processedData.every(item => selectedItems.includes(item[idField]));
  }, [processedData, selectedItems, idField]);

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allIds = processedData.map(item => item[idField]);
      onSelectionChange([...new Set([...selectedItems, ...allIds])]);
    } else {
      const currentIds = processedData.map(item => item[idField]);
      onSelectionChange(selectedItems.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  // Sorting helpers
  const handleSort = (field: string) => {
    if (!sortable) return;
    
    let newDirection: 'asc' | 'desc' = 'desc';
    if (sortField === field && sortDirection === 'desc') {
      newDirection = 'asc';
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    
    if (onSortChange) {
      onSortChange(field, newDirection);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  // Render table content
  const renderTableContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} 
                     className="text-center py-8">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (processedData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} 
                     className="text-center py-8">
            {emptyState || 'No data found.'}
          </TableCell>
        </TableRow>
      );
    }

    return processedData.map((item) => (
      <TableRow
        key={item[idField]}
        className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
        onClick={() => onRowClick?.(item)}
      >
        {/* Selection checkbox */}
        {selectable && (
          <TableCell className="w-[50px]" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedItems.includes(item[idField])}
              onCheckedChange={(checked) => 
                handleSelectItem(item[idField], checked as boolean)
              }
            />
          </TableCell>
        )}

        {/* Data columns */}
        {columns.map((column) => (
          <TableCell 
            key={column.key} 
            className={column.className}
            style={column.width ? { width: column.width } : undefined}
          >
            {column.render ? column.render(item) : item[column.key]}
          </TableCell>
        ))}

        {/* Actions menu */}
        {actions.length > 0 && (
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {actions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => action.onClick(item)}
                    disabled={action.disabled?.(item)}
                    className={action.variant === 'destructive' ? 'text-destructive' : ''}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  const tableContent = (
    <div className={`space-y-4 ${className}`}>
      {/* Filters and Search */}
      <AdminFilters
        searchable={searchable}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={setFilterValues}
      />

      {/* Bulk Actions */}
      {selectable && selectedItems.length > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedItems.length} item(s) selected
          </span>
          {bulkActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => action.onClick(
                processedData.filter(item => selectedItems.includes(item[idField]))
              )}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection header */}
              {selectable && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.sortable !== false && sortable ? 'cursor-pointer hover:bg-muted/50' : ''} ${column.className || ''}`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={column.width ? { width: column.width } : undefined}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && sortable && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}

              {/* Actions header */}
              {actions.length > 0 && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableContent()}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {Math.ceil(pagination.totalCount / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.totalCount / pagination.pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Wrap in tabs if configured
  if (tabs.length > 0) {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs">({tab.count})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {tableContent}
        </TabsContent>
      </Tabs>
    );
  }

  return tableContent;
} 