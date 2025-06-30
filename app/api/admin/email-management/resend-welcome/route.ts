import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'

/**
 * Admin API: Resend Welcome Email
 * 
 * Allows administrators to resend context-appropriate welcome emails
 * based on user's transaction history and purchase context.
 * 
 * POST /api/admin/email-management/resend-welcome
 */
export async function POST(req: NextRequest) {
  try {
    const { email, context } = await req.json()

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!context || !['P2P', 'Canva', 'Shopify'].includes(context)) {
      return NextResponse.json(
        { error: 'Valid context required (P2P, Canva, or Shopify)' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Get user profile information - try unified_profiles first, then ebook_contacts
    let profile = null
    let isEbookContact = false
    
    const { data: userProfile, error: profileError } = await supabase
      .from('unified_profiles')
      .select('id, first_name, last_name, email')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('[Resend Welcome] Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    if (userProfile) {
      profile = userProfile
    } else {
      // Check if this is an ebook contact
      const { data: ebookContact, error: ebookError } = await supabase
        .from('ebook_contacts')
        .select('email, first_name, last_name')
        .eq('email', email)
        .maybeSingle()

      if (ebookError) {
        console.error('[Resend Welcome] Ebook contact fetch error:', ebookError)
        return NextResponse.json(
          { error: 'Failed to fetch contact information' },
          { status: 500 }
        )
      }

      if (ebookContact) {
        profile = ebookContact
        isEbookContact = true
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found in unified profiles or ebook contacts' },
        { status: 404 }
      )
    }

    const firstName = profile.first_name || email.split('@')[0]

    let templateName: string
    let emailVariables: Record<string, any>
    let resultMessage: string

    // Determine welcome email type based on context
    switch (context) {
      case 'P2P':
        // Generate magic link for P2P customers
        let magicLink = ''
        let expirationHours = '48'
        let setupRequired = 'true'

        try {
          console.log(`[Resend Welcome] Generating magic link for P2P customer: ${email}`)
          
          // Classify customer and generate magic link
          const classificationResult = await classifyCustomer(email)
          
          if (classificationResult.success) {
            const classification = classificationResult.classification!
            const authFlow = getAuthenticationFlow(classification)
            
            console.log(`[Resend Welcome] Customer classified as: ${classification.type}`)
            
            const magicLinkResult = await generateMagicLink({
              email,
              purpose: authFlow.magicLinkPurpose,
              redirectTo: authFlow.redirectPath,
              expiresIn: '48h',
              metadata: {
                customerType: classification.type,
                isExistingUser: classification.isExistingUser,
                userId: classification.userId,
                generatedAt: new Date().toISOString(),
                requestSource: 'resend_welcome_email'
              }
            })
            
            if (magicLinkResult.success) {
              magicLink = magicLinkResult.magicLink!
              console.log(`[Resend Welcome] Magic link generated successfully for P2P customer`)
            } else {
              console.warn(`[Resend Welcome] Magic link generation failed: ${magicLinkResult.error}`)
              magicLink = '[MAGIC_LINK_FAILED]'
            }
          } else {
            console.warn(`[Resend Welcome] Customer classification failed: ${classificationResult.error}`)
            magicLink = '[MAGIC_LINK_FAILED]'
          }
        } catch (error) {
          console.error(`[Resend Welcome] Error generating magic link:`, error)
          magicLink = '[MAGIC_LINK_FAILED]'
        }

        templateName = 'P2P Course Welcome'
        emailVariables = {
          first_name: firstName,
          course_name: 'Papers to Profits',
          enrollment_date: new Date().toLocaleDateString(),
          access_link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gracefulhomeschooling.com'}/dashboard/course`,
          magic_link: magicLink,
          expiration_hours: expirationHours,
          setup_required: setupRequired
        }
        resultMessage = 'P2P Course welcome email sent successfully'
        break

      case 'Canva':
        templateName = 'Canva Ebook Delivery'
        emailVariables = {
          first_name: firstName,
          ebook_title: 'My Canva Business Ebook',
          google_drive_link: process.env.CANVA_EBOOK_DRIVE_LINK || 'https://drive.google.com/file/d/example',
          support_email: process.env.SUPPORT_EMAIL || 'help@gracefulhomeschooling.com'
        }
        resultMessage = 'Canva Ebook delivery email sent successfully'
        break

      case 'Shopify':
        // For Shopify, we need to get recent order information (only for unified profiles, not ebook contacts)
        if (isEbookContact) {
          return NextResponse.json(
            { error: 'Shopify context not applicable for ebook contacts' },
            { status: 400 }
          )
        }
        
        const { data: recentOrders, error: orderError } = await (supabase as any)
          .from('ecommerce_orders')
          .select('id, status, metadata, total_amount, currency, created_at')
          .eq('user_id', (profile as any).id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (orderError) {
          console.error('[Resend Welcome] Order fetch error:', orderError)
          return NextResponse.json(
            { error: 'Failed to fetch recent order information' },
            { status: 500 }
          )
        }

        const recentOrder = recentOrders?.[0]
        if (!recentOrder) {
          return NextResponse.json(
            { error: 'No recent Shopify orders found for this user' },
            { status: 404 }
          )
        }

        // Generate magic link for Shopify customers if they're new
        let shopifyMagicLink = ''
        let shopifyExpirationHours = '48'
        let customerType = 'returning'
        let accountBenefits = ''

        try {
          console.log(`[Resend Welcome] Checking if Shopify customer needs magic link: ${email}`)
          
          const classificationResult = await classifyCustomer(email)
          
          if (classificationResult.success) {
            const classification = classificationResult.classification!
            const authFlow = getAuthenticationFlow(classification)
            
            console.log(`[Resend Welcome] Shopify customer classified as: ${classification.type}`)
            
            if (classification.type === 'public_customer') {
              customerType = 'new'
              accountBenefits = 'Create your account to access order history, track purchases, and get exclusive member benefits.'
              
              const magicLinkResult = await generateMagicLink({
                email,
                purpose: authFlow.magicLinkPurpose,
                redirectTo: authFlow.redirectPath,
                expiresIn: '48h',
                metadata: {
                  customerType: classification.type,
                  isExistingUser: classification.isExistingUser,
                  userId: classification.userId,
                  generatedAt: new Date().toISOString(),
                  requestSource: 'resend_welcome_shopify'
                }
              })
              
              if (magicLinkResult.success) {
                shopifyMagicLink = magicLinkResult.magicLink!
                console.log(`[Resend Welcome] Magic link generated for new Shopify customer`)
              } else {
                console.warn(`[Resend Welcome] Magic link generation failed for Shopify: ${magicLinkResult.error}`)
              }
            }
          }
        } catch (error) {
          console.error(`[Resend Welcome] Error processing Shopify magic link:`, error)
        }

        templateName = 'Shopify Order Confirmation'
        emailVariables = {
          first_name: firstName,
          order_number: recentOrder.id,
          order_items: 'Digital products from your recent order', // Simplified for resend
          total_amount: (recentOrder.total_amount || 0).toFixed(2),
          currency: recentOrder.currency || 'PHP',
          access_instructions: 'Your digital products have been delivered to your email. Check your Google Drive access for each item.',
          magic_link: shopifyMagicLink,
          expiration_hours: shopifyExpirationHours,
          customer_type: customerType,
          account_benefits: accountBenefits
        }
        resultMessage = 'Shopify Order confirmation email sent successfully'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid context provided' },
          { status: 400 }
        )
    }

    // Send the welcome email
    console.log(`[Resend Welcome] Sending ${context} welcome email to ${email}`)
    
    const emailResult = await sendTransactionalEmail(
      templateName,
      email,
      emailVariables
    )

    if (!emailResult.success) {
      console.error(`[Resend Welcome] Email send failed:`, emailResult.error)
      return NextResponse.json(
        { error: `Failed to send email: ${emailResult.error}` },
        { status: 500 }
      )
    }

    // Log the admin action for audit purposes
    console.log(`[Resend Welcome] Successfully sent ${context} welcome email to ${email} (Message ID: ${emailResult.messageId})`)

    return NextResponse.json({
      success: true,
      message: resultMessage,
      templateUsed: templateName,
      messageId: emailResult.messageId
    })

  } catch (error) {
    console.error('[Resend Welcome] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 