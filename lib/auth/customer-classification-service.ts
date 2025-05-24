import { getAdminClient } from '@/lib/supabase/admin'

// Customer classification interfaces
export interface CustomerClassification {
  type: 'p2p_customer' | 'public_customer' | 'new_customer'
  isExistingUser: boolean
  userId?: string
  enrollmentStatus?: 'enrolled' | 'not_enrolled'
  lastPurchaseDate?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface ClassificationResult {
  success: boolean
  classification?: CustomerClassification
  error?: string
}

/**
 * Classify a customer based on their email to determine authentication flow
 * - P2P customers: Have P2P enrollments, get guided account setup with required password
 * - Public customers: Have Shopify orders but no P2P, get simple magic link confirmation  
 * - New customers: No purchase history, get full account creation flow
 */
export async function classifyCustomer(email: string): Promise<ClassificationResult> {
  try {
    const supabase = getAdminClient()

    // 1. Check if user already exists in unified_profiles
    const { data: profile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id, first_name, last_name, created_at')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('[CustomerClassification] Profile lookup failed:', profileError)
      return { success: false, error: 'Failed to lookup customer profile' }
    }

    const isExistingUser = !!profile
    const userId = profile?.id

    // 2. Check for P2P enrollments (highest priority)
    // Need to join with unified_profiles since enrollments has user_id, not email
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments') 
      .select(`
        id, 
        course_id, 
        status, 
        enrolled_at,
        user:unified_profiles!inner(email)
      `)
      .eq('unified_profiles.email', email)
      .eq('status', 'active')

    if (enrollmentError) {
      console.error('[CustomerClassification] Enrollment lookup failed:', enrollmentError)
      return { success: false, error: 'Failed to lookup enrollments' }
    }

    // 3. Check for Shopify orders
    const { data: shopifyOrders, error: shopifyError } = await supabase
      .from('shopify_orders')
      .select('id, total_price, created_at, financial_status')
      .eq('email', email)
      .eq('financial_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)

    if (shopifyError) {
      console.error('[CustomerClassification] Shopify order lookup failed:', shopifyError)
      return { success: false, error: 'Failed to lookup Shopify orders' }
    }

    // 4. Check for user tags to understand customer journey
    let userTags: string[] = []
    if (isExistingUser && userId) {
      const { data: tags, error: tagsError } = await supabase
        .from('user_tags')
        .select('tag:tags(name)')
        .eq('user_id', userId)

      if (!tagsError && tags) {
        userTags = tags.map(t => t.tag?.name).filter(Boolean) as string[]
      }
    }

    // 5. Classification logic
    const hasP2PEnrollment = enrollments && enrollments.length > 0
    const hasShopifyOrders = shopifyOrders && shopifyOrders.length > 0
    const lastPurchaseDate = shopifyOrders?.[0]?.created_at

    if (hasP2PEnrollment) {
      // P2P Customer: Enrolled in Papers to Profits course
      return {
        success: true,
        classification: {
          type: 'p2p_customer',
          isExistingUser,
          userId,
          enrollmentStatus: 'enrolled',
          lastPurchaseDate: enrollments[0]?.enrolled_at,
          tags: userTags,
          metadata: {
            enrollmentCount: enrollments.length,
            hasShopifyOrders,
            classification_date: new Date().toISOString()
          }
        }
      }
    }

    if (hasShopifyOrders) {
      // Public Customer: Has Shopify orders but no P2P enrollment
      return {
        success: true,
        classification: {
          type: 'public_customer',
          isExistingUser,
          userId,
          enrollmentStatus: 'not_enrolled',
          lastPurchaseDate: lastPurchaseDate || undefined,
          tags: userTags,
          metadata: {
            shopifyOrderCount: shopifyOrders.length,
            lastOrderValue: shopifyOrders[0]?.total_price,
            classification_date: new Date().toISOString()
          }
        }
      }
    }

    // New Customer: No purchase history found
    return {
      success: true,
      classification: {
        type: 'new_customer',
        isExistingUser,
        userId,
        enrollmentStatus: 'not_enrolled',
        tags: userTags,
        metadata: {
          classification_date: new Date().toISOString(),
          profile_exists: isExistingUser
        }
      }
    }

  } catch (error) {
    console.error('[CustomerClassification] Error classifying customer:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during customer classification' 
    }
  }
}

/**
 * Get recommended authentication flow based on customer classification
 * Returns specific instructions for magic link purpose and post-auth flow
 */
export function getAuthenticationFlow(classification: CustomerClassification): {
  magicLinkPurpose: 'account_setup' | 'login' | 'shopify_access'
  redirectPath: string
  requiresPasswordCreation: boolean
  flowDescription: string
} {
  switch (classification.type) {
    case 'p2p_customer':
      return {
        magicLinkPurpose: 'account_setup',
        redirectPath: '/auth/setup-account?flow=p2p',
        requiresPasswordCreation: true,
        flowDescription: 'P2P customer: Magic link → guided account setup → required password creation'
      }

    case 'public_customer':
      return {
        magicLinkPurpose: 'shopify_access',
        redirectPath: '/dashboard/store',
        requiresPasswordCreation: false,
        flowDescription: 'Public customer: Magic link → direct access to store/dashboard'
      }

    case 'new_customer':
      return {
        magicLinkPurpose: 'account_setup',
        redirectPath: '/auth/setup-account?flow=new',
        requiresPasswordCreation: true,
        flowDescription: 'New customer: Magic link → full account creation → password setup'
      }

    default:
      return {
        magicLinkPurpose: 'login',
        redirectPath: '/dashboard',
        requiresPasswordCreation: false,
        flowDescription: 'Default: Basic magic link authentication'
      }
  }
}

/**
 * Enhanced classification that also checks for abandoned cart/lead status
 * Useful for determining if user should receive different email messaging
 */
export async function classifyCustomerWithLeadHistory(email: string): Promise<ClassificationResult & {
  leadHistory?: {
    hasAbandonedCarts: boolean
    lastFormSubmission?: string
    leadStatus?: string
    interestedProducts?: string[]
  }
}> {
  try {
    const baseClassification = await classifyCustomer(email)
    
    if (!baseClassification.success) {
      return baseClassification
    }

    const supabase = getAdminClient()

    // Check for purchase leads (abandoned carts, form submissions)
    const { data: leads, error: leadsError } = await supabase
      .from('purchase_leads')
      .select('product_type, status, submitted_at, last_activity_at')
      .eq('email', email)
      .order('submitted_at', { ascending: false })

    if (leadsError) {
      console.error('[CustomerClassification] Lead history lookup failed:', leadsError)
      // Continue without lead data rather than failing
    }

    const leadHistory = leads ? {
      hasAbandonedCarts: leads.some(lead => 
        ['payment_initiated', 'payment_failed', 'payment_abandoned'].includes(lead.status)
      ),
      lastFormSubmission: leads[0]?.submitted_at || undefined,
      leadStatus: leads[0]?.status,
      interestedProducts: leads.map(lead => lead.product_type).filter(Boolean)
    } : undefined

    return {
      ...baseClassification,
      leadHistory
    }

  } catch (error) {
    console.error('[CustomerClassification] Error in enhanced classification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during enhanced classification' 
    }
  }
} 