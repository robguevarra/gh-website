'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart2, Users, CreditCard, Settings as SettingsIcon, HelpCircle } from 'lucide-react'; // Removed ArrowLeft as it's in the header

// Import the new AffiliateHeader component
import { AffiliateHeader } from '@/components/affiliate/affiliate-header';

const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-background p-6 rounded-xl shadow-lg border border-border hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center mb-4">
      <Icon className="h-6 w-6 mr-3 text-primary" />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    </div>
    <div className="text-muted-foreground space-y-2">
      {children}
    </div>
  </div>
);

const AffiliatePortalPage = () => {
  // Placeholder data - replace with actual data fetching
  const affiliateData = {
    slug: 'your-unique-slug',
    clicks: 1250,
    conversions: 75,
    earnings: 1875.50,
    conversionRate: (75 / 1250) * 100,
    nextPayoutDate: '15/07/2024',
    minPayout: 100,
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <AffiliateHeader />
      <div className="container mx-auto px-4">
        <p className="mb-8 text-md md:text-lg text-muted-foreground max-w-3xl">
          Welcome to your Affiliate Portal. Here you can track your referrals, earnings, and manage your affiliate settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SectionCard title="Overview & Stats" icon={BarChart2}>
            <p>Your key performance indicators:</p>
            <div className="mt-3 space-y-1 text-sm">
              <div><strong>Total Clicks:</strong> <span className="font-medium text-foreground">{affiliateData.clicks.toLocaleString()}</span></div>
              <div><strong>Total Conversions:</strong> <span className="font-medium text-foreground">{affiliateData.conversions.toLocaleString()}</span></div>
              <div><strong>Total Earnings:</strong> <span className="font-medium text-foreground text-green-600">${affiliateData.earnings.toFixed(2)}</span></div>
              <div><strong>Conversion Rate:</strong> <span className="font-medium text-foreground">{affiliateData.conversionRate.toFixed(2)}%</span></div>
            </div>
          </SectionCard>

          <SectionCard title="My Referrals" icon={Users}>
            <p>Details about your referred users and their status.</p>
            <div className="mt-3">
              <p className="text-sm">Your unique referral link:</p>
              <div className="mt-1 p-2.5 bg-muted rounded-md border border-input flex items-center justify-between">
                <code className="text-sm text-foreground break-all">{`https://ghsocials.com/ref/${affiliateData.slug}`}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigator.clipboard.writeText(`https://ghsocials.com/ref/${affiliateData.slug}`)}
                  className="ml-2 text-xs h-auto py-1 px-2"
                >
                  Copy
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Payouts" icon={CreditCard}>
            <p>Information about your commission payouts and history.</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><strong>Next Payout Date:</strong> <span className="font-medium text-foreground">{affiliateData.nextPayoutDate}</span></p>
              <p><strong>Minimum Payout Threshold:</strong> <span className="font-medium text-foreground">${affiliateData.minPayout.toFixed(2)}</span></p>
              <Button variant="link" className="p-0 h-auto text-primary text-sm mt-2">View Payout History</Button>
            </div>
          </SectionCard>

          <SectionCard title="Settings" icon={SettingsIcon}>
            <p>Manage your affiliate profile, payment details, and preferences.</p>
            <div className="mt-3">
              <Button variant="secondary" className="text-sm">Edit Profile & Payment Details</Button>
            </div>
          </SectionCard>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <HelpCircle className="inline-block mr-1.5 h-4 w-4 relative -top-px" />
            Need help? Visit our <Link href="/affiliate-faq" className="text-primary hover:underline font-medium">Affiliate FAQ</Link> or <Link href="/contact-support" className="text-primary hover:underline font-medium">contact support</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliatePortalPage;
