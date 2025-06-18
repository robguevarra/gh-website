/**
 * Payout Notification Service
 * 
 * Handles sending email notifications to affiliates for payout status changes.
 * Integrates with Postmark email service and our template system.
 * Replaces Xendit's generic email notifications with branded communications.
 */

import { sendTransactionalEmail } from '../../email/transactional-email-service';
import { getAdminClient } from '../../supabase/admin';

/**
 * Interface for payout data used in email notifications
 */
export interface PayoutNotificationData {
  payoutId: string;
  affiliateName: string;
  affiliateEmail: string;
  payoutAmount: string;
  payoutMethod: string;
  processingDate: string;
  completionDate?: string;
  referenceId: string;
  failureReason?: string;
  supportUrl: string;
  retryDate?: string;
  dashboardUrl: string;
}

/**
 * Fetches payout data from the database for email notifications
 * 
 * @param payoutId The UUID of the affiliate payout
 * @returns Promise resolving to payout data or null if not found
 */
export async function fetchPayoutNotificationData(payoutId: string): Promise<PayoutNotificationData | null> {
  const supabase = getAdminClient();
  
  try {
    console.log(`🔍 Fetching payout notification data for: ${payoutId}`);
    
    // Get payout with affiliate data using LEFT JOINs for better compatibility
    const { data: payout, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select(`
        id,
        amount,
        net_amount,
        status,
        payout_method,
        reference,
        processing_notes,
        processed_at,
        created_at,
        updated_at,
        affiliates!left(
          id,
          commission_rate,
          unified_profiles!user_id(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError) {
      console.error('❌ Supabase query error fetching payout:', payoutError);
      return null;
    }

    if (!payout) {
      console.error('❌ No payout found with ID:', payoutId);
      return null;
    }

    console.log('✅ Raw payout data fetched:', {
      id: payout.id,
      amount: payout.amount,
      affiliate: payout.affiliates ? 'Found' : 'Missing',
      profile: payout.affiliates?.unified_profiles ? 'Found' : 'Missing'
    });

    if (!payout.affiliates) {
      console.error('❌ No affiliate data found for payout:', payoutId);
      return null;
    }

    if (!payout.affiliates.unified_profiles) {
      console.error('❌ No unified profile found for affiliate in payout:', payoutId);
      return null;
    }

    // Format payout method display name
    const formatPayoutMethod = (method: string): string => {
      switch (method?.toLowerCase()) {
        case 'gcash':
          return 'GCash';
        case 'bank_transfer':
          return 'Bank Transfer';
        case 'paymaya':
          return 'PayMaya';
        default:
          return method || 'Bank Transfer';
      }
    };

    // Format currency amounts
    const formatAmount = (amount: number): string => {
      return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Format dates
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Calculate retry date (7 days from now for failed payouts)
    const getRetryDate = (): string => {
      const retryDate = new Date();
      retryDate.setDate(retryDate.getDate() + 7);
      return formatDate(retryDate.toISOString());
    };

    // Extract failure reason from processing notes
    const extractFailureReason = (notes: string | null): string => {
      if (!notes) return 'Unknown error occurred';
      
      // Common Xendit failure patterns
      if (notes.includes('INSUFFICIENT_BALANCE')) return 'Insufficient account balance';
      if (notes.includes('INVALID_DESTINATION')) return 'Invalid account details';
      if (notes.includes('RECIPIENT_ACCOUNT_CLOSED')) return 'Recipient account is closed';
      if (notes.includes('REJECTED_BY_PARTNER')) return 'Transaction rejected by payment partner';
      
      // Extract failure reason from processing notes
      const failureMatch = notes.match(/Payment failed: (.+?) on/);
      if (failureMatch) return failureMatch[1];
      
      return 'Payment processing error occurred';
    };

    const affiliateProfile = payout.affiliates.unified_profiles;
    
    return {
      payoutId: payout.id,
      affiliateName: `${affiliateProfile.first_name || ''} ${affiliateProfile.last_name || ''}`.trim() || 'Affiliate',
      affiliateEmail: affiliateProfile.email || '',
      payoutAmount: formatAmount(payout.net_amount || payout.amount),
      payoutMethod: formatPayoutMethod(payout.payout_method),
      processingDate: formatDate(payout.processed_at || payout.created_at),
      completionDate: payout.processed_at ? formatDate(payout.processed_at) : undefined,
      referenceId: payout.reference || payout.id,
      failureReason: payout.status === 'failed' ? extractFailureReason(payout.processing_notes) : undefined,
      supportUrl: 'help@gracefulhomeschooling.com',
      retryDate: payout.status === 'failed' ? getRetryDate() : undefined,
      dashboardUrl: 'https://new.gracefulhomeschooling.com/affiliate-portal',
    };

  } catch (error) {
    console.error('Error in fetchPayoutNotificationData:', error);
    return null;
  }
}

/**
 * Sends payout processing notification email
 * 
 * @param payoutId The UUID of the payout that is being processed
 * @returns Promise resolving to success status
 */
export async function sendPayoutProcessingEmail(payoutId: string): Promise<boolean> {
  try {
    console.log(`📧 Sending payout processing email for payout: ${payoutId}`);

    // Fetch payout data
    const payoutData = await fetchPayoutNotificationData(payoutId);
    if (!payoutData) {
      console.error('❌ Failed to fetch payout data for processing email');
      return false;
    }

    // Prepare variables for the transactional email service
    const variables = {
      affiliateName: payoutData.affiliateName,
      payoutAmount: payoutData.payoutAmount,
      payoutMethod: payoutData.payoutMethod,
      processingDate: payoutData.processingDate,
      referenceId: payoutData.referenceId,
      dashboardUrl: payoutData.dashboardUrl,
    };

    // Validate email address
    if (!payoutData.affiliateEmail) {
      console.error('❌ No email address found for affiliate');
      return false;
    }

    // Send email using the centralized transactional email service
    const result = await sendTransactionalEmail(
      'Affiliate Payout Processing',
      payoutData.affiliateEmail,
      variables
    );

    if (result.success) {
      console.log(`✅ Payout processing email sent successfully to ${payoutData.affiliateEmail}`);
      return true;
    } else {
      console.error('❌ Failed to send payout processing email:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending payout processing email:', error);
    return false;
  }
}

/**
 * Sends payout success notification email
 * 
 * @param payoutId The UUID of the payout that completed successfully
 * @returns Promise resolving to success status
 */
export async function sendPayoutSuccessEmail(payoutId: string): Promise<boolean> {
  try {
    console.log(`📧 Sending payout success email for payout: ${payoutId}`);

    // Fetch payout data
    const payoutData = await fetchPayoutNotificationData(payoutId);
    if (!payoutData) {
      console.error('❌ Failed to fetch payout data for success email');
      return false;
    }

    // Validate email address
    if (!payoutData.affiliateEmail) {
      console.error('❌ No email address found for affiliate');
      return false;
    }

    // Prepare variables for the transactional email service
    const variables = {
      affiliateName: payoutData.affiliateName,
      payoutAmount: payoutData.payoutAmount,
      payoutMethod: payoutData.payoutMethod,
      completionDate: payoutData.completionDate || payoutData.processingDate,
      referenceId: payoutData.referenceId,
      dashboardUrl: payoutData.dashboardUrl,
    };

    // Send email using the centralized transactional email service
    const result = await sendTransactionalEmail(
      'Affiliate Payout Success',
      payoutData.affiliateEmail,
      variables
    );

    if (result.success) {
      console.log(`✅ Payout success email sent successfully to ${payoutData.affiliateEmail}`);
      return true;
    } else {
      console.error('❌ Failed to send payout success email:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending payout success email:', error);
    return false;
  }
}

/**
 * Sends payout failed notification email
 * 
 * @param payoutId The UUID of the payout that failed
 * @returns Promise resolving to success status
 */
export async function sendPayoutFailedEmail(payoutId: string): Promise<boolean> {
  try {
    console.log(`📧 Sending payout failed email for payout: ${payoutId}`);

    // Fetch payout data
    const payoutData = await fetchPayoutNotificationData(payoutId);
    if (!payoutData) {
      console.error('❌ Failed to fetch payout data for failed email');
      return false;
    }

    // Validate email address
    if (!payoutData.affiliateEmail) {
      console.error('❌ No email address found for affiliate');
      return false;
    }

    // Prepare variables for the transactional email service
    const variables = {
      affiliateName: payoutData.affiliateName,
      payoutAmount: payoutData.payoutAmount,
      failureReason: payoutData.failureReason || 'Payment processing error occurred',
      supportUrl: payoutData.supportUrl,
      retryDate: payoutData.retryDate || 'Next scheduled payout cycle',
      dashboardUrl: payoutData.dashboardUrl,
    };

    // Send email using the centralized transactional email service
    const result = await sendTransactionalEmail(
      'Affiliate Payout Failed',
      payoutData.affiliateEmail,
      variables
    );

    if (result.success) {
      console.log(`✅ Payout failed email sent successfully to ${payoutData.affiliateEmail}`);
      return true;
    } else {
      console.error('❌ Failed to send payout failed email:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending payout failed email:', error);
    return false;
  }
}

/**
 * Test function for sending payout notifications with sample data
 * 
 * @param payoutId The UUID of the payout to test
 * @param emailType Type of email to test ('processing', 'success', 'failed')
 * @returns Promise resolving to success status
 */
export async function testPayoutNotification(payoutId: string, emailType: 'processing' | 'success' | 'failed' = 'processing'): Promise<boolean> {
  console.log(`🧪 Testing payout ${emailType} notification for payout: ${payoutId}`);
  
  try {
    switch (emailType) {
      case 'processing':
        return await sendPayoutProcessingEmail(payoutId);
      case 'success':
        return await sendPayoutSuccessEmail(payoutId);
      case 'failed':
        return await sendPayoutFailedEmail(payoutId);
      default:
        console.error('❌ Invalid email type specified');
        return false;
    }
  } catch (error) {
    console.error(`❌ Error testing payout ${emailType} notification:`, error);
    return false;
  }
} 