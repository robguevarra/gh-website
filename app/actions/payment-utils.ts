// payment-utils.ts
// Modular utility functions for payment and enrollment flow
// See build notes: payment-actions_phase-1_payment-and-enrollment-flow.md

import { getAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid' // Import uuid generator for transaction IDs
// import other necessary Supabase or helper modules here

/**
 * Ensures a Supabase Auth user and unified profile exist for a course buyer.
 * - Checks if user exists by email; creates if not.
 * - Upserts unified profile (first_name, last_name, phone).
 * - Returns userId and profile.
 * - Uses improved pagination and multiple lookup strategies for reliability.
 */
export async function ensureAuthUserAndProfile({ email, firstName, lastName, phone }: { 
  email: string; 
  firstName: string; 
  lastName?: string | null; 
  phone?: string | null;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();
  
  // Normalize email for consistent lookup
  const normalizedEmail = email.toLowerCase();
  
  // Try to find user by querying the auth.users table directly using SQL function
  // This is much more efficient than listing all users
  let userId: string | undefined;
  
  // First try: query profiles table which might be faster and have email index
  try {
    console.log(`[Auth] Looking up user by email in profiles...`);
    const { data: profileData, error: profileLookupError } = await supabase
      .from('unified_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
      
    if (!profileLookupError && profileData?.id) {
      userId = profileData.id;
      console.log(`[Auth] Found user via profiles lookup.`);
    }
  } catch (err: any) {
    console.error(`[Auth] Error looking up user in profiles:`, err?.message || err);
    // Continue to next strategy
  }
  
  // Second try: Use admin.listUsers with pagination if needed
  if (!userId) {
    try {
      // Implement pagination for user lookup
      const findUserByEmail = async (email: string) => {
        let currentPage = 1;
        const perPage = 1000; // Max allowed by Supabase
        let foundUser = null;
        let hasMorePages = true;
        
        console.log(`[Auth] Starting paginated user lookup for email...`);
        
        while (hasMorePages && !foundUser) {
          console.log(`[Auth] Checking page ${currentPage} of users...`);
          const { data, error } = await supabase.auth.admin.listUsers({ 
            page: currentPage, 
            perPage: perPage
          });
          
          if (error) {
            console.error(`[Auth] Error listing users on page ${currentPage}:`, error.message);
            break;
          }
          
          // Check if we found the user in this batch
          foundUser = data?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
          
          // Determine if there are more pages to check
          hasMorePages = data?.users?.length === perPage;
          currentPage++;
          
          // Safety check - don't go beyond 10 pages (10,000 users)
          if (currentPage > 10) {
            console.log(`[Auth] Reached pagination limit (10 pages) without finding user.`);
            break;
          }
        }
        
        return foundUser;
      };
      
      const existingUser = await findUserByEmail(normalizedEmail);
      userId = existingUser?.id;
      
      if (userId) {
        console.log(`[Auth] Found user via paginated lookup.`);
      } else {
        console.log(`[Auth] User not found via paginated lookup.`);
      }
    } catch (err: any) {
      console.error(`[Auth] Error in paginated user lookup:`, err?.message || err);
      // Continue to next strategy
    }
  }
  
  // If user still not found, try to create one
  if (!userId) {
    try {
      // Attempt to create the user
      console.log(`[Auth] User not found, attempting to create...`);
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });
      
      if (createUserError) {
        // If error is "already registered", we need to find the user another way
        if (createUserError.message && createUserError.message.includes('already been registered')) {
          console.log(`[Auth] User already exists but couldn't be found in previous lookups.`);
          
          // Last resort: try to have the user sign in to obtain their ID
          try {
            console.log(`[Auth] Attempting alternative lookup via admin functions...`);
            
            // Use more specific queries if available in your Supabase instance
            // This depends on your Supabase version and custom functions
            // If a direct query method becomes available, use it here
            
            // Fallback to checking the first few pages more thoroughly
            for (let page = 1; page <= 5; page++) {
              const { data: retryData, error: retryError } = await supabase.auth.admin.listUsers({
                page,
                perPage: 1000
              });
              
              if (!retryError && retryData?.users) {
                // Case insensitive search
                const foundUser = retryData.users.find(
                  u => u.email?.toLowerCase() === normalizedEmail
                );
                
                if (foundUser?.id) {
                  userId = foundUser.id;
                  console.log(`[Auth] Found user on retry page ${page}.`);
                  break;
                }
              }
            }
            
            // If we still don't have a userId, create a new one as last resort
            if (!userId) {
              console.warn(`[Auth] Could not find existing user despite 'already registered' error.`);
              console.log(`[Auth] Creating new user as fallback...`);
              
              // Generate a slightly modified email to avoid collision
              // This is a last resort to prevent complete failure
              const timestamp = new Date().getTime();
              const modifiedEmail = `${normalizedEmail.split('@')[0]}+${timestamp}@${normalizedEmail.split('@')[1]}`;
              
              const { data: fallbackUser, error: fallbackError } = await supabase.auth.admin.createUser({
                email: modifiedEmail,
                email_confirm: true,
              });
              
              if (fallbackError) {
                throw new Error(`Failed to create fallback user: ${fallbackError.message}`);
              } else if (fallbackUser?.user?.id) {
                userId = fallbackUser.user.id;
                console.log(`[Auth] Created fallback user with modified email.`);
              }
            }
          } catch (lookupErr: any) {
            console.error(`[Auth] All user lookup methods failed:`, lookupErr?.message || lookupErr);
            throw new Error(`Could not find or create user after multiple attempts: ${lookupErr?.message || 'Unknown error'}`);
          }
        } else {
          // Handle other createUser errors
          throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
        }
      } else if (!newUser?.user?.id) {
        throw new Error(`Failed to create user: Unknown error`);
      } else {
        userId = newUser.user.id;
        console.log(`[Auth] Successfully created new user.`);
      }
    } catch (err: any) {
      console.error(`[Auth] Error creating user:`, err?.message || err);
      throw new Error(`User creation failed: ${err?.message || 'Unknown error'}`);
    }
  }

  // 3. Parse name into first_name and last_name
  // const [firstName, ...rest] = (name || '').split(' ');
  // const lastName = rest.length > 0 ? rest.join(' ') : null;
  // -- REMOVED Name Parsing - Use passed firstName and lastName directly --

  // 4. Upsert the user's profile in unified_profiles
  if (!userId) {
    throw new Error('Cannot upsert profile: userId is undefined');
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .upsert({
      id: userId, // PK matches auth.users.id - now guaranteed to be defined
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
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

  // Generate a UUID for the transaction ID to satisfy the not-null constraint
  const transactionId = uuidv4();
  
  // Log for debugging
  console.log(`[logTransaction] Generated transaction ID: ${transactionId.substring(0, 8)}... for external_id: ${externalId}`);

  const transactionData = {
    id: transactionId, // Add UUID for the primary key
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

  // Generate a UUID for the enrollment ID to satisfy the not-null constraint
  const enrollmentId = uuidv4();
  
  // Log for debugging
  console.log(`[createEnrollment] Generated enrollment ID: ${enrollmentId.substring(0, 8)}... for user`);

  // Prepare enrollment data (verify against actual schema)
  const enrollmentData = {
    id: enrollmentId, // Add UUID for the primary key
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
  // Note: We removed the id field because the schema doesn't have it according to the error
  const contactData = {
    email: normalizedEmail, // Use normalized email as primary key
    first_name: metadata?.firstName || null, // Extract firstName
    last_name: metadata?.lastName || null,  // Extract lastName
    phone: metadata?.phone || null,        // Extract phone
    metadata: metadata || {},              // Keep the full metadata too
    updated_at: new Date().toISOString(),
  };

  // Upsert contact info (by normalized email)
  // Log the operation for debugging
  console.log(`[storeEbookContactInfo] Upserting contact with email hash: ${normalizedEmail.substring(0, 2)}...`);
  
  const { data: contact, error } = await supabase
    .from('ebook_contacts')
    .upsert(contactData, { 
      onConflict: 'email',  // onConflict uses the 'email' column name
      ignoreDuplicates: false // We want to update existing records, not ignore them
    })
    .select()
    .maybeSingle();

  if (error) {
    // Log only that an error occurred, do not log sensitive details
    console.error("Supabase error in storeEbookContactInfo.");
    // Construct a more informative error message
    const errorMessage = error.message || 'Unknown error storing ebook contact info';
    // Log the error but don't throw - make this function non-blocking
    console.error(`Warning: Failed to store ebook contact info: ${errorMessage}. Details: ${JSON.stringify(error)}`);
    
    // Return a minimal contact object with just the email to prevent null reference errors
    return { email: normalizedEmail };
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