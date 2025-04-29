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

  // 1. Check if user exists in Supabase Auth by email using Auth Admin API
  // Supabase Auth Admin API does not provide direct getUserByEmail, so we list users and filter
  const { data: usersResponse, error: listUsersError } = await supabase.auth.admin.listUsers({ 
    page: 1, 
    perPage: 1000 // Adjust perPage as needed, check limits
  });
  if (listUsersError) {
    throw new Error(`Failed to list users to find existing user: ${listUsersError.message}`);
  }
  // Find the user with the matching email from the list
  const existingUser = usersResponse?.users?.find(u => u.email === email);
  let userId = existingUser?.id;

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
        // Log only non-sensitive info for debugging (do NOT log PII or secrets)
        console.log(`[Auth] User already registered. Fetching existing user ID.`);
        // Use listUsers to find the user by email - more reliable
        const { data: usersResponse2, error: listUsersError2 } = await supabase.auth.admin.listUsers({ 
            page: 1, 
            perPage: 1000 // Adjust perPage as needed, check limits
          });
        if (listUsersError2) {
          throw new Error(`Failed to list users to find existing user after duplicate error: ${listUsersError2.message}`);
        }
        const existingUser2 = usersResponse2?.users?.find(u => u.email === email);
        if (existingUser2?.id) {
          userId = existingUser2.id;
          // Log only that an existing user was found, not the email or ID
          console.log(`[Auth] Found existing user.`);
        } else {
          // Log only that user could not be found, do not log email or full response
          console.error(`[Auth] Could not find user via listUsers despite 'already registered' error.`);
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
  transactionType: 'course' | 'ebook' | 'ecommerce';
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
  let dbTransactionType: string;
  switch (transactionType) {
    case 'course':
      dbTransactionType = 'P2P';
      break;
    case 'ebook':
      dbTransactionType = 'Canva';
      break;
    case 'ecommerce':
      dbTransactionType = 'SHOPIFY_ECOM'; // Assign a specific DB value for e-commerce
      break;
    default:
      // Handle unexpected type if necessary, or default
      dbTransactionType = 'unknown'; 
      console.warn(`[logTransaction] Unknown transaction type: ${transactionType}`);
  }

  // Prepare transaction data (typed object, not generic Record)
  const transactionMetadata: Record<string, any> = {
    ...metadata,
    ...(transactionType === 'ebook' ? { contact_email: email } : {}),
    phone: phone ?? metadata?.phone ?? null, // Always set phone, default to null
  };

  const transactionData = {
    user_id: userId || null, // null for ebook buyers
    amount,
    transaction_type: dbTransactionType, // Use mapped database type
    status: 'pending', // default status; update as needed
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    external_id: externalId || null,
    payment_method: paymentMethod || null,
    metadata: transactionMetadata,
    contact_email: email,
  };

  // Insert transaction (typed object)
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([transactionData]) // Insert expects an array of objects
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

  // Log successful enrollment (do NOT log userId, transactionId, or courseId directly)
  console.log(`[Enrollment] Successfully created enrollment.`);

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
    // Log only that an error occurred, do not log sensitive details
    console.error("Supabase error in storeEbookContactInfo.");
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