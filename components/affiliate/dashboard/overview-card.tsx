'use client';

import { useEffect } from 'react';
import { ArrowRight, TrendingUp, LineChart, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { 
  useAffiliateProfileData, 
  useAffiliateMetricsData, 
  useReferralLinksData 
} from '@/lib/hooks/use-affiliate-dashboard';
import { formatCurrencyPHP } from '@/lib/utils/formatting';

export function OverviewCard() {
  const router = useRouter();
  const { affiliateProfile, isLoadingProfile } = useAffiliateProfileData();
  const { metrics, isLoadingMetrics, loadAffiliateMetrics } = useAffiliateMetricsData();
  const { referralLinks, isLoadingReferralLinks, loadReferralLinks } = useReferralLinksData();

  // Load metrics and referral links on component mount
  useEffect(() => {
    // We need to wait for the profile to load to get the userId
    if (affiliateProfile?.userId) {
      // Load data with the userId from the profile
      loadReferralLinks(affiliateProfile.userId);
      
      // Default to last 30 days of data for metrics
      loadAffiliateMetrics(affiliateProfile.userId, { dateRange: '30days' });
    }
  }, [loadAffiliateMetrics, loadReferralLinks, affiliateProfile]);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        // Could use toast here but keeping it simple
        alert("Link copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy link: ", err);
      });
  };

  // Helper function to format numbers with commas
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Calculate conversion rate
  const conversionRate = metrics?.totalClicks && metrics.totalClicks > 0
    ? ((metrics.totalConversions / metrics.totalClicks) * 100).toFixed(2)
    : '0.00';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Affiliate Dashboard Overview</CardTitle>
        <CardDescription>
          View your performance metrics and quick actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingProfile || isLoadingMetrics ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Welcome and status section */}
            <div className="p-4 bg-muted/50 rounded-lg mb-6">
              <h3 className="text-lg font-medium mb-2">
                Welcome, {affiliateProfile?.user?.name || 'Affiliate'}!
              </h3>
              <p className="text-muted-foreground">
                Your affiliate account is <span className="font-medium">{affiliateProfile?.status}</span>.
                {affiliateProfile?.status === 'active' ? (
                  ' You have full access to all affiliate features.'
                ) : affiliateProfile?.status === 'pending' ? (
                  ' Your application is under review.'
                ) : (
                  ' Please contact support for assistance.'
                )}
              </p>
            </div>
            
            {/* Key metrics summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(metrics?.totalClicks)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {conversionRate}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clicks to conversions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                    <LineChart className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrencyPHP(metrics?.totalEarnings) || '₱0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick actions */}
            <div className="space-y-3">
              <h3 className="font-medium">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-between h-auto py-3"
                  onClick={() => router.push('/affiliate-portal/performance')}
                >
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <LineChart className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">View Performance</p>
                      <p className="text-xs text-muted-foreground">
                        Analyze your clicks and conversions data
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
