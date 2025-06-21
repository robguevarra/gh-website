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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Eye, Edit, CheckCircle, XCircle, Flag, UserX, Search, Check, Loader2, Smartphone, CreditCard, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from "date-fns";
import { AdminAffiliateListItem, AffiliateStatusType, GCashVerificationStatus } from '@/types/admin/affiliate';
import {
  getAdminAffiliates,
  approveAffiliate,
  rejectAffiliate,
  flagAffiliate,
  updateAffiliateStatus,
  bulkApproveAffiliates
} from '@/lib/actions/affiliate-actions';
import { CreateFraudFlagDialog } from '@/components/admin/flags/create-fraud-flag-dialog';
import { toast } from "sonner";

const statusVariantMap: Record<AffiliateStatusType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  flagged: 'destructive',
  inactive: 'outline',
};

const verificationStatusMap: Record<GCashVerificationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode, label: string }> = {
  unverified: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3" />, label: 'Unverified' },
  pending_documents: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Pending Docs' },
  pending_review: { variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Pending Review' },
  verified: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Verified' },
  rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Rejected' },
  expired: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3" />, label: 'Expired' },
};

function PayoutMethodBadge({ method, verified, verificationStatus }: { 
  method?: string; 
  verified?: boolean; 
  verificationStatus?: GCashVerificationStatus;
}) {
  if (!method) return <span className="text-muted-foreground">Not set</span>;
  
  const isGCash = method === 'gcash';
  const icon = isGCash ? <Smartphone className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />;
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        {icon}
        {isGCash ? 'GCash' : method.replace('_', ' ').toUpperCase()}
      </Badge>
      {isGCash && verificationStatus && (
        <Badge 
          variant={verificationStatusMap[verificationStatus].variant}
          className="flex items-center gap-1 text-xs"
        >
          {verificationStatusMap[verificationStatus].icon}
          {verificationStatusMap[verificationStatus].label}
        </Badge>
      )}
      {!isGCash && verified !== undefined && (
        <Badge 
          variant={verified ? 'default' : 'outline'}
          className="flex items-center gap-1 text-xs"
        >
          {verified ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {verified ? 'Verified' : 'Unverified'}
        </Badge>
      )}
    </div>
  );
}

export default function AffiliateList() {
  const router = useRouter();
  const [affiliatesData, setAffiliatesData] = useState<AdminAffiliateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});
  const [selectedAffiliates, setSelectedAffiliates] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false); // For row-specific loading

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

  // Filter affiliates based on search term and status filter
  // Filter affiliates based on search term and status filter
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

  const handleAction = async (affiliateId: string, actionType: string, actionFn: () => Promise<any>, successMessage: string, errorMessage: string) => {
    // Set loading state for this specific action
    setActionStates(prev => ({ ...prev, [`${affiliateId}_${actionType}`]: true }));
    
    try {
      const result = await actionFn();
      if (result.success) {
        // Refresh the data
        fetchData();
        toast.success(successMessage);
      } else {
        toast.error(`${errorMessage}: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`Error in ${actionType} action:`, err);
      toast.error(`${errorMessage}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionStates(prev => ({ ...prev, [`${affiliateId}_${actionType}`]: false }));
    }
  };
  
  // Handle bulk approval of selected affiliates
  const handleBulkApprove = async () => {
    if (selectedAffiliates.length === 0) {
      toast.error("No affiliates selected for approval");
      return;
    }
    
    setBulkActionLoading(true);
    try {
      // Call the bulk approve function
      const result = await bulkApproveAffiliates(selectedAffiliates);
      
      if (result.success) {
        // All operations successful
        toast.success("Bulk approval completed", {
          description: `Successfully approved ${result.successCount} affiliate${result.successCount > 1 ? 's' : ''}`
        });
        setSelectedAffiliates([]); // Clear selection
      } else if (result.successCount > 0) {
        // Partial success
        toast.warning("Bulk approval partially completed", {
          description: `Successfully approved ${result.successCount} affiliate${result.successCount > 1 ? 's' : ''}. ${result.failedCount} failed.`
        });
        
        // Show detailed errors if any
        if (result.errors.length > 0) {
          console.error('Bulk approval errors:', result.errors);
          result.errors.forEach((error, index) => {
            if (index < 3) { // Limit to first 3 error toasts to avoid spam
              toast.error(`Approval error`, {
                description: error,
                duration: 10000,
              });
            }
          });
        }
        setSelectedAffiliates([]); // Clear selection even on partial success
      } else {
        // Complete failure
        toast.error("Bulk approval failed", {
          description: result.errors[0] || "All affiliate approvals failed"
        });
      }

      // Refresh the data to reflect changes
      await fetchData();

    } catch (err) {
      console.error('Error in bulk approve action:', err);
      toast.error(`Failed to approve affiliates: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBulkActionLoading(false);
      setShowConfirmDialog(false);
    }
  };
  
  // Toggle selection of a single affiliate
  const toggleAffiliateSelection = (affiliateId: string) => {
    setSelectedAffiliates(prev => 
      prev.includes(affiliateId) 
        ? prev.filter(id => id !== affiliateId)
        : [...prev, affiliateId]
    );
  };
  
  // Toggle selection of all visible affiliates
  const toggleSelectAll = () => {
    if (selectedAffiliates.length === filteredAffiliates.length) {
      // If all are selected, deselect all
      setSelectedAffiliates([]);
    } else {
      // Otherwise, select all visible affiliates
      setSelectedAffiliates(filteredAffiliates.map(affiliate => affiliate.affiliate_id));
    }
  };
  
  // Check if all visible affiliates are selected
  const areAllSelected = useMemo(() => {
    return filteredAffiliates.length > 0 && 
           selectedAffiliates.length === filteredAffiliates.length;
  }, [filteredAffiliates, selectedAffiliates]);
  
  // Count of pending affiliates (for bulk approval button visibility)
  const pendingAffiliatesCount = useMemo(() => {
    return filteredAffiliates.filter(affiliate => affiliate.status === 'pending').length;
  }, [filteredAffiliates]);
  
  // Count of selected pending affiliates
  const selectedPendingCount = useMemo(() => {
    const pendingIds = new Set(
      filteredAffiliates
        .filter(affiliate => affiliate.status === 'pending')
        .map(affiliate => affiliate.affiliate_id)
    );
    return selectedAffiliates.filter(id => pendingIds.has(id)).length;
  }, [filteredAffiliates, selectedAffiliates]);


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
    <div className="space-y-4">
      {/* Confirmation Dialog for Mass Approval */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Mass Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {selectedPendingCount} pending affiliate{selectedPendingCount !== 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleBulkApprove();
              }}
              disabled={bulkActionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Approve All Selected</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {error && <div className="p-4 text-red-500 border border-red-200 rounded-md">{error}</div>}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search by name, email, or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-96"
          />
          {pendingAffiliatesCount > 0 && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                // Select all pending affiliates
                const pendingIds = filteredAffiliates
                  .filter(affiliate => affiliate.status === 'pending')
                  .map(affiliate => affiliate.affiliate_id);
                setSelectedAffiliates(pendingIds);
                setShowConfirmDialog(true);
              }}
              disabled={pendingAffiliatesCount === 0}
            >
              <Check className="mr-2 h-4 w-4" />
              Mass Approve ({pendingAffiliatesCount}) Pending
            </Button>
          )}
          {selectedAffiliates.length > 0 && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedPendingCount === 0}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve Selected ({selectedPendingCount})
            </Button>
          )}
        </div>
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
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={areAllSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all affiliates"
                />
              </TableHead>
              <TableHead>Affiliate</TableHead>
              <TableHead>Membership Tier</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Payout Method</TableHead>
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
                    if ((e.target as HTMLElement).closest('[data-radix-dropdown-menu-trigger], button, a, [data-state]')) {
                      return;
                    }
                    router.push(`/admin/affiliates/${affiliate.affiliate_id}`);
                  }}
                  className={`cursor-pointer hover:bg-muted/50 ${actionStates[`${affiliate.affiliate_id}_approve`] || actionStates[`${affiliate.affiliate_id}_reject`] || actionStates[`${affiliate.affiliate_id}_flag`] || actionStates[`${affiliate.affiliate_id}_deactivate`] || actionStates[`${affiliate.affiliate_id}_clearFlag`] ? 'opacity-50' : ''}`}
                >
                  <TableCell className="w-[50px]">
                    <Checkbox
                      checked={selectedAffiliates.includes(affiliate.affiliate_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          toggleAffiliateSelection(affiliate.affiliate_id);
                        } else {
                          toggleAffiliateSelection(affiliate.affiliate_id);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select affiliate ${affiliate.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{affiliate.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {affiliate.email}
                        </div>
                      </div>
                      <Badge variant={statusVariantMap[affiliate.status as AffiliateStatusType]} className="ml-2">
                        {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{affiliate.membership_level_name}</TableCell>
                  <TableCell className="text-right">
                    {affiliate.tier_commission_rate !== null && affiliate.tier_commission_rate !== undefined
                      ? `${(affiliate.tier_commission_rate * 100).toFixed(0)}%`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <PayoutMethodBadge 
                      method={affiliate.payout_method}
                      verified={affiliate.payout_method === 'gcash' ? affiliate.gcash_verified : affiliate.bank_account_verified}
                      verificationStatus={affiliate.gcash_verification_status}
                    />
                  </TableCell>
                  <TableCell className="text-right">{affiliate.total_conversions}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(affiliate.total_earnings || 0)}
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
                            onClick={(e) => { e.stopPropagation(); handleAction(affiliate.affiliate_id, 'approve', () => approveAffiliate(affiliate.affiliate_id), 'Affiliate approved successfully', 'Error approving affiliate'); }}
                            disabled={actionStates[`${affiliate.affiliate_id}_approve`]}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleAction(affiliate.affiliate_id, 'reject', () => rejectAffiliate(affiliate.affiliate_id), 'Affiliate rejected successfully', 'Error rejecting affiliate'); }}
                            disabled={actionStates[`${affiliate.affiliate_id}_reject`]}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        {(affiliate.status === 'active' || affiliate.status === 'pending') && (
                          <DropdownMenuItem asChild>
                            <div onClick={(e) => e.stopPropagation()}>
                              <CreateFraudFlagDialog 
                                affiliateId={affiliate.affiliate_id}
                                affiliateName={affiliate.name}
                                onFlagCreated={() => fetchData()}
                                trigger={
                                  <div className="flex items-center w-full px-2 py-1.5 text-sm">
                                    <Flag className="mr-2 h-4 w-4 text-orange-500" />
                                    Create Fraud Flag
                                  </div>
                                }
                              />
                            </div>
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'active' && (
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleAction(affiliate.affiliate_id, 'deactivate', () => updateAffiliateStatus(affiliate.user_id, 'inactive'), 'Affiliate deactivated successfully', 'Error deactivating affiliate'); }}
                            disabled={actionStates[`${affiliate.affiliate_id}_deactivate`]}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        {affiliate.status === 'flagged' && (
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleAction(affiliate.affiliate_id, 'clearFlag', () => updateAffiliateStatus(affiliate.user_id, 'active'), 'Affiliate flag cleared (status set to active)', 'Error clearing affiliate flag'); }}
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