'use server';

import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Type definitions for conversion management
export interface AdminConversion {
  conversion_id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  conversion_value: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  conversion_date: string;
  created_at: string;
  conversion_type: string;
  product_name?: string;
  customer_email?: string;
  order_id?: string;
  days_pending?: number;
  fraud_score?: number;
}

export interface ConversionStats {
  total_pending: number;
  total_cleared: number;
  total_paid: number;
  total_flagged: number;
  pending_value: number;
  cleared_value: number;
  paid_value: number;
  total_value: number;
  avg_conversion_value: number;
  avg_days_to_clear: number;
}

interface GetAdminConversionsFilters {
  status?: 'pending' | 'cleared' | 'paid' | 'flagged';
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  orderId?: string;
  customerEmail?: string;
}

interface GetAdminConversionsPagination {
  page?: number;
  pageSize?: number;
}

interface GetAdminConversionsSort {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface GetAdminConversionsResult {
  data: AdminConversion[];
  totalCount: number;
  error?: string | null;
}

/**
 * Fetches admin conversions with filtering, pagination, and sorting
 */
export async function getAdminConversions({
  filters = {},
  pagination = { page: 1, pageSize: 20 },
  sort = { sortBy: 'created_at', sortDirection: 'desc' },
}: {
  filters?: GetAdminConversionsFilters;
  pagination?: GetAdminConversionsPagination;
  sort?: GetAdminConversionsSort;
}): Promise<GetAdminConversionsResult> {
  const supabase = getAdminClient();
  const { page = 1, pageSize = 20 } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('affiliate_conversions')
      .select(
        `
        id,
        affiliate_id,
        gmv,
        commission_amount,
        status,
        created_at,
        order_id,
        affiliates (
          user_id,
          unified_profiles!affiliates_user_id_fkey (
            first_name,
            last_name,
            email
          )
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.affiliateId) {
      query = query.eq('affiliate_id', filters.affiliateId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.minAmount) {
      query = query.gte('commission_amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('commission_amount', filters.maxAmount);
    }
    if (filters.orderId) {
      query = query.ilike('order_id', `%${filters.orderId}%`);
    }
    if (filters.customerEmail) {
      query = query.ilike('customer_email', `%${filters.customerEmail}%`);
    }

    // Apply sorting
    if (sort.sortBy && sort.sortDirection) {
      query = query.order(sort.sortBy, { ascending: sort.sortDirection === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: rawConversions, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match AdminConversion interface
    const transformedData: AdminConversion[] = (rawConversions || []).map((c: any) => {
      const daysPending = c.status === 'pending' && c.created_at
        ? Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Calculate commission rate from amounts
      const commissionRate = c.gmv && c.gmv > 0 && c.commission_amount ? c.commission_amount / c.gmv : 0.15;

      return {
        conversion_id: c.id,
        affiliate_id: c.affiliate_id,
        affiliate_name: c.affiliates?.unified_profiles 
          ? `${c.affiliates.unified_profiles.first_name || ''} ${c.affiliates.unified_profiles.last_name || ''}`.trim() || 'N/A'
          : 'N/A',
        affiliate_email: c.affiliates?.unified_profiles?.email || 'N/A',
        conversion_value: c.gmv || 0,
        commission_amount: c.commission_amount || 0,
        commission_rate: commissionRate,
        status: c.status,
        conversion_date: c.created_at,
        created_at: c.created_at,
        conversion_type: 'sale',
        product_name: undefined,
        customer_email: undefined,
        order_id: c.order_id,
        days_pending: daysPending,
        fraud_score: undefined,
      };
    });

    return {
      data: transformedData,
      totalCount: count || 0,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching conversions.';
    console.error('getAdminConversions error:', errorMessage);
    console.error('Full error:', err);
    return {
      data: [],
      totalCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Fetches conversion statistics for the admin dashboard
 */
export async function getConversionStats(): Promise<{
  stats: ConversionStats | null;
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    // Get conversion counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('affiliate_conversions')
      .select('status, commission_amount, created_at')
      .order('created_at', { ascending: false });

    if (statusError) {
      throw statusError;
    }

    if (!statusCounts || statusCounts.length === 0) {
      return {
        stats: {
          total_pending: 0,
          total_cleared: 0,
          total_paid: 0,
          total_flagged: 0,
          pending_value: 0,
          cleared_value: 0,
          paid_value: 0,
          total_value: 0,
          avg_conversion_value: 0,
          avg_days_to_clear: 0,
        },
        error: null,
      };
    }

    // Calculate statistics
    const stats = statusCounts.reduce(
      (acc: any, conversion: any) => {
        const amount = conversion.commission_amount || 0;
        
        switch (conversion.status) {
          case 'pending':
            acc.total_pending++;
            acc.pending_value += amount;
            break;
          case 'cleared':
            acc.total_cleared++;
            acc.cleared_value += amount;
            break;
          case 'paid':
            acc.total_paid++;
            acc.paid_value += amount;
            break;
          case 'flagged':
            acc.total_flagged++;
            break;
        }
        
        acc.total_value += amount;
        acc.total_count++;
        
        return acc;
      },
      {
        total_pending: 0,
        total_cleared: 0,
        total_paid: 0,
        total_flagged: 0,
        pending_value: 0,
        cleared_value: 0,
        paid_value: 0,
        total_value: 0,
        total_count: 0,
      }
    );

    const avgConversionValue = stats.total_count > 0 ? stats.total_value / stats.total_count : 0;

    // Calculate average days to clear (simplified calculation)
    const avgDaysToClear = 7; // Placeholder - would need more complex query to calculate actual average

    return {
      stats: {
        total_pending: stats.total_pending,
        total_cleared: stats.total_cleared,
        total_paid: stats.total_paid,
        total_flagged: stats.total_flagged,
        pending_value: stats.pending_value,
        cleared_value: stats.cleared_value,
        paid_value: stats.paid_value,
        total_value: stats.total_value,
        avg_conversion_value: avgConversionValue,
        avg_days_to_clear: avgDaysToClear,
      },
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversion statistics.';
    console.error('getConversionStats error:', errorMessage);
    return {
      stats: null,
      error: errorMessage,
    };
  }
}

/**
 * Verify conversions and transition them from 'pending' to 'cleared'
 */
export async function verifyConversions({
  conversionIds,
  verificationNotes,
}: {
  conversionIds: string[];
  verificationNotes?: string;
}): Promise<{ success: boolean; error: string | null; verifiedCount: number }> {
  const supabase = getAdminClient();

  try {
    // Update conversion status to 'cleared'
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .update({ 
        status: 'cleared',
        updated_at: new Date().toISOString()
      })
      .in('id', conversionIds)
      .eq('status', 'pending') // Only update pending conversions
      .select('id');

    if (error) {
      throw error;
    }

    const verifiedCount = data?.length || 0;

    if (verifiedCount === 0) {
      return {
        success: false,
        error: 'No pending conversions were found to verify.',
        verifiedCount: 0
      };
    }

    // Get current admin user
    const { data: adminUser } = await supabase.auth.getUser();
    if (!adminUser.user) {
      return { success: false, error: 'Unauthorized: Admin authentication required', verifiedCount: 0 };
    }

    // Create admin verification records for each conversion
    const verificationRecords = conversionIds.map(conversionId => ({
      admin_user_id: adminUser.user.id,
      target_entity_type: 'conversion',
      target_entity_id: conversionId,
      verification_type: 'conversion_verification',
      is_verified: true,
      notes: verificationNotes || null,
      verified_at: new Date().toISOString(),
    }));

    const { error: verificationError } = await supabase
      .from('admin_verifications')
      .insert(verificationRecords);

    if (verificationError) {
      console.error('Error creating verification records:', verificationError);
      // Don't fail the main operation if verification logging fails
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Verified ${verifiedCount} conversions`,
      details: { 
        conversion_ids: conversionIds,
        verified_count: verifiedCount,
        verification_notes: verificationNotes 
      }
    });

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/conversions');
    revalidatePath('/admin/affiliates/payouts/preview');

