'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePagination } from '@/components/ui/pagination';
import { 
  ArrowLeft,
  Users, 
  DollarSign, 
  Package,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Eye
} from 'lucide-react';
import { getBatchPreviewData } from '@/lib/actions/admin/conversion-actions';

interface BatchData {
  total_affiliates: number;
  total_amount: number;
  cleared_conversions: number;
  requires_manual_review: boolean;
  affiliate_payouts: any[];
  ineligible_affiliates?: any[];
  validation_summary?: {
    total_ineligible_amount: number;
  };
  month: string;
  status: string;
}

export default function MonthlyPreviewPage() {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ineligiblePage, setIneligiblePage] = useState(1);
  const itemsPerPage = 20; // Show 20 affiliates per page

  useEffect(() => {
    async function fetchData() {
      try {
        const { batch: batchData, error: fetchError } = await getBatchPreviewData();
        if (fetchError) {
          setError(fetchError);
        } else {
          setBatch(batchData);
        }
      } catch (err) {
        setError('Failed to load batch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Paginated eligible affiliates
  const paginatedEligibleAffiliates = useMemo(() => {
    if (!batch?.affiliate_payouts) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return batch.affiliate_payouts.slice(startIndex, startIndex + itemsPerPage);
  }, [batch?.affiliate_payouts, currentPage, itemsPerPage]);

  // Paginated ineligible affiliates
  const paginatedIneligibleAffiliates = useMemo(() => {
    if (!batch?.ineligible_affiliates) return [];
    const startIndex = (ineligiblePage - 1) * itemsPerPage;
    return batch.ineligible_affiliates.slice(startIndex, startIndex + itemsPerPage);
  }, [batch?.ineligible_affiliates, ineligiblePage, itemsPerPage]);

  const totalEligiblePages = Math.ceil((batch?.affiliate_payouts?.length || 0) / itemsPerPage);
  const totalIneligiblePages = Math.ceil((batch?.ineligible_affiliates?.length || 0) / itemsPerPage);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600">No Data Available</h2>
            <p className="text-muted-foreground">{error || 'No conversions ready for payout'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href="/admin/affiliates/conversions" 
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conversions
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Payout Review</h1>
          <p className="text-muted-foreground">
            Review cleared conversions and create payout batch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Change Month
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.total_affiliates}</div>
            <p className="text-xs text-muted-foreground">
              ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₱{batch.total_amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              in commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{batch.cleared_conversions}</div>
            <p className="text-xs text-muted-foreground">
              cleared this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {batch.requires_manual_review ? (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${batch.requires_manual_review ? 'text-orange-600' : 'text-green-600'}`}>
              {batch.requires_manual_review ? 'Review' : 'Ready'}
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.requires_manual_review ? 'needs attention' : 'for approval'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Eligible Affiliates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Eligible for Payout ({batch.total_affiliates})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Affiliates with cleared conversions ready for payment
              </p>
            </div>
            {batch.total_affiliates > 0 && (
              <Link href="/admin/affiliates/batch-preview">
                <Button>
                  <Eye className="mr-2 h-4 w-4" />
                  Create Batch
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {batch.affiliate_payouts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEligibleAffiliates.map((affiliate) => (
                    <TableRow 
                      key={affiliate.affiliate_id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/admin/affiliates/${affiliate.affiliate_id}`}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{affiliate.affiliate_name}</div>
                          <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{affiliate.conversions_count}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{affiliate.total_commission.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {affiliate.payout_method === 'gcash' ? 'GCash' : 'Bank Transfer'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ready
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination for eligible affiliates */}
              {totalEligiblePages > 1 && (
                <div className="mt-4">
                  <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalEligiblePages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No eligible affiliates for payout this month</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ineligible Affiliates (if any) */}
      {batch.ineligible_affiliates && batch.ineligible_affiliates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Ineligible Affiliates ({batch.ineligible_affiliates.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ₱{batch.validation_summary?.total_ineligible_amount.toLocaleString()} will rollover to next month
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIneligibleAffiliates.map((affiliate) => (
                  <TableRow 
                    key={affiliate.affiliate_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/admin/affiliates/${affiliate.affiliate_id}`}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.affiliate_name}</div>
                        <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ₱{affiliate.total_commission.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600">
                        {affiliate.rejection_reasons[0]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination for ineligible affiliates */}
            {totalIneligiblePages > 1 && (
              <div className="mt-4">
                <SimplePagination
                  currentPage={ineligiblePage}
                  totalPages={totalIneligiblePages}
                  onPageChange={setIneligiblePage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 