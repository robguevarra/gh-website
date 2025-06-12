'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, FileText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { AdminDataTable, AdminTableColumn, AdminTableAction } from '@/components/admin/common/admin-data-table';
import { AdminPayoutBatch, PayoutBatchStats } from '@/types/admin/affiliate';
import { 
  deletePayoutBatch,
  processPayoutBatch 
} from '@/lib/actions/admin/payout-actions';

interface BatchesListProps {
  batches: AdminPayoutBatch[];
  stats?: PayoutBatchStats;
}

export function BatchesListMigrated({ batches, stats }: BatchesListProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  // Process batch handler
  async function handleProcessBatch(batchId: string) {
    try {
      setProcessingBatchId(batchId);
      const result = await processPayoutBatch(batchId);
      
      if (result.success) {
        toast.success('Batch processing started successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to process batch');
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setProcessingBatchId(null);
    }
  }

  // Delete batch handler
  async function handleDeleteBatch() {
    if (!batchToDelete) return;
    
    try {
      const result = await deletePayoutBatch(batchToDelete);
      
      if (result.success) {
        toast.success('Batch deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setBatchToDelete(null);
      setDeleteDialogOpen(false);
    }
  }

  // Column configuration for AdminDataTable
  const columns: AdminTableColumn<AdminPayoutBatch>[] = [
    {
      key: 'batch_name',
      label: 'Batch Name',
      sortable: true,
      render: (batch) => (
        <div>
          <div className="font-medium">
            {batch.batch_name || `Batch #${batch.id.substring(0, 8)}`}
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {batch.id.substring(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      key: 'payout_count',
      label: 'Payouts',
      sortable: true,
      render: (batch) => batch.payout_count || 'N/A',
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      sortable: true,
      render: (batch) => (
        <span className="font-medium">
          ${Number(batch.total_amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (batch) => {
        if (batch.status === 'pending') {
          return <Badge variant="outline">Pending</Badge>;
        }
        if (batch.status === 'processing') {
          return <Badge variant="secondary">Processing</Badge>;
        }
        if (batch.status === 'completed') {
          return (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200" variant="outline">
              Completed
            </Badge>
          );
        }
        return <Badge variant="outline">{batch.status}</Badge>;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (batch) =>
        batch.created_at ? format(new Date(batch.created_at), 'MMM d, yyyy') : 'N/A',
    },
    {
      key: 'processed_at',
      label: 'Processed Date',
      sortable: true,
      render: (batch) =>
        batch.processed_at ? format(new Date(batch.processed_at), 'MMM d, yyyy') : 'N/A',
    },
  ];

  // Action configuration for AdminDataTable
  const actions: AdminTableAction<AdminPayoutBatch>[] = [
    {
      label: 'View Details',
      icon: <Eye className="mr-2 h-4 w-4" />,
      onClick: (batch) => router.push(`/admin/affiliates/payouts/batches/${batch.id}`),
    },
    {
      label: 'Process Batch',
      icon: <FileText className="mr-2 h-4 w-4" />,
      onClick: (batch) => handleProcessBatch(batch.id),
      disabled: (batch) => batch.status !== 'pending' || processingBatchId === batch.id,
    },
    {
      label: 'Delete Batch',
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: (batch) => {
        setBatchToDelete(batch.id);
        setDeleteDialogOpen(true);
      },
      disabled: (batch) => batch.status !== 'pending',
      variant: 'destructive',
    },
  ];

  // Tab configuration for AdminDataTable
  const tabs = [
    {
      key: 'all',
      label: 'All Batches',
      count: batches.length,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: batches.filter(b => b.status === 'pending').length,
      filter: (batch: AdminPayoutBatch) => batch.status === 'pending',
    },
    {
      key: 'processing',
      label: 'Processing',
      count: batches.filter(b => b.status === 'processing').length,
      filter: (batch: AdminPayoutBatch) => batch.status === 'processing',
    },
    {
      key: 'completed',
      label: 'Completed',
      count: batches.filter(b => b.status === 'completed').length,
      filter: (batch: AdminPayoutBatch) => batch.status === 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Batch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBatches || batches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingBatches || batches.filter(b => b.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.processingBatches || batches.filter(b => b.status === 'processing').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedBatches || batches.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <AdminDataTable
        data={batches}
        columns={columns}
        idField="id"
        onRowClick={(batch) => router.push(`/admin/affiliates/payouts/batches/${batch.id}`)}
        actions={actions}
        searchable={true}
        searchFields={['batch_name', 'id']}
        tabs={tabs}
        sortable={true}
        defaultSort={{ field: 'created_at', direction: 'desc' }}
        emptyState={
          <div className="text-center py-8 text-muted-foreground">
            No batches found.
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBatch}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 