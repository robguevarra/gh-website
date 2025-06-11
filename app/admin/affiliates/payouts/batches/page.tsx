'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BatchesList } from "@/components/admin/affiliates/payouts/batches-list";
import { 
  getAdminAffiliatePayoutBatches,
  getAdminAffiliatePayoutBatchStats 
} from "@/lib/actions/admin/payout-actions";
import { AdminPayoutBatch, PayoutBatchStats } from "@/types/admin/affiliate";

export default function AffiliatePayoutBatchesPage() {
  const [batches, setBatches] = useState<AdminPayoutBatch[]>([]);
  const [stats, setStats] = useState<PayoutBatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [batchResult, statsResult] = await Promise.all([
          getAdminAffiliatePayoutBatches(),
          getAdminAffiliatePayoutBatchStats()
        ]);

        if (batchResult.error || statsResult.error) {
          setError(batchResult.error || statsResult.error || 'Failed to load data');
          console.error("Error fetching payout batches:", batchResult.error || statsResult.error);
        } else {
          setBatches(batchResult.batches || []);
          setStats(statsResult.stats);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error loading payout batches:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/affiliates/payouts">
            <ChevronLeft className="h-4 w-4" />
            Back to Payouts
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        heading="Payout Batches"
        description="Manage and process batches of affiliate payouts"
      >
        <div className="flex items-center gap-x-2">
          <a 
            href="/admin/affiliates/payouts/preview" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create New Batch
          </a>
        </div>
      </AdminPageHeader>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
          Error: {error}
        </div>
      )}

      <BatchesList batches={batches} stats={stats || undefined} />
    </div>
  );
}
