'use client';

import { useEffect } from 'react';
import { CampaignDetail } from '../components/campaign-detail';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';

interface CampaignDetailClientProps {
  id: string;
}

export function CampaignDetailClient({ id }: CampaignDetailClientProps) {
  const { resetState } = useCampaignStore();
  
  // Reset store state when component unmounts
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  return (
    <div className="container py-6">
      <CampaignDetail campaignId={id} />
    </div>
  );
}
