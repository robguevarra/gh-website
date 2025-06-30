import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink, validateMagicLink } from '@/lib/auth/magic-link-service'
import { getEmailFromToken } from '@/lib/auth/token-lookup-service'
import { getAdminClient } from '@/lib/supabase/admin'
import jwt from 'jsonwebtoken'

/**
 * Test endpoint for magic link refresh flow
 * Allows testing each component of the refresh process separately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, token, email } = body
    
    // Track detailed diagnostics for each step
    const diagnostics: Record<string, any> = {
      input: { action, token: token ? `${token.substring(0, 10)}...` : null, email },
      tokenDetails: {},
      emailLookup: {},
      refreshAttempt: {},
      apiResponse: {},
      serverState: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      }
    }
    
    // Define supported test actions
    const actions = {
      // Test token validation
      validate_token: async () => {
        if (!token) return { success: false, error: 'Token is required' }
        
        // Validate the token
        diagnostics.tokenDetails.validationStarted = true
        const validation = await validateMagicLink(token)
        diagnostics.tokenDetails.validationResult = {
          success: validation.success,
          expired: validation.expired,
          used: validation.used,
          hasEmail: !!validation.email
        }
        
        return validation
      },
      
      // Test email lookup from token
      lookup_email: async () => {
        if (!token) return { success: false, error: 'Token is required' }
        
        // Try to get email from token
        diagnostics.emailLookup.lookupStarted = true
        const result = await getEmailFromToken(token)
        diagnostics.emailLookup.found = result.success
        diagnostics.emailLookup.email = result.email
        
        return result
      },
      
      // Test database state for token
      check_token_db: async () => {
        if (!token) return { success: false, error: 'Token is required' }
        
        const supabase = getAdminClient()
        
        // Check token in database
        diagnostics.tokenDetails.dbLookupStarted = true
        const { data, error } = await supabase
          .from('magic_links')
          .select('*')
          .eq('token', token)
          .maybeSingle()
        
        diagnostics.tokenDetails.dbLookupError = error ? error.message : null
        diagnostics.tokenDetails.tokenExists = !!data
        
        if (data) {
          // Don't expose full token or sensitive data
          const safeData = { ...data }
          delete safeData.token
          diagnostics.tokenDetails.tokenData = safeData
        }
        
        return { success: !error, data, error }
      },
      
      // Test JWT decoding (without verification)
      decode_token: async () => {
        if (!token) return { success: false, error: 'Token is required' }
        
        try {
          // Try to decode token without verification
          diagnostics.tokenDetails.decodeAttempted = true
          const decoded = jwt.decode(token)
          diagnostics.tokenDetails.decodable = !!decoded
          diagnostics.tokenDetails.decodedData = decoded
          
          return { success: true, decoded }
        } catch (error) {
          diagnostics.tokenDetails.decodeError = error instanceof Error ? error.message : 'Unknown error'
          return { success: false, error: 'Failed to decode token' }
        }
      },
      
      // Test the complete refresh flow
      test_refresh_flow: async () => {
        if (!token) return { success: false, error: 'Token is required' }
        
        // 1. First check token in database
        const dbCheck = await actions.check_token_db()
        
        // 2. Try to get email from token
        const emailLookup = await actions.lookup_email()
        
        if (!emailLookup.success) {
          return { success: false, error: 'Email lookup failed', details: emailLookup }
        }
        
        // 3. Attempt to call refresh endpoint
        diagnostics.refreshAttempt.started = true
        
        try {
          const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://gracefulhomeschooling.com'}/api/auth/magic-link/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expiredToken: token,
              purpose: 'account_setup'
            })
          })
          
          const refreshResult = await refreshResponse.json()
          diagnostics.refreshAttempt.status = refreshResponse.status
          diagnostics.refreshAttempt.result = refreshResult
          
          return { 
            success: refreshResponse.ok, 
            refreshResult,
            emailUsed: emailLookup.email
          }
        } catch (error) {
          diagnostics.refreshAttempt.error = error instanceof Error ? error.message : 'Unknown error'
          return { success: false, error: 'Refresh request failed' }
        }
      }
    }
    
    // Execute the requested action
    if (!action || !actions[action as keyof typeof actions]) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action',
        validActions: Object.keys(actions),
        diagnostics
      }, { status: 400 })
    }
    
    const result = await actions[action as keyof typeof actions]()
    diagnostics.apiResponse = result
    
    return NextResponse.json({
      success: true,
      action,
      result,
      diagnostics
    })
    
  } catch (error) {
    console.error('[TestMagicLinkRefresh] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Magic Link Refresh Test Endpoint',
    usage: 'POST with { "action": "action_name", "token": "your_token" }',
    availableActions: [
      'validate_token',
      'lookup_email',
      'check_token_db',
      'decode_token',
      'test_refresh_flow'
    ],
    description: 'Tests each component of the magic link refresh flow'
  })
}
