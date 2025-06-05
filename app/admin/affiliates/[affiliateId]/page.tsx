import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminAffiliateById } from '@/lib/actions/affiliate-actions';
import { AdminAffiliateListItem } from '@/types/admin/affiliate';
import AffiliateDetailView from '@/components/admin/affiliates/affiliate-detail-view';
import PageHeader from '@/components/common/page-header';

interface AffiliateDetailPageProps {
  params: {
    affiliateId: string;
  };
}

export default async function AffiliateDetailPage({
  params,
}: AffiliateDetailPageProps) {
  const affiliateId = params.affiliateId; 
  let affiliateDetails: AdminAffiliateListItem | null = null;
  let errorFetching: string | null = null;

  try {
    affiliateDetails = await getAdminAffiliateById(affiliateId);
  } catch (error) {
    console.error('Failed to fetch affiliate details:', error);
    errorFetching = error instanceof Error ? error.message : 'An unknown error occurred.';
  }

  if (!affiliateDetails && !errorFetching) {
    notFound();
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/affiliates">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back to Affiliate List
          </Button>
        </Link>
      </div>

      <PageHeader 
        title={affiliateDetails ? `Affiliate: ${affiliateDetails.name}` : 'Affiliate Details'}
        description={affiliateDetails ? `Manage details and performance for ${affiliateDetails.email}` : 'View and edit affiliate information'}
      />

      {errorFetching ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <h3 className="font-medium">Error Loading Affiliate</h3>
          <p className="text-sm text-red-700 mt-1">There was a problem fetching the affiliate details.</p>
          <p className="text-sm font-mono mt-2 p-2 bg-red-100 rounded">{errorFetching}</p>
        </div>
      ) : affiliateDetails ? (
        <AffiliateDetailView initialAffiliateDetails={affiliateDetails} />
      ) : null}
    </div>
  );
}
