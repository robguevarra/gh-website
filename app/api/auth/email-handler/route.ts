/**
 * Supabase Auth Email Webhook Handler
 * 
 * This API route intercepts Supabase Auth events and sends custom emails
 * using our Postmark email service instead of the default Supabase emails.
 * 
 * Setup:
 * 1. Configure this webhook URL in Supabase Auth settings
 * 2. Disable the built-in email provider or set as fallback
 * 3. Set up proper JWT verification for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleAuthEvent } from '@/lib/services/email/supabase-auth-email-handler';
import { captureAuthError } from '@/lib/auth/auth-error-monitor';

// Process auth webhook events from Supabase
export async function POST(request: NextRequest) {
  try {
    // Parse the incoming JSON payload
    const payload = await request.json();
    
    // Check for required fields
    if (!payload.type || !payload.email) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    
    // Extract the event details
    const { type, email, ...additionalData } = payload;
    
    // Map Supabase event types to our handler's expected format
    const eventTypeMap: Record<string, string> = {
      'PASSWORD_RECOVERY': 'PASSWORD_RECOVERY',
      'SIGNUP': 'SIGNED_UP',
      'EMAIL_CHANGE': 'EMAIL_CHANGE',
      'INVITE': 'INVITE',
    };
    
    const eventType = eventTypeMap[type];
    if (!eventType) {
      return NextResponse.json(
        { error: `Unsupported event type: ${type}` },
        { status: 400 }
      );
    }
    
    // Handle the event using our custom handler
    const success = await handleAuthEvent(
      eventType as any,
      email,
      additionalData
    );
    
    if (success) {
      return NextResponse.json(
        { message: `Handled ${eventType} event for ${email}` },
        { status: 200 }
      );
    } else {
      // If our handler fails, Supabase will use its fallback
      return NextResponse.json(
        { error: `Failed to handle ${eventType} event for ${email}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in auth email webhook:', error);
    
    // Capture webhook processing error for monitoring
    await captureAuthError(
      'provider_error',
      error instanceof Error ? error.message : 'Auth webhook processing failed',
      {
        code: 'AUTH_WEBHOOK_ERROR',
        status: 500,
        endpoint: '/api/auth/email-handler',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        originalError: error,
      },
      {
        url: request.url,
        component: 'AuthEmailWebhookHandler',
      }
    );
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optionally handle GET requests for testing the webhook
export async function GET() {
  return NextResponse.json(
    { message: 'Auth email webhook is operational. Use POST for actual events.' },
    { status: 200 }
  );
}
