import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Database } from '@/types/supabase';

const resendSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Resend confirmation API: Supabase URL or Anon Key is missing.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          const currentCookieStore = cookies();
          return currentCookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          const currentCookieStore = cookies();
          try {
            currentCookieStore.set(name, value, options);
          } catch (error) {
            console.warn(`Resend confirmation API: Could not set cookie '${name}'. This might be an issue if called in a context where response headers cannot be set.`, error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          const currentCookieStore = cookies();
          try {
            currentCookieStore.set(name, '', { ...options, maxAge: -1 });
          } catch (error) {
            console.warn(`Resend confirmation API: Could not remove cookie '${name}'. This might be an issue if called in a context where response headers cannot be set.`, error);
          }
        },
      },
    }
  );
  let requestBody;

  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = resendSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email provided', issues: parsed.error.issues }, { status: 400 });
  }

  const { email } = parsed.data;

  const { error } = await supabase.auth.resend({
    type: 'signup', // Or other types like 'email_change', 'recovery' if needed later
    email: email,
  });

  if (error) {
    console.error('Error resending confirmation email:', error);
    // Be cautious about revealing too much info in error messages,
    // e.g., whether an email exists or not, to prevent enumeration attacks.
    // Supabase itself might handle this gracefully.
    return NextResponse.json({ error: 'Failed to resend confirmation email. Please try again later.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'If an account with this email exists and requires confirmation, a new email has been sent.' });
}
