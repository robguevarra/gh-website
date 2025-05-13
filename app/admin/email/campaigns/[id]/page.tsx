import { Suspense } from 'react';
// Correct the import path and alias CampaignDetail as CampaignDetailClient
import { CampaignDetail as CampaignDetailClient } from '../components/campaign-detail';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

// Make the component async
export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  // No explicit await needed here if just passing params.id, 
  // but making the function async satisfies Next.js's expectation.
  const { id } = await params; 

  return (
    <Suspense fallback={<div>Loading campaign details...</div>}>
      <CampaignDetailClient campaignId={id} />
    </Suspense>
  );
}
