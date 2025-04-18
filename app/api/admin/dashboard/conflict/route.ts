import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST /api/admin/dashboard/conflict
// This endpoint checks if a given email is enrolled (PAID) in Xendit for 'Papers to Profits'.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }
    // Query Xendit for PAID 'Papers to Profits' enrollment for this email
    const { data: enrollments, error } = await admin
      .from('xendit')
      .select('*')
      .eq('Status', 'PAID')
      .ilike('Description', '%papers to profits%')
      .ilike('Email', email.trim().toLowerCase());
    if (error) throw error;
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No PAID Papers to Profits enrollment found for this email.',
        email,
      }, { status: 404 });
    }
    // Return enrollment details
    return NextResponse.json({
      success: true,
      email,
      enrollments,
      message: `Found ${enrollments.length} enrollment(s) for this email.`,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Conflict check failed',
      error: err,
    }, { status: 500 });
  }
} 