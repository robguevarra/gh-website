import { createClient } from '@/lib/supabase/client'; // Using browser client for client-side operations
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils';
import { getAdminClient } from '@/lib/supabase/admin'; // Corrected: Use getAdminClient
import type { Database } from '@/types/supabase'; // Import Database types for explicit typing
import { SupabaseClient } from '@supabase/supabase-js'; // Ensure this is imported

export interface QueueEmailParams {
  campaignId: string;
  recipientEmail: string;
  recipientData?: Record<string, any>;
  priority?: number;
  scheduledAt?: Date;
}

export interface ProcessQueueOptions {
  batchSize?: number;
  rateLimit?: number; // emails per minute
  maxRetries?: number;
}

// Define a more specific type for the campaign data we fetch
type CampaignDataForQueue = Pick<
  Database['public']['Tables']['email_campaigns']['Row'], 
  'subject' | 'campaign_html_body' | 'sender_email' | 'sender_name'
>;

/**
 * Add an email to the queue
 */
export async function addToQueue(
  supabaseAdmin: SupabaseClient, // Changed: Accept admin client
  params: QueueEmailParams
): Promise<{ id: string } | { error: Error }> {
  // const supabase = createClient(); // Changed: Use passed admin client
  
  try {
    const { data, error } = await supabaseAdmin // Changed: Use supabaseAdmin
      .from('email_queue')
      .insert([{
        campaign_id: params.campaignId,
        recipient_email: params.recipientEmail,
        recipient_data: params.recipientData || null,
        priority: params.priority || 0,
        scheduled_at: params.scheduledAt?.toISOString() || new Date().toISOString(),
        status: 'pending'
      }])
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  } catch (error) {
    console.error('Error adding to queue:', error);
    return { error: error instanceof Error ? error : new Error('Failed to add to queue') };
  }
}

/**
 * Process the email queue
 */
