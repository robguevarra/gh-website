import Link from 'next/link';
import { UserSearchParams } from '@/types/admin-types';

// Import admin components from the index file
import { UserTable, UserFilters, AdminHeading, UserPageClient } from '@/components/admin';

// Direct import of functions to avoid module resolution issues
import { searchUsers, getUserCount } from '@/lib/supabase/data-access/admin-users';

export const metadata = {
  title: 'Manage Users | Admin Dashboard',
  description: 'View and manage all user accounts in the platform.',
};

// Client component has been moved to components/admin/user-page-client.tsx

// Server component for data fetching
export default async function UsersPage(
  { searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }
) {
  // Await searchParams to satisfy Next.js 15 requirements
  const params = await Promise.resolve(searchParams);
  // Parse search parameters from the awaited params object
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const searchTerm = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const acquisitionSource = typeof params.source === 'string' ? params.source : undefined;
  const sortField = typeof params.sortField === 'string' ? params.sortField : undefined;
  const sortDirection = params.sortDirection === 'asc' || params.sortDirection === 'desc' ? 
    params.sortDirection : undefined;
  
  // Handle boolean parameters
  const hasTransactions = params.hasTransactions === 'true' ? true : 
                          params.hasTransactions === 'false' ? false : undefined;
  
  const hasEnrollments = params.hasEnrollments === 'true' ? true : 
                         params.hasEnrollments === 'false' ? false : undefined;
  
  // Handle date parameters
  const createdAfter = typeof params.createdAfter === 'string' ? params.createdAfter : undefined;
  const createdBefore = typeof params.createdBefore === 'string' ? params.createdBefore : undefined;
  
  // Handle array parameters
  const tags = typeof params.tags === 'string' ? 
    params.tags.split(',').map(tag => tag.trim()) : undefined;
  
  // Build search parameters
  const userSearchParams: UserSearchParams = {
    searchTerm,
    status,
    tags,
    acquisitionSource,
    hasTransactions,
    hasEnrollments,
    createdAfter,
    createdBefore,
    sortField,
    sortDirection,
    limit: pageSize,
    offset: (page - 1) * pageSize
  };

  // Use our admin data access layer to search users
  const { data: users, error } = await searchUsers(userSearchParams);
  
  // Get total count for pagination
  const { data: totalCount, error: countError } = await getUserCount(userSearchParams);

  if (error || countError) {
    console.error('Error fetching users:', error || countError);
    return (
      <div className="p-6">
        <div className="text-red-500">Error loading users. Please try again later.</div>
      </div>
    );
  }

  // Get total pages
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <UserPageClient searchParams={params}>
      <UserTable 
        users={users || []} 
        searchParams={userSearchParams}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
      />
    </UserPageClient>
  );
} 