import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, handleUnauthorized } from '@/lib/supabase/route-handler';
import { securityLogger } from '@/lib/security/security-logger';

export async function GET(
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
      securityLogger.warn('Unauthorized access attempt to template', {
        templateId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Check if user has access to templates (enrolled in a course)
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    
    if (enrollmentError || !enrollments || enrollments.length === 0) {
      securityLogger.warn('Unauthorized template access attempt - not enrolled', {
        userId: user.id,
        templateId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      
      return NextResponse.json(
        { error: 'You must be enrolled in a course to access templates' },
        { status: 403 }
      );
    }
    
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Log successful template access
    securityLogger.info('Template accessed', {
      userId: user.id,
      templateId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    
    // Return the template
    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error accessing template', {
      templateId,
      error: error instanceof Error ? error.message : String(error),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to access template', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
