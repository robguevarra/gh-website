/**
 * Transactional Email Service
 * 
 * A specialized service for sending template-based transactional emails
 * using our Postmark email templates. Provides a simple interface for
 * sending emails with variable substitution.
 */

import postmarkClient, { EmailRecipient, EmailTemplateData } from './postmark-client';
import { getAdminClient } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';

export interface TransactionalEmailOptions {
  to: string | EmailRecipient;
  templateId: string;
  variables: Record<string, string | number | boolean | null>;
  cc?: string | EmailRecipient | (string | EmailRecipient)[];
  bcc?: string | EmailRecipient | (string | EmailRecipient)[];
  attachments?: Array<{name: string; content: string; contentType: string}>;
  tag?: string;
  metadata?: Record<string, string>;
}

/**
 * Format an email recipient object for consistency
 */
const formatRecipient = (recipient: string | EmailRecipient): EmailRecipient => {
  if (typeof recipient === 'string') {
    return { email: recipient };
  }
  return recipient;
};

/**
 * Format multiple recipients
 */
const formatRecipients = (
  recipients: string | EmailRecipient | (string | EmailRecipient)[]
): EmailRecipient[] => {
  if (!recipients) return [];
  if (!Array.isArray(recipients)) {
    return [formatRecipient(recipients)];
  }
  return recipients.map(formatRecipient);
};

/**
 * Sends a transactional email using Postmark templates
 * Also logs the email send to the database for tracking
 */
export async function sendTransactionalEmail(options: TransactionalEmailOptions) {
  try {
    const { to, templateId, variables, cc, bcc, attachments, tag, metadata } = options;
    
    // Format recipients
    const toRecipients = formatRecipients(to);
    const ccRecipients = cc ? formatRecipients(cc) : undefined;
    const bccRecipients = bcc ? formatRecipients(bcc) : undefined;
    
    // Get template info from database if available
    const supabase = getAdminClient();
    const { data: templateData } = await supabase
      .from('email_templates')
      .select('name, category, subject')
      .eq('template_id', templateId)
      .maybeSingle();
    
    // Log email attempt before sending
    const emailLogEntry = {
      template_id: templateId,
      template_name: templateData?.name || templateId,
      template_category: templateData?.category || 'transactional',
      recipient_email: toRecipients[0].email,
      recipient_name: toRecipients[0].name || null,
      subject: templateData?.subject || 'Transactional Email',
      cc_addresses: ccRecipients ? ccRecipients.map(r => r.email).join(', ') : null,
      bcc_addresses: bccRecipients ? bccRecipients.map(r => r.email).join(', ') : null,
      tags: tag ? [tag] : null,
      variables: variables,
      status: 'queued',
      metadata: metadata || null
    };
    
    const { data: logEntry, error: logError } = await supabase
      .from('email_send_log')
      .insert(emailLogEntry)
      .select('id')
      .single();
    
    if (logError) {
      console.error('Failed to log email send:', logError);
    }
    
    // Send the email using the template
    const result = await postmarkClient.sendTemplateEmail(
      templateId,
      variables as EmailTemplateData,
      {
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: templateData?.subject || `${templateId} Email`, // Ensure we always have a subject
        tag: tag || templateData?.category || 'transactional',
        attachments,
        metadata: {
          ...(metadata || {}),
          // Ensure metadata values are strings and handle undefined
          emailLogId: logEntry?.id ? String(logEntry.id) : ''
        }
      }
    );
    
    // Prepare to store email content and headers
    // For template emails, we store template variables as they represent email content
    const emailContent = {
      templateId,
      variables,
      subject: templateData?.subject || `${templateId} Email`, // Store the subject
      renderedBy: 'postmark-server'
    };
    
    // Extract headers from the response
    // Postmark doesn't expose Headers directly in the type, but we can access it safely
    const headers = (result as any).Headers || {};
    
    // Update log with successful send and store content/headers
    if (logEntry) {
      await supabase
        .from('email_send_log')
        .update({
          status: 'sent',
          external_id: result.MessageID, // Store the Postmark message ID for tracking
          sent_at: new Date().toISOString(),
          subject: templateData?.subject || `${templateId} Email`, // Store in dedicated column
          email_content: JSON.stringify(emailContent),
          email_headers: headers,
          raw_response: result // Store the complete API response
        })
        .eq('id', logEntry.id);
    }
    
    return {
      success: true,
      messageId: result.MessageID,
      logId: logEntry?.id
    };
  } catch (error) {
    console.error('Failed to send transactional email:', error);
    
    // If we have a log entry, update it with the error
    if (error instanceof Error) {
      try {
        const supabase = getAdminClient();
        await supabase
          .from('email_send_log')
          .update({
            status: 'error',
            error_message: error.message
          })
          .eq('recipient_email', formatRecipients(options.to)[0].email)
          .eq('template_id', options.templateId)
          .eq('status', 'queued');
      } catch (logError) {
        console.error('Failed to update email send log with error:', logError);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}
