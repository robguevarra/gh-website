'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { MoreHorizontal, Eye, Edit, CheckCircle, XCircle, Flag, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminAffiliateListItem, AffiliateStatusType } from '@/types/admin/affiliate';
import {
  getAdminAffiliates,
  approveAffiliate,
  rejectAffiliate,
  flagAffiliate,
  updateAffiliateStatus, // Changed from deactivateAffiliate and clearAffiliateFlag
} from '@/lib/actions/affiliate-actions';

const statusVariantMap: Record<AffiliateStatusType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  flagged: 'destructive',
  inactive: 'outline',
};

export default function AffiliateList() {
  const router = useRouter();
  const [affiliatesData, setAffiliatesData] = useState<AdminAffiliateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({}); // For row-specific loading

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AffiliateStatusType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminAffiliates();
      setAffiliatesData(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching affiliates.');
      }
      setAffiliatesData([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = useCallback(async (
    affiliateId: string, 
    actionName: string, // For specific loading state
    actionFn: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    errorMessagePrefix: string
  ) => {
    setActionStates(prev => ({ ...prev, [`${affiliateId}_${actionName}`]: true }));
    setError(null);
    try {
      const result = await actionFn();
      if (result.success) {
        console.log(successMessage); // Placeholder for toast
        await fetchData(); // Re-fetch data to reflect changes
      } else {
        console.error(`${errorMessagePrefix}: ${result.error}`);
        setError(result.error || `${errorMessagePrefix}: An unknown error occurred.`);
      }
    } catch (err) {
      console.error(`${errorMessagePrefix} (catch):`, err);
      setError(`${errorMessagePrefix}: An unexpected error occurred.`);
    } finally {
      setActionStates(prev => ({ ...prev, [`${affiliateId}_${actionName}`]: false }));
    }
  }, [fetchData]);

  const filteredAffiliates = useMemo(() => {
    return affiliatesData.filter((affiliate) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearchTerm = (
        affiliate.name.toLowerCase().includes(lowerSearchTerm) ||
        affiliate.email.toLowerCase().includes(lowerSearchTerm) ||
        affiliate.slug.toLowerCase().includes(lowerSearchTerm)
      );
      const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
      return matchesSearchTerm && matchesStatus;
    });
  }, [affiliatesData, searchTerm, statusFilter]);

  const paginatedAffiliates = useMemo(() => {
    return filteredAffiliates.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredAffiliates, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAffiliates.length / itemsPerPage);
  }, [filteredAffiliates, itemsPerPage]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as AffiliateStatusType | 'all');
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleViewAffiliate = (id: string) => console.log('View affiliate:', id);
  const handleEditAffiliate = (id: string) => console.log('Edit affiliate:', id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Input
          placeholder="Search by name, email, or slug..."
          className="max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Affiliate</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Loading affiliates...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-red-500">
                  Error fetching affiliates: {error}
                </TableCell>
              </TableRow>
            ) : paginatedAffiliates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No affiliates found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedAffiliates.map((affiliate) => (
                <TableRow
                  key={affiliate.affiliate_id}
                  onClick={(e) => {
                    // Prevent row click when clicking on interactive elements like the dropdown trigger, buttons, or links within the row
                    if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-trigger], button, a')) {
                      return;
                    }
                    router.push(`/admin/affiliates/${affiliate.affiliate_id}`);
                  }}
                  className={`cursor-pointer hover:bg-muted/50 ${actionStates[`${affiliate.affiliate_id}_approve`] || actionStates[`${affiliate.affiliate_id}_reject`] || actionStates[`${affiliate.affiliate_id}_flag`] || actionStates[`${affiliate.affiliate_id}_deactivate`] || actionStates[`${affiliate.affiliate_id}_clearFlag`] ? 'opacity-50' : ''}`}
                >
                  <TableCell>
                    <div className="font-medium">{affiliate.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {affiliate.email}
                    </div>
                  </TableCell>
                  <TableCell>{affiliate.slug}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[affiliate.status] || 'secondary'}>
                      {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {typeof affiliate.tier_commission_rate === 'number'
                      ? `${(affiliate.tier_commission_rate * 100).toFixed(0)}%`
                      : affiliate.membership_level_name ? 'N/A' : 'No Tier'}
                  </TableCell>
                  <TableCell className="text-right">{affiliate.total_conversions}</TableCell>
                  <TableCell className="text-right">
                    ${affiliate.total_earnings.toFixed(2)}
                  </TableCell>
                  <TableCell>{new Date(affiliate.joined_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionStates[`${affiliate.affiliate_id}_approve`] || actionStates[`${affiliate.affiliate_id}_reject`] || actionStates[`${affiliate.affiliate_id}_flag`] || actionStates[`${affiliate.affiliate_id}_deactivate`] || actionStates[`${affiliate.affiliate_id}_clearFlag`]}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/admin/affiliates/${affiliate.affiliate_id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {affiliate.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleAction(affiliate.affiliate_id, 'approve', () => approveAffiliate(affiliate.affiliate_id), 'Affiliate approved successfully', 'Error approving affiliate')}
                            disabled={actionStates[`${affiliate.affiliate_id}_approve`]}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleAction(affiliate.affiliate_id, 'reject', () => rejectAffiliate(affiliate.affiliate_id), 'Affiliate rejected successfully', 'Error rejecting affiliate')}
                            disabled={actionStates[`${affiliate.affiliate_id}_reject`]}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        {(affiliate.status === 'active' || affiliate.status === 'pending') && (
                          <DropdownMenuItem 
                            onClick={() => handleAction(affiliate.affiliate_id, 'flag', () => flagAffiliate(affiliate.affiliate_id), 'Affiliate flagged successfully', 'Error flagging affiliate')}
                            disabled={actionStates[`${affiliate.affiliate_id}_flag`]}
                          >
                            <Flag className="mr-2 h-4 w-4 text-orange-500" />
                            Flag Account
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'active' && (
                          <DropdownMenuItem 
                            onClick={() => handleAction(affiliate.affiliate_id, 'deactivate', () => updateAffiliateStatus(affiliate.user_id, 'inactive'), 'Affiliate deactivated successfully', 'Error deactivating affiliate')}
                            disabled={actionStates[`${affiliate.affiliate_id}_deactivate`]}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'flagged' && (
                          <DropdownMenuItem 
                            onClick={() => handleAction(affiliate.affiliate_id, 'clearFlag', () => updateAffiliateStatus(affiliate.user_id, 'active'), 'Affiliate flag cleared (status set to active)', 'Error clearing affiliate flag')}
                            disabled={actionStates[`${affiliate.affiliate_id}_clearFlag`]}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Clear Flag
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}