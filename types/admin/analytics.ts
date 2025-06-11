export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface AffiliateProgramTrends {
  clicks: TrendDataPoint[];
  conversions: TrendDataPoint[];
  gmv: TrendDataPoint[];
  commissions: TrendDataPoint[];
}

export interface TopAffiliateDataPoint {
  affiliateId: string;
  name: string;
  slug?: string;
  value: number;
}

export interface AffiliateProgramKPIs {
  totalActiveAffiliates: number;
  pendingApplications: number;
  totalClicks: number;
  totalConversions: number;
  totalGmv: number;
  totalCommissionsPaid: number;
  averageConversionRate: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface AffiliateAnalyticsData {
  kpis: AffiliateProgramKPIs;
  trends: AffiliateProgramTrends;
  topAffiliatesByConversions: TopAffiliateDataPoint[];
  totalActiveAffiliates: number;
  pendingApplications: number;
  totalClicksLast30Days: number;
  totalConversionsLast30Days: number;
  totalGmvLast30Days: number;
  totalCommissionsPaidLast30Days: number;
  averageConversionRate: number;
} 