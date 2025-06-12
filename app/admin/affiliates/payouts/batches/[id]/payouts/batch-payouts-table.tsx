'use client';

import { AdminDataTable } from "@/components/admin/common/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/common/admin-status-badge";
import { formatPrice } from "@/lib/utils";

interface PayoutTableData {
  id: string;
  affiliate_name: string;
  affiliate_email: string;
  affiliate_slug: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  payout_method: string;
  reference?: string;
  xendit_disbursement_id?: string;
  transaction_date?: string;
  processed_at?: string;
  created_at: string;
}

interface BatchPayoutsTableProps {
  data: PayoutTableData[];
}

// Helper function for formatting dates
function formatDate(date: string | null | undefined): string {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function BatchPayoutsTable({ data }: BatchPayoutsTableProps) {
  // Define table columns with render functions on client side
  const columns = [
    {
      key: 'affiliate_name',
      label: 'Affiliate',
      render: (item: PayoutTableData) => (
        <div className="space-y-1">
          <div className="font-medium">{item.affiliate_name}</div>
          <div className="text-sm text-muted-foreground">{item.affiliate_email}</div>
          <div className="text-xs text-muted-foreground">@{item.affiliate_slug}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item: PayoutTableData) => (
        <div className="text-right font-mono">
          {formatPrice(item.amount)}
        </div>
      )
    },
    {
      key: 'fee_amount',
      label: 'Fees',
      render: (item: PayoutTableData) => (
        <div className="text-right font-mono text-sm text-muted-foreground">
          -{formatPrice(item.fee_amount || 0)}
        </div>
      )
    },
    {
      key: 'net_amount',
      label: 'Net Amount',
      render: (item: PayoutTableData) => (
        <div className="text-right font-mono font-medium">
          {formatPrice(item.net_amount || 0)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: PayoutTableData) => (
        <AdminStatusBadge status={item.status} context="payout" />
      )
    },
    {
      key: 'reference',
      label: 'Reference',
      render: (item: PayoutTableData) => (
        <div className="space-y-1">
          {item.reference && (
            <div className="text-sm font-mono">{item.reference}</div>
          )}
          {item.xendit_disbursement_id && (
            <div className="text-xs text-muted-foreground" title="Xendit Disbursement ID">
              {item.xendit_disbursement_id}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'processed_at',
      label: 'Processed',
      render: (item: PayoutTableData) => (
        <div className="text-sm">
          {formatDate(item.processed_at)}
        </div>
      )
    }
  ];

  return (
    <AdminDataTable
      data={data}
      columns={columns}
      idField="id"
      searchFields={['affiliate_name', 'affiliate_email']}
      emptyState={
        <div className="text-center py-8 text-muted-foreground">
          No payouts found in this batch
        </div>
      }
    />
  );
} 