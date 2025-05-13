/**
 * Email Templates API Route
 * 
 * Endpoints for listing and retrieving email templates
 */

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
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

    // Get templates from Supabase using the service role client
    const supabase = await createServiceRoleClient();
    const { data, error, count } = await supabase
      .from('email_templates')
      .select('id, name, subject, category, html_content, design, version, tags, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Map 'design' to 'design_json' and ensure structure for client
    const mappedTemplates = data
      ? data.map((template: any) => ({
          ...template,
          design_json: template.design || {},
          // html_content: template.html_content || '', // Ensure defaults if needed
          // subject: template.subject || '', // Ensure defaults if needed
        }))
      : [];

    return Response.json({
      templates: mappedTemplates,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    return handleServerError(error, 'Failed to fetch email templates');
  }
}
