import { NextRequest, NextResponse } from 'next/server';
import { captureAuthError } from '@/lib/auth/auth-error-monitor';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { errorType, message, details, context } = body;

    // Validate required fields
    if (!errorType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: errorType and message' },
        { status: 400 }
      );
    }

    // Enhance details with server-side information
    const enhancedDetails = {
      ...details,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || details.userAgent,
      endpoint: details.endpoint || 'client-side',
      method: details.method || 'CLIENT',
    };

    // Enhance context with server-side information
    const enhancedContext = {
      ...context,
      component: context.component || 'ClientSideAuth',
      url: context.url || request.url,
    };

    // Forward to server-side monitoring
    await captureAuthError(
      errorType,
      message,
      enhancedDetails,
      enhancedContext
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Auth error captured and forwarded to monitoring system' 
    });

  } catch (error) {
    console.error('[MonitorError] Failed to process client auth error:', error);
    
    // Try to capture this as an error too, but don't create infinite loops
    try {
      await captureAuthError(
        'unknown_error',
        'Failed to process client-side auth error',
        {
          code: 'CLIENT_ERROR_PROCESSING_FAILED',
          status: 500,
          endpoint: '/api/auth/monitor-error',
          method: 'POST',
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          originalError: error,
        },
        {
          url: request.url,
          component: 'ClientErrorMonitorAPI',
        }
      );
    } catch {
      // Ignore monitoring errors to prevent infinite loops
    }

    return NextResponse.json(
      { error: 'Failed to process auth error' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Auth Error Monitor API - POST only',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
} 