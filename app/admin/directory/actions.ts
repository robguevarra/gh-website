'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service'
import { generateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { v4 as uuidv4 } from 'uuid'

// Manually define DirectoryContact since the View type is not resolving correctly from Database
export interface DirectoryContact {
    id: string
    email: string
    type: 'customer' | 'lead'
    first_name: string | null
    last_name: string | null
    tags: string[] | null
    status: string | null
    created_at: string | null
}

export type CrmActivity = Database['public']['Tables']['crm_activities']['Row']

export interface ContactDetail extends DirectoryContact {
    activities: CrmActivity[]
}

export async function searchDirectory(
    query: string = '',
    filters: { type?: 'customer' | 'lead' | 'all'; status?: string } = { type: 'all' },
    page: number = 1,
    pageSize: number = 20
) {
    const supabase = await createServerSupabaseClient()

    // Start building the query
    let dbQuery = supabase
        .from('view_directory_contacts')
        .select('*', { count: 'exact' })

    // Apply Search (Search Filters)
    if (query) {
        dbQuery = dbQuery.or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    }

    // Apply Type Filter
    if (filters.type && filters.type !== 'all') {
        dbQuery = dbQuery.eq('type', filters.type)
    }

    // Apply Status Filter
    if (filters.status) {
        dbQuery = dbQuery.eq('status', filters.status)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    dbQuery = dbQuery.range(from, to).order('created_at', { ascending: false })

    const { data, error, count } = await dbQuery

    if (error) {
        console.error('Error fetching directory contacts:', error)
        throw new Error('Failed to fetch contacts')
    }

    return {
        data: data as unknown as DirectoryContact[],
        metadata: {
            total: count || 0,
            page,
            pageSize,
            totalPages: count ? Math.ceil(count / pageSize) : 0
        }
    }
}

export async function getContactDetails(id: string, type: 'customer' | 'lead'): Promise<ContactDetail | null> {
    const supabase = await createServerSupabaseClient()

    // 1. Fetch Basic Contact Info
    const { data: contactData, error: contactError } = await supabase
        .from('view_directory_contacts')
        .select('*')
        .eq('id', id)
        .single()

    const contact = contactData as unknown as DirectoryContact

    if (contactError || !contact) {
        console.error('Error fetching contact:', contactError)
        return null
    }

    // 2. Fetch Activities (Unified)
    // We search by ID (if customer) OR Email (if lead/customer) to be safe
    const { data: activities, error: activityError } = await supabase
        .from('crm_activities')
        .select('*')
        .or(`contact_id.eq.${id},contact_email.eq.${contact.email}`)
        .order('occurred_at', { ascending: false })
        .limit(50)

    if (activityError) {
        console.error('Error fetching activities:', activityError)
        // We don't fail the whole request, just return empty activities
    }

    return {
        ...contact,
        activities: (activities ?? []) as CrmActivity[]
    }
}

// -- Phase 2.5: CRM Integrations --

import { getContactFinancials, FinancialSummary } from '@/lib/admin/financials'
import { getContactEmailHistory, EmailHistorySummary } from '@/lib/admin/email-history'

export async function getDirectoryFinancials(email: string): Promise<FinancialSummary> {
    return await getContactFinancials(email)
}

export async function getDirectoryEmailHistory(email: string): Promise<EmailHistorySummary> {
    return await getContactEmailHistory(email)
}

// -- CRM Actions (Phase 2.5) --

interface ActionResponse {
    success: boolean
    message?: string
    error?: string
}

export async function updateContactPrimaryEmail(userId: string, newEmail: string, verification: boolean = false): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const adminClient = await createServiceRoleClient() // Use service role for admin updates
    const lowerNewEmail = newEmail.toLowerCase().trim()

    // 1. Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(lowerNewEmail)) return { success: false, error: 'Invalid email format' }

    // 2. Check existence
    const { data: currentProfile } = await adminClient
        .from('unified_profiles')
        .select('email')
        .eq('id', userId)
        .single()

    if (!currentProfile) return { success: false, error: 'User not found' }

    const { data: existingProfile } = await adminClient
        .from('unified_profiles')
        .select('id')
        .eq('email', lowerNewEmail)
        .neq('id', userId)
        .maybeSingle()

    if (existingProfile) return { success: false, error: 'Email already exists for another user' }

    const oldEmail = currentProfile.email
    if (!oldEmail) return { success: false, error: 'Current user has no email' }

    try {
        // 3. Cascade Updates
        await Promise.all([
            adminClient.auth.admin.updateUserById(userId, { email: lowerNewEmail }),
            adminClient.from('unified_profiles').update({ email: lowerNewEmail, updated_at: new Date().toISOString() }).eq('id', userId),
            adminClient.from('transactions').update({ contact_email: lowerNewEmail }).eq('contact_email', oldEmail),
            adminClient.from('purchase_leads').update({ email: lowerNewEmail }).eq('email', oldEmail),
            adminClient.from('ebook_contacts').update({ email: lowerNewEmail }).eq('email', oldEmail)
        ])

        // Log change (optional, fire and forget)
        /* await adminClient.from('email_change_log').insert({ ... }) */

        return { success: true, message: 'Primary email updated successfully' }
    } catch (error) {
        console.error('Update Primary Email Failed:', error)
        return { success: false, error: 'Failed to update email. Check logs.' }
    }
}

export async function updateContactSecondaryEmail(userId: string, secondaryEmail: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const adminClient = await createServiceRoleClient()
    const lowerEmail = secondaryEmail.toLowerCase().trim()

    // 1. Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(lowerEmail)) return { success: false, error: 'Invalid email format' }

    // 2. Fetch Profile & Metadata
    const { data: currentProfile } = await adminClient
        .from('unified_profiles')
        .select('email, admin_metadata')
        .eq('id', userId)
        .single()

    if (!currentProfile) return { success: false, error: 'User not found' }
    if (currentProfile.email === lowerEmail) return { success: false, error: 'Email is already primary' }

    const currentMetadata = (currentProfile.admin_metadata as any) || {}
    const currentSecondary = (currentMetadata.secondary_emails as string[]) || []

    if (currentSecondary.includes(lowerEmail)) return { success: false, error: 'Email already in secondary list' }

    // 3. Update Profile
    const updatedSecondary = [...currentSecondary, lowerEmail]
    const updatedMetadata = { ...currentMetadata, secondary_emails: updatedSecondary }

    const { error } = await adminClient
        .from('unified_profiles')
        .update({ admin_metadata: updatedMetadata, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) return { success: false, error: error.message }

    // 4. Link Shopify (Best Effort)
    try {
        const { data: existingCustomer } = await adminClient.from('shopify_customers').select('id').eq('email', lowerEmail).maybeSingle()
        let targetId = existingCustomer?.id

        if (!targetId) {
            const { data: newCust } = await adminClient
                .from('shopify_customers')
                .insert({ email: lowerEmail, unified_profile_id: userId, shopify_customer_id: null as any })
                .select('id')
                .maybeSingle()
            targetId = newCust?.id
        } else {
            await adminClient.from('shopify_customers').update({ unified_profile_id: userId }).eq('id', targetId)
        }

        if (targetId) {
            await adminClient.from('shopify_orders').update({ customer_id: targetId }).is('customer_id', null).eq('email', lowerEmail)
        }
    } catch (e) {
        console.error('Secondary Email Shopify Link Error:', e)
    }

    return { success: true, message: 'Secondary email added' }
}

export async function resendContactWelcomeEmail(email: string, context: 'P2P' | 'Canva' | 'Shopify'): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    if (!email) return { success: false, error: 'Email required' }

    const supabase = await createServiceRoleClient()

    // Fetch Profile
    const { data: profile } = await supabase.from('unified_profiles').select('first_name').eq('email', email).maybeSingle()
    const firstName = profile?.first_name || email.split('@')[0]

    let templateName = ''
    let variables: any = {}

    try {
        if (context === 'P2P') {
            const classificationResult = await classifyCustomer(email)
            let magicLink = '[MAGIC_LINK_FAILED]'

            if (classificationResult.success && classificationResult.classification) {
                const flow = getAuthenticationFlow(classificationResult.classification)
                const linkRes = await generateMagicLink({
                    email,
                    purpose: flow.magicLinkPurpose,
                    redirectTo: flow.redirectPath,
                    expiresIn: '48h',
                    metadata: { source: 'admin_resend_welcome' }
                })
                if (linkRes.success) magicLink = linkRes.magicLink!
            }

            templateName = 'P2P Course Welcome'
            variables = {
                first_name: firstName,
                course_name: 'Papers to Profits',
                enrollment_date: new Date().toLocaleDateString(),
                access_link: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/course`,
                magic_link: magicLink,
                expiration_hours: '48',
                setup_required: 'true'
            }
        } else if (context === 'Canva') {
            templateName = 'Canva Ebook Delivery'
            variables = {
                first_name: firstName,
                ebook_title: 'My Canva Business Ebook',
                google_drive_link: process.env.CANVA_EBOOK_DRIVE_LINK || 'https://drive.google.com/file/d/example',
                support_email: process.env.SUPPORT_EMAIL || 'help@gracefulhomeschooling.com'
            }
        } else if (context === 'Shopify') {
            // Fetch recent order
            const { data: recentOrders } = await supabase
                .from('ecommerce_orders')
                .select('id, total_amount, currency')
                .eq('user_id', (profile as any)?.id) // Only works if we found a profile
                .order('created_at', { ascending: false })
                .limit(1)

            const recentOrder = recentOrders?.[0]
            if (!recentOrder) return { success: false, error: 'No recent Shopify orders found' }

            templateName = 'Shopify Order Confirmation'
            variables = {
                first_name: firstName,
                order_number: recentOrder.id,
                order_items: 'Digital products from your recent order',
                total_amount: (recentOrder.total_amount || 0).toFixed(2),
                currency: recentOrder.currency || 'PHP',
                access_instructions: 'Your digital products have been delivered.',
                customer_type: 'returning',
                account_benefits: ''
            }
        }

        const result = await sendTransactionalEmail(templateName, email, variables)
        if (!result.success) return { success: false, error: result.error }

        return { success: true, message: `Sent ${context} welcome email` }

    } catch (e: any) {
        console.error('Resend Welcome Error:', e)
        return { success: false, error: e.message || 'Internal Error' }
    }
}

export async function enrollContactInP2P(email: string, firstName: string, lastName: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const supabase = await createServiceRoleClient()
    const normalizedEmail = email.toLowerCase().trim()
    const P2P_COURSE_ID = '7e386720-8839-4252-bd5f-09a33c3e1afb'

    try {
        // 1. Get or Create User
        let userId: string
        const { data: usersData } = await supabase.auth.admin.listUsers()
        const existingUser = usersData.users.find(u => u.email?.toLowerCase() === normalizedEmail)

        if (existingUser) {
            userId = existingUser.id
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: normalizedEmail,
                email_confirm: true,
                user_metadata: { first_name: firstName, last_name: lastName, source: 'admin_manual_enroll' }
            })
            if (createError) throw createError
            userId = newUser.user.id
        }

        // 2. Check Enrollment
        const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', P2P_COURSE_ID)
            .single()

        if (existingEnrollment) return { success: false, error: 'User already enrolled' }

        // 3. Upsert Profile
        await supabase.from('unified_profiles').upsert({
            id: userId,
            email: normalizedEmail,
            first_name: firstName,
            last_name: lastName,
            is_student: true,
            status: 'active',
            updated_at: new Date().toISOString()
        })

        // 4. Create Transaction & Enrollment
        const transactionId = uuidv4()
        await supabase.from('transactions').insert({
            id: transactionId,
            user_id: userId,
            contact_email: normalizedEmail,
            amount: 0,
            currency: 'PHP',
            status: 'SUCCEEDED',
            transaction_type: 'manual_enrollment',
            metadata: { first_name: firstName, last_name: lastName, source: 'admin_manual' }
        })

        await supabase.from('enrollments').insert({
            id: uuidv4(),
            user_id: userId,
            course_id: P2P_COURSE_ID,
            transaction_id: transactionId,
            status: 'active',
            enrolled_at: new Date().toISOString()
        })

        return { success: true, message: 'Enrolled in P2P successfully' }

    } catch (e: any) {
        console.error('P2P Enrollment Error:', e)
        return { success: false, error: e.message }
    }
}

export async function sendPasswordResetLink(email: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const supabase = await createServiceRoleClient()

    try {
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
            }
        })

        if (error) throw error

        // If you want to automatically send it via your email provider instead of just getting the link:
        // Supabase generateLink typically returns the link. You might need to email it manually if your SMTP isn't set up to "just work" with this call.
        // However, Supabase's `resetPasswordForEmail` triggers the standard email. 
        // Let's use `resetPasswordForEmail` if we want Supabase to send it, OR use `generateLink` if we want to send it ourselves.
        // Given existing patterns, let's use the standard reset flow which emails the user.

        // Actually, `generateLink` gives us the link. `resetPasswordForEmail` sends it.
        // Note: resetPasswordForEmail is on the public client, but admin can trigger resets too.
        // Let's try sending it via the transactional email service if we get a link, or just rely on Supabase's built-in mailer if configured.

        // Re-reading usage: Users usually want a "Magick Link" or "Reset Password Email".
        // Let's stick to the simplest: Trigger Supabase's built-in reset email.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
        })

        if (resetError) throw resetError

        return { success: true, message: 'Password reset email sent' }

    } catch (e: any) {
        console.error('Password Reset Error:', e)
        return { success: false, error: e.message }
    }
}

export async function toggleUserBan(userId: string, shouldBan: boolean, reason?: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const supabase = await createServiceRoleClient()

    try {
        // 1. Update Auth User
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            ban_duration: shouldBan ? 'infinite' : 'none',
            user_metadata: {
                blocked_at: shouldBan ? new Date().toISOString() : null,
                blocked_reason: shouldBan ? reason : null
            }
        })

        if (authError) throw authError

        // 2. Update Unified Profile
        const { error: profileError } = await supabase
            .from('unified_profiles')
            .update({
                status: shouldBan ? 'blocked' : 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)

        if (profileError) throw profileError

        return { success: true, message: shouldBan ? 'User banned successfully' : 'User unbanned successfully' }

    } catch (e: any) {
        console.error('Ban/Unban Error:', e)
        return { success: false, error: e.message }
    }
}

export async function revokeP2PAccess(email: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const supabase = await createServiceRoleClient()
    const P2P_COURSE_ID = '7e386720-8839-4252-bd5f-09a33c3e1afb'

    try {
        // 1. Get User
        const { data: profile } = await supabase
            .from('unified_profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (!profile) return { success: false, error: 'User not found' }

        // 2. Find Active Enrollment to get Transaction ID
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id, transaction_id')
            .eq('user_id', profile.id)
            .eq('course_id', P2P_COURSE_ID)
            .maybeSingle()

        if (!enrollment) return { success: false, error: 'No P2P enrollment found' }

        // 3. Cancel Enrollment (Revokes Access)
        const { error: updateError } = await supabase
            .from('enrollments')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', enrollment.id)

        if (updateError) throw updateError

        // 4. Refund Associated Transaction (if exists)
        if (enrollment.transaction_id) {
            const { error: txError } = await supabase
                .from('transactions')
                .update({
                    status: 'refunded',
                })
                .eq('id', enrollment.transaction_id)

            if (txError) console.error('Warning: Failed to mark transaction as refunded:', txError)
        }

        // 5. BAN User (Prevent Future Login)
        // Per user request: "prevent them here [signin] when they ask for refund"
        const { error: banError } = await supabase.auth.admin.updateUserById(profile.id, {
            ban_duration: 'infinite',
            user_metadata: {
                blocked_at: new Date().toISOString(),
                blocked_reason: 'Refunded P2P'
            }
        })
        if (banError) console.error('Warning: Failed to ban user in Auth:', banError)

        // Update profile status
        await supabase
            .from('unified_profiles')
            .update({ status: 'blocked' })
            .eq('id', profile.id)

        return { success: true, message: 'P2P Access Revoked, Transaction Refunded & User Banned' }

    } catch (e: any) {
        console.error('Revoke Access Error:', e)
        return { success: false, error: e.message }
    }
}

export async function deleteUser(userId: string): Promise<ActionResponse> {
    const adminCheck = await checkAdminAccess()
    if (!adminCheck.isAdmin) return { success: false, error: 'Unauthorized' }

    const supabase = await createServiceRoleClient()

    try {
        // 0. Fetch user email for string-based tables
        const { data: profile } = await supabase
            .from('unified_profiles')
            .select('email')
            .eq('id', userId)
            .single()

        const email = profile?.email

        // 1. Manual Cascade - Delete Children First
        // a. Enrollments (Has foreign key with NO ACTION)
        await supabase.from('enrollments').delete().eq('user_id', userId)

        // b. Transactions (Usually linked by user_id)
        await supabase.from('transactions').delete().eq('user_id', userId)

        // c. Shopify Customers (Linked by unified_profile_id)
        await supabase.from('shopify_customers').delete().eq('unified_profile_id', userId)

        // d. Email-based records (Purchase Leads, Ebook Contacts)
        if (email) {
            await supabase.from('purchase_leads').delete().eq('email', email)
            await supabase.from('ebook_contacts').delete().eq('email', email)
        }

        // 2. Delete from Auth (This is the primary identity)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)

        if (authError) throw authError

        // 3. Explicitly Delete Profile (In case no Cascade or Auth delete didn't trigger it due to timing)
        const { error: profileError } = await supabase
            .from('unified_profiles')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('Profile cleanup warning:', profileError)
        }

        return { success: true, message: 'User and all related data deleted permanently' }

    } catch (e: any) {
        console.error('Delete User Error:', e)
        return { success: false, error: e.message }
    }
}



// -- Smart List Actions (Phase 3) --

export interface SmartList {
    id: string
    name: string
    rules: any
    user_count?: number
    created_at?: string
}

export async function getSmartLists(): Promise<SmartList[]> {
    const supabase = await createServerSupabaseClient()

    // We fetch all lists. In future, we might paginate, but usually there are few lists.
    const { data, error } = await supabase
        .from('crm_smart_lists')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching smart lists:', error)
        return []
    }

    return data as SmartList[]
}
