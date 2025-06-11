/**
 * Payout API Middleware
 * 
 * This middleware enforces permission-based access control for payout-related API endpoints.
 * It checks user permissions, validates access patterns, and logs security events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  requirePayoutPermission, 
  checkIPRestriction, 
  detectSuspiciousActivity,
  type PayoutPermission 
} from '@/lib/auth/payout-permissions';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';

// Route permission mapping
const ROUTE_PERMISSIONS: Record<string, PayoutPermission[]> = {
  // View routes
  'GET:/api/admin/affiliate/payouts': ['payout.view'],
  'GET:/api/admin/affiliate/payouts/preview': ['payout.preview'],
  'GET:/api/admin/affiliate/payouts/monitoring': ['payout.monitor'],
  'GET:/api/admin/affiliate/payouts/reports': ['payout.reports'],
  
  // Processing routes
  'POST:/api/admin/affiliate/payouts/verify': ['payout.verify'],
  'POST:/api/admin/affiliate/payouts/process': ['payout.process'],
  'POST:/api/admin/affiliate/payouts/cancel': ['payout.cancel'],
  
  // Data export routes
  'GET:/api/admin/affiliate/payouts/export': ['payout.export'],
  'POST:/api/admin/affiliate/payouts/export': ['payout.export'],
  
  // Error resolution routes
  'POST:/api/admin/affiliate/payouts/error/resolve': ['payout.error_resolve'],
  'PATCH:/api/admin/affiliate/payouts/error/resolve': ['payout.error_resolve'],
  
  // Conversion management routes
  'GET:/api/admin/affiliate/conversions': ['conversion.view'],
  'POST:/api/admin/affiliate/conversions/verify': ['conversion.verify'],
  'PATCH:/api/admin/affiliate/conversions': ['conversion.update'],
};

// High-value payout amount extraction patterns
const HIGH_VALUE_PATTERNS = [
  /amount["\s]*:\s*([0-9.]+)/i,
  /total["\s]*:\s*([0-9.]+)/i,
  /value["\s]*:\s*([0-9.]+)/i,
  /payout_amount["\s]*:\s*([0-9.]+)/i,
];

/**
 * Extract payout amount from request body for high-value checks
 */
async function extractPayoutAmount(request: NextRequest): Promise<number | undefined> {
  try {
    // Clone the request to avoid consuming the body
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    
    if (!body) return undefined;
    
    // Try to parse as JSON first
    try {
      const jsonBody = JSON.parse(body);
      
      // Look for amount-related fields
      const amountFields = ['amount', 'total', 'value', 'payout_amount', 'totalAmount'];
      for (const field of amountFields) {
        if (jsonBody[field] && typeof jsonBody[field] === 'number') {
          return jsonBody[field];
        }
      }
      
      // Check for nested amounts in batch operations
      if (jsonBody.payouts && Array.isArray(jsonBody.payouts)) {
        const totalAmount = jsonBody.payouts.reduce((sum: number, payout: any) => {
          return sum + (payout.amount || payout.value || 0);
        }, 0);
        return totalAmount;
      }
      
    } catch {
      // Fall back to regex pattern matching for non-JSON bodies
      for (const pattern of HIGH_VALUE_PATTERNS) {
        const match = body.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1]);
          if (!isNaN(amount)) {
            return amount;
          }
        }
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting payout amount:', error);
    return undefined;
  }
}

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddress = request.headers.get('x-remote-address');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddress || 'unknown';
}

/**
 * Main middleware function for payout API protection
 */
