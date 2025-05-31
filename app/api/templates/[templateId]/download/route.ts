import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, handleUnauthorized } from '@/lib/supabase/route-handler';
import { securityLogger } from '@/lib/security/security-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;
  
  if (!templateId) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Create Supabase client using the modern SSR approach
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated using getUser() instead of getSession()
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      securityLogger.warn('Unauthorized template download attempt', {
        templateId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Get template from database
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Track the download
    await supabase
      .from('template_downloads')
      .insert({
        user_id: user.id,
        template_id: templateId,
        downloaded_at: new Date().toISOString(),
      })
      .select();
    
    // Log successful template download
    securityLogger.info('Template downloaded', {
      userId: user.id,
      templateId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    
    // Return the template with download URL
    return NextResponse.json(
      {
        ...template,
        download_url: template.file_url,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log the error
    securityLogger.error('Error downloading template', {
      templateId,
      error: error instanceof Error ? error.message : String(error),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to download template', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
