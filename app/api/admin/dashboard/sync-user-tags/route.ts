import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic'; // Ensure fresh execution

// POST /api/admin/dashboard/sync-user-tags
// Synchronizes tags from unified_profiles.tags to the user_tags table
// by calling the sync_all_user_tags_from_unified_profiles PL/pgSQL function.
export async function POST(req: NextRequest) {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin.rpc('sync_all_user_tags_from_unified_profiles');

    if (error) {
      console.error('Error calling sync_all_user_tags_from_unified_profiles:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to synchronize user tags due to a database error.',
        error_details: error.message,
        summary: data // The function might return partial data on error if it was structured to do so
      }, { status: 500 });
    }

    // The 'data' variable here is the JSONB returned by the function
    // Check the status property within the returned JSONB
    if (data && data.status === 'error') {
        console.error('User tag synchronization function returned an error:', data);
        return NextResponse.json({
            success: false,
            message: 'User tag synchronization function reported an error.',
            summary: data // Contains error_message and error_details from the function
        }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User tags synchronized successfully.',
      summary: data // This will contain { deleted_count, inserted_count, status }
    });

  } catch (err: any) {
    console.error('API route error in sync-user-tags:', err);
    return NextResponse.json({
      success: false,
      message: err.message || 'An unexpected error occurred during tag synchronization.',
      error: err.toString()
    }, { status: 500 });
  }
}
