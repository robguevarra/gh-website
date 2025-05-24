import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
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
      return NextResponse.json(
        { error: 'Failed to classify customer', details: classificationResult.error },
        { status: 500 }
      )
    }

    const classification = classificationResult.classification!
    const authFlow = getAuthenticationFlow(classification)

    // 3. Use specified purpose or recommended purpose from classification
    const finalPurpose = purpose || authFlow.magicLinkPurpose
    const finalRedirectTo = redirectTo || authFlow.redirectPath

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