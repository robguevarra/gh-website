'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminAffiliateListItem, AffiliateStatusType, AffiliateClick, AffiliateConversion, AdminAffiliatePayout, ConversionStatusType, PayoutMethodType } from '@/types/admin/affiliate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, BarChart2, AlertTriangle, UserCheck, UserX, Calendar, Percent, Link as LinkIcon, User, MousePointerClick, CreditCard, DollarSign, FileText, Smartphone, CheckCircle, XCircle, Clock } from 'lucide-react';
import EditAffiliateForm from './edit-affiliate-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { getAffiliateClicks, getAffiliateConversions, getAffiliatePayouts } from '@/lib/actions/admin/affiliate.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getMembershipLevels, MembershipLevelData } from '@/lib/actions/membership-level-actions';
import { updateAffiliateMembershipLevel } from '@/lib/actions/affiliate-actions';
import { useRouter } from 'next/navigation'; // For revalidating path, though revalidatePath is server-side
import { Separator } from '@/components/ui/separator';

// Define InfoItem component locally
interface InfoItemProps {
  Icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ Icon, label, value, className }) => (
  <div className={`flex items-center space-x-2 ${className || ''}`}>
    <Icon size={16} className="text-muted-foreground" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  </div>
);

interface AffiliateDetailViewProps {
  initialAffiliateDetails: AdminAffiliateListItem;
  initialClicksData?: {
    data: AffiliateClick[];
    totalCount: number;
    error: string | null;
  };
  initialConversionsData?: {
    data: AffiliateConversion[];
    totalCount: number;
    error: string | null;
  };
  initialPayoutsData?: {
    data: AdminAffiliatePayout[];
    totalCount: number;
    error: string | null;
  };
  payoutValidation?: any;
}



const statusBadgeVariants: Record<AffiliateStatusType, string> = {
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  active: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  inactive: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  flagged: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
};

const ITEMS_PER_PAGE = 5;

const statusIcons: Record<AffiliateStatusType, React.ElementType> = {
  pending: AlertTriangle,
  active: UserCheck,
  inactive: UserX,
  flagged: AlertTriangle,
};

// Mock data for demonstration purposes - will be replaced with real data fetching
const mockClickHistory: AffiliateClick[] = [
  { 
    id: '1', 
    affiliate_id: '123', 
    date: '2025-05-30T14:25:00Z', 
    source: 'Blog Post', 
    landing_page: '/courses/homeschool-101', 
    landing_page_url: '/courses/homeschool-101', 
    visitor_id: 'v-12345',
    created_at: '2025-05-30T14:25:00Z',
    updated_at: '2025-05-30T14:25:00Z'
  },
  { 
    id: '2', 
    affiliate_id: '123', 
    date: '2025-05-30T10:12:00Z', 
    source: 'Facebook', 
    landing_page: '/', 
    landing_page_url: '/', 
    visitor_id: 'v-23456',
    created_at: '2025-05-30T10:12:00Z',
    updated_at: '2025-05-30T10:12:00Z'
  },
  { 
    id: '3', 
    affiliate_id: '123', 
    date: '2025-05-29T16:45:00Z', 
    source: 'Direct', 
    landing_page: '/pricing', 
    landing_page_url: '/pricing', 
    visitor_id: 'v-34567',
    created_at: '2025-05-29T16:45:00Z',
    updated_at: '2025-05-29T16:45:00Z'
  },
  { 
    id: '4', 
    affiliate_id: '123', 
    date: '2025-05-29T09:30:00Z', 
    source: 'Instagram', 
    landing_page: '/courses', 
    landing_page_url: '/courses', 
    visitor_id: 'v-45678',
    created_at: '2025-05-29T09:30:00Z',
    updated_at: '2025-05-29T09:30:00Z'
  },
  { 
    id: '5', 
    affiliate_id: '123', 
    date: '2025-05-28T11:20:00Z', 
    source: 'Email Campaign', 
    landing_page: '/courses/advanced-curriculum', 
    landing_page_url: '/courses/advanced-curriculum', 
    visitor_id: 'v-56789',
    created_at: '2025-05-28T11:20:00Z',
    updated_at: '2025-05-28T11:20:00Z'
  },
];

