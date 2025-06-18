/**
 * Affiliate Notification Service
 * 
 * Handles sending email notifications to affiliates when they earn commissions.
 * Integrates with Postmark email service and our template system.
 */

import { createPostmarkClient } from './postmark-client';
import { substituteVariables, getStandardVariableDefaults } from './template-utils';
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
    // Get conversion with affiliate data
    const { data: conversion, error: conversionError } = await supabase
      .from('affiliate_conversions')
      .select(`
        id,
        gmv,
        commission_amount,
        order_id,
        affiliates!inner(
          commission_rate,
          unified_profiles!inner(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', conversionId)
      .single();

    if (conversionError || !conversion) {
      console.error('Error fetching conversion data:', conversionError);
      return null;
    }

    // Get customer data from transaction
    let transaction = null;
    if (conversion.order_id) {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          unified_profiles(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', conversion.order_id)
        .single();

      if (transactionError) {
        console.warn('Could not fetch customer data:', transactionError);
      } else {
        transaction = transactionData;
      }
    }

    // Type assertion to handle the complex nested structure
    const affiliate = (conversion as any).affiliates.unified_profiles;
    const customer = transaction?.unified_profiles as any;
    
    return {
      conversionId: conversion.id,
      affiliateName: `${affiliate.first_name} ${affiliate.last_name}`.trim(),
      affiliateEmail: affiliate.email,
      customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Unknown Customer',
      productName: 'Digital Course Bundle', // TODO: Get from product/order data
      saleAmount: `₱${Number(conversion.gmv).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      commissionRate: `${Math.round(Number((conversion as any).affiliates.commission_rate) * 100)}%`,
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
) {
  try {
    console.log(`🎯 Starting affiliate notification for conversion: ${conversionId}`);
    
    // Fetch conversion data
    const conversionData = await fetchAffiliateConversionData(conversionId);
    if (!conversionData) {
      throw new Error(`Could not fetch data for conversion: ${conversionId}`);
    }

    console.log(`📧 Sending notification to: ${conversionData.affiliateEmail}`);
    console.log(`💰 Commission: ${conversionData.commissionAmount} from ${conversionData.saleAmount} sale`);

    // Get the email template
    const supabase = getAdminClient();
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('html_content, text_content, subject')
      .eq('name', templateName)
      .single();

    if (templateError || !template) {
      throw new Error(`Email template '${templateName}' not found: ${templateError?.message}`);
    }

    // Prepare variable substitution data
    const emailVariables = {
      ...getStandardVariableDefaults(),
      affiliate_name: conversionData.affiliateName,
      customer_name: conversionData.customerName,
      product_name: conversionData.productName,
      sale_amount: conversionData.saleAmount,
      commission_rate: conversionData.commissionRate,
      commission_amount: conversionData.commissionAmount,
      dashboard_url: conversionData.dashboardUrl,
      // Standard recipient details for this specific affiliate
      first_name: conversionData.affiliateName.split(' ')[0],
      last_name: conversionData.affiliateName.split(' ').slice(1).join(' '),
      full_name: conversionData.affiliateName,
      email_address: conversionData.affiliateEmail,
    };

    // Substitute variables in template content
    const finalHtmlContent = substituteVariables(template.html_content, emailVariables);
    const finalTextContent = substituteVariables(template.text_content || '', emailVariables);
    const finalSubject = substituteVariables(template.subject, emailVariables);

    // Send the email via Postmark
    const postmarkClient = createPostmarkClient();
    const result = await postmarkClient.sendEmail({
      to: { email: conversionData.affiliateEmail, name: conversionData.affiliateName },
      subject: finalSubject,
      htmlBody: finalHtmlContent,
      textBody: finalTextContent,
      tag: 'affiliate-conversion',
      metadata: {
        conversion_id: conversionId,
        affiliate_email: conversionData.affiliateEmail,
        commission_amount: conversionData.commissionAmount
      }
    });

    console.log(`✅ Email sent successfully! Message ID: ${result.MessageID}`);
    return result;

  } catch (error) {
    console.error('❌ Failed to send affiliate notification:', error);
    throw error;
  }
}

/**
 * Test function to send a sample affiliate notification
 * This is useful for testing the email template and service
 */
export async function testAffiliateNotification(conversionId: string) {
  console.log('🧪 Testing affiliate notification service...');
  
  try {
    const result = await sendAffiliateConversionNotification(conversionId);
    console.log('🎉 Test successful!', result);
    return result;
  } catch (error) {
    console.error('💥 Test failed:', error);
    throw error;
  }
} 