export async function processQueue(options: ProcessQueueOptions = {}): Promise<{ processed: number; errors: number }> {
  const {
    batchSize = 100,
    // rateLimit = 100, // emails per minute -- Rate limiting will be handled by Postmark if we send one by one via API
    maxRetries = 3
  } = options;

  // Use admin client for server-side data fetching and updates
  const supabaseAdmin = getAdminClient(); // Corrected: Use getAdminClient()
  let processed = 0;
  let errors = 0;

  try {
    // Process emails in batches
    let hasMore = true;
    
    while (hasMore) {
      // Get a batch of pending emails, ordered by priority and scheduled time
      const { data: emails, error: fetchError } = await supabaseAdmin
        .from('email_queue')
        .select('*') // Fetches all columns from email_queue, including recipient_data
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(batchSize);

      if (fetchError) throw fetchError;
      if (!emails || emails.length === 0) {
        hasMore = false;
        continue;
      }

      // Process each email in the batch
      for (const email of emails) {
        try {
          // Mark as processing
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'processing',
              processing_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id)
            .throwOnError();

          // Fetch campaign details
          const { data: campaignData, error: campaignError } = await supabaseAdmin
            .from('email_campaigns')
            .select('subject, campaign_html_body, sender_email, sender_name')
            .eq('id', email.campaign_id)
            .single<CampaignDataForQueue>(); // Explicitly type the expected return data

          if (campaignError) {
            console.error(`Error fetching campaign ${email.campaign_id} for email ${email.id}:`, campaignError);
            throw campaignError; // This will be caught by the outer catch and email marked as error
          }
          if (!campaignData) {
            console.error(`Campaign ${email.campaign_id} not found for email ${email.id}`);
            throw new Error(`Campaign ${email.campaign_id} not found`);
          }

          // Prepare variables for substitution
          const standardDefaults = getStandardVariableDefaults();
          
          // Safely access recipient_data, ensuring it's an object
          const recipientDataObject = 
            email.recipient_data && 
            typeof email.recipient_data === 'object' && 
            !Array.isArray(email.recipient_data) 
              ? email.recipient_data as Record<string, any> 
              : {};

          const nameData: Record<string, string> = {};
          if (recipientDataObject.first_name) nameData.first_name = String(recipientDataObject.first_name);
          if (recipientDataObject.last_name) nameData.last_name = String(recipientDataObject.last_name);
          if (nameData.first_name && nameData.last_name) {
            nameData.full_name = `${nameData.first_name} ${nameData.last_name}`;
          } else if (nameData.first_name) {
            nameData.full_name = nameData.first_name;
          }

          // Generate magic link for this recipient
          let magicLinkForRecipient = '';
          try {
            // Import magic link service
            const { generateMagicLink } = await import('@/lib/auth/magic-link-service');
            const { classifyCustomer, getAuthenticationFlow } = await import('@/lib/auth/customer-classification-service');
            
            // Classify customer to determine appropriate magic link purpose
            const classificationResult = await classifyCustomer(email.recipient_email);
            
            if (classificationResult.success && classificationResult.classification) {
              const classification = classificationResult.classification;
              const authFlow = getAuthenticationFlow(classification);
              
              // Generate magic link with appropriate purpose
              const magicLinkResult = await generateMagicLink({
                email: email.recipient_email,
                purpose: authFlow.magicLinkPurpose,
                redirectTo: authFlow.redirectPath,
                expiresIn: '48h',
                metadata: {
                  customerType: classification.type,
                  isExistingUser: classification.isExistingUser,
                  userId: classification.userId,
                  generatedAt: new Date().toISOString(),
                  requestSource: 'campaign_email',
                  campaignId: email.campaign_id
                }
              });
              
              if (magicLinkResult.success && magicLinkResult.magicLink) {
                magicLinkForRecipient = magicLinkResult.magicLink;
                console.log(`Generated magic link for ${email.recipient_email} in campaign ${email.campaign_id}`);
              } else {
                console.error(`Failed to generate magic link for ${email.recipient_email}:`, magicLinkResult.error);
                magicLinkForRecipient = '[MAGIC_LINK_GENERATION_FAILED]';
              }
            } else {
              console.error(`Failed to classify customer ${email.recipient_email}:`, classificationResult.error);
              magicLinkForRecipient = '[CUSTOMER_CLASSIFICATION_FAILED]';
            }
          } catch (magicLinkError) {
            console.error(`Error generating magic link for ${email.recipient_email}:`, magicLinkError);
            magicLinkForRecipient = '[MAGIC_LINK_ERROR]';
          }

          const mergedVariables = {
            ...standardDefaults,
            ...recipientDataObject,
            ...nameData,
            email_address: email.recipient_email,
            magic_link: magicLinkForRecipient, // Add the generated magic link
          };

          // Ensure campaignData.subject and campaignData.campaign_html_body are treated as strings or empty strings
          const subjectString = campaignData.subject || '';
          const htmlBodyString = campaignData.campaign_html_body || '';

          const processedSubject = substituteVariables(subjectString, mergedVariables);
          const processedHtml = substituteVariables(htmlBodyString, mergedVariables);

          // Send email via Postmark
          console.log(`Sending campaign email ${email.id} to ${email.recipient_email} with subject: ${processedSubject}`);
          
          let messageId: string;
          try {
            // Import Postmark client
            const { createPostmarkClient } = await import('@/lib/services/email/postmark-client');
            const postmark = createPostmarkClient();
            
            // Send the email using Postmark
            const emailResponse = await postmark.sendEmail({
              to: { email: email.recipient_email },
              subject: processedSubject,
              htmlBody: processedHtml,
              from: { 
                email: campaignData.sender_email || process.env.POSTMARK_SENDER_EMAIL_DEFAULT || 'no-reply@gracefulhomeschooling.com',
                name: campaignData.sender_name || 'Graceful Homeschooling'
              },
              messageStream: 'broadcast',
              trackOpens: true,
              trackLinks: 'HtmlAndText',
              tag: `campaign-${email.campaign_id}`
            });
            
            messageId = emailResponse.MessageID;
            console.log(`Successfully sent campaign email ${email.id} via Postmark, MessageID: ${messageId}`);
          } catch (sendError) {
            console.error(`Failed to send campaign email ${email.id} via Postmark:`, sendError);
            throw new Error(`Email send failed: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
          }

          // Mark as sent
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(), // Use sent_at
              completed_at: new Date().toISOString(), // Keep completed_at for consistency if used elsewhere
              provider_message_id: messageId, // Store the actual Postmark MessageID
              subject: processedSubject, // Store the processed subject
              html_content: processedHtml, // Store the processed HTML (optional, for logging/auditing)
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id)
            .throwOnError();
          
          processed++;
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          
          const retryCount = (email.retry_count || 0) + 1;
          const shouldRetry = retryCount < maxRetries;
          
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: retryCount,
              last_error: error instanceof Error ? error.message : String(error),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id)
            .throwOnError(); // Ensure this update doesn't fail silently
            
          errors++;
        }
      }
    }
    
    return { processed, errors };
  } catch (error) {
    console.error('Error processing queue:', error);
    return { processed, errors: errors + 1 };
  }
}

/**
 * Start the queue processor
 */
export function startQueueProcessor(options: ProcessQueueOptions & { intervalMs?: number } = {}) {
  const { intervalMs = 30000, ...processOptions } = options; // Default to 30 seconds
  
  console.log('Starting email queue processor...');
  
  // Initial run
  processQueue(processOptions).then(({ processed, errors }) => {
    console.log(`Processed ${processed} emails, ${errors} errors`);
  });
  
  // Set up interval for subsequent runs
  const interval = setInterval(async () => {
    const { processed, errors } = await processQueue(processOptions);
    console.log(`Processed ${processed} emails, ${errors} errors`);
  }, intervalMs);
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log('Stopped email queue processor');
  };
}
