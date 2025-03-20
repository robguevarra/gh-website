'use server';

import { createServerSupabaseClient } from './client';
import { randomUUID } from 'crypto';

type PaymentInfo = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  membershipTierId?: string;
};

/**
 * Creates an account for a user after payment and sends them a setup email.
 * This is called after a successful payment to create the user account and
 * send an email with a link to set up their password.
 */
export async function createAccountAfterPayment(paymentInfo: PaymentInfo) {
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', paymentInfo.email)
      .single();
    
    if (existingUser) {
      // User already exists, just send them another setup email
      return sendAccountSetupEmail(paymentInfo.email);
    }
    
    // Generate a secure random password that the user will never use
    // (they'll set their own password through the setup link)
    const temporaryPassword = randomUUID();
    
    // Create the user account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: paymentInfo.email,
      password: temporaryPassword,
      email_confirm: true, // Mark email as already confirmed since we trust the payment info
    });
    
    if (authError) {
      console.error('Error creating user:', authError);
      throw new Error(`Failed to create user account: ${authError.message}`);
    }
    
    // Create profile with additional info
    if (authUser?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: paymentInfo.email,
          first_name: paymentInfo.firstName || null,
          last_name: paymentInfo.lastName || null,
          phone: paymentInfo.phone || null,
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue despite profile error, as the auth account was created
      }
      
      // If a membership tier was specified, assign it
      if (paymentInfo.membershipTierId) {
        const { error: membershipError } = await supabase
          .from('user_memberships')
          .insert({
            user_id: authUser.user.id,
            tier_id: paymentInfo.membershipTierId,
            status: 'active',
            start_date: new Date().toISOString(),
          });
        
        if (membershipError) {
          console.error('Error assigning membership:', membershipError);
          // Continue despite membership error
        }
      }
    }
    
    // Send the user an email to set up their account
    return sendAccountSetupEmail(paymentInfo.email);
    
  } catch (error) {
    console.error('Account creation error:', error);
    throw error;
  }
}

/**
 * Sends an account setup email to the user with a link to set their password
 */
async function sendAccountSetupEmail(email: string) {
  const supabase = createServerSupabaseClient();
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/setup-account`,
    });
    
    if (error) {
      console.error('Error sending setup email:', error);
      throw new Error(`Failed to send account setup email: ${error.message}`);
    }
    
    return { success: true, email };
  } catch (error) {
    console.error('Send setup email error:', error);
    throw error;
  }
} 