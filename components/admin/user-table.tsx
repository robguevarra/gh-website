'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  MoreHorizontal,
  UserCog,
  Trash2,
  CreditCard,
  GraduationCap,
  Clock,
  Tag,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExtendedUnifiedProfile, UserSearchParams } from '@/types/admin-types';

const statusColorMap: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  pending: 'bg-yellow-500',
  suspended: 'bg-red-500',
};

interface UserTableProps {
  users: ExtendedUnifiedProfile[];
  searchParams: UserSearchParams;
  page: number;
  pageSize: number;
  totalPages: number;
}

type SortField = 'name' | 'status' | 'source' | 'activity' | 'joined' | '';
type SortDirection = 'asc' | 'desc' | '';

export default function UserTable({ users, searchParams, page, pageSize, totalPages }: UserTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Remove searchInput state as we'll use the UserFilters component for search
  const [sortField, setSortField] = useState<SortField>(searchParams.sortField as SortField || '');
  const [sortDirection, setSortDirection] = useState<SortDirection>(searchParams.sortDirection as SortDirection || '');

  // Initialize sort state from URL params on component mount
  useEffect(() => {
    if (searchParams.sortField) {
      setSortField(searchParams.sortField as SortField);
    }
    if (searchParams.sortDirection) {
      setSortDirection(searchParams.sortDirection as SortDirection);
    }
  }, [searchParams.sortField, searchParams.sortDirection]);

  // Create a function to generate URLs with updated search params
  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams();

    // Add current search params
    if (searchParams.searchTerm) newParams.set('search', searchParams.searchTerm.toString());
    if (searchParams.status) newParams.set('status', searchParams.status.toString());
    if (searchParams.acquisitionSource) newParams.set('source', searchParams.acquisitionSource.toString());
    if (searchParams.hasTransactions !== undefined) newParams.set('hasTransactions', searchParams.hasTransactions.toString());
    if (searchParams.hasEnrollments !== undefined) newParams.set('hasEnrollments', searchParams.hasEnrollments.toString());
    if (searchParams.createdAfter) newParams.set('createdAfter', searchParams.createdAfter.toString());
    if (searchParams.createdBefore) newParams.set('createdBefore', searchParams.createdBefore.toString());
    if (searchParams.tags) newParams.set('tags', searchParams.tags.join(','));
    if (page) newParams.set('page', page.toString());
    if (pageSize) newParams.set('pageSize', pageSize.toString());

    // Update with new params
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    return newParams.toString();
  };

  // Handle column sorting
  const handleSort = (field: SortField) => {
    let direction: SortDirection = 'asc';

    // If already sorting by this field, toggle direction or clear
    if (field === sortField) {
      if (sortDirection === 'asc') {
        direction = 'desc';
      } else if (sortDirection === 'desc') {
        // Clear sorting
        field = '';
        direction = '';
      }
    }

    // Update state
    setSortField(field);
    setSortDirection(direction);

    // Update URL
    router.push(
      `${pathname}?${createQueryString({
        sortField: field || null,
        sortDirection: direction || null,
        page: 1, // Reset to first page when sorting changes
      })}`
    );
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }

    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleStatusChange = (newStatus: string) => {
    router.push(`${pathname}?${createQueryString({ status: newStatus === 'all' ? null : newStatus, page: 1 })}`);
  };

  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    router.push(`${pathname}?${createQueryString({ page: newPage })}`);
  };
  
  // Generate user initials for avatar
  const getUserInitials = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase();
  };
  
  // Get full name
  const getFullName = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) return 'Unknown User';
    return [firstName, lastName].filter(Boolean).join(' ');
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="w-full rounded-md border">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search form removed - now handled by UserFilters component */}
        
        <div className="flex items-center gap-2 ml-auto">
          <Select
            defaultValue={searchParams.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
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
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                Name
                {getSortIcon('name')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {getSortIcon('status')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('source')}
            >
              <div className="flex items-center">
                Source
                {getSortIcon('source')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('activity')}
            >
              <div className="flex items-center">
                Activity
                {getSortIcon('activity')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('joined')}
            >
              <div className="flex items-center">
                Joined
                {getSortIcon('joined')}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar>
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={getFullName(user.first_name, user.last_name)} />
                    ) : (
                      <AvatarFallback>{getUserInitials(user.first_name, user.last_name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">{getFullName(user.first_name, user.last_name)}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    {user.phone && <div className="text-xs text-muted-foreground">{user.phone}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColorMap[user.status] || 'bg-gray-500'}>
                  {user.status || 'Unknown'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.acquisition_source ? (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span>{user.acquisition_source}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
                {user.tags && user.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {user.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Last login: {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                    <span>Transactions: {user.transaction_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    <span>Enrollments: {user.enrollment_count || 0}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatDate(user.created_at)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/${user.id}`}>
                        <UserCog className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/${user.id}/edit`}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Edit User
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <span className="sr-only">Next Page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 