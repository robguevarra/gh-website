import { NextRequest, NextResponse } from 'next/server';
import { authErrorMonitor } from '@/lib/auth/auth-error-monitor';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the request body
    const body = await request.json();
    const { errorType, severity, testMode = false } = body;

    // Get user for testing (optional)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get IP and user agent for context
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (testMode) {
      // Run the built-in test method
      await authErrorMonitor.testErrorMonitoring();
      
      return NextResponse.json({
        success: true,
        message: 'Test error monitoring triggered successfully',
        emailSentTo: ['robneil@gmail.com'], // Hardcoded dev email
      });
    }

    // Validate error type if provided
    const validErrorTypes = [
      'login_failure',
      'signup_failure', 
      'password_reset_failure',
      'password_update_failure',
      'session_expired',
      'session_invalid',
      'token_invalid',
      'permission_denied',
      'account_locked',
      'rate_limit_exceeded',
      'provider_error',
      'database_error',
      'network_error',
      'validation_error',
      'unknown_error',
    ];

    if (errorType && !validErrorTypes.includes(errorType)) {
      return NextResponse.json(
        { error: 'Invalid error type', validTypes: validErrorTypes },
        { status: 400 }
      );
    }

    // Capture a test error with the specified type and severity
    await authErrorMonitor.captureAuthError(
      errorType || 'unknown_error',
      `Test authentication error for monitoring system - ${severity || 'medium'} severity`,
      {
        code: 'TEST_ERROR',
        status: 500,
        endpoint: '/api/auth/test-error-monitoring',
        method: 'POST',
        userAgent,
        ipAddress,
        originalError: {
          testError: true,
          triggeredBy: user?.id || 'anonymous',
          timestamp: new Date().toISOString(),
        },
      },
      {
        url: request.url,
        component: 'TestErrorMonitoring',
        action: 'manual_test',
        referer: request.headers.get('referer') || undefined,
      },
      user?.id,
      'test_session_id'
    );

    // Get current error statistics
    const stats = authErrorMonitor.getErrorStatistics(60); // Last 60 minutes

    return NextResponse.json({
      success: true,
      message: 'Test error captured successfully',
      errorType: errorType || 'unknown_error',
      severity: severity || 'determined by monitor',
      stats,
      emailSentTo: ['robneil@gmail.com'], // Hardcoded dev email
    });

  } catch (error) {
    console.error('Error in test error monitoring:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test error monitoring',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Return current error statistics
    const stats = authErrorMonitor.getErrorStatistics(60); // Last 60 minutes
    const config = {
      emailNotificationThreshold: {
        critical: 1,
        high: 1,   // LAUNCH MODE: Every high error
        medium: 1, // LAUNCH MODE: Every medium error
        low: 5,    // LAUNCH MODE: Every 5 low errors
      },
      timeWindow: 15,
      maxEmailsPerHour: 50, // LAUNCH MODE: Increased limit
      developerEmails: ['robneil@gmail.com'], // Hardcoded dev email
      enableRealTimeAlerts: true,
    };

    return NextResponse.json({
      success: true,
      stats,
      config,
      message: 'Auth error monitoring is active',
      testEndpoint: 'POST to this endpoint with { "testMode": true } to trigger a test error',
    });

  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get monitoring stats',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 