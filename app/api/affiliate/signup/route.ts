import { createRouteHandlerClient } from '@/lib/supabase/route-handler';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import slugify from 'slugify';
import { Database } from '@/types/supabase';
import { createServiceRoleClient } from '@/lib/supabase/server'; // Assuming your DB types are here

// Define the schema for the request body
const affiliateSignupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  preferred_slug: z.string().optional(),
  terms_agreed: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

// Helper function to generate a unique slug
async function generateUniqueSlug(supabase: any, baseSlug: string): Promise<string> {
  let slug = slugify(baseSlug, { lower: true, strict: true });
  let isUnique = false;
  let attempt = 0;

  while (!isUnique) {
    const { data, error } = await supabase
      .from('affiliates')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error checking slug uniqueness:', error);
      throw new Error('Could not verify slug uniqueness.'); // Or handle more gracefully
    }

    if (!data) {
      isUnique = true;
    } else {
      attempt++;
      // Append a short random string or counter if not unique
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      slug = `${slugify(baseSlug, { lower: true, strict: true })}-${randomSuffix}`;
      if (attempt > 5) { // Safety break to prevent infinite loops
          throw new Error('Could not generate a unique slug after multiple attempts.');
      }
    }
  }
  return slug;
}

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();

  let requestData;
  try {
    requestData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body: Must be JSON.' }, { status: 400 });
  }

  const validation = affiliateSignupSchema.safeParse(requestData);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input.', issues: validation.error.flatten() }, { status: 400 });
  }

  const { email, password, preferred_slug, terms_agreed } = validation.data;

  try {
    // 1. Check if user already exists in unified_profiles
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('unified_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') { // PGRST116: 0 rows
      console.error('Error checking for existing profile:', profileCheckError);
      return NextResponse.json({ error: 'Server error checking user existence.' }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already exists. Please log in and apply to become an affiliate through your dashboard.' }, 
        { status: 409 }
      );
    }

    // 2. Sign up the new user with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // emailRedirectTo: `${new URL(request.url).origin}/auth/callback`, // Or your specific confirmation URL
      },
    });

    if (signUpError) {
      console.error('Supabase sign up error:', signUpError);
      // Check for specific errors, e.g., user already registered but unconfirmed
      if (signUpError.message.includes('User already registered')) {
        return NextResponse.json({ error: 'This email is already registered. If you haven\'t confirmed your email, please check your inbox.' }, { status: 409 });
      }
      return NextResponse.json({ error: signUpError.message || 'Failed to sign up user.' }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User not created, please try again.' }, { status: 500 });
    }

    const userId = authData.user.id;

    // Instantiate Admin Client for RLS-bypassing operations
    const supabaseAdmin = await createServiceRoleClient();

    // 3. Create unified_profile entry
    const { data: newProfile, error: profileInsertError } = await supabaseAdmin
      .from('unified_profiles')
      .insert({
        id: userId,
        email: email,
        // Add other default fields for unified_profiles if necessary
      })
      .select('id')
      .single();

    if (profileInsertError) {
      console.error('Error inserting into unified_profiles:', profileInsertError);
      // Potentially attempt to clean up auth.users entry if this fails critically
      return NextResponse.json({ error: 'Failed to create user profile.' }, { status: 500 });
    }
    if (!newProfile) {
        return NextResponse.json({ error: 'Failed to create user profile record.' }, { status: 500 });
    }

    // 4. Generate a unique slug
    const baseSlug = preferred_slug || email.split('@')[0];
    const uniqueSlug = await generateUniqueSlug(supabaseAdmin, baseSlug);

    // 5. Create affiliate entry
    const defaultCommissionRate = 0.05; // 5% - TODO: Make this configurable
    const { error: affiliateInsertError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: newProfile.id, // This is the unified_profiles.id, which matches auth.users.id
        slug: uniqueSlug,
        commission_rate: defaultCommissionRate,
        is_member: false, // Default for new affiliates
        status: 'pending', // Default status, admin to review
      });

    if (affiliateInsertError) {
      console.error('Error inserting into affiliates:', affiliateInsertError);
      // Potentially attempt to clean up auth.users and unified_profiles entries
      return NextResponse.json({ error: 'Failed to create affiliate record.' }, { status: 500 });
    }

    // User is signed up, profile and affiliate records created.
    // Supabase will have sent a confirmation email.
    return NextResponse.json(
      { message: 'Signup successful! Please check your email to confirm your account. Your affiliate application is pending review.' }, 
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Affiliate signup unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
