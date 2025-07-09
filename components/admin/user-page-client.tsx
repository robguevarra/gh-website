'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserSearchParams } from '@/types/admin-types';
import { Button } from '@/components/ui/button';
import { Plus, Filter, UserSearch } from 'lucide-react';
import { UserFilters, AdminHeading } from '@/components/admin';

interface UserPageClientProps {
  children: React.ReactNode;
  searchParams: { [key: string]: string | string[] | undefined };
}

export function UserPageClient({ children, searchParams }: UserPageClientProps) {
  // Show filters by default for better user experience
  const [showFilters, setShowFilters] = useState(true);
  const router = useRouter();
  
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminHeading
          title="Users"
          description="Manage user accounts, permissions, and profile information."
        />
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/admin/tag-management')}
          >
            <UserSearch className="mr-2 h-4 w-4" />
            User Tag Management
          </Button>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Link>
          </Button>
        </div>
      </div>
      
      {showFilters && (
        <UserFilters currentFilters={searchParams as Partial<UserSearchParams>} />
      )}
      
      {children}
    </div>
  );
}
