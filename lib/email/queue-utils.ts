import { createClient } from '@/lib/supabase/client'; // Using browser client for client-side operations
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';

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

/**
 * Add an email to the queue
 */
export async function addToQueue(params: QueueEmailParams): Promise<{ id: string } | { error: Error }> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
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
    rateLimit = 100, // emails per minute
    maxRetries = 3
  } = options;

  const supabase = createClient();
  let processed = 0;
  let errors = 0;

  try {
    // Process emails in batches
    let hasMore = true;
    
    while (hasMore) {
      // Get a batch of pending emails, ordered by priority and scheduled time
      const { data: emails, error: fetchError } = await supabase
        .from('email_queue')
        .select('*')
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
          const { error: updateError } = await supabase
            .from('email_queue')
            .update({
              status: 'processing',
              processing_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);

          if (updateError) throw updateError;

          // TODO: Implement actual email sending logic
          // const result = await sendEmail(email);
          
          // For now, simulate a successful send
          await new Promise(resolve => setTimeout(resolve, 1000 / (rateLimit / 60))); // Rate limiting
          
          // Mark as sent
          const { error: completeError } = await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);

          if (completeError) throw completeError;
          
          processed++;
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          
          // Handle retries
          const retryCount = (email.retry_count || 0) + 1;
          const shouldRetry = retryCount < maxRetries;
          
          await supabase
            .from('email_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: retryCount,
              last_error: error instanceof Error ? error.message : String(error),
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);
            
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
