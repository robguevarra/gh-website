/**
 * Security Monitoring API Route
 * Provides endpoints for controlling the security monitoring service
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from '@/lib/security/security-logger';
import { securityMonitor } from '@/lib/security/monitoring/security-monitor';
import { createRouteHandlerClient, handleUnauthorized, handleServerError } from '@/lib/supabase/route-handler';

/**
 * GET handler for retrieving the security monitor status
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to security monitoring', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Get the security monitor status
    const status = {
      isRunning: securityMonitor.isMonitorRunning(),
      lastCheckTime: securityMonitor.getLastCheckTime(),
      detectedIssues: securityMonitor.getDetectedIssues(),
    };
    
    // Log the request
    securityLogger.info('Security monitor status requested', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      status: status.isRunning ? 'running' : 'stopped',
    });
    
    // Return the status
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error retrieving security monitor status', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to retrieve security monitor status', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST handler for controlling the security monitor
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { action, options } = body;
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to control security monitoring', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required fields', requiredFields: ['action'] },
        { status: 400 }
      );
    }
    
    // Handle the action
    let result;
    switch (action) {
      case 'start':
        securityMonitor.start();
        result = { status: 'started', isRunning: true };
        break;
      case 'stop':
        securityMonitor.stop();
        result = { status: 'stopped', isRunning: false };
        break;
      case 'check':
        const issues = await securityMonitor.runSecurityCheck();
        result = { status: 'check_completed', issues };
        break;
      case 'clear':
        securityMonitor.clearDetectedIssues();
        result = { status: 'issues_cleared', detectedIssues: [] };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action', validActions: ['start', 'stop', 'check', 'clear'] },
          { status: 400 }
        );
    }
    
    // Log the action
    securityLogger.info(`Security monitor ${action} action performed`, {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action,
      options,
    });
    
    // Return the result
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error controlling security monitor', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to control security monitor', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