    return {
      success: true,
      error: null,
      verifiedCount
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to verify conversions.';
    console.error('verifyConversions error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      verifiedCount: 0
    };
  }
}

/**
 * Update the status of a single conversion
 */
export async function updateConversionStatus({
  conversionId,
  status,
  notes,
}: {
  conversionId: string;
  status: 'pending' | 'cleared' | 'paid' | 'flagged';
  notes?: string;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = getAdminClient();

  try {
    const { error } = await supabase
      .from('affiliate_conversions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversionId);

    if (error) {
      throw error;
    }

    // Get current admin user
    const { data: adminUser } = await supabase.auth.getUser();
    if (!adminUser.user) {
      return { success: false, error: 'Unauthorized: Admin authentication required' };
    }

    // Create admin verification record
    const { error: verificationError } = await supabase
      .from('admin_verifications')
      .insert([{
        admin_user_id: adminUser.user.id,
        target_entity_type: 'conversion',
        target_entity_id: conversionId,
        verification_type: 'status_change',
        is_verified: status === 'cleared',
        notes: notes || null,
        verified_at: new Date().toISOString(),
      }]);

    if (verificationError) {
      console.error('Error creating verification record:', verificationError);
    }

    // Log admin activity
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Updated conversion status to ${status}`,
      details: { 
        conversion_id: conversionId,
        new_status: status,
        notes 
      }
    });

    // Revalidate relevant paths
    revalidatePath('/admin/affiliates/conversions');
    revalidatePath('/admin/affiliates/payouts/preview');

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update conversion status.';
    console.error('updateConversionStatus error:', errorMessage);
    return { success: false, error: errorMessage };
  }
} 