const mockConversions: AffiliateConversion[] = [
  { 
    id: '1', 
    affiliate_id: '123', 
    order_id: 'ORD-12345', 
    date: '2025-05-30T15:10:00Z', 
    amount: 199.99, 
    gmv: 199.99, 
    commission: 40.00, 
    commission_amount: 40.00, 
    status: 'cleared',
    created_at: '2025-05-30T15:10:00Z',
    updated_at: '2025-05-30T15:10:00Z',
    product_name: 'Homeschool 101 Course'
  },
  { 
    id: '2', 
    affiliate_id: '123', 
    order_id: 'ORD-12346', 
    date: '2025-05-29T12:05:00Z', 
    amount: 149.99, 
    gmv: 149.99, 
    commission: 30.00, 
    commission_amount: 30.00, 
    status: 'paid',
    created_at: '2025-05-29T12:05:00Z',
    updated_at: '2025-05-29T12:05:00Z',
    product_name: 'Math Curriculum Bundle'
  },
  { 
    id: '3', 
    affiliate_id: '123', 
    order_id: 'ORD-12347', 
    date: '2025-05-28T14:30:00Z', 
    amount: 99.99, 
    gmv: 99.99, 
    commission: 20.00, 
    commission_amount: 20.00, 
    status: 'paid',
    created_at: '2025-05-28T14:30:00Z',
    updated_at: '2025-05-28T14:30:00Z',
    product_name: 'Science Curriculum'
  },
  { 
    id: '4', 
    affiliate_id: '123', 
    order_id: 'ORD-12348', 
    date: '2025-05-27T09:15:00Z', 
    amount: 199.99, 
    gmv: 199.99, 
    commission: 40.00, 
    commission_amount: 40.00, 
    status: 'pending',
    created_at: '2025-05-27T09:15:00Z',
    updated_at: '2025-05-27T09:15:00Z',
    product_name: 'Annual Membership'
  },
  { 
    id: '5', 
    affiliate_id: '123', 
    order_id: 'ORD-12349', 
    date: '2025-05-26T16:45:00Z', 
    amount: 149.99, 
    gmv: 149.99, 
    commission: 30.00, 
    commission_amount: 30.00, 
    status: 'flagged',
    created_at: '2025-05-26T16:45:00Z',
    updated_at: '2025-05-26T16:45:00Z',
    product_name: 'Language Arts Bundle'
  },
];

const mockPayouts: AdminAffiliatePayout[] = [
  { 
    payout_id: '1', 
    affiliate_id: '123', 
    affiliate_name: 'John Doe',
    affiliate_email: 'john@example.com',
    amount: 120.00, 
    payout_method: 'paypal', 
    status: 'sent', 
    reference: 'PAY-98765',
    created_at: '2025-05-15T10:00:00Z'
  },
  { 
    payout_id: '2', 
    affiliate_id: '123', 
    affiliate_name: 'John Doe',
    affiliate_email: 'john@example.com',
    amount: 90.00, 
    payout_method: 'bank_transfer', 
    status: 'sent', 
    reference: 'PAY-87654',
    created_at: '2025-04-15T10:00:00Z'
  },
  { 
    payout_id: '3', 
    affiliate_id: '123', 
    affiliate_name: 'John Doe',
    affiliate_email: 'john@example.com',
    amount: 75.00, 
    payout_method: 'paypal', 
    status: 'sent', 
    reference: 'PAY-76543',
    created_at: '2025-03-15T10:00:00Z'
  },
  { 
    payout_id: '4', 
    affiliate_id: '123', 
    affiliate_name: 'John Doe',
    affiliate_email: 'john@example.com',
    amount: 60.00, 
    payout_method: 'bank_transfer', 
    status: 'sent', 
    reference: 'PAY-65432',
    created_at: '2025-02-15T10:00:00Z'
  },
  { 
    payout_id: '5', 
    affiliate_id: '123', 
    affiliate_name: 'John Doe',
    affiliate_email: 'john@example.com',
    amount: 45.00, 
    payout_method: 'paypal', 
    status: 'sent', 
    reference: 'PAY-54321',
    created_at: '2025-01-15T10:00:00Z'
  },
];

