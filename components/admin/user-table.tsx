'use client';

import { useState } from 'react';
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

const roleColorMap: Record<string, string> = {
  admin: 'bg-red-500',
  instructor: 'bg-blue-500',
  user: 'bg-green-500',
  moderator: 'bg-yellow-500',
  marketing: 'bg-purple-500',
};

type User = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  is_admin: boolean;
  user_memberships: Array<{
    id: string;
    status: string;
    membership_tier_id: string;
    membership_tiers: {
      name: string;
    }[];
  }>;
};

interface UserTableProps {
  users: User[];
  totalPages: number;
  page: number;
  search: string;
  role: string;
}

export default function UserTable({
  users,
  totalPages,
  page,
  search,
  role,
}: UserTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(search || '');
  
  // Create a function to generate URLs with updated search params
  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams();
    
    // Add current search params
    if (search) newParams.set('search', search);
    if (role) newParams.set('role', role);
    if (page) newParams.set('page', page.toString());
    
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
  
  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${pathname}?${createQueryString({ search: searchInput, page: 1 })}`);
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    router.push(`${pathname}?${createQueryString({ search: null, page: 1 })}`);
  };
  
  // Handle role filter change
  const handleRoleChange = (newRole: string) => {
    router.push(`${pathname}?${createQueryString({ role: newRole === 'all' ? null : newRole, page: 1 })}`);
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
        <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="w-full pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
        
        <div className="flex items-center gap-2">
          <Select
            defaultValue={role || 'all'}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Joined</TableHead>
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
                    {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={roleColorMap[user.role]}>
                  {user.role}
                </Badge>
                {user.is_admin && (
                  <Badge variant="secondary" className="ml-2 bg-red-500">
                    Admin
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.user_memberships?.length > 0 ? (
                  user.user_memberships.map((membership) => (
                    <Badge key={membership.id} variant="outline">
                      {membership.membership_tiers[0]?.name || 'Unknown'}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No membership</span>
                )}
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