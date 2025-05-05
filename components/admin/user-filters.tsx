'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserSearchParams } from '@/types/admin-types';

interface UserFiltersProps {
  currentFilters: Partial<UserSearchParams>;
}

export function UserFilters({ currentFilters }: UserFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // State for filter values
  const [searchTerm, setSearchTerm] = useState(currentFilters.searchTerm || '');
  const [status, setStatus] = useState(currentFilters.status || 'all');
  const [acquisitionSource, setAcquisitionSource] = useState(currentFilters.acquisitionSource || 'all');
  const [hasTransactions, setHasTransactions] = useState<string>(
    currentFilters.hasTransactions !== undefined 
      ? String(currentFilters.hasTransactions) 
      : 'any'
  );
  const [hasEnrollments, setHasEnrollments] = useState<string>(
    currentFilters.hasEnrollments !== undefined 
      ? String(currentFilters.hasEnrollments) 
      : 'any'
  );
  const [createdAfter, setCreatedAfter] = useState<Date | null>(
    currentFilters.createdAfter 
      ? new Date(currentFilters.createdAfter) 
      : null
  );
  const [createdBefore, setCreatedBefore] = useState<Date | null>(
    currentFilters.createdBefore 
      ? new Date(currentFilters.createdBefore) 
      : null
  );
  
  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (status) count++;
    if (acquisitionSource) count++;
    if (hasTransactions) count++;
    if (hasEnrollments) count++;
    if (createdAfter) count++;
    if (createdBefore) count++;
    return count;
  };
  
  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    // Add search term if present
    if (searchTerm) {
      params.set('search', searchTerm); // Changed from 'searchTerm' to 'search' to match page.tsx
    }
    
    // Add filters if they have values
    if (status && status !== 'all') {
      params.set('status', status);
    }
    
    if (acquisitionSource && acquisitionSource !== 'all') {
      params.set('source', acquisitionSource); // Changed from 'acquisitionSource' to 'source' to match page.tsx
    }
    
    if (hasTransactions && hasTransactions !== 'any') {
      params.set('hasTransactions', hasTransactions);
    }
    
    if (hasEnrollments && hasEnrollments !== 'any') {
      params.set('hasEnrollments', hasEnrollments);
    }
    
    if (createdAfter) {
      params.set('createdAfter', format(createdAfter, 'yyyy-MM-dd'));
    }
    
    if (createdBefore) {
      params.set('createdBefore', format(createdBefore, 'yyyy-MM-dd'));
    }
    
    // Navigate to the filtered URL
    router.push(`${pathname}?${params.toString()}`);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatus('all');
    setAcquisitionSource('all');
    setHasTransactions('any');
    setHasEnrollments('any');
    setCreatedAfter(null);
    setCreatedBefore(null);
    
    // Navigate to the base URL without params
    router.push(pathname);
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  // Get active filter badges
  const getFilterBadges = () => {
    const badges = [];
    
    if (status && status !== 'all') {
      badges.push(
        <Badge key="status" variant="secondary" className="mr-2 mb-2">
          Status: {status}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setStatus('all'); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    if (acquisitionSource && acquisitionSource !== 'all') {
      badges.push(
        <Badge key="source" variant="secondary" className="mr-2 mb-2">
          Source: {acquisitionSource}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setAcquisitionSource('all'); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    if (hasTransactions && hasTransactions !== 'any') {
      badges.push(
        <Badge key="transactions" variant="secondary" className="mr-2 mb-2">
          Has Transactions: {hasTransactions === 'true' ? 'Yes' : 'No'}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setHasTransactions('any'); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    if (hasEnrollments && hasEnrollments !== 'any') {
      badges.push(
        <Badge key="enrollments" variant="secondary" className="mr-2 mb-2">
          Has Enrollments: {hasEnrollments === 'true' ? 'Yes' : 'No'}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setHasEnrollments('any'); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    if (createdAfter) {
      badges.push(
        <Badge key="createdAfter" variant="secondary" className="mr-2 mb-2">
          Created After: {format(createdAfter, 'MMM d, yyyy')}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setCreatedAfter(null); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    if (createdBefore) {
      badges.push(
        <Badge key="createdBefore" variant="secondary" className="mr-2 mb-2">
          Created Before: {format(createdBefore, 'MMM d, yyyy')}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1" 
            onClick={() => { setCreatedBefore(null); applyFilters(); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }
    
    return badges;
  };
  
  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>
      
      {/* Filter Badges */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center">
          {getFilterBadges()}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs" 
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>
      )}
      
      {/* Advanced Filters */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters">
          <AccordionTrigger>
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Acquisition Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Acquisition Source</Label>
                <Select value={acquisitionSource} onValueChange={setAcquisitionSource}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Has Transactions */}
              <div className="space-y-2">
                <Label htmlFor="hasTransactions">Has Transactions</Label>
                <Select value={hasTransactions} onValueChange={setHasTransactions}>
                  <SelectTrigger id="hasTransactions">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Has Enrollments */}
              <div className="space-y-2">
                <Label htmlFor="hasEnrollments">Has Enrollments</Label>
                <Select value={hasEnrollments} onValueChange={setHasEnrollments}>
                  <SelectTrigger id="hasEnrollments">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Created After */}
              <div className="space-y-2">
                <Label htmlFor="createdAfter">Created After</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="createdAfter"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !createdAfter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createdAfter ? format(createdAfter, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={createdAfter as any}
                      onSelect={(date: Date | undefined) => setCreatedAfter(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Created Before */}
              <div className="space-y-2">
                <Label htmlFor="createdBefore">Created Before</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="createdBefore"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !createdBefore && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createdBefore ? format(createdBefore, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={createdBefore as any}
                      onSelect={(date: Date | undefined) => setCreatedBefore(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Reset
              </Button>
              <Button onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
