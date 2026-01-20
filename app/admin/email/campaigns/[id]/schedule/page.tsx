'use client';

import { CampaignScheduler } from '@/app/admin/email/campaigns/v2/components/campaign-scheduler';

interface ScheduleCampaignPageProps {
  params: {
    id: string;
  };
}

export default function ScheduleCampaignPage({ params }: ScheduleCampaignPageProps) {
  const { id } = params;

  return (
    <div className="container py-6">
      <CampaignScheduler campaignId={id} />
    </div>
  );
}
