// payment-utils.ts
// Modular utility functions for payment and enrollment flow
// See build notes: payment-actions_phase-1_payment-and-enrollment-flow.md

import { getAdminClient } from '@/lib/supabase/admin'
// import other necessary Supabase or helper modules here

/**
 * Ensures a Supabase Auth user and unified profile exist for a course buyer.
 * - Checks if user exists by email; creates if not.
 * - Upserts unified profile.
 * - Returns userId and profile.
 */
export async function ensureAuthUserAndProfile({ email, name }: { email: string; name: string }) {
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
    if (createUserError || !newUser?.user?.id) {
      throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
    }
    userId = newUser.user.id;
  }

  // 3. Upsert the user's profile in unified_profiles
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .upsert({
      user_id: userId,
      email,
      name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to upsert unified profile: ${profileError.message}`);
  }

  // 4. Return userId and profile
  return { userId, profile };
}

/**
 * Logs a transaction for any product type.
 * - For course buyers: links to userId.
 * - For ebook buyers: userId is null, stores contact info in metadata.
 * - Returns transaction record.
 */
export async function logTransaction({ productType, userId, email, amount, metadata }: {
  productType: 'course' | 'ebook';
  userId?: string | null;
  email: string;
  amount: number;
  metadata?: Record<string, any>;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // Prepare transaction data
  const transactionData: Record<string, any> = {
    user_id: userId || null, // null for ebook buyers
    amount,
    product_type: productType,
    status: 'pending', // default status; update as needed
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Store contact info for ebook buyers in metadata
    metadata: {
      ...metadata,
      ...(productType === 'ebook' ? { contact_email: email } : {}),
    },
  };

  // Optionally store email directly for analytics/BI
  if (productType === 'ebook') {
    transactionData.contact_email = email;
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
 */
export async function createEnrollment({ userId, transactionId, courseId }: {
  userId: string;
  transactionId: string;
  courseId: string;
}) {
  // Get Supabase admin client
  const supabase = getAdminClient();

  // Prepare enrollment data
  const enrollmentData = {
    user_id: userId,
    transaction_id: transactionId,
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

  // Prepare contact data
  const contactData = {
    email,
    metadata: metadata || {},
    updated_at: new Date().toISOString(),
  };

  // Upsert contact info (by email)
  const { data: contact, error } = await supabase
    .from('ebook_contacts')
    .upsert(contactData, { onConflict: 'email' })
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to store ebook contact info: ${error.message}`);
  }

  return contact;
}

/**
 * Upgrades an ebook buyer to a course buyer.
 * - Creates user/profile if needed.
 * - Updates previous ebook transactions to link to new userId.
 * - Returns userId and count of updated transactions.
 */
export async function upgradeEbookBuyerToCourse({ email, name }: {
  email: string;
  name: string;
}) {
  // 1. Ensure user and profile exist
  const { userId } = await ensureAuthUserAndProfile({ email, name });

  // 2. Get Supabase admin client
  const supabase = getAdminClient();

  // 3. Update previous ebook transactions to link to new userId
  const { data, error }: { data: any[] | null; error: any } = await supabase
    .from('transactions')
    .update({ user_id: userId })
    .eq('product_type', 'ebook')
    .eq('contact_email', email);

  if (error) {
    throw new Error(`Failed to upgrade ebook transactions: ${error.message}`);
  }

  // Ensure data is an array before accessing length
  const updatedCount = Array.isArray(data) ? (data as any[]).length : 0;

  // Return userId and count of updated transactions
  return { userId, updatedCount };
} 