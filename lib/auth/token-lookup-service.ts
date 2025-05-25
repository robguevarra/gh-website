import { getAdminClient } from '@/lib/supabase/admin'

/**
 * Retrieves email address from a magic link token
 * Works for valid, expired, and used tokens
 * 
 * @param token The magic link token to lookup
 * @returns Object containing success status and email if found
 */
export async function getEmailFromToken(token: string): Promise<{
  success: boolean
  email?: string
  error?: string
}> {
  try {
    const supabase = getAdminClient()
    
    // Directly query the token from the database
    const { data: tokenData, error } = await supabase
      .from('magic_links')
      .select('email')
      .eq('token', token)
      .maybeSingle()
    
    if (error) {
      console.error('[TokenLookup] Database error retrieving email:', error)
      return { 
        success: false, 
        error: 'Database error while retrieving email' 
      }
    }
    
    if (!tokenData || !tokenData.email) {
      console.warn('[TokenLookup] No email found for token:', token.substring(0, 20) + '...')
      return { 
        success: false, 
        error: 'No email associated with this token' 
      }
    }
    
    console.log('[TokenLookup] Successfully retrieved email for token')
    return {
      success: true,
      email: tokenData.email
    }
    
  } catch (error) {
    console.error('[TokenLookup] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error retrieving email'
    }
  }
}
