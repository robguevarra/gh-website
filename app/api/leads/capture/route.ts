import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export interface LeadCaptureRequest {
  email: string
  firstName: string
  lastName: string
  phone?: string
  productType: 'P2P' | 'Canva' | 'SHOPIFY_ECOM'
  amount?: number
  currency?: string
  sourcePage: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  metadata?: Record<string, any>
  marketingOptIn?: boolean
}

export interface LeadCaptureResponse {
  success: boolean
  leadId?: string
  error?: string
}

/**
 * Lead Capture API Endpoint
 * Captures user contact information BEFORE payment redirect
 * This implements industry best practice for lead capture and abandoned cart recovery
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LeadCaptureRequest = await request.json()

    // Validate required fields
    if (!body.email || !body.firstName || !body.productType || !body.sourcePage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: email, firstName, productType, sourcePage'
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format'
        },
        { status: 400 }
      )
    }

    // Validate product type
    if (!['P2P', 'Canva', 'SHOPIFY_ECOM'].includes(body.productType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product type. Must be P2P, Canva, or SHOPIFY_ECOM'
        },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Check for existing lead today (prevent duplicates)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existingLead } = await (supabase as any)
      .from('purchase_leads')
      .select('id, status')
      .eq('email', body.email)
      .eq('product_type', body.productType)
      .gte('submitted_at', today.toISOString())
      .lt('submitted_at', tomorrow.toISOString())
      .maybeSingle()

    if (existingLead) {
      console.log(`[Lead] Existing lead found for ${body.email} - ${body.productType}:`, existingLead.id)
      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        message: 'Lead already exists for today'
      })
    }

    // Create new lead record
    const leadData = {
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone || null,
      product_type: body.productType,
      status: 'form_submitted',
      amount: body.amount || null,
      currency: body.currency || 'PHP',
      source_page: body.sourcePage,
      utm_source: body.utmSource || null,
      utm_medium: body.utmMedium || null,
      utm_campaign: body.utmCampaign || null,
      metadata: body.metadata || {},
      submitted_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      email_marketing_subscribed: body.marketingOptIn || false
    }

    const { data: newLead, error: insertError } = await (supabase as any)
      .from('purchase_leads')
      .insert(leadData)
      .select('id')
      .single()

    if (insertError) {
      console.error('[Lead] Error creating lead:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to capture lead information'
        },
        { status: 500 }
      )
    }

    console.log(`[Lead] Successfully captured lead:`, {
      leadId: newLead.id,
      email: body.email,
      productType: body.productType,
      sourcePage: body.sourcePage
    })

    // --- Server-Side Event Tracking ---
    // This logs the "checkout.abandoned" (initially) event and triggers automations
    // We do this securely on the server side.
    try {
      const { trackEvent } = await import('@/app/actions/tracking');
      await trackEvent({
        email: body.email,
        contactId: newLead.id,
        eventType: 'checkout.started', // or checkout.abandoned depending on flow
        metadata: {
          source: body.sourcePage,
          product_type: body.productType,
          amount: body.amount,
          marketing_opt_in: body.marketingOptIn
        }
      });

      // Also track conversion if paid? No, this is capture before payment.
      // We'll track 'checkout.abandoned' effectively by starting the flow.
      // If they purchase, the purchase event will cancel this flow (if configured).

    } catch (trackError) {
      console.error('[Lead] Error tracking event:', trackError);
      // Don't fail the request just because tracking failed
    }

    return NextResponse.json({
      success: true,
      leadId: newLead.id
    })

  } catch (error) {
    console.error('[Lead] Error in lead capture API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * Update lead status (for payment flow tracking)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { leadId, status, xenditExternalId } = body

    if (!leadId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: leadId, status'
        },
        { status: 400 }
      )
    }

    const validStatuses = [
      'form_submitted',
      'payment_initiated',
      'payment_completed',
      'payment_failed',
      'payment_abandoned',
      'lead_nurture'
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    const updateData: any = {
      status,
      last_activity_at: new Date().toISOString()
    }

    if (xenditExternalId) {
      updateData.xendit_external_id = xenditExternalId
    }

    if (status === 'payment_completed') {
      updateData.converted_at = new Date().toISOString()
    }

    const { error: updateError } = await (supabase as any)
      .from('purchase_leads')
      .update(updateData)
      .eq('id', leadId)

    if (updateError) {
      console.error('[Lead] Error updating lead status:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update lead status'
        },
        { status: 500 }
      )
    }

    console.log(`[Lead] Successfully updated lead ${leadId} to status: ${status}`)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('[Lead] Error in lead status update API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
} 