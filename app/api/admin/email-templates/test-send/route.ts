/**
 * Email Template Test Send API
 * 
 * This API endpoint allows admins to send test emails using specific templates
 * to verify they render and deliver correctly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import templateManager from '@/lib/services/email/template-manager';
import postmarkClient from '@/lib/services/email/postmark-client';

// Initialize Supabase client for auth checks
const getSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Not needed for API routes
        },
        remove(name: string, options: any) {
          // Not needed for API routes
        }
      },
    }
  );
};

// Admin auth middleware
const requireAdmin = async () => {
  const supabase = await getSupabaseClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { isAdmin: false, error: 'Not authenticated' };
  }
  
  // Check if user is an admin
  const { data: userData, error: userError } = await supabase
    .from('unified_profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  
  if (userError || !userData) {
    return { isAdmin: false, error: 'User profile not found' };
  }
  
  return { isAdmin: !!userData.is_admin, error: null };
};

export async function POST(request: NextRequest) {
  // Verify admin access
  const { isAdmin, error } = await requireAdmin();
  
  if (!isAdmin) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { templateId, recipientEmail, variables } = await request.json();
    
    if (!templateId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Template ID and recipient email are required' },
        { status: 400 }
      );
    }
    
    // Initialize template manager
    await templateManager.initialize();
    
    // Render the template with provided variables
    const html = await templateManager.renderTemplate(templateId, variables || {});
    
    // Get template name for subject line
    const template = await templateManager.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }
    
    // Send the test email
    const result = await postmarkClient.sendEmail({
      to: { email: recipientEmail },
      subject: `[TEST] ${template.name || templateId} Email Template`,
      htmlBody: html,
      textBody: `This is a test email for the ${templateId} template. Please view in an HTML email client.`,
      tag: 'test',
    });
    
    // Log the test email for admin auditing
    console.log(`Test email sent for template ${templateId} to ${recipientEmail}`);
    
    return NextResponse.json({
      success: true,
      messageId: result.MessageID,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
