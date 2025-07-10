import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
import { captureAuthError } from '@/lib/auth/auth-error-monitor'
import { z } from 'zod'

// Request validation schema
const generateMagicLinkSchema = z.object({
  email: z.string().email('Valid email address is required'),
  purpose: z.enum(['account_setup', 'login', 'shopify_access']).optional(),
  redirectTo: z.string().optional(),
  sendEmail: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json()
    const validatedData = generateMagicLinkSchema.parse(body)
    const { email, purpose, redirectTo, sendEmail } = validatedData

    console.log(`[MagicLinkAPI] Generate request for ${email}:`, { purpose, redirectTo, sendEmail })

    // 2. Classify customer to determine appropriate flow
    const classificationResult = await classifyCustomer(email)
    
    if (!classificationResult.success) {
      console.error('[MagicLinkAPI] Customer classification failed:', classificationResult.error)
      
      // Capture classification failure for monitoring
      await captureAuthError(
        'database_error',
        'Customer classification failed during magic link generation',
        {
          code: 'CUSTOMER_CLASSIFICATION_FAILED',
          status: 500,
          endpoint: '/api/auth/magic-link/generate',
          method: 'POST',
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          originalError: classificationResult.error,
        },
        {
          url: request.url,
          component: 'MagicLinkGenerateAPI',
        }
      );
      
      return NextResponse.json(
        { error: 'Failed to classify customer', details: classificationResult.error },
        { status: 500 }
      )
    }

    const classification = classificationResult.classification!
    const authFlow = getAuthenticationFlow(classification)
    
    // 3. Check if user has already set their password before generating account_setup magic links
    let finalPurpose = purpose || authFlow.magicLinkPurpose
    let finalRedirectTo = redirectTo || authFlow.redirectPath
    
    // IMPORTANT: Check if we're trying to generate an account_setup magic link for a user 
    // who has already set up their password - redirect them to login instead
    if (finalPurpose === 'account_setup' && classification.isExistingUser && classification.userId) {
      try {
        // Import admin client for auth checks
        const { getAdminClient } = await import('@/lib/supabase/admin')
        const supabase = getAdminClient()
        
        // Get user data to check password status
        const { data, error } = await supabase.auth.admin.listUsers()
        
        if (!error && data.users && data.users.length > 0) {
          // Find the user matching this email
          const matchingUsers = data.users.filter(u => u.email === email)
          
          if (matchingUsers.length > 0) {
            const user = matchingUsers[0]
            const hasSetPassword = user?.user_metadata?.password_set_at !== undefined
            
            if (hasSetPassword) {
              console.log(`[MagicLinkAPI] User has already set password, redirecting to signin instead of account setup`)
              
              // Override purpose and redirect path for users who have set up their password
              finalPurpose = 'login'
              finalRedirectTo = '/auth/signin?password_set=true&email=' + encodeURIComponent(email)
            }
          }
        }
      } catch (err) {
        console.error('[MagicLinkAPI] Error checking password status:', err)
        // Continue with normal flow if we can't determine password status
      }
    }
    
    console.log(`[MagicLinkAPI] Customer classified as ${classification.type}:`, {
      isExistingUser: classification.isExistingUser,
      recommendedPurpose: authFlow.magicLinkPurpose,
      finalPurpose,
      finalRedirectTo
    })

    // 4. Generate magic link
    const magicLinkResult = await generateMagicLink({
      email,
      purpose: finalPurpose,
      redirectTo: finalRedirectTo,
      expiresIn: '48h',
      metadata: {
        customerType: classification.type,
        isExistingUser: classification.isExistingUser,
        userId: classification.userId,
        generatedAt: new Date().toISOString(),
        requestSource: 'api'
      }
    })

    if (!magicLinkResult.success) {
      console.error('[MagicLinkAPI] Magic link generation failed:', magicLinkResult.error)
      
      // Capture magic link generation failure for monitoring
      await captureAuthError(
        'provider_error',
        'Magic link generation failed',
        {
          code: 'MAGIC_LINK_GENERATION_FAILED',
          status: 500,
          endpoint: '/api/auth/magic-link/generate',
          method: 'POST',
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          originalError: magicLinkResult.error,
        },
        {
          url: request.url,
          component: 'MagicLinkGenerateAPI',
        }
      );
      
      return NextResponse.json(
        { error: 'Failed to generate magic link', details: magicLinkResult.error },
        { status: 500 }
      )
    }

    // 5. Send email if requested (default: true)
    let emailResult = null
    if (sendEmail) {
      emailResult = await sendMagicLinkEmail(
        email,
        magicLinkResult.magicLink!,
        classification,
        authFlow
      )

      if (!emailResult.success) {
        console.warn('[MagicLinkAPI] Email sending failed but magic link generated:', emailResult.error)
        // Continue - magic link still works even if email fails
      }
    }

    // 6. Return success response
    const response = {
      success: true,
      message: 'Magic link generated successfully',
      classification: {
        type: classification.type,
        isExistingUser: classification.isExistingUser,
        enrollmentStatus: classification.enrollmentStatus
      },
      authFlow: {
        purpose: finalPurpose,
        redirectPath: finalRedirectTo,
        requiresPasswordCreation: authFlow.requiresPasswordCreation,
        description: authFlow.flowDescription
      },
      email: {
        sent: sendEmail,
        success: emailResult?.success || false,
        templateUsed: emailResult?.templateUsed || null
      },
      expiresAt: magicLinkResult.expiresAt,
      // Only include magic link in development or when explicitly requested
      ...(process.env.NODE_ENV === 'development' && { 
        magicLink: magicLinkResult.magicLink 
      })
    }

    console.log(`[MagicLinkAPI] Successfully generated magic link for ${email}:`, {
      type: classification.type,
      emailSent: emailResult?.success || false
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('[MagicLinkAPI] Error processing request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Send appropriate magic link email based on customer classification
 * Uses different email templates and messaging for different customer types
 */
async function sendMagicLinkEmail(
  email: string,
  magicLink: string,
  classification: any,
  authFlow: any
): Promise<{ success: boolean; error?: string; templateUsed?: string }> {
  try {
    // Determine email template based on customer type
    let templateName: string
    let emailVariables: Record<string, any>

    const firstName = classification.metadata?.firstName || 
                     email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)

    switch (classification.type) {
      case 'p2p_customer':
        templateName = 'P2P Magic Link Account Setup'
        emailVariables = {
          first_name: firstName,
          magic_link: magicLink,
          course_access_info: 'You\'ll be able to access your Papers to Profits course after setting up your account.',
          password_requirement: 'You\'ll need to create a password for easy daily access to your course materials.',
          expiration_hours: '48'
        }
        break

      case 'public_customer':
        templateName = 'Shopify Customer Magic Link'
        emailVariables = {
          first_name: firstName,
          magic_link: magicLink,
          store_access_info: 'Click the link below to access your digital products and order history.',
          simple_access: 'No password required - this link gives you instant access to your purchases.',
          expiration_hours: '48'
        }
        break

      case 'new_customer':
      default:
        templateName = 'New Customer Account Setup'
        emailVariables = {
          first_name: firstName,
          magic_link: magicLink,
          account_benefits: 'Create your account to access your purchases and receive homeschool resources.',
          security_info: 'You\'ll create a secure password to protect your account and order history.',
          expiration_hours: '48'
        }
        break
    }

    // Send email using existing transactional email service
    const emailResult = await sendTransactionalEmail(
      templateName,
      email,
      emailVariables
    )

    if (emailResult.success) {
      console.log(`[MagicLinkAPI] Email sent successfully to ${email} using template: ${templateName}`)
      return { success: true, templateUsed: templateName }
    } else {
      console.error(`[MagicLinkAPI] Email sending failed for ${email}:`, emailResult.error)
      return { success: false, error: emailResult.error, templateUsed: templateName }
    }

  } catch (error) {
    console.error('[MagicLinkAPI] Error sending magic link email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown email sending error' 
    }
  }
} 