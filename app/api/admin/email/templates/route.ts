/**
 * Email Templates API Route
 * 
 * Endpoints for listing and retrieving email templates
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { validateAdminAccess, handleServerError } from '@/lib/supabase/route-handler';

/**
 * GET /api/admin/email/templates
 * List all email templates
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin or marketing role
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get templates from Supabase
    const supabase = createClient();
    const { data, error, count } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return Response.json({
      templates: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch email templates');
  }
}
