import { validateMagicLink } from '@/lib/auth/magic-link-service';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Specialized endpoint for validating password reset magic links
 * Includes additional security checks and rate limiting specific to password resets
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.pathname.split('/').pop();
    
    if (!token) {
      return Response.json({
        success: false,
        error: 'No token provided'
      }, { status: 400 });
    }
    
    // Get client IP and user agent for security tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Check rate limiting first - prevent brute force attacks
    // Maximum 10 verification attempts per IP per hour
    const supabase = getAdminClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentAttempts, error: countError } = await supabase
      .from('password_reset_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', oneHourAgo);
    
    if (countError) {
      console.error('Error checking rate limits:', countError);
    } else if (recentAttempts && recentAttempts > 10) {
      console.warn(`Rate limit exceeded for IP ${ipAddress}: ${recentAttempts} password reset attempts in the past hour`);
      
      // Log the rate limit breach for security monitoring
      await supabase.from('security_events').insert({
        event_type: 'password_reset_rate_limit_exceeded',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          attempts_count: recentAttempts,
          timeframe: '1 hour'
        }
      }).catch(error => {
        console.error('Failed to log security event:', error);
      });
      
      return Response.json({
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
        rateLimit: true
      }, { status: 429 });
    }
    
    // Log the verification attempt
    await supabase.from('password_reset_attempts').insert({
      token_snippet: token.substring(0, 8), // Store only a snippet for privacy
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'attempted'
    }).catch(error => {
      console.error('Failed to log password reset attempt:', error);
    });
    
    // Validate the magic link token
    const validation = await validateMagicLink(token, ipAddress, userAgent);
    
    // Update the attempt status based on validation result
    if (validation.success) {
      await supabase.from('password_reset_attempts')
        .update({ status: 'success', email: validation.email })
        .eq('token_snippet', token.substring(0, 8))
        .eq('ip_address', ipAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .catch(error => {
          console.error('Failed to update password reset attempt status:', error);
        });
    } else {
      await supabase.from('password_reset_attempts')
        .update({ 
          status: validation.expired ? 'expired' : validation.used ? 'already_used' : 'invalid',
          error: validation.error
        })
        .eq('token_snippet', token.substring(0, 8))
        .eq('ip_address', ipAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .catch(error => {
          console.error('Failed to update password reset attempt status:', error);
        });
    }
    
    if (!validation.success) {
      if (validation.expired) {
        return Response.json({
          success: false,
          expired: true,
          email: validation.email,
          error: 'Password reset link has expired'
        });
      } else if (validation.used) {
        return Response.json({
          success: false,
          used: true,
          email: validation.email,
          error: 'Password reset link has already been used'
        });
      } else {
        return Response.json({
          success: false,
          error: validation.error || 'Invalid password reset link'
        });
      }
    }
    
    // Ensure this is a password reset token
    if (validation.purpose !== 'password_reset') {
      return Response.json({
        success: false,
        error: 'Invalid token purpose'
      });
    }
    
    // Successfully validated token for password reset
    return Response.json({
      success: true,
      verification: {
        email: validation.email,
        purpose: validation.purpose,
        metadata: validation.metadata
      },
      authFlow: {
        redirectPath: '/auth/update-password'
      }
    });
  } catch (error) {
    console.error('Password reset validation error:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
