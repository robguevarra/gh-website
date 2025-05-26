import { NextRequest, NextResponse } from 'next/server'
import { refreshExpiredMagicLink } from '@/lib/auth/magic-link-service'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'

/**
 * Magic Link Refresh API
 * Handles expired magic links by generating fresh ones automatically
 * Industry best practice: Users shouldn't be blocked by expired links
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { expiredToken, purpose } = body

    // Validate required fields
    if (!expiredToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: expiredToken is required' 
        },
        { status: 400 }
      )
    }
    
    // Get the email from the token - this follows industry best practice
    // by looking up the token in the database regardless of token status
    const { getEmailFromToken } = await import('@/lib/auth/token-lookup-service')
    const emailLookup = await getEmailFromToken(expiredToken)
    
    if (!emailLookup.success || !emailLookup.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not retrieve email from token. Please try signing in directly.' 
        },
        { status: 400 }
      )
    }
    
    const email = emailLookup.email
    console.log('[MagicLinkRefresh] Processing refresh request for:', email)

    // Generate fresh magic link using the refresh service
    const refreshResult = await refreshExpiredMagicLink(expiredToken, {
      email,
      purpose: purpose || 'account_setup', // Default purpose
      redirectTo: undefined, // Will use original redirect
      expiresIn: '48h' // Fresh 48-hour window
    })

    if (!refreshResult.success) {
      console.error('[MagicLinkRefresh] Failed to generate fresh link:', refreshResult.error)
      return NextResponse.json(
        { success: false, error: refreshResult.error || 'Failed to generate fresh magic link' },
        { status: 400 }
      )
    }

    console.log('[MagicLinkRefresh] Fresh magic link generated successfully')

    // Send expired magic link recovery email
    try {
      const firstName = email.split('@')[0] // Simple fallback for first name
      
      await sendTransactionalEmail(
        'Expired Magic Link Recovery',
        email,
        {
          first_name: firstName,
          magic_link: refreshResult.magicLink!, // Use magic_link as the variable name for template compatibility
          original_purpose: purpose || 'account setup',
          support_email: process.env.SUPPORT_EMAIL || 'help@gracefulhomeschooling.com',
          expiration_hours: '48'
        }
      )

      console.log('[MagicLinkRefresh] Recovery email sent successfully')

      return NextResponse.json({
        success: true,
        message: 'Fresh magic link generated and sent to your email',
        magicLink: refreshResult.magicLink,
        expiresAt: refreshResult.expiresAt,
        emailSent: true
      })

    } catch (emailError) {
      console.error('[MagicLinkRefresh] Failed to send recovery email:', emailError)
      
      // Return the magic link even if email fails (don't block user)
      return NextResponse.json({
        success: true,
        message: 'Fresh magic link generated (email delivery failed)',
        magicLink: refreshResult.magicLink,
        expiresAt: refreshResult.expiresAt,
        emailSent: false,
        emailError: 'Failed to send recovery email'
      })
    }

  } catch (error) {
    console.error('[MagicLinkRefresh] Unexpected error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Only allow POST requests for security
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to refresh magic links.' },
    { status: 405 }
  )
} 