export const AffiliateDetailView: React.FC<AffiliateDetailViewProps> = ({ 
  initialAffiliateDetails,
  initialClicksData,
  initialConversionsData,
  initialPayoutsData,
  payoutValidation 
}) => {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<AdminAffiliateListItem>(initialAffiliateDetails);
  const [isEditing, setIsEditing] = useState(false);
  const [clicks, setClicks] = useState<AffiliateClick[]>(initialClicksData?.data || []);
  const [clicksTotal, setClicksTotal] = useState<number>(initialClicksData?.totalCount || 0);
  
  const [conversions, setConversions] = useState<AffiliateConversion[]>(initialConversionsData?.data || []);
  const [conversionsTotal, setConversionsTotal] = useState<number>(initialConversionsData?.totalCount || 0);
  
  const [payouts, setPayouts] = useState<AdminAffiliatePayout[]>(initialPayoutsData?.data || mockPayouts);  
  const [payoutsTotal, setPayoutsTotal] = useState<number>(initialPayoutsData?.totalCount || 0);
  const [isLoading, setIsLoading] = useState(false);
  // Removed duplicated state declarations for affiliate, setAffiliate, isEditing, setIsEditing, clicks, conversions, payouts as they exist later or were mock data.

  // State for membership level management
  const [membershipLevels, setMembershipLevels] = useState<MembershipLevelData[]>([]);
  const [selectedMembershipLevelId, setSelectedMembershipLevelId] = useState<string | null>(
    affiliate.current_membership_level_id || null
  );
  const [isLevelsLoading, setIsLevelsLoading] = useState(false);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);
  const [updateTierError, setUpdateTierError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembershipLevels = async () => {
      setIsLevelsLoading(true);
      setLevelsError(null);
      try {
        const levels = await getMembershipLevels();
        if (levels && levels.length > 0) {
          setMembershipLevels(levels);
        } else {
          // This case covers both an explicit empty array from the server (no levels found)
          // or if the function returned an empty array due to an internal error it caught and logged.
          setLevelsError('No membership levels found or error fetching them.');
          // toast.info('No membership levels available to select.'); // Consider if a toast is needed for empty list vs error
        }
      } catch (error) { // This catch is for errors not caught within getMembershipLevels itself
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setLevelsError(errorMessage);
        toast.error(`Error fetching membership levels: ${errorMessage}`);
      }
      setIsLevelsLoading(false);
    };

    fetchMembershipLevels();
  }, []);

  // Update selectedMembershipLevelId when initialAffiliateDetails changes or levels are loaded
  useEffect(() => {
    setSelectedMembershipLevelId(affiliate.current_membership_level_id || null);
  }, [affiliate.current_membership_level_id]);

  const handleUpdateTier = async () => {
    if (selectedMembershipLevelId === affiliate.current_membership_level_id) {
      toast.info('No changes to save. Current tier is already selected.');
      return;
    }

    setIsUpdatingTier(true);
    setUpdateTierError(null);

    try {
      // Ensure affiliate.user_id is passed, as this is the ID for unified_profiles
      const result = await updateAffiliateMembershipLevel(affiliate.user_id, selectedMembershipLevelId);

      if (result.error) {
        setUpdateTierError(result.error);
        toast.error(`Failed to update tier: ${result.error}`);
      } else {
        toast.success('Affiliate membership tier updated successfully!');
        
        const newLevelDetails = selectedMembershipLevelId 
          ? membershipLevels.find(level => level.id === selectedMembershipLevelId)
          : null;

        const updatedAffiliateState: AdminAffiliateListItem = {
          ...affiliate,
          current_membership_level_id: selectedMembershipLevelId,
          membership_level_name: newLevelDetails?.name || undefined,
        };
        setAffiliate(updatedAffiliateState);
        
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during tier update';
      setUpdateTierError(errorMessage);
      toast.error(errorMessage); // Display the actual error message from the catch block
    }
    setIsUpdatingTier(false);
  };

  const [loadingClicks, setLoadingClicks] = useState(!initialClicksData);
  const [currentPageClicks, setCurrentPageClicks] = useState(1);
  const [loadingConversions, setLoadingConversions] = useState(!initialConversionsData);
  const [currentPageConversions, setCurrentPageConversions] = useState(1);
  const [loadingPayouts, setLoadingPayouts] = useState(!initialPayoutsData);
  const [currentPagePayouts, setCurrentPagePayouts] = useState(1);
  const [clickFilter, setClickFilter] = useState('');
  const [conversionFilter, setConversionFilter] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('');
  
  // Initialize with pre-fetched data if available
  const [clickHistoryData, setClickHistoryData] = useState<{ data: AffiliateClick[]; totalCount: number }>({ 
    data: initialClicksData?.data || [], 
    totalCount: initialClicksData?.totalCount || 0 
  });
  
  const [conversionHistoryData, setConversionHistoryData] = useState<{ data: AffiliateConversion[]; totalCount: number }>({ 
    data: initialConversionsData?.data || [], 
    totalCount: initialConversionsData?.totalCount || 0 
  });
  
  const [payoutHistoryData, setPayoutHistoryData] = useState<{ data: AdminAffiliatePayout[]; totalCount: number }>({ 
    data: initialPayoutsData?.data || [], 
    totalCount: initialPayoutsData?.totalCount || 0 
  });
  // Removed duplicate declarations of [affiliate, setAffiliate] and [isEditing, setIsEditing]
  // These are already declared near the top of the component.

  useEffect(() => {
    // If we have pre-fetched data and we're on the first page with no filters, skip the fetch
    const isPrefetchedDataSufficient = 
      initialClicksData?.data && 
      initialClicksData.data.length > 0 && 
      currentPageClicks === 1 && 
      !clickFilter;
      
    if (isPrefetchedDataSufficient) {
      setLoadingClicks(false);
      return;
    }
    
    async function fetchClickData() {
      if (!affiliate?.affiliate_id) return;
      setLoadingClicks(true);
      try {
        const result = await getAffiliateClicks({
          affiliateId: affiliate.affiliate_id,
          currentPage: currentPageClicks,
          itemsPerPage: ITEMS_PER_PAGE,
          filters: { 
            source: clickFilter || undefined, 
            landingPage: clickFilter || undefined 
          },
        }).catch(error => {
          console.error('Error calling getAffiliateClicks:', error);
          return null; // Return null to be handled in the next step
        });
        
        if (!result) {
          console.error('getAffiliateClicks returned undefined or failed');
          // Keep existing data if available, otherwise reset
          if (clickHistoryData.data.length === 0) {
            setClickHistoryData({ data: [], totalCount: 0 });
          }
        } else if (result.data) {
          setClickHistoryData({ data: result.data, totalCount: result.totalCount });
        } else if (result.error) {
          console.error('Failed to fetch click history:', result.error);
          // Keep existing data if available, otherwise reset
          if (clickHistoryData.data.length === 0) {
            setClickHistoryData({ data: [], totalCount: 0 });
          }
        }
      } catch (error) {
        console.error('Error in fetchClickData:', error);
        // Keep existing data if available, otherwise reset
        if (clickHistoryData.data.length === 0) {
          setClickHistoryData({ data: [], totalCount: 0 });
        }
      }
      setLoadingClicks(false);
    }

    fetchClickData();
  }, [affiliate?.affiliate_id, currentPageClicks, clickFilter, initialClicksData]);

  useEffect(() => {
    // If we have pre-fetched data and we're on the first page with no filters, skip the fetch
    const isPrefetchedDataSufficient = 
      initialConversionsData?.data && 
      initialConversionsData.data.length > 0 && 
      currentPageConversions === 1 && 
      !conversionFilter;
      
    if (isPrefetchedDataSufficient) {
      setLoadingConversions(false);
      return;
    }
    
    async function fetchConversionData() {
      if (!affiliate?.affiliate_id) return;
      setLoadingConversions(true);
      try {
        const result = await getAffiliateConversions({
          affiliateId: affiliate.affiliate_id,
          currentPage: currentPageConversions,
          itemsPerPage: ITEMS_PER_PAGE,
          filters: { 
            orderId: conversionFilter || undefined,
            // Ensure conversionFilter is correctly parsed if it's for status
            status: conversionFilter && ['pending', 'cleared', 'paid', 'flagged'].includes(conversionFilter.toLowerCase()) 
                    ? conversionFilter.toLowerCase() as ConversionStatusType 
                    : undefined
          },
        }).catch(error => {
          console.error('Error calling getAffiliateConversions:', error);
          return null; // Return null to be handled in the next step
        });
        
        // Check if result is undefined/null first
        if (!result) {
          console.error('getAffiliateConversions returned undefined or failed');
          // Keep existing data if available, otherwise reset
          if (conversionHistoryData.data.length === 0) {
            setConversionHistoryData({ data: [], totalCount: 0 });
          }
        } else if (result.data) {
          setConversionHistoryData({ data: result.data, totalCount: result.totalCount });
        } else if (result.error) {
          console.error('Failed to fetch conversion history:', result.error);
          // Keep existing data if available, otherwise reset
          if (conversionHistoryData.data.length === 0) {
            setConversionHistoryData({ data: [], totalCount: 0 });
          }
        }
      } catch (error) {
        console.error('Error in fetchConversionData:', error);
        // Keep existing data if available, otherwise reset
        if (conversionHistoryData.data.length === 0) {
          setConversionHistoryData({ data: [], totalCount: 0 });
        }
      }
      setLoadingConversions(false);
    }

    fetchConversionData();
  }, [affiliate?.affiliate_id, currentPageConversions, conversionFilter, initialConversionsData]);

  useEffect(() => {
    // If we have pre-fetched data and we're on the first page with no filters, skip the fetch
    const isPrefetchedDataSufficient = 
      initialPayoutsData?.data && 
      initialPayoutsData.data.length > 0 && 
      currentPagePayouts === 1 && 
      !payoutFilter;
      
    if (isPrefetchedDataSufficient) {
      setLoadingPayouts(false);
      return;
    }
    
    async function fetchPayoutData() {
      if (!affiliate?.affiliate_id) return;
      setLoadingPayouts(true);
      try {
        const result = await getAffiliatePayouts({
          affiliateId: affiliate.affiliate_id,
          currentPage: currentPagePayouts,
          itemsPerPage: ITEMS_PER_PAGE,
          filters: { 
            reference: payoutFilter || undefined,
            method: payoutFilter && ['paypal', 'bank_transfer', 'wise', 'other'].includes(payoutFilter.toLowerCase()) 
                    ? payoutFilter.toLowerCase() as PayoutMethodType 
                    : undefined
          },
        }).catch(error => {
          console.error('Error calling getAffiliatePayouts:', error);
          return null; // Return null to be handled in the next step
        });
        
        if (!result) {
          console.error('getAffiliatePayouts returned undefined or failed');
          // Keep existing data if available, otherwise reset
          if (payoutHistoryData.data.length === 0) {
            setPayoutHistoryData({ data: [], totalCount: 0 });
          }
        } else if (result.data) {
          setPayoutHistoryData({ data: result.data, totalCount: result.totalCount });
        } else if (result.error) {
          console.error('Failed to fetch payout history:', result.error);
          // Keep existing data if available, otherwise reset
          if (payoutHistoryData.data.length === 0) {
            setPayoutHistoryData({ data: [], totalCount: 0 });
          }
        }
      } catch (error) {
        console.error('Error in fetchPayoutData:', error);
        // Keep existing data if available, otherwise reset
        if (payoutHistoryData.data.length === 0) {
          setPayoutHistoryData({ data: [], totalCount: 0 });
        }
      }
      setLoadingPayouts(false);
    }

    fetchPayoutData();
  }, [affiliate?.affiliate_id, currentPagePayouts, payoutFilter, initialPayoutsData]); 

  // Reset page to 1 when filter changes
  useEffect(() => {
    setCurrentPageClicks(1);
  }, [clickFilter]);

  useEffect(() => {
    setCurrentPageConversions(1);
  }, [conversionFilter]);

  useEffect(() => {
    setCurrentPagePayouts(1);
  }, [payoutFilter]);

  useEffect(() => {
  }, []);

  useEffect(() => {
    setAffiliate(initialAffiliateDetails);
  }, [initialAffiliateDetails]);

  const handleEditSuccess = () => {
    setIsEditing(false);
    // Data will be re-fetched by revalidatePath in server action
    // The EditAffiliateForm now shows its own success toast
  };

  const StatusIcon = statusIcons[affiliate.status] || AlertTriangle;

  if (isEditing) {
    return (
      <EditAffiliateForm 
        affiliate={affiliate} 
        onFormSubmitSuccess={handleEditSuccess} 
        onCancel={() => setIsEditing(false)} 
      />
    );
  }

  // Data for clicks is now fetched from server
  const paginatedClicks = clickHistoryData.data;
  const totalPagesClicks = Math.ceil(clickHistoryData.totalCount / ITEMS_PER_PAGE);

  // Data for conversions is now fetched from server
  const paginatedConversions = conversionHistoryData.data;
  const totalPagesConversions = Math.ceil(conversionHistoryData.totalCount / ITEMS_PER_PAGE);

  // Data for payouts is now fetched from server
  const paginatedPayouts = payoutHistoryData.data;
  const totalPagesPayouts = Math.ceil(payoutHistoryData.totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-serif text-primary">{affiliate.name}</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">{affiliate.email}</p>
            </div>
            <Badge className={`${statusBadgeVariants[affiliate.status]} flex items-center gap-1.5 px-3 py-1`}>
              <StatusIcon size={14} />
              <span className="capitalize">{affiliate.status}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Basic Info */}
          <div className="mb-8">
            <h3 className="text-md font-medium mb-4 text-primary/80 font-serif">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Affiliate ID</p>
                  <p className="text-sm font-medium">{affiliate.affiliate_id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <LinkIcon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Affiliate Slug</p>
                  <p className="text-sm font-medium">{affiliate.slug}</p>
                </div>
              </div>
              <InfoItem Icon={Percent} label="Membership Tier" value={affiliate.membership_level_name || 'N/A'} />
              <InfoItem Icon={Percent} label="Tier Commission Rate" value={affiliate.tier_commission_rate !== undefined ? `${(affiliate.tier_commission_rate * 100).toFixed(0)}%` : 'N/A'} />
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined Date</p>
                  <p className="text-sm font-medium">
                    {new Date(affiliate.joined_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Details Section */}
          <Separator className="my-6" />
          <div className="mb-8">
            <h3 className="text-md font-medium mb-4 text-primary/80 font-serif">Payout Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Payout Method */}
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-primary/10">
                  {affiliate.payout_method === 'gcash' ? (
                    <Smartphone size={16} className="text-primary" />
                  ) : (
                    <CreditCard size={16} className="text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payout Method</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium capitalize">
                      {affiliate.payout_method || 'Not Set'}
                    </p>
                    {affiliate.payout_method === 'gcash' && (
                      <Badge variant={affiliate.gcash_verified ? 'default' : 'secondary'} className="text-xs">
                        {affiliate.gcash_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    )}
                    {affiliate.payout_method === 'bank_transfer' && (
                      <Badge variant={affiliate.bank_account_verified ? 'default' : 'secondary'} className="text-xs">
                        {affiliate.bank_account_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* GCash Details (if GCash method) */}
              {affiliate.payout_method === 'gcash' && (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Smartphone size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">GCash Number</p>
                      <p className="text-sm font-medium font-mono">
                        {affiliate.gcash_number || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">GCash Account Name</p>
                      <p className="text-sm font-medium">
                        {affiliate.gcash_name || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  {affiliate.gcash_verification_status && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        {affiliate.gcash_verification_status === 'verified' ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : affiliate.gcash_verification_status === 'rejected' ? (
                          <XCircle size={16} className="text-red-600" />
                        ) : (
                          <Clock size={16} className="text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Verification Status</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium capitalize">
                            {affiliate.gcash_verification_status.replace('_', ' ')}
                          </p>
                          <Badge 
                            variant={
                              affiliate.gcash_verification_status === 'verified' ? 'default' :
                              affiliate.gcash_verification_status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {affiliate.gcash_verification_status === 'verified' ? 'Verified' :
                             affiliate.gcash_verification_status === 'rejected' ? 'Rejected' :
                             affiliate.gcash_verification_status === 'pending_review' ? 'Pending Review' :
                             affiliate.gcash_verification_status === 'pending_documents' ? 'Needs Documents' :
                             'Unverified'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Bank Details (if bank transfer method) */}
              {affiliate.payout_method === 'bank_transfer' && (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CreditCard size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bank Name</p>
                      <p className="text-sm font-medium">
                        {affiliate.bank_name || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="text-sm font-medium font-mono">
                        {affiliate.account_number ? 
                          `****${affiliate.account_number.slice(-4)}` : 
                          'Not provided'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Holder</p>
                      <p className="text-sm font-medium">
                        {affiliate.account_holder_name || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Validation Status */}
              {payoutValidation && (
                <div className="col-span-full">
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      {payoutValidation.isValid ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                      Payout Validation Status
                    </h4>
                    {payoutValidation.errors && payoutValidation.errors.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">Errors:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {payoutValidation.errors.map((error: string, index: number) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-red-500">•</span>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {payoutValidation.warnings && payoutValidation.warnings.length > 0 && (
                      <div className={payoutValidation.errors && payoutValidation.errors.length > 0 ? "mt-2" : ""}>
                        <p className="text-xs text-muted-foreground mb-1">Warnings:</p>
                        <ul className="text-sm text-amber-600 space-y-1">
                          {payoutValidation.warnings.map((warning: string, index: number) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-amber-500">⚠</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {payoutValidation.isValid && (!payoutValidation.warnings || payoutValidation.warnings.length === 0) && (
                      <p className="text-sm text-green-600">
                        ✓ All payout details are valid and ready for processing
                      </p>
                    )}
                    {payoutValidation.isValid && payoutValidation.warnings && payoutValidation.warnings.length > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Payout details are valid but please review warnings above
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clicks">Click History</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="payouts"><DollarSign size={16} className="mr-2" />Payouts</TabsTrigger>
          <TabsTrigger value="fraud"><AlertTriangle size={16} className="mr-2" />Fraud Flags</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Performance Metrics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md font-serif text-primary">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{affiliate.ctr ? `${affiliate.ctr}%` : 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Click-through Rate</div>
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Total Conversions</p>
                  <p className="text-2xl font-medium">{affiliate.total_conversions}</p>
                </div>
                <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl font-medium">${affiliate.total_earnings.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md font-serif text-primary">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setIsEditing(true)} className="flex items-center">
                  <Edit size={16} className="mr-2" /> Edit Affiliate
                </Button>
                <Button variant="outline" asChild className="flex items-center">
                  <Link href={`/admin/affiliates/analytics?affiliateId=${affiliate.affiliate_id}`}>
                    <BarChart2 size={16} className="mr-2" /> View Performance Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Click History Tab */}
        <TabsContent value="clicks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-md font-serif text-primary">Click History</CardTitle>
                  <CardDescription>Recent referral link clicks</CardDescription>
                </div>
                <Input
                  placeholder="Filter by source or landing page..."
                  value={clickFilter}
                  onChange={(e) => setClickFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Landing Page</TableHead>
                    <TableHead>Visitor ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingClicks ? (
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                      <TableRow key={`skeleton-click-${index}`}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedClicks.length > 0 ? (
                    paginatedClicks.map((click) => (
                      <TableRow key={click.id}>
                        <TableCell>
                          {new Date(click.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{click.referral_url || 'N/A'}</TableCell>
                        <TableCell>{click.landing_page_url || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-xs">{click.visitor_id || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No click history available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageClicks(prev => Math.max(1, prev - 1))}
                    disabled={currentPageClicks === 1 || loadingClicks}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageClicks(prev => Math.min(totalPagesClicks, prev + 1))}
                    disabled={currentPageClicks === totalPagesClicks || loadingClicks || totalPagesClicks === 0}
                  >
                    Next
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Page {clickHistoryData.totalCount > 0 ? currentPageClicks : 0} of {totalPagesClicks}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/affiliates/clicks?affiliateId=${affiliate.affiliate_id}`}>
                    <MousePointerClick size={14} className="mr-2" /> View All Clicks
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-md font-serif text-primary">Conversion Details</CardTitle>
                  <CardDescription>Sales attributed to this affiliate</CardDescription>
                </div>
                <Input
                  placeholder="Filter by Order ID or status..."
                  value={conversionFilter}
                  onChange={(e) => setConversionFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingConversions ? (
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                      <TableRow key={`skeleton-conversion-${index}`}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedConversions.length > 0 ? (
                    paginatedConversions.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          {new Date(conversion.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{conversion.order_id}</TableCell>
                        <TableCell>${conversion.gmv.toFixed(2)}</TableCell>
                        <TableCell>${conversion.commission_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            conversion.status === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            conversion.status === 'cleared' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            conversion.status === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                            'bg-red-100 text-red-800 hover:bg-red-200'
                          }>
                            {conversion.status.charAt(0).toUpperCase() + conversion.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No conversion data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageConversions(prev => Math.max(1, prev - 1))}
                    disabled={currentPageConversions === 1 || loadingConversions}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageConversions(prev => Math.min(totalPagesConversions, prev + 1))}
                    disabled={currentPageConversions === totalPagesConversions || loadingConversions || totalPagesConversions === 0}
                  >
                    Next
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Page {conversionHistoryData.totalCount > 0 ? currentPageConversions : 0} of {totalPagesConversions}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/affiliates/conversions/list?affiliateId=${affiliate.affiliate_id}`}>
                    <CreditCard size={14} className="mr-2" /> View All Conversions
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-md font-serif text-primary">Payout History</CardTitle>
                  <CardDescription>Record of payouts made to this affiliate</CardDescription>
                </div>
                <Input
                  placeholder="Filter by method or reference..."
                  value={payoutFilter}
                  onChange={(e) => setPayoutFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayouts ? (
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                      <TableRow key={`skeleton-payout-${index}`}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedPayouts && paginatedPayouts.length > 0 ? (
                    paginatedPayouts.map((payout) => (
                      <TableRow key={payout.payout_id}>
                        <TableCell>
                          {new Date(payout.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>${payout.amount.toFixed(2)}</TableCell>
                        <TableCell>{payout.payout_method}</TableCell>
                        <TableCell>
                          <Badge variant={'outline'} className={
                            payout.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            payout.status === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                            payout.status === 'processing' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            'bg-red-100 text-red-800 hover:bg-red-200' // for 'failed'
                          }>
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{payout.reference}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No payout history available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePayouts(prev => Math.max(1, prev - 1))}
                    disabled={currentPagePayouts === 1 || loadingPayouts}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPagePayouts(prev => Math.min(totalPagesPayouts, prev + 1))}
                    disabled={currentPagePayouts === totalPagesPayouts || loadingPayouts || totalPagesPayouts === 0}
                  >
                    Next
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Page {payoutHistoryData.totalCount > 0 ? currentPagePayouts : 0} of {totalPagesPayouts}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/affiliates/payouts?affiliateId=${affiliate.affiliate_id}`}>
                    <DollarSign size={14} className="mr-2" /> View All Payouts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Flags</CardTitle>
              <CardDescription>
                Review any fraud flags associated with this affiliate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {affiliate.fraud_flags && affiliate.fraud_flags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reported At</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Resolved At</TableHead>
                      <TableHead>Resolver Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliate.fraud_flags.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>{new Date(flag.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{flag.reason}</TableCell>
                        <TableCell>
                          <Badge variant={flag.resolved ? 'default' : 'destructive'}>
                            {flag.resolved ? 'Resolved' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {flag.details ? (
                            <Button variant="outline" size="sm" onClick={() => toast.info(JSON.stringify(flag.details, null, 2))}>
                              View Details
                            </Button>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>{flag.resolved_at ? new Date(flag.resolved_at).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{flag.resolver_notes || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No fraud flags recorded for this affiliate.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Development Notes - can be removed in production */}
      <Card className="border-dashed border-muted-foreground/30 mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-serif text-muted-foreground">Development Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
            <li className="line-through">Implement actual data fetching for performance metrics. (Basic metrics done)</li>
            <li className="line-through">Link "View Performance Data" to a dedicated analytics/reporting view.</li>
            <li className="line-through">Add more detailed sections (e.g., click history, conversion details, payout history).</li>
            <li className="line-through">Refine UI/UX, potentially add tabs for different information sections.</li>
            <li className="line-through">Replace alert with a proper toast notification for edit success.</li>
            <li className="line-through">Fix TypeScript errors related to ctr property.</li>
            <li className="line-through">Fix TypeScript errors related to date handling and optional properties.</li>
            <li>Implement real data fetching for click history, conversions, and payouts.</li>
            <li>Create the dedicated analytics pages that the "View All" buttons link to.</li>
            <li>Add pagination to tables for large datasets.</li>
            <li>Implement filtering and sorting options for each data table.</li>
            <li>Add date range filtering for performance metrics.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
