import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/security/rate-limit';

// Define allowed event types to prevent abuse
const ALLOWED_EVENT_TYPES = [
  'auth_login_attempt',
  'auth_login_success',
  'auth_login_failure',
  'auth_logout',
  'auth_signup_attempt',
  'auth_signup_success',
  'auth_signup_failure',
  'auth_password_reset_request',
  'auth_password_reset_success',
  'auth_password_reset_failure',
  'session_initialized',
  'session_refreshed',
  'session_timed_out',
  'session_timeout_warning',
  'session_cleared',
  'session_refresh_failed',
  'session_refresh_exception',
  'auth_error',
  'security_test',
  'suspicious_activity',
];

// Define the security log interface
interface SecurityLogEntry {
  eventType: string;
  userId: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  sessionId?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

// Rate limiting for this endpoint - 60 requests per minute
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

/**
 * Sanitizes the log entry to prevent injection and ensure data validity
 */
function sanitizeLogEntry(entry: any): SecurityLogEntry {
  // Ensure event type is allowed
  const eventType = ALLOWED_EVENT_TYPES.includes(entry.eventType)
    ? entry.eventType
    : 'unknown_event';
  
  // Basic sanitization
  const userId = typeof entry.userId === 'string' ? entry.userId : 'anonymous';
  const timestamp = new Date(entry.timestamp).toISOString();
  
  // Default severity based on event type
  let severity: 'info' | 'warning' | 'error' | 'critical' = 'info';
  
  if (entry.eventType?.includes('failure') || entry.eventType?.includes('error')) {
    severity = 'error';
  } else if (entry.eventType?.includes('suspicious')) {
    severity = 'warning';
  } else if (entry.eventType?.includes('timed_out')) {
    severity = 'warning';
  }
  
  // Override with provided severity if valid
  if (entry.severity && ['info', 'warning', 'error', 'critical'].includes(entry.severity)) {
    severity = entry.severity as any;
  }
  
  // Create sanitized entry
  const sanitizedEntry: SecurityLogEntry = {
    eventType,
    userId,
    timestamp,
    severity,
  };
  
  // Copy optional fields if they exist and are of the right type
  if (typeof entry.sessionId === 'string') sanitizedEntry.sessionId = entry.sessionId;
  if (typeof entry.ip === 'string') sanitizedEntry.ip = entry.ip;
  if (typeof entry.userAgent === 'string') sanitizedEntry.userAgent = entry.userAgent;
  if (entry.details && typeof entry.details === 'object') {
    // Deep clone and sanitize object - remove any sensitive fields
    const safeDetails = { ...entry.details };
    delete safeDetails.password;
    delete safeDetails.token;
    delete safeDetails.accessToken;
    delete safeDetails.refreshToken;
    sanitizedEntry.details = safeDetails;
  }
  
  return sanitizedEntry;
}

/**
 * Determines if an event should trigger additional security alerts
 */
function shouldTriggerAlert(entry: SecurityLogEntry): boolean {
  // High-severity events that should trigger alerts
  const alertEvents = [
    'auth_login_failure',
    'suspicious_activity',
    'session_refresh_failure',
  ];
  
  // Critical severity always triggers an alert
  if (entry.severity === 'critical') return true;
  
  // Check if it's an alert-worthy event and has error severity
  if (alertEvents.includes(entry.eventType) && entry.severity === 'error') {
    return true;
  }
  
  // Check for multiple login failures (would require checking previous logs)
  // This is simplified; in a real implementation, we'd query the database
  
  return false;
}

/**
 * POST handler for security logs
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting check
    const clientIp = request.ip || 'unknown';
    try {
      await limiter.check(5, clientIp); // 5 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // Get the request body
    const body = await request.json();
    
    // Sanitize and validate the log entry
    const logEntry = sanitizeLogEntry(body);
    
    // Add IP and user agent from request
    logEntry.ip = clientIp;
    logEntry.userAgent = request.headers.get('user-agent') || undefined;
    
    // Get request headers for additional context
    const headersList = headers();
    const referer = headersList.get('referer');
    if (referer) {
      logEntry.details = {
        ...(logEntry.details || {}),
        referer,
      };
    }
    
    // Create supabase client
    const supabase = getServerClient();
    
    // Insert log entry into security_logs table if it exists
    try {
      const { error } = await supabase
        .from('security_logs')
        .insert([{
          event_type: logEntry.eventType,
          user_id: logEntry.userId,
          session_id: logEntry.sessionId,
          ip_address: logEntry.ip,
          user_agent: logEntry.userAgent,
          details: logEntry.details,
          severity: logEntry.severity,
          created_at: logEntry.timestamp,
        }]);
        
      if (error) {
        console.error('Error saving security log:', error);
        // Continue with the function, don't return an error to the client
      }
    } catch (err) {
      console.error('Exception saving security log:', err);
      // Table might not exist, continue with function
    }
    
    // Check if this event should trigger an alert
    if (shouldTriggerAlert(logEntry)) {
      // In a real application, this would trigger an alert system
      // For now, we'll just log it
      console.warn('SECURITY ALERT:', logEntry);
      
      // You could implement notification logic here:
      // - Send email to administrators
      // - Send to third-party security monitoring
      // - Add to alerts dashboard
    }
    
    // Return success response
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Security log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - should be protected and only accessible to admins
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Create supabase client
  const supabase = getServerClient();
  
  // Check if user is admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Verify admin role (we should have a better way to check roles)
  const { data: userData, error: userError } = await supabase
    .from('unified_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (userError || !userData || userData.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const eventType = searchParams.get('eventType');
  const userId = searchParams.get('userId');
  const severity = searchParams.get('severity');
  const offset = (page - 1) * limit;
  
  // Build query
  let query = supabase
    .from('security_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);
    
  // Apply filters
  if (eventType) query = query.eq('event_type', eventType);
  if (userId) query = query.eq('user_id', userId);
  if (severity) query = query.eq('severity', severity);
  
  // Execute query
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching security logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security logs' },
      { status: 500 }
    );
  }
  
  // Return logs with pagination info
  return NextResponse.json({
    data,
    pagination: {
      total: count || 0,
      page,
      limit,
      pages: count ? Math.ceil(count / limit) : 0,
    },
  }, { status: 200 });
}
