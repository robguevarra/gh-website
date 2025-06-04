'use client';

import { Copy, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

import { useAffiliateProfileData } from '@/lib/hooks/use-affiliate-dashboard';
import { Award } from 'lucide-react';

export function ReferralLinksCard() {
  const { affiliateProfile, isLoadingProfile } = useAffiliateProfileData();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const affiliateLink = affiliateProfile?.slug ? `${baseUrl}/papers-to-profits?a=${affiliateProfile.slug}` : null;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Affiliate link copied to clipboard",
        });
      })
      .catch((error) => {
        console.error("Failed to copy:", error);
        toast({
          title: "Copy Failed",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Your Affiliate Link</CardTitle>
          <CardDescription>Share this link to earn commissions on Papers to Profits</CardDescription>
        </div>

      </CardHeader>
      <CardContent>
        {isLoadingProfile ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {affiliateLink ? (
              <div className="flex items-center space-x-2 p-4 bg-muted rounded-md">
                <LinkIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-mono break-all flex-grow">
                  {affiliateLink}
                </span>
                <Button variant="outline" size="sm" onClick={() => handleCopyLink(affiliateLink)} className="flex-shrink-0">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No affiliate link available.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please contact support if you believe this is an error.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {affiliateProfile?.membershipLevel ? (
              <>
                <Award className="h-3 w-3 text-blue-500" />
                <span>
                  {affiliateProfile.membershipLevel.name}: {(affiliateProfile.membershipLevel.commissionRate * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <span>Commission rate: {affiliateProfile?.commissionRate ? `${(affiliateProfile.commissionRate * 100).toFixed(0)}%` : '—'}</span>
            )}
          </div>
          <div>
            <span>Affiliate since: {affiliateProfile?.createdAt ? new Date(affiliateProfile.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
