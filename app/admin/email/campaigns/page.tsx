import { Metadata } from 'next';
import { CampaignList } from './v2/components/campaign-list';

export const metadata: Metadata = {
  title: 'Email Campaigns | Graceful Homeschooling Admin',
  description: 'Manage email marketing campaigns for Graceful Homeschooling',
};

export default function CampaignsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Email Campaigns</h1>
        <p className="text-muted-foreground">
          Create, schedule, and monitor email campaigns for your audience.
        </p>
      </div>

      <CampaignList />
    </div>
  );
}
