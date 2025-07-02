import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer } from '@/lib/auth/customer-classification-service'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
import { getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils'

// Add logging to confirm the BASE_URL being used
const MAGIC_LINK_BASE_URL = process.env.MAGIC_LINK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://gracefulhomeschooling.com'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check admin access
    const adminAccess = await checkAdminAccess()
    if (!adminAccess.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId = '3b292bfd-bec2-42ac-aa2c-97d3edd3501d', batchSize = 1, startFrom = 0, testEmails = null } = body

    console.log(`🚀 Starting template migration for template: ${templateId}`)
    console.log(`📊 Batch size: ${batchSize}, Starting from: ${startFrom}`)
    console.log(`🧪 Test mode: ${testEmails ? 'YES' : 'NO'}`)
    console.log(`🔧 Environment check:`, {
      magicLinkBaseUrl: MAGIC_LINK_BASE_URL,
      hasJwtSecret: !!(process.env.MAGIC_LINK_JWT_SECRET || process.env.JWT_SECRET),
      hasBaseUrl: !!(process.env.MAGIC_LINK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    if (testEmails) {
      console.log(`📧 Test emails: ${testEmails.join(', ')}`)
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Fetch emails that already received this template to avoid duplicates
    const { data: sentLogs, error: sentLogsError } = await supabase
      .from('email_send_log')
      .select('recipient_email')
      .eq('template_id', templateId)

    if (sentLogsError) {
      console.error('❌ Error fetching sent email logs:', sentLogsError)
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 })
    }

    const sentEmailSet = new Set<string>(
      (sentLogs ?? []).map((log: any) => (log.recipient_email as string).toLowerCase())
    )

    // Get users (paginated for batching or filtered by test emails)
    let query = supabase
      .from('unified_profiles')
      .select('id, email, first_name, last_name')
      .eq('acquisition_source', 'migrated')
      .or('email_bounced.is.null,email_bounced.eq.false')
      .not('email', 'is', null)

    // If test emails provided, filter to only those emails
    if (testEmails && Array.isArray(testEmails) && testEmails.length > 0) {
      query = query.in('email', testEmails)
      console.log(`🧪 Testing with specific emails: ${testEmails.join(', ')}`)
    } else {
      // Normal batch processing
      query = query.range(startFrom, startFrom + batchSize - 1)
    }

    const { data: profiles, error: profilesError } = await query.order('id')

    // Remove users who have already been sent this template
    const filteredProfiles = (profiles ?? []).filter(
      (p: any) => !sentEmailSet.has((p.email as string).toLowerCase())
    )

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
    }

    if (!filteredProfiles || filteredProfiles.length === 0) {
      console.log(`⚠️ No profiles found for processing`)
      const message = testEmails ? 'No users found with the specified test emails' : 'No more users to process'
      return NextResponse.json({ 
        message,
        templateId,
        batchSize: 0,
        successCount: 0,
        errorCount: 0,
        startFrom,
        nextStartFrom: startFrom,
        hasMore: false,
        errors: testEmails ? [`No profiles found for emails: ${testEmails.join(', ')}`] : undefined
      }, { status: 200 })
    }

    console.log(`📧 Processing ${filteredProfiles.length} users...`)
    console.log(`👥 Found profiles: ${filteredProfiles.map(p => p.email).join(', ')}`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each user  
    for (const profile of filteredProfiles) {
      try {
        // Skip customer classification for migration - use simple account_setup flow
        // const customerClassification = await classifyCustomer(profile.email)
        
        // Generate magic link with minimal metadata to reduce processing time
        console.log(`🔗 Generating magic link for: ${profile.email}`)
        const magicLinkResult = await generateMagicLink({
          email: profile.email,
          purpose: 'account_setup',
          redirectTo: '/dashboard',
          metadata: {
            source: 'template_migration',
            template_id: templateId
          }
        })
        console.log(`🔗 Magic link result:`, { success: magicLinkResult.success, hasLink: !!magicLinkResult.magicLink, error: magicLinkResult.error })

        if (!magicLinkResult.success || !magicLinkResult.magicLink) {
          console.warn(`⚠️ Failed to generate magic link for ${profile.email}:`, magicLinkResult.error)
          errors.push(`Magic link generation failed for ${profile.email}: ${magicLinkResult.error || 'Unknown error'}`)
          errorCount++
          continue
        }

        // Get template variables for this user
        const templateVariables = getStandardVariableDefaults()
        
        // Prepare merged variables
        const mergedVariables = {
          ...templateVariables,
          first_name: profile.first_name || 'Friend',
          last_name: profile.last_name || '',
          magic_link: magicLinkResult.magicLink
        }

        // Replace variables in template
        const processedSubject = substituteVariables(template.subject, mergedVariables)
        const processedHtmlContent = substituteVariables(template.html_content, mergedVariables)

        // Send email
        console.log(`📧 Sending to ${profile.email}`)
        
        const emailResult = await sendTransactionalEmail(
          template.name,
          profile.email,
          mergedVariables,
          undefined // Don't link to purchase_leads for migration emails
        )
        
        if (emailResult.success) {
          successCount++
          console.log(`✅ Sent to ${profile.email}`)
        } else {
          errorCount++
          errors.push(`Email send failed for ${profile.email}: ${emailResult.error}`)
          console.error(`❌ Failed to send to ${profile.email}:`, emailResult.error)
        }

      } catch (error) {
        errorCount++
        const errorMsg = `Processing failed for ${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    const response = {
      message: `Template migration batch completed`,
      templateId,
      batchSize: filteredProfiles.length,
      successCount,
      errorCount,
      startFrom,
      nextStartFrom: startFrom + profiles.length,
      hasMore: profiles.length === batchSize,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log(`📊 Batch Results:`, response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Template migration error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 