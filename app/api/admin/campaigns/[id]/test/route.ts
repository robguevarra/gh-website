/**
 * Campaign Test Sending API Route
 * 
 * Endpoint for sending test emails for a campaign
 */

import { NextRequest, NextResponse } from 'next/server'; 
import { PostmarkClient, EmailRecipient } from '@/lib/services/email/postmark-client';
import { 
  getCampaignById,
} from '@/lib/supabase/data-access/campaign-management';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';

// Actual email sending utility using Postmark
async function sendEmailUtility(options: { 
  to: string; 
  subject: string; 
  html: string; 
  fromEmail: string; // e.g., "Sender Name <email@example.com>" or "email@example.com"
}) {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  if (!postmarkToken) {
    console.error('Postmark server token is not configured. Set POSTMARK_SERVER_TOKEN environment variable.');
    return { success: false, error: 'Email service (Postmark) not configured. Missing token.' };
  }

  // The PostmarkClient constructor takes the token.
  // The defaultFrom and defaultMessageStream in PostmarkClient constructor are optional and have defaults.
  const pmClient = new PostmarkClient(postmarkToken);

  // Helper to parse "Name <email>" or "email" string to EmailRecipient
  const parseEmailString = (emailString: string): EmailRecipient => {
    const match = emailString.match(/(?:(.*?)\s*<)?([^<>@\s]+@[^<>@\s]+)(?:>)?/);
    if (match) {
      const name = match[1] ? match[1].trim() : undefined;
      const email = match[2].trim();
      return { email, name };
    }
    // Fallback if regex somehow fails, treat the whole string as email, though Postmark might validate/reject.
    return { email: emailString.trim() }; 
  };

  const fromRecipient: EmailRecipient = parseEmailString(options.fromEmail);
  const toRecipient: EmailRecipient = { email: options.to }; // 'to' is expected to be a simple email address

  try {
    const result = await pmClient.sendEmail({
      from: fromRecipient,
      to: toRecipient,
      subject: options.subject,
      htmlBody: options.html,
      // textBody: '', // Optional: Generate from HTML or provide if available
      // trackOpens: true, // Handled by PostmarkClient defaults or Postmark account settings
      // trackLinks: 'HtmlAndText', // Handled by PostmarkClient defaults
      // messageStream: 'outbound', // Handled by PostmarkClient defaults, override if necessary for test sends
    });
    
    // Assuming successful Postmark API call returns an object with MessageID
    // (This is typical for the 'postmark' npm library)
    if (result && result.MessageID) {
      console.log(`Email sent successfully to ${options.to} via Postmark. MessageID: ${result.MessageID}`);
      return { success: true, messageId: result.MessageID };
    } else {
      // If PostmarkClient's sendEmail doesn't throw but indicates failure differently (e.g., ErrorCode)
      console.error('Postmark send attempt did not return a MessageID. Response:', result);
      return { success: false, error: 'Failed to send email via Postmark. Unexpected response.', details: result };
    }

  } catch (error) {
    console.error('Failed to send email via Postmark:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email via Postmark.';
    return { success: false, error: errorMessage };
  }
}

function substituteVariables(html: string, variables: Record<string, string>): string {
  let processedHtml = html;
  if (variables) {
    for (const key in variables) {
      const regex = new RegExp(`\\{\\{\s*${key}\s*\\}\\}`, 'g');
      processedHtml = processedHtml.replace(regex, variables[key]);
    }
  }
  return processedHtml;
}

/**
 * POST /api/admin/campaigns/[id]/test
 * Send a test email for a campaign with variable substitution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const resolvedParams = await params; // Treat params from signature as awaitable
    const { id: campaignId } = resolvedParams;
    const body = await request.json();
    const { 
      recipientEmail, 
      subject, 
      html_content, 
      placeholder_data 
    } = body;
    
    // Validate required fields
    if (!recipientEmail || !subject || !html_content) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, subject, and html_content are required.' },
        { status: 400 }
      );
    }
    
    // Validate email format for recipientEmail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: `Invalid email format for recipientEmail: ${recipientEmail}` },
        { status: 400 }
      );
    }
    
    // Validate campaign exists
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return handleNotFound('Campaign');
    }

    // Perform variable substitution
    const finalHtml = substituteVariables(html_content, placeholder_data || {});

    // Construct 'From' email address
    const fromEmail = campaign.sender_name 
      ? `${campaign.sender_name} <${campaign.sender_email}>` 
      : campaign.sender_email;

    // Send test email using the utility
    await sendEmailUtility({
      to: recipientEmail,
      subject: subject,
      html: finalHtml,
      fromEmail: fromEmail,
    });

    return NextResponse.json({ 
      success: true,
      message: `Test email successfully simulated for ${recipientEmail}`,
    });
  } catch (error) {
    return handleServerError(error, 'Failed to send test email');
  }
}
