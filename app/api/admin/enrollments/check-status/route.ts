import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateAdminStatus } from '@/lib/supabase/admin';
import { Database } from '@/types/supabase';

// Define the expected response structure
interface EnrollmentStatusResponse {
  isEnrolled: boolean;
  paymentDate: string | null;
}

export async function GET(request: NextRequest) {
  // Await the client creation
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  // 1. Validate input
  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  // 2. Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await validateAdminStatus(user.id);
  if (!isAdmin) { 
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Use hardcoded P2P Course ID
  const p2pCourseId = '7e386720-8839-4252-bd5f-09a33c3e1afb';

  try {
    // 3. Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      const response: EnrollmentStatusResponse = { isEnrolled: false, paymentDate: null };
      return NextResponse.json(response);
    }

    const userId = profile.id;

    // 4. Check for P2P enrollment for this user
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, transaction_id') // Select transaction_id to find payment date
      .eq('user_id', userId)
      .eq('course_id', p2pCourseId)
      // Optionally filter by status if needed, e.g., .eq('status', 'active')
      .order('enrolled_at', { ascending: false }) // Get the latest enrollment if multiple
      .limit(1)
      .maybeSingle();

    if (enrollmentError) throw enrollmentError;

    if (!enrollment || !enrollment.transaction_id) {
      // Not enrolled or enrollment missing transaction link
      const response: EnrollmentStatusResponse = { isEnrolled: false, paymentDate: null };
      return NextResponse.json(response);
    }

    // 5. Find the associated transaction to get the payment date
    // We assume the transaction linked to the enrollment represents the payment event.
    // The most reliable date is often `paid_at` or `settled_at`.
    // Let's prioritize `paid_at` ?? `settled_at` ?? `created_at`.
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions') 
      .select('paid_at, settled_at, created_at') // Select existing timestamp fields
      .eq('id', enrollment.transaction_id)
      .maybeSingle();

    if (transactionError) throw transactionError;

    let paymentDate: string | null = null;
    if (transaction) {
      // Determine the best available date representing payment completion
      paymentDate = transaction.paid_at ?? transaction.settled_at ?? transaction.created_at;
    }

    const response: EnrollmentStatusResponse = { isEnrolled: true, paymentDate };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking enrollment status:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to check enrollment status', details: errorMessage }, { status: 500 });
  }
} 