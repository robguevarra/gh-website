import { Suspense } from 'react';
import { CampaignStats } from './campaign-stats';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Loading campaign details...</div>}>
      <CampaignStats campaignId={id} />
    </Suspense>
  );
}
