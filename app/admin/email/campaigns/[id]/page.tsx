import { Suspense } from 'react';
import { CampaignDetailClient } from './client';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading campaign details...</div>}>
      <CampaignDetailClient id={params.id} />
    </Suspense>
  );
}
