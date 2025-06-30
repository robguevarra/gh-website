import { SupabaseClient } from '@supabase/supabase-js';
import { UnifiedProfile } from '@/types/users'; // Using path alias

const FREQUENCY_CAP_LIMIT = 3; // Max emails per user
const FREQUENCY_CAP_HOURS = 24; // Within this period

interface Logger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, context?: any) => void;
}

// A simple console logger, replace with your actual logger if available
const consoleLogger: Logger = {
  debug: (message, context) => console.debug(message, context),
  info: (message, context) => console.info(message, context),
  warn: (message, context) => console.warn(message, context),
  error: (message, context) => console.error(message, context),
};

/**
 * Filters a list of profile IDs based on recent send activity in email_queue.
 * Returns profile IDs that have not exceeded the frequency cap.
 * 
 * @param profileIds - Array of profile IDs to check.
 * @param supabaseClient - Supabase client instance.
 * @param logger - Optional logger instance.
 * @returns A promise that resolves to an array of profile IDs permitted to receive emails.
 */
export async function getPermittedProfileIds(
  profileIds: string[], 
  supabaseClient: SupabaseClient,
  logger: Logger = consoleLogger
): Promise<string[]> {
  if (!profileIds || profileIds.length === 0) {
    logger.info('[FrequencyCapping] No profile IDs provided, returning empty array.');
    return [];
  }

  logger.info(`[FrequencyCapping] Starting frequency check for ${profileIds.length} profile IDs.`);

  // 1. Fetch unified_profiles for the given IDs to get their email addresses
  // Note: email_bounced can be NULL (not bounced), false (not bounced), or true (bounced)
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('unified_profiles')
    .select('id, email')
    .in('id', profileIds)
    .or('email_bounced.is.null,email_bounced.eq.false') // Only consider non-bounced emails (NULL or false)
    .returns<Pick<UnifiedProfile, 'id' | 'email'>[]>(); // Ensure return type

  if (profilesError) {
    logger.error('[FrequencyCapping] Error fetching unified_profiles', { error: profilesError.message });
    // If we can't fetch profiles, we can't determine their emails, so conservatively block all
    return []; 
  }

  if (!profiles || profiles.length === 0) {
    logger.info('[FrequencyCapping] No valid, non-bounced profiles found for the given IDs.');
    return [];
  }

  const emailsToCheck = profiles.map(p => p.email.toLowerCase()).filter(Boolean) as string[];
  if (emailsToCheck.length === 0) {
    logger.info('[FrequencyCapping] No valid email addresses found among the profiles.');
    return [];
  }

  // 2. Check for frequency capping based on recent emails sent
  const lookbackDate = new Date(Date.now() - (FREQUENCY_CAP_HOURS * 60 * 60 * 1000)).toISOString();
  
  const { data: recentEmails, error: recentError } = await supabaseClient
    .from('email_queue') // Assuming this is the table where sent/pending emails are logged
    .select('recipient_email, created_at')
    .in('recipient_email', emailsToCheck) // Check against the emails of the provided profiles
    .gte('created_at', lookbackDate);

  if (recentError) {
    logger.warn('[FrequencyCapping] Error checking email frequency from email_queue', { error: recentError.message });
    // If we can't check frequency, proceed with caution - allowing all might be too risky.
    // For now, let's be conservative and block if frequency check fails.
    // Alternatively, could allow all and log a prominent warning.
    return [];
  }

  // 3. Group by email to count frequency
  const emailFrequency: Record<string, number> = {};
  if (recentEmails) {
    recentEmails.forEach((item: { recipient_email: string | null }) => {
      if (item.recipient_email) {
        const email = item.recipient_email.toLowerCase();
        emailFrequency[email] = (emailFrequency[email] || 0) + 1;
      }
    });
  }
  logger.debug('[FrequencyCapping] Email frequency counts:', emailFrequency);

  // 4. Filter profiles based on frequency cap
  const permittedProfiles = profiles.filter(profile => {
    const email = profile.email.toLowerCase();
    const recentCount = emailFrequency[email] || 0;
    
    if (recentCount >= FREQUENCY_CAP_LIMIT) {
      logger.info(`[FrequencyCapping] Skipping ${email} (profile ID: ${profile.id}) - frequency cap reached (${recentCount} emails in ${FREQUENCY_CAP_HOURS}h).`);
      return false;
    }
    return true;
  });

  const permittedProfileIds = permittedProfiles.map(p => p.id);
  logger.info(`[FrequencyCapping] Completed. ${permittedProfileIds.length} out of ${profileIds.length} initial profiles are permitted.`);

  return permittedProfileIds;
}

// Example Usage (conceptual - assumes Supabase client and logger are set up):
// async function someFunction() {
//   const supabase = getSupabaseClient(); // Your Supabase client instance
//   const initialProfileIds = ['uuid1', 'uuid2', 'uuid3', 'uuid4'];
//   
//   const allowedProfileIds = await getPermittedProfileIds(initialProfileIds, supabase, consoleLogger);
//   console.log('Allowed profile IDs after frequency capping:', allowedProfileIds);
//   // Proceed to use allowedProfileIds
// } 