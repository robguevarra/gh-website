import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'

export async function POST(request: NextRequest) {
  try {
    console.log('[TestMagicLink] Starting magic link flow test...')
    
    const body = await request.json()
    const { email, purpose = 'account_setup' } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 1. Test customer classification
    console.log('[TestMagicLink] Classifying customer:', email)
    const classificationResult = await classifyCustomer(email)
    
    if (!classificationResult.success) {
      return NextResponse.json({ 
        error: 'Customer classification failed', 
        details: classificationResult.error 
      }, { status: 500 })
    }

    const classification = classificationResult.classification!
    const authFlow = getAuthenticationFlow(classification)
    
    console.log('[TestMagicLink] Customer classified as:', classification.type)

    // 2. Test magic link generation
    console.log('[TestMagicLink] Generating magic link...')
    const magicLinkResult = await generateMagicLink({
      email,
      purpose: purpose as 'account_setup' | 'login' | 'shopify_access',
      redirectTo: authFlow.redirectPath,
      metadata: {
        testFlow: true,
        customerType: classification.type,
        timestamp: new Date().toISOString()
      }
    })

    if (!magicLinkResult.success) {
      return NextResponse.json({ 
        error: 'Magic link generation failed', 
        details: magicLinkResult.error 
      }, { status: 500 })
    }

    console.log('[TestMagicLink] Magic link generated successfully')

    // 3. Return comprehensive test results
    const testResults = {
      success: true,
      message: 'Magic link flow test completed successfully',
      results: {
        email,
        classification: {
          type: classification.type,
          isExistingUser: classification.isExistingUser,
          enrollmentStatus: classification.enrollmentStatus
        },
        authFlow: {
          purpose: authFlow.magicLinkPurpose,
          redirectPath: authFlow.redirectPath,
          requiresPasswordCreation: authFlow.requiresPasswordCreation,
          description: authFlow.flowDescription
        },
        magicLink: {
          url: magicLinkResult.magicLink,
          expiresAt: magicLinkResult.expiresAt,
          token: magicLinkResult.token?.substring(0, 20) + '...' // Partial token for security
        },
        testInstructions: {
          nextStep: 'Click the magic link to test the verification flow',
          verificationUrl: `/auth/magic-link/verify/${magicLinkResult.token}`,
          expectedRedirect: authFlow.redirectPath
        }
      }
    }

    return NextResponse.json(testResults)

  } catch (error) {
    console.error('[TestMagicLink] Test failed:', error)
    return NextResponse.json(
      { error: 'Magic link flow test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Magic Link Flow Test Endpoint',
    usage: 'POST with { "email": "test@example.com", "purpose": "account_setup" }',
    availablePurposes: ['account_setup', 'login', 'shopify_access'],
    description: 'Tests the complete magic link flow including customer classification and link generation'
  })
} 