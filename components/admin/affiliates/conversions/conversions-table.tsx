'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Clock, Search, Filter, Info, ArrowRight, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { AdminConversion } from "@/lib/actions/admin/conversion-actions";
import { verifyConversions, updateConversionStatus } from "@/lib/actions/admin/conversion-actions";
import { toast } from "sonner";
import Link from 'next/link';

interface ConversionsTableProps {
  conversions: AdminConversion[];
  onUpdate?: () => void;
}

// Status badge styling
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'cleared':
      return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Cleared</Badge>;
    case 'paid':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>;
    case 'flagged':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Flagged</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Add workflow notification component at the top
function WorkflowNotification() {
  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Conversion to Payout Workflow</h4>
            <p className="text-sm text-blue-700 mb-3">
              Verify pending conversions to make them eligible for payout processing.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-blue-600">
                <span>1. Verify Conversions</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <ArrowRight className="h-4 w-4 text-blue-400" />
              <div className="flex items-center gap-1 text-blue-600">
                <span>2. Preview Payouts</span>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-400" />
              <div className="flex items-center gap-1 text-blue-600">
                <span>3. Create Batch</span>
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/affiliates/payouts/preview">
                  Preview Eligible Payouts
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/affiliates/payouts/batches">
                  View Payout Batches
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConversionsTable({ conversions, onUpdate }: ConversionsTableProps) {
  const [selectedConversions, setSelectedConversions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Filter conversions
  const filteredConversions = useMemo(() => {
    return conversions.filter(conversion => {
      const matchesSearch = searchTerm === '' || 
        conversion.affiliate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversion.affiliate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversion.order_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || conversion.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [conversions, searchTerm, statusFilter]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectedConversions(checked ? new Set(filteredConversions.map(c => c.conversion_id)) : new Set());
  };

  const handleSelectConversion = (conversionId: string, checked: boolean) => {
    const newSelection = new Set(selectedConversions);
    if (checked) {
      newSelection.add(conversionId);
    } else {
      newSelection.delete(conversionId);
    }
    setSelectedConversions(newSelection);
  };

  // Batch verification
  const handleBatchVerify = async () => {
    if (selectedConversions.size === 0) {
      toast.error('Please select conversions to verify');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyConversions({
        conversionIds: Array.from(selectedConversions),
        verificationNotes: `Batch verification of ${selectedConversions.size} conversions`
      });

      if (result.success) {
        toast.success(`Successfully verified ${result.verifiedCount} conversions`);
        setSelectedConversions(new Set());
        onUpdate?.();
      } else {
        toast.error(result.error || 'Failed to verify conversions');
      }
    } catch (error) {
      toast.error('An error occurred while verifying conversions');
    } finally {
      setIsLoading(false);
    }
  };

  // Individual status change
  const handleStatusChange = async (conversionId: string, newStatus: 'pending' | 'cleared' | 'paid' | 'flagged') => {
    try {
      const result = await updateConversionStatus({
        conversionId,
        status: newStatus,
        notes: `Status changed to ${newStatus} via admin interface`
      });

      if (result.success) {
        toast.success(`Conversion status updated to ${newStatus}`);
        onUpdate?.();
      } else {
        toast.error(result.error || 'Failed to update conversion status');
      }
    } catch (error) {
      toast.error('An error occurred while updating conversion status');
    }
  };

  const allSelected = filteredConversions.length > 0 && selectedConversions.size === filteredConversions.length;

  return (
    <div className="space-y-4">
      <WorkflowNotification />
      
    <Card>
      <CardContent className="p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Batch Actions */}
        {selectedConversions.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedConversions.size} conversions selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBatchVerify}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Verifying...' : 'Verify Selected'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedConversions(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No conversions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredConversions.map((conversion) => (
                  <TableRow key={conversion.conversion_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedConversions.has(conversion.conversion_id)}
                        onCheckedChange={(checked) => 
                          handleSelectConversion(conversion.conversion_id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{conversion.affiliate_name}</div>
                      <div className="text-sm text-gray-500">{conversion.affiliate_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(conversion.conversion_value)}</div>
                      {conversion.order_id && (
                        <div className="text-sm text-gray-500">Order: {conversion.order_id}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(conversion.commission_amount)}</div>
                      <div className="text-sm text-gray-500">{(conversion.commission_rate * 100).toFixed(1)}%</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(conversion.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {conversion.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(conversion.conversion_id, 'cleared')}
                            className="h-8 px-2 text-xs"
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(conversion.conversion_id, 'flagged')}
                          className="h-8 px-2 text-xs"
                        >
                          Flag
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
} 