/**
 * Security Audit API Route
 * Provides endpoints for running security audits
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSecurityAudit } from '@/lib/security/security-audit';
import { securityLogger } from '@/lib/security/security-logger';

/**
 * GET handler for running a security audit
 */
export async function GET(request: NextRequest) {
  try {
    securityLogger.info('Security audit requested', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin;
    
    // Run the security audit
    const auditResult = await runSecurityAudit({ baseUrl });
    
    // Log the audit result
    securityLogger.info('Security audit completed', {
      auditId: auditResult.id,
      summary: auditResult.summary,
    });
    
    // Return the audit result
    return NextResponse.json(auditResult, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error running security audit', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to run security audit', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST handler for running a targeted security audit
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { checks } = body;
    
    securityLogger.info('Targeted security audit requested', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      checks,
    });

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin;
    
    // Run the security audit with the specified checks
    const auditResult = await runSecurityAudit({ baseUrl, checks });
    
    // Log the audit result
    securityLogger.info('Targeted security audit completed', {
      auditId: auditResult.id,
      summary: auditResult.summary,
    });
    
    // Return the audit result
    return NextResponse.json(auditResult, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error running targeted security audit', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to run targeted security audit', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
