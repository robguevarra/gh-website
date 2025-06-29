/**
 * Simple test API endpoint for affiliate conversion notification emails
 * 
 * This endpoint tests the email system with hard-coded data to isolate issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPostmarkClient } from '@/lib/services/email/postmark-client';
import { substituteVariables, getStandardVariableDefaults } from '@/lib/services/email/template-utils';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing simple affiliate notification...');

    // Get the email template
    const supabase = getAdminClient();
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('html_content, text_content, subject')
      .eq('name', 'Affiliate Conversion Notification')
      .single();

    if (templateError || !template) {
      throw new Error(`Email template not found: ${templateError?.message}`);
    }

    console.log('✅ Template found:', template.subject);

    // Hard-coded test data from the real conversion
    const testData = {
      ...getStandardVariableDefaults(),
      affiliate_name: 'Robbbb Geeee',
      customer_name: 'flkjaf1 fjflajfa',
      product_name: 'Digital Course Bundle',
      sale_amount: '₱1,300.00',
      commission_rate: '25%',
      commission_amount: '₱325.00',
      dashboard_url: 'https://new.gracefulhomeschooling.com/affiliate-portal',
      first_name: 'Robbbb',
      last_name: 'Geeee',
      full_name: 'Robbbb Geeee',
      email_address: 'robneil+0000@gmail.com',
    };

    // Substitute variables in template
    const finalHtmlContent = substituteVariables(template.html_content, testData);
    const finalTextContent = substituteVariables(template.text_content || '', testData);
    const finalSubject = substituteVariables(template.subject, testData);

    console.log('📧 Sending email to: robneil+0000@gmail.com');
    console.log('💰 Commission: ₱325.00 from ₱1,300.00 sale');

    // Send the email via Postmark
    const postmarkClient = createPostmarkClient();
    const result = await postmarkClient.sendEmail({
      to: { email: 'robneil+0000@gmail.com', name: 'Robbbb Geeee' },
      subject: finalSubject,
      htmlBody: finalHtmlContent,
      textBody: finalTextContent,
      tag: 'affiliate-conversion-test',
      metadata: {
        test: 'true',
        conversion_id: '4fd5e4be-e378-4771-ae85-48b4d708c228',
        commission_amount: '₱250.00'
      }
    });

    console.log(`✅ Email sent successfully! Message ID: ${result.MessageID}`);

    return NextResponse.json({
      success: true,
      message: 'Test affiliate notification email sent successfully!',
      messageId: result.MessageID,
      to: result.To,
      submittedAt: result.SubmittedAt,
      subject: finalSubject
    });

  } catch (error) {
    console.error('❌ Simple test email failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple test affiliate email endpoint',
    usage: 'POST to send a test email with hard-coded data',
    testData: {
      affiliate: 'Robbbb Geeee (robneil+0000@gmail.com)',
      customer: 'flkjaf1 fjflajfa',
      commission: '₱325.00 from ₱1,300.00 sale'
    }
  });
} 