import { getAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const queryParamsSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  interval: z.enum(['day', 'hour', 'week', 'month']).default('day')
});

export type PasswordResetMetricsResponse = {
  timeframe: {
    interval: string;
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_requests: number;
    successful_resets: number;
    failed_attempts: number;
    expired_links: number;
    conversion_rate: number;
  };
  attempts_by_status: Array<{
    status: string;
    count: number;
  }>;
  attempts_by_time: Array<{
    time_bucket: string;
    attempts: number;
    unique_ips: number;
    unique_emails: number;
  }>;
  potential_security_issues: Array<{
    issue_type: string;
    count: number;
    details: string;
  }>;
};

/**
 * Admin API endpoint for password reset security metrics
 * Returns analytics data on password reset attempts, success rates, and potential security issues
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    const parsedParams = queryParamsSchema.safeParse(params);
    
    if (!parsedParams.success) {
      return Response.json({
        error: 'Invalid query parameters',
        details: parsedParams.error.format()
      }, { status: 400 });
    }
    
    const { start_date, end_date, interval } = parsedParams.data;
    
    // Default to last 30 days if no dates specified
    const startDate = start_date 
      ? new Date(start_date) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
    const endDate = end_date 
      ? new Date(end_date) 
      : new Date();
    
    const supabase = getAdminClient();
    
    // Get overall metrics
    const metricsQuery = supabase
      .from('password_reset_attempts')
      .select('status, ip_address, email, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    const { data: metricsData, error: metricsError } = await metricsQuery;
    
    if (metricsError) {
      console.error('Error fetching password reset metrics:', metricsError);
      return Response.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
    
    // Calculate metrics
    const totalRequests = metricsData.length;
    const successfulResets = metricsData.filter(item => item.status === 'success').length;
    const failedAttempts = metricsData.filter(item => item.status === 'invalid').length;
    const expiredLinks = metricsData.filter(item => item.status === 'expired').length;
    const conversionRate = totalRequests > 0 ? (successfulResets / totalRequests) * 100 : 0;
    
    // Group attempts by status
    const attemptsByStatus = Object.entries(
      metricsData.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count }));
    
    // Get time-based metrics
    // Since we don't have the custom function created yet, we'll aggregate manually
    const attemptsByTime: Array<{
      time_bucket: string;
      attempts: number;
      unique_ips: number;
      unique_emails: number;
    }> = [];
    
    // Group by day for now (we can implement more complex time bucketing later)
    const timeGrouped: Record<string, {
      attempts: number;
      ips: Set<string>;
      emails: Set<string>;
    }> = {};
    
    metricsData.forEach(item => {
      const date = new Date(item.created_at);
      const day = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!timeGrouped[day]) {
        timeGrouped[day] = {
          attempts: 0,
          ips: new Set<string>(),
          emails: new Set<string>()
        };
      }
      
      timeGrouped[day].attempts++;
      if (item.ip_address) timeGrouped[day].ips.add(item.ip_address);
      if (item.email) timeGrouped[day].emails.add(item.email);
    });
    
    // Convert to array for response
    for (const [day, data] of Object.entries(timeGrouped)) {
      attemptsByTime.push({
        time_bucket: day,
        attempts: data.attempts,
        unique_ips: data.ips.size,
        unique_emails: data.emails.size
      });
    }
    
    // Sort by date
    attemptsByTime.sort((a, b) => a.time_bucket.localeCompare(b.time_bucket));
    
    // Get potential security issues
    const { data: securityIssues, error: securityError } = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'password_reset_rate_limit_exceeded')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (securityError) {
      console.error('Error fetching security issues:', securityError);
      // Continue with partial data
    }
    
    // Format potential security issues
    const potentialSecurityIssues: Array<{
      issue_type: string;
      count: number;
      details: string;
    }> = securityIssues ? securityIssues.map(issue => ({
      issue_type: 'rate_limit_exceeded',
      count: issue.metadata?.attempts_count || 0,
      details: `IP ${issue.ip_address} exceeded rate limit with ${issue.metadata?.attempts_count || 'multiple'} attempts in ${issue.metadata?.timeframe || 'a short period'}`
    })) : [];
    
    // Find suspicious patterns - multiple failed attempts from same IP
    const ipAttemptCounts: Record<string, number> = {};
    const emailAttemptCounts: Record<string, number> = {};
    
    metricsData.forEach(attempt => {
      const ip = attempt.ip_address;
      const email = attempt.email;
      
      if (ip) ipAttemptCounts[ip] = (ipAttemptCounts[ip] || 0) + 1;
      if (email) emailAttemptCounts[email] = (emailAttemptCounts[email] || 0) + 1;
    });
    
    // Add suspicious IPs with more than 5 attempts
    Object.entries(ipAttemptCounts)
      .filter(([_, count]) => count > 5)
      .forEach(([ip, count]) => {
        potentialSecurityIssues.push({
          issue_type: 'suspicious_ip_activity',
          count,
          details: `IP ${ip} made ${count} password reset attempts`
        });
      });
    
    // Add suspicious emails with more than 3 attempts
    Object.entries(emailAttemptCounts)
      .filter(([_, count]) => count > 3)
      .forEach(([email, count]) => {
        potentialSecurityIssues.push({
          issue_type: 'multiple_reset_attempts',
          count,
          details: `Email ${email} had ${count} password reset attempts`
        });
      });
    
    const response: PasswordResetMetricsResponse = {
      timeframe: {
        interval,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      metrics: {
        total_requests: totalRequests,
        successful_resets: successfulResets,
        failed_attempts: failedAttempts,
        expired_links: expiredLinks,
        conversion_rate: conversionRate
      },
      attempts_by_status: attemptsByStatus,
      attempts_by_time: attemptsByTime,
      potential_security_issues: potentialSecurityIssues
    };
    
    return Response.json(response);
  } catch (error) {
    console.error('Error in password reset metrics API:', error);
    
    return Response.json({
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
