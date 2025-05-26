import { getAdminClient } from '@/lib/supabase/admin'
import { createPostmarkClient } from '@/lib/services/email/postmark-client'

export interface EmailVariables {
  [key: string]: string | number | any
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Centralized transactional email service for the platform
 * Uses snake_case variable format for template substitution
 * Logs all email attempts to email_send_log table
 */
export async function sendTransactionalEmail(
  templateName: string,
  recipientEmail: string,
  variables: EmailVariables,
  leadId?: string
): Promise<EmailSendResult> {
  const supabase = getAdminClient()
  const postmark = createPostmarkClient()
  let templateId: string | undefined
  let logId: string | undefined

  try {
    // 1. Retrieve template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('id, subject, html_content, text_content, variables, active')
      .eq('name', templateName)
      .eq('active', true)
      .maybeSingle()

    if (templateError) {
      console.error(`[Email] Error fetching template "${templateName}":`, templateError)
      return { success: false, error: `Template fetch failed: ${templateError.message}` }
    }

    if (!template) {
      console.error(`[Email] Template "${templateName}" not found or inactive`)
      return { success: false, error: `Template "${templateName}" not found or inactive` }
    }

    templateId = template.id

    // 2. Create log entry (pending status) - using any type to avoid TypeScript issues
    try {
      const { data: logEntry, error: logError } = await (supabase as any)
        .from('email_send_log')
        .insert({
          template_id: templateId,
          recipient_email: recipientEmail,
          variables: variables,
          status: 'pending',
          lead_id: leadId || null
        })
        .select('id')
        .single()

      if (logError) {
        console.error(`[Email] Error creating email log entry:`, logError)
        // Continue anyway - logging failure shouldn't prevent email sending
      } else {
        logId = logEntry.id
      }
    } catch (logErr) {
      console.error(`[Email] Failed to create log entry:`, logErr)
      // Continue without logging
    }

    // 3. Perform variable substitution using snake_case format
    const processedSubject = substituteVariables(template.subject, variables)
    const processedHtmlContent = substituteVariables(template.html_content, variables)
    const processedTextContent = substituteVariables(template.text_content || '', variables)

    // 4. Send email via Postmark
    const emailResponse = await postmark.sendEmail({
      to: { email: recipientEmail },
      subject: processedSubject,
      htmlBody: processedHtmlContent,
      textBody: processedTextContent || undefined,
      messageStream: 'outbound',
      trackOpens: true,
      trackLinks: 'HtmlAndText'
    })

    // 5. Prepare email content and headers for storage
    const emailContent = {
      html: processedHtmlContent,
      text: processedTextContent || '',
      subject: processedSubject
    };
    
    // Extract headers from the response if available
    const headers = (emailResponse as any).Headers || {};
    
    // 6. Update log entry with success status and content details
    if (logId) {
      try {
        await (supabase as any)
          .from('email_send_log')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_content: JSON.stringify(emailContent),
            email_headers: headers,
            raw_response: emailResponse
          })
          .eq('id', logId)
      } catch (updateErr) {
        console.error('[Email] Failed to update success log:', updateErr)
      }
    }

    console.log(`[Email] Successfully sent "${templateName}" to ${recipientEmail}`, {
      messageId: emailResponse.MessageID,
      templateId: templateId,
      logId: logId
    })

    return {
      success: true,
      messageId: emailResponse.MessageID
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Email] Failed to send "${templateName}" to ${recipientEmail}:`, error)

    // Update log entry with failure status
    if (logId) {
      try {
        await (supabase as any)
          .from('email_send_log')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('id', logId)
      } catch (updateError) {
        console.error('[Email] Failed to update error log:', updateError)
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Substitute variables in template content using snake_case format
 * Replaces {{variable_name}} patterns with actual values
 */
function substituteVariables(content: string, variables: EmailVariables): string {
  if (!content) return ''
  
  let processedContent = content

  Object.entries(variables).forEach(([key, value]) => {
    // Convert camelCase keys to snake_case for template matching
    const snakeKey = camelToSnakeCase(key)
    const placeholder = `{{${snakeKey}}}`
    const stringValue = String(value || '')
    
    // Replace all occurrences of the placeholder
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), stringValue)
  })

  return processedContent
}

/**
 * Convert camelCase string to snake_case
 * Example: firstName -> first_name, orderNumber -> order_number
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Check if an email has already been sent for a specific template and recipient
 * Useful for preventing duplicate sends
 * TODO: Implement proper duplicate checking once database types are updated
 */
export async function hasEmailBeenSent(
  templateName: string,
  recipientEmail: string,
  withinHours = 24
): Promise<boolean> {
  // Simplified implementation for now - always return false
  // This will be implemented properly once the database types are regenerated
  console.log(`[Email] Duplicate check not implemented yet for template: ${templateName}`)
  return false
} 