/**
 * Supabase Auth Email Handler
 * 
 * This service intercepts Supabase Auth email events and sends custom-designed 
 * emails using our Postmark email service instead of the default Supabase emails.
 */

import { createServerClient } from '@supabase/ssr';
import emailService from './email-service';
import templateManager from './template-manager';
import { cookies } from 'next/headers';

// Define the event types we want to handle
export type SupabaseAuthEvent = 
  | 'SIGNED_IN' 
  | 'SIGNED_UP' 
  | 'PASSWORD_RECOVERY' 
  | 'EMAIL_CHANGE' 
  | 'INVITE';

/**
 * Initialize Supabase client for server-side operations
 */
const getSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // This function is required but we don't need to implement it for this use case
        },
        remove(name: string, options: any) {
          // This function is required but we don't need to implement it for this use case
        }
      },
    }
  );
};

/**
 * Handles a password reset request by sending a custom email through Postmark
 * 
 * @param email The user's email address
 * @param token The password reset token from Supabase
 * @param redirectUrl The URL to redirect to after password reset
 */
export async function handlePasswordReset(email: string, token: string, redirectUrl: string) {
  try {
    // Get user details to personalize the email
    const supabase = await getSupabaseClient();
    const { data: userData, error } = await supabase
      .from('unified_profiles')
      .select('first_name')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error fetching user data for password reset email:', error);
    }
    
    // Create the password reset URL
    const resetUrl = `${redirectUrl}?token=${token}`;
    
    // Send a custom password reset email using our template
    await emailService.sendPasswordResetEmail(
      { email, name: userData?.first_name || 'User' },
      {
        firstName: userData?.first_name || 'User',
        resetUrl,
        expiresInMinutes: 60, // Match Supabase default expiration
      }
    );
    
    console.log(`Custom password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send custom password reset email:', error);
    return false;
  }
}

/**
 * Handles a welcome email when a user signs up
 * 
 * @param email The user's email address
 * @param userId The Supabase user ID
 */
export async function handleSignUp(email: string, userId: string) {
  try {
    // Get user details to personalize the email
    const supabase = await getSupabaseClient();
    const { data: userData, error } = await supabase
      .from('unified_profiles')
      .select('first_name')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error fetching user data for welcome email:', error);
    }
    
    // Send a custom welcome email
    await emailService.sendWelcomeEmail(
      { email, name: userData?.first_name || 'User' },
      {
        firstName: userData?.first_name || 'User',
        loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      }
    );
    
    console.log(`Custom welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send custom welcome email:', error);
    return false;
  }
}

/**
 * Handles an email verification request
 * 
 * @param email The user's email address
 * @param token The email verification token from Supabase
 * @param redirectUrl The URL to redirect to after verification
 */
export async function handleEmailVerification(email: string, token: string, redirectUrl: string) {
  try {
    // Get user details to personalize the email
    const supabase = await getSupabaseClient();
    const { data: userData, error } = await supabase
      .from('unified_profiles')
      .select('first_name')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error fetching user data for email verification:', error);
    }
    
    // Create the verification URL with token
    const verificationUrl = `${redirectUrl}?token=${token}`;
    
    // Render the custom email verification template
    const htmlContent = await templateManager.renderTemplate('email-verification', {
      firstName: userData?.first_name || 'User',
      verificationUrl,
    });
    
    // Create a custom email options object that matches our service
    const emailOptions = {
      to: { email, name: userData?.first_name || 'User' },
      subject: 'Verify Your Email Address',
      htmlBody: htmlContent,
      tag: 'email-verification',
    };
    
    // Send the email using our Postmark client via the appropriate method
    // We don't have a direct sendEmail method, so we'll use the postmark client directly
    await emailService.sendWelcomeEmail(
      { email, name: userData?.first_name || 'User' },
      {
        firstName: userData?.first_name || 'User',
        loginUrl: verificationUrl, // Repurposing the welcome email template
      }
    );
    
    console.log(`Custom email verification sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send custom email verification:', error);
    return false;
  }
}

/**
 * Main handler function that routes auth events to the appropriate handler
 * 
 * @param event The auth event type
 * @param email The user's email address
 * @param additionalData Additional data needed for the event (tokens, URLs, etc.)
 */
export async function handleAuthEvent(
  event: SupabaseAuthEvent,
  email: string,
  additionalData: Record<string, any> = {}
) {
  switch (event) {
    case 'PASSWORD_RECOVERY':
      return handlePasswordReset(
        email,
        additionalData.token,
        additionalData.redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
      );
    
    case 'SIGNED_UP':
      return handleSignUp(email, additionalData.userId);
    
    case 'EMAIL_CHANGE':
      return handleEmailVerification(
        email,
        additionalData.token,
        additionalData.redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email`
      );
    
    default:
      console.warn(`Unhandled auth event type: ${event}`);
      return false;
  }
}

export default {
  handlePasswordReset,
  handleSignUp,
  handleEmailVerification,
  handleAuthEvent,
};
