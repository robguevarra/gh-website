'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ArrowLeft, Eye, Download } from "lucide-react";
import Link from "next/link";
import { getAdminConversions, AdminConversion, bulkClearPendingConversions } from "@/lib/actions/admin/conversion-actions";
import { SimplePagination } from "@/components/ui/pagination";

// Clean conversions list page with search and filtering
// Industry best practice: Stripe-style data table with comprehensive filtering

export default function ConversionsListPage() {
  const searchParams = useSearchParams();
  const [conversions, setConversions] = useState<AdminConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // URL parameters
  const initialStatus = searchParams.get('status') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialAffiliateId = searchParams.get('affiliateId') || '';
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [affiliateFilter, setAffiliateFilter] = useState(initialAffiliateId);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 20;

  // Fetch conversions with filters
  useEffect(() => {
    async function fetchConversions() {
      setLoading(true);
      try {
        const filters: any = {};
        
        // Apply status filter
        if (statusFilter !== 'all') {
          filters.status = statusFilter;
        }
        
        // Apply affiliate filter
        if (affiliateFilter) {
          filters.affiliateId = affiliateFilter;
        }
        
        // Apply search term (order ID)
        if (searchTerm) {
          filters.orderId = searchTerm;
        }

        const result = await getAdminConversions({
          filters,
          pagination: { page: currentPage, pageSize: itemsPerPage },
          sort: { sortBy: 'created_at', sortDirection: 'desc' }
        });

        if (result.data) {
          setConversions(result.data);
          setTotalCount(result.totalCount);
        } else {
          console.error('Failed to fetch conversions:', result.error);
          setConversions([]);
          setTotalCount(0);
        }
      } catch (error) {
        console.error('Error fetching conversions:', error);
        setConversions([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchConversions();
  }, [statusFilter, searchTerm, affiliateFilter, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, affiliateFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'flagged': return 'bg-red-100 text-red-800 border-red-200';
      case 'cleared': return 'bg-green-100 text-green-800 border-green-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/affiliates/conversions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Conversions</h1>
            <p className="text-muted-foreground">
              {totalCount} total conversions found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusFilter === 'pending' && conversions.length > 0 && (
            <Button 
              variant="default" 
              size="sm"
              onClick={async () => {
                if (confirm(`Clear all ${conversions.length} pending conversions for payout?`)) {
                  try {
                    const pendingConversionIds = conversions
                      .filter(c => c.status === 'pending')
                      .map(c => c.conversion_id);
                    
                    const result = await bulkClearPendingConversions({
                      conversionIds: pendingConversionIds,
                      notes: 'Bulk cleared by admin from conversions list'
                    });
                    
                    if (result.success) {
                      alert(`Successfully cleared ${result.clearedCount} conversions!`);
                      // Refresh the page to show updated data
                      window.location.reload();
                    } else {
                      alert(`Error clearing conversions: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('Error clearing conversions:', error);
                    alert('Failed to clear conversions. Please try again.');
                  }
                }
              }}
            >
              Clear All Pending ({conversions.filter(c => c.status === 'pending').length})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
                setAffiliateFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Conversions {statusFilter !== 'all' && `(${statusFilter})`}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {conversions.length} of {totalCount} results
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : conversions.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((conversion) => (
                      <TableRow 
                        key={conversion.conversion_id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          // Smart navigation based on conversion status
                          if (conversion.status === 'paid' && conversion.payout_id) {
                            // For paid conversions, go to payout detail page
                            window.location.href = `/admin/affiliates/payouts/${conversion.payout_id}`;
                          } else {
                            // For other statuses, go to conversion detail page
                            window.location.href = `/admin/affiliates/conversions/${conversion.conversion_id}`;
                          }
                        }}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{conversion.affiliate_name}</div>
                            <div className="text-sm text-muted-foreground">{conversion.affiliate_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{conversion.order_id || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">₱{conversion.conversion_value.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">₱{conversion.commission_amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {(conversion.commission_rate * 100).toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(conversion.status)}>
                            {conversion.status.charAt(0).toUpperCase() + conversion.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(conversion.conversion_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(conversion.conversion_date).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Smart navigation based on conversion status
                              if (conversion.status === 'paid' && conversion.payout_id) {
                                // For paid conversions, go to payout detail page
                                window.location.href = `/admin/affiliates/payouts/${conversion.payout_id}`;
                              } else {
                                // For other statuses, go to conversion detail page
                                window.location.href = `/admin/affiliates/conversions/${conversion.conversion_id}`;
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No conversions found</h3>
                <p>Try adjusting your filters or search terms.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 