import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getAdminAffiliateById,
  getAffiliateLinks,
} from '@/lib/actions/affiliate-actions';
import { validateAffiliatePayoutDetails } from '@/lib/actions/admin/payout-actions';
import { 
  getAffiliateClicks,
  getAffiliateConversions,
  getAffiliatePayouts 
} from '@/lib/actions/admin/affiliate.actions';
import { getFraudFlagsForAffiliate } from '@/lib/actions/admin/fraud-actions';
import { getHighRiskFraudFlagsForAffiliate, assessFraudRiskLevel } from '@/lib/actions/fraud-notification-actions-simplified';
import { AdminAffiliateListItem, AdminFraudFlagListItem } from '@/types/admin/affiliate';
import { AffiliateDetailView } from '@/components/admin/affiliates/affiliate-detail-view';
import { FraudFlagsList } from '@/components/admin/flags/fraud-flags-list';
import { RiskAssessmentBadge } from '@/components/admin/flags/risk-assessment-badge';
import { AffiliateLinksTable } from '@/components/admin/affiliates/affiliate-links-table';
import PageHeader from '@/components/common/page-header';

interface AffiliateDetailPageProps {
  params: {
    affiliateId: string;
  };
}

export default async function AffiliateDetailPage({
  params,
}: AffiliateDetailPageProps) {
  // Await params before accessing its properties
  const resolvedParams = await Promise.resolve(params);
  const affiliateId = resolvedParams.affiliateId;
  let affiliateDetails: AdminAffiliateListItem | null = null;
  let fraudFlags: AdminFraudFlagListItem[] = [];
  let affiliateLinks: any[] = [];
  let errorFetching: string | null = null;
  
  // Initialize risk assessment variables
  let riskCounts = { total: 0, unresolved: 0, highRisk: 0 };
  let riskLevel: 'high' | 'medium' | 'low' = 'low';
  
  // Initialize data for performance and activity tabs
  let clicksData: { data: any[]; totalCount: number; error: string | null } = { data: [], totalCount: 0, error: null };
  let conversionsData: { data: any[]; totalCount: number; error: string | null } = { data: [], totalCount: 0, error: null };
  let payoutsData: { data: any[]; totalCount: number; error: string | null } = { data: [], totalCount: 0, error: null };
  let payoutValidation: any = null;

  try {
    // Fetch all affiliate data in parallel
    const [
      affiliateResult, 
      fraudFlagsResult, 
      highRiskResult, 
      linksResult,
      clicksResult,
      conversionsResult,
      payoutsResult,
      payoutValidationResult
    ] = await Promise.all([
      getAdminAffiliateById(affiliateId),
      getFraudFlagsForAffiliate(affiliateId),
      getHighRiskFraudFlagsForAffiliate(affiliateId),
      getAffiliateLinks(affiliateId),
      getAffiliateClicks({
        affiliateId,
        currentPage: 1,
        itemsPerPage: 5
      }),
      getAffiliateConversions({
        affiliateId,
        currentPage: 1,
        itemsPerPage: 5
      }),
      getAffiliatePayouts({
        affiliateId,
        currentPage: 1,
        itemsPerPage: 5
      }),
      validateAffiliatePayoutDetails(affiliateId).catch(() => null)
    ]);
    
    affiliateDetails = affiliateResult;
    fraudFlags = fraudFlagsResult?.flags || [];
    affiliateLinks = linksResult?.links || [];
    payoutValidation = payoutValidationResult;
    
    // Pre-process fraud flags with risk assessment on the server side
    // to avoid calling server actions during component rendering
    if (fraudFlags.length > 0) {
      const processedFlags = await Promise.all(
        fraudFlags.map(async (flag) => {
          const risk = await assessFraudRiskLevel(flag);
          return { ...flag, risk };
        })
      );
      fraudFlags = processedFlags;
    }
    // Safely assign data with null checks
    clicksData = {
      data: clicksResult.data || [],
      totalCount: clicksResult.totalCount || 0,
      error: clicksResult.error
    };
    
    conversionsData = {
      data: conversionsResult.data || [],
      totalCount: conversionsResult.totalCount || 0,
      error: conversionsResult.error
    };
    
    payoutsData = {
      data: payoutsResult.data || [],
      totalCount: payoutsResult.totalCount || 0,
      error: payoutsResult.error
    };
    
    // Extract risk assessment information
    riskCounts = highRiskResult?.counts || { total: 0, unresolved: 0, highRisk: 0 };
    riskLevel = riskCounts.highRisk > 0 ? 
      (riskCounts.highRisk >= 2 ? 'high' : 'medium') : 
      'low';
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

      <div className="flex items-center justify-between">
        <PageHeader 
          title={affiliateDetails ? `Affiliate: ${affiliateDetails.name}` : 'Affiliate Details'}
          description={affiliateDetails ? `Manage details and performance for ${affiliateDetails.email}` : 'View and edit affiliate information'}
        />
        
        {/* Risk Assessment Badge */}
        {affiliateDetails && (
          <div className="flex-shrink-0">
            <RiskAssessmentBadge
              affiliateId={affiliateId}
              highRiskCount={riskCounts.highRisk}
              unresolvedCount={riskCounts.unresolved}
              riskLevel={riskLevel}
            />
          </div>
        )}
      </div>

      {errorFetching ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <h3 className="font-medium">Error Loading Affiliate</h3>
          <p className="text-sm text-red-700 mt-1">There was a problem fetching the affiliate details.</p>
          <p className="text-sm font-mono mt-2 p-2 bg-red-100 rounded">{errorFetching}</p>
        </div>
      ) : affiliateDetails ? (
        <div className="space-y-6">
          <AffiliateDetailView 
            initialAffiliateDetails={affiliateDetails} 
            initialClicksData={clicksData}
            initialConversionsData={conversionsData}
            initialPayoutsData={payoutsData}
            payoutValidation={payoutValidation}
          />
          
          {/* Fraud Flags Section */}
          <div className="mt-8">
            <Tabs defaultValue="fraud-flags" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fraud-flags" className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Fraud Flags ({fraudFlags.length})
                </TabsTrigger>
                <TabsTrigger value="referral-links" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Referral Links ({affiliateLinks.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="fraud-flags" className="pt-4">
                <FraudFlagsList flags={fraudFlags} />
              </TabsContent>
              
              <TabsContent value="referral-links" className="pt-4">
                <AffiliateLinksTable links={affiliateLinks} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}
    </div>
  );
}
