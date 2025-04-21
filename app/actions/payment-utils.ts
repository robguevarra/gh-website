// payment-utils.ts
// Modular utility functions for payment and enrollment flow
// See build notes: payment-actions_phase-1_payment-and-enrollment-flow.md

import { getAdminClient } from '@/lib/supabase/admin'
// import other necessary Supabase or helper modules here

/**
 * Ensures a Supabase Auth user and unified profile exist for a course buyer.
 * - Checks if user exists by email; creates if not.
 * - Upserts unified profile (first_name, last_name, phone).
 * - Returns userId and profile.
 * - NOTE: The calling function (e.g., in payment-actions.ts) must be updated
 *   to pass firstName and lastName separately instead of a combined name.
 */
export async function ensureAuthUserAndProfile({ email, firstName, lastName, phone }: { 
  email: string; 
  firstName: string; 
  lastName?: string | null; 
  phone?: string | null;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // 1. Check if user exists in auth.users by email
  const { data: user, error: userFetchError } = await supabase
    .from('auth.users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  let userId = user?.id;

  // 2. If not, create the user (confirmed)
  if (!userId) {
    // Use Supabase Admin API to create user
    // NOTE: This requires service role key and proper permissions
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createUserError) {
      // If error is "already registered", fetch the user again using admin API
      if (createUserError.message && createUserError.message.includes('already been registered')) {
        console.log(`[Auth] User already registered for ${email}. Fetching existing user ID.`);
        // Use listUsers to find the user by email - more reliable
        // The type for listUsers params doesn't directly take email, need to paginate or search
        // For simplicity here, assuming low user count and filtering after getting first page
        // Production might need search or pagination if user count is high
        const { data: usersResponse, error: listUsersError } = await supabase.auth.admin.listUsers({ 
            page: 1, 
            perPage: 1000 // Adjust perPage as needed, check limits
          });

        if (listUsersError) {
          throw new Error(`Failed to list users to find existing user after duplicate error: ${listUsersError.message}`);
        }

        // Find the user with the matching email from the list
        const existingUser = usersResponse?.users?.find(u => u.email === email);

        if (existingUser?.id) {
          userId = existingUser.id;
          console.log(`[Auth] Found existing user ID: ${userId}`);
        } else {
          // This case should ideally not happen if the error was truly 'already registered'
          console.error(`[Auth] Could not find user via listUsers despite 'already registered' error for ${email}. Response:`, usersResponse);
          throw new Error(`Failed to fetch existing user after duplicate error for ${email}.`);
        }
      } else {
        // Handle other createUser errors
        throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
      }
    } else if (!newUser?.user?.id) {
      throw new Error(`Failed to create user: Unknown error`);
    } else {
      userId = newUser.user.id;
    }
  }

  // 3. Parse name into first_name and last_name
  // const [firstName, ...rest] = (name || '').split(' ');
  // const lastName = rest.length > 0 ? rest.join(' ') : null;
  // -- REMOVED Name Parsing - Use passed firstName and lastName directly --

  // 4. Upsert the user's profile in unified_profiles
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .upsert({
      id: userId, // PK matches auth.users.id
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to upsert unified profile: ${profileError.message}`);
  }

  // 5. Return userId and profile
  return { userId, profile };
}

/**
 * Logs a transaction for any product type.
 * - For course buyers: links to userId.
 * - For ebook buyers: userId is null, stores contact info in metadata.
 * - Returns transaction record.
 */
export async function logTransaction({ transactionType, userId, email, amount, metadata, externalId, paymentMethod, phone }: {
  transactionType: 'course' | 'ebook';
  userId?: string | null;
  email: string;
  amount: number;
  metadata?: Record<string, any>;
  externalId?: string | null;
  paymentMethod?: string | null;
  phone?: string | null;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // Map conceptual type to database value
  const dbTransactionType = transactionType === 'course' ? 'P2P' : 'Canva';

  // Prepare transaction data
  const transactionData: Record<string, any> = {
    user_id: userId || null, // null for ebook buyers
    amount,
    transaction_type: dbTransactionType, // Use mapped database type
    status: 'pending', // default status; update as needed
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    external_id: externalId || null,
    payment_method: paymentMethod || null,
    // Store contact info and phone in metadata
    metadata: {
      ...metadata,
      ...(transactionType === 'ebook' ? { contact_email: email } : {}),
      phone: phone || metadata?.phone,
    },
    contact_email: email,
  };

  // Clean metadata before insertion (remove undefined/null)
  if (transactionData.metadata) {
    Object.keys(transactionData.metadata).forEach(key => 
      (transactionData.metadata[key] === undefined || transactionData.metadata[key] === null) && delete transactionData.metadata[key]
    );
  }

  // Insert transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to log transaction: ${error.message}`);
  }

  return transaction;
}

/**
 * Creates an enrollment for a course buyer.
 * - Links enrollment to user and transaction.
 * - Returns enrollment record.
 * - NOTE: Verify this data structure matches the exact 'enrollments' table schema.
 */
export async function createEnrollment({ userId, transactionId, courseId }: {
  userId: string;
  transactionId: string;
  courseId: string;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // Prepare enrollment data (verify against actual schema)
  const enrollmentData = {
    user_id: userId,
    transaction_id: transactionId,
    course_id: courseId,
    status: 'active', // Added default status
    enrolled_at: new Date().toISOString(),
    // updated_at: new Date().toISOString(), // Removed: Column likely doesn't exist
    // expires_at, last_accessed_at, metadata can be added as needed
  };

  // Insert enrollment
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .insert(enrollmentData)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to create enrollment: ${error.message}`);
  }

  // Log successful enrollment
  console.log(`[Enrollment] Successfully created enrollment ${enrollment?.id} for user ${userId}, transaction ${transactionId}, course ${courseId}`);

  return enrollment;
}

/**
 * Stores ebook buyer contact info for future marketing.
 * - Optionally used if not handled in logTransaction.
 * - Upserts into ebook_contacts table (or similar).
 * - Returns the created/updated contact record.
 */
export async function storeEbookContactInfo({ email, metadata }: {
  email: string;
  metadata?: Record<string, any>;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // Normalize email to lowercase before storing
  const normalizedEmail = email.toLowerCase();

  // Prepare contact data, extracting specific fields from metadata
  const contactData = {
    email: normalizedEmail, // Use normalized email
    first_name: metadata?.firstName || null, // Extract firstName
    last_name: metadata?.lastName || null,  // Extract lastName
    phone: metadata?.phone || null,        // Extract phone
    metadata: metadata || {},              // Keep the full metadata too
    updated_at: new Date().toISOString(),
  };

  // Upsert contact info (by normalized email)
  const { data: contact, error } = await supabase
    .from('ebook_contacts')
    .upsert(contactData, { onConflict: 'email' }) // onConflict still uses the 'email' column name
    .select()
    .maybeSingle();

  if (error) {
    // Log the full error object for detailed diagnostics
    console.error("Supabase error in storeEbookContactInfo:", error);
    // Construct a more informative error message
    const errorMessage = error.message || 'Unknown error storing ebook contact info';
    // Include stringified error details in the thrown error
    throw new Error(`Failed to store ebook contact info: ${errorMessage}. Details: ${JSON.stringify(error)}`);
  }

  return contact;
}

/**
 * Upgrades an ebook buyer to a course buyer.
 * - Creates user/profile if needed.
 * - Updates previous ebook transactions to link to new userId.
 * - Returns userId and count of updated transactions.
 */
export async function upgradeEbookBuyerToCourse({ email, firstName, lastName }: {
  email: string;
  firstName: string;
  lastName?: string | null;
}) {
  // 1. Ensure user and profile exist
  const { userId } = await ensureAuthUserAndProfile({ email, firstName, lastName });

  // 2. Get Supabase admin client
  const supabase = getAdminClient();

  // 3. Update previous ebook transactions to link to new userId
  const { data, error }: { data: any[] | null; error: any } = await supabase
    .from('transactions')
    .update({ user_id: userId })
    .eq('transaction_type', 'ebook')
    .eq('contact_email', email);

  if (error) {
    throw new Error(`Failed to upgrade ebook transactions: ${error.message}`);
  }

  // Ensure data is an array before accessing length
  const updatedCount = Array.isArray(data) ? (data as any[]).length : 0;

  // Return userId and count of updated transactions
  return { userId, updatedCount };
} 