export async function withPayoutPermissions(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  const routeKey = `${method}:${pathname}`;
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // Get user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: `Unauthenticated payout API access attempt: ${routeKey}`,
        details: {
          route: routeKey,
          ip_address: clientIP,
          user_agent: userAgent,
          error: 'No valid session'
        }
      });
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check for required permissions
    const requiredPermissions = ROUTE_PERMISSIONS[routeKey];
    if (!requiredPermissions || requiredPermissions.length === 0) {
      // Route not in permission map - check for general admin access
      const permissionCheck = await requirePayoutPermission(user.id, 'payout.view', {
        ipAddress: clientIP,
        userAgent
      });
      
      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { error: 'Access denied: Route not configured for access control' },
          { status: 403 }
        );
      }
    } else {
      // Check each required permission
      for (const permission of requiredPermissions) {
        // Extract payout amount for high-value checks
        const payoutAmount = await extractPayoutAmount(request);
        
        const permissionCheck = await requirePayoutPermission(user.id, permission, {
          payoutAmount,
          ipAddress: clientIP,
          userAgent
        });
        
        if (!permissionCheck.authorized) {
          return NextResponse.json(
            { 
              error: `Access denied: ${permissionCheck.error}`,
              permission_required: permission,
              user_role: permissionCheck.role
            },
            { status: 403 }
          );
        }
      }
    }
    
    // Check IP restrictions for high-value operations
    const payoutAmount = await extractPayoutAmount(request);
    if (payoutAmount && payoutAmount >= 1000) { // High-value threshold
      const ipCheck = await checkIPRestriction(user.id, clientIP);
      if (!ipCheck.allowed) {
        return NextResponse.json(
          { 
            error: `IP restricted: ${ipCheck.reason}`,
            requires_authorized_ip: true
          },
          { status: 403 }
        );
      }
    }
    
    // Detect suspicious activity patterns
    const suspiciousCheck = await detectSuspiciousActivity(user.id, routeKey, {
      ipAddress: clientIP,
      userAgent,
      payoutAmount
    });
    
    if (suspiciousCheck.suspicious && suspiciousCheck.riskLevel === 'high') {
      // Block high-risk suspicious activity
      await logAdminActivity({
        activity_type: 'GENERAL_ADMIN_ACTION',
        description: `Blocked suspicious payout API access: ${routeKey}`,
        details: {
          route: routeKey,
          ip_address: clientIP,
          user_agent: userAgent,
          risk_level: suspiciousCheck.riskLevel,
          reason: suspiciousCheck.reason,
          payout_amount: payoutAmount,
          target_user_id: user.id
        }
      });
      
      return NextResponse.json(
        { 
          error: 'Access temporarily restricted due to suspicious activity',
          risk_level: suspiciousCheck.riskLevel,
          reason: suspiciousCheck.reason
        },
        { status: 429 }
      );
    }
    
    // Log successful access
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Authorized payout API access: ${routeKey}`,
      details: {
        route: routeKey,
        ip_address: clientIP,
        user_agent: userAgent,
        payout_amount: payoutAmount,
        risk_level: suspiciousCheck.riskLevel,
        target_user_id: user.id,
        permissions_checked: requiredPermissions
      }
    });
    
    // Execute the original handler
    const response = await handler(request);
    
    // Log response details
    const processingTime = Date.now() - startTime;
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Completed payout API request: ${routeKey}`,
      details: {
        route: routeKey,
        status_code: response.status,
        processing_time_ms: processingTime,
        ip_address: clientIP,
        target_user_id: user.id
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('Payout middleware error:', error);
    
    // Log middleware error
    await logAdminActivity({
      activity_type: 'GENERAL_ADMIN_ACTION',
      description: `Payout middleware error: ${routeKey}`,
      details: {
        route: routeKey,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip_address: clientIP,
        user_agent: userAgent
      }
    });
    
    return NextResponse.json(
      { error: 'Internal security error' },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API handlers with payout permission middleware
 */
export function withPayoutAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    return withPayoutPermissions(req, handler);
  };
}

/**
 * Route-specific permission middleware factories
 */
export const requirePayoutView = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withPayoutAuth(handler);

export const requirePayoutProcess = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withPayoutAuth(handler);

export const requirePayoutAdmin = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withPayoutAuth(handler); 