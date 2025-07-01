import { config } from 'dotenv'
import { getAdminClient } from '@/lib/supabase/admin'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
import { getStandardVariableDefaults, substituteVariables } from '@/lib/services/email/template-utils'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const TEMPLATE_ID = '3b292bfd-bec2-42ac-aa2c-97d3edd3501d'
const BATCH_SIZE = 10 // Process 10 at a time
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds between batches

async function migrateUsersWithMagicLinks() {
  console.log('🚀 Starting user migration with magic links...')
  
  const supabase = getAdminClient()
  
  // Verify environment
  const MAGIC_LINK_BASE_URL = process.env.MAGIC_LINK_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://gracefulhomeschooling.com'
  console.log(`🔧 Magic links will use base URL: ${MAGIC_LINK_BASE_URL}`)
  
  // Get template
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', TEMPLATE_ID)
    .single()

  if (templateError || !template) {
    console.error('❌ Template not found:', templateError)
    return
  }

  console.log(`📧 Using template: ${template.name}`)

  // Get total user count
  const { count: totalUsers } = await supabase
    .from('unified_profiles')
    .select('id', { count: 'exact' })
    .or('email_bounced.is.null,email_bounced.eq.false')
    .not('email', 'is', null)

  console.log(`👥 Total users to process: ${totalUsers}`)

  let processedCount = 0
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  // Process in batches
  for (let offset = 0; offset < (totalUsers || 0); offset += BATCH_SIZE) {
    console.log(`\n📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil((totalUsers || 0) / BATCH_SIZE)}`)
    
    const { data: profiles, error: profilesError } = await supabase
      .from('unified_profiles')
      .select('id, email, first_name, last_name')
      .or('email_bounced.is.null,email_bounced.eq.false')
      .not('email', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id')

    if (profilesError || !profiles) {
      console.error('❌ Error fetching profiles:', profilesError)
      continue
    }

    // Process each user in this batch
    for (const profile of profiles) {
      try {
        processedCount++
        console.log(`🔗 Processing ${processedCount}/${totalUsers}: ${profile.email}`)

        // Generate magic link
        const magicLinkResult = await generateMagicLink({
          email: profile.email,
          purpose: 'account_setup',
          redirectTo: '/dashboard',
          metadata: {
            source: 'script_migration',
            template_id: TEMPLATE_ID
          }
        })

        if (!magicLinkResult.success || !magicLinkResult.magicLink) {
          throw new Error(`Magic link generation failed: ${magicLinkResult.error}`)
        }

        // Prepare variables
        const templateVariables = getStandardVariableDefaults()
        const mergedVariables = {
          ...templateVariables,
          first_name: profile.first_name || 'Friend',
          last_name: profile.last_name || '',
          magic_link: magicLinkResult.magicLink
        }

        // Send email
        const emailResult = await sendTransactionalEmail(
          template.name,
          profile.email,
          mergedVariables
        )

        if (emailResult.success) {
          successCount++
          console.log(`✅ Sent to ${profile.email}`)
        } else {
          throw new Error(`Email send failed: ${emailResult.error}`)
        }

      } catch (error) {
        errorCount++
        const errorMsg = `Failed for ${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    // Delay between batches to avoid overwhelming services
    if (offset + BATCH_SIZE < (totalUsers || 0)) {
      console.log(`⏱️ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  console.log('\n📊 Migration Complete!')
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`📧 Total processed: ${processedCount}`)
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    errors.forEach(error => console.log(`  - ${error}`))
  }
}

// Run the migration
if (require.main === module) {
  migrateUsersWithMagicLinks()
    .then(() => {
      console.log('🎉 Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error)
      process.exit(1)
    })
}

export { migrateUsersWithMagicLinks } 