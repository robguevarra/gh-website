/**
 * Affiliate Notification Service
 * 
 * Handles sending email notifications to affiliates when they earn commissions.
 * Integrates with Postmark email service and our template system.
 */

import { sendTransactionalEmail } from '../../email/transactional-email-service';
import { getAdminClient } from '../../supabase/admin';

/**
 * Interface for affiliate conversion data used in email notifications
 */
export interface AffiliateConversionData {
  conversionId: string;
  affiliateName: string;
  affiliateEmail: string;
  customerName: string;
  productName: string;
  saleAmount: string;
  commissionRate: string;
  commissionAmount: string;
  dashboardUrl: string;
}

/**
 * Fetches affiliate conversion data from the database
 * 
 * @param conversionId The UUID of the affiliate conversion
 * @returns Promise resolving to conversion data or null if not found
 */
export async function fetchAffiliateConversionData(conversionId: string): Promise<AffiliateConversionData | null> {
  const supabase = getAdminClient();
  
  try {
    console.log(`[Debug] Fetching conversion data for ID: ${conversionId}`);
    
    // Step 1: Get conversion data
    const { data: conversion, error: conversionError } = await supabase
      .from('affiliate_conversions')
      .select('id, gmv, commission_amount, order_id, affiliate_id')
      .eq('id', conversionId)
      .single();

    if (conversionError || !conversion) {
      console.error('Error fetching conversion data:', conversionError);
      return null;
    }

    // Step 2: Get affiliate data
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, commission_rate, user_id')
      .eq('id', conversion.affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      console.error('Error fetching affiliate data:', affiliateError);
      return null;
    }

    // Step 3: Get affiliate profile data
    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id, first_name, last_name, email')
      .eq('id', affiliate.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile data:', profileError);
      return null;
    }

    // Step 4: Get customer data from transaction (optional)
    let customer = null;
    if (conversion.order_id) {
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('id, user_id')
        .eq('id', conversion.order_id)
        .single();

      if (transaction?.user_id) {
        const { data: customerProfile, error: customerError } = await supabase
          .from('unified_profiles')
          .select('first_name, last_name, email')
          .eq('id', transaction.user_id)
          .single();

        if (!customerError && customerProfile) {
          customer = customerProfile;
        }
      }
    }

    return {
      conversionId: conversion.id,
      affiliateName: `${profile.first_name} ${profile.last_name}`.trim(),
      affiliateEmail: profile.email,
      customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Unknown Customer',
      productName: 'Digital Course Bundle', // TODO: Get from product/order data
      saleAmount: `₱${Number(conversion.gmv).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      commissionRate: `${Math.round(Number(affiliate.commission_rate) * 100)}%`,
      commissionAmount: `₱${Number(conversion.commission_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      dashboardUrl: 'https://new.gracefulhomeschooling.com/affiliate-portal'
    };
  } catch (error) {
    console.error('Unexpected error fetching conversion data:', error);
    return null;
  }
}

/**
 * Sends an affiliate conversion notification email
 * 
 * @param conversionId The UUID of the affiliate conversion
 * @param templateName Optional template name (defaults to 'Affiliate Conversion Notification')
 * @returns Promise resolving to email send result
 */
export async function sendAffiliateConversionNotification(
  conversionId: string, 
  templateName: string = 'Affiliate Conversion Notification'
): Promise<boolean> {
  try {
    console.log(`🎯 Starting affiliate notification for conversion: ${conversionId}`);
    
    // Fetch conversion data
    const conversionData = await fetchAffiliateConversionData(conversionId);
    if (!conversionData) {
      console.error('❌ Failed to fetch conversion data for affiliate notification');
      return false;
    }

    console.log(`📧 Sending notification to: ${conversionData.affiliateEmail}`);
    console.log(`💰 Commission: ${conversionData.commissionAmount} from ${conversionData.saleAmount} sale`);

    // Validate email address
    if (!conversionData.affiliateEmail) {
      console.error('❌ No email address found for affiliate');
      return false;
    }

    // Prepare variables for the transactional email service
    const variables = {
      affiliateName: conversionData.affiliateName,
      customerName: conversionData.customerName,
      productName: conversionData.productName,
      saleAmount: conversionData.saleAmount,
      commissionRate: conversionData.commissionRate,
      commissionAmount: conversionData.commissionAmount,
      dashboardUrl: conversionData.dashboardUrl,
      // Additional standard fields
      firstName: conversionData.affiliateName.split(' ')[0],
      lastName: conversionData.affiliateName.split(' ').slice(1).join(' '),
      fullName: conversionData.affiliateName,
      emailAddress: conversionData.affiliateEmail,
    };

    console.log(`📝 Template: "${templateName}"`);
    console.log(`📝 Variables:`, variables);

    // Send email using the centralized transactional email service
    const result = await sendTransactionalEmail(
      templateName,
      conversionData.affiliateEmail,
      variables
    );

    console.log(`📧 Email service result:`, result);

    if (result.success) {
      console.log(`✅ Affiliate conversion email sent successfully to ${conversionData.affiliateEmail}`);
      return true;
    } else {
      console.error('❌ Failed to send affiliate conversion email:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending affiliate conversion notification:', error);
    return false;
  }
}

/**
 * Test function to send a sample affiliate notification
 * This is useful for testing the email template and service
 */
export async function testAffiliateNotification(conversionId: string): Promise<boolean> {
  console.log('🧪 Testing affiliate notification service...');
  
  try {
    const result = await sendAffiliateConversionNotification(conversionId);
    console.log('🎉 Test successful!', result);
    return result;
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
} 