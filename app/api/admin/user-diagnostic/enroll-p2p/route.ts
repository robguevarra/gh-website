import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'
import { v4 as uuidv4 } from 'uuid'

/**
 * Enroll user in P2P course from user diagnostic interface
 * POST /api/admin/user-diagnostic/enroll-p2p
 * 
 * Request body:
 * {
 *   email: string,
 *   source: 'transaction' | 'systemeio' | 'manual',
 *   transaction_id?: string,  // If enrolling based on existing transaction
 *   manual_data?: {           // If manually enrolling
 *     firstName: string,
 *     lastName: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 P2P Enrollment API called');
    
    // Check admin access
    const adminCheck = await checkAdminAccess()
    console.log('🔒 Admin check result:', adminCheck);
    
    if (!adminCheck.isAdmin) {
      console.error('❌ Admin access denied:', adminCheck);
      return NextResponse.json(
        { error: adminCheck.error || 'Admin access required' },
        { status: adminCheck.status }
      )
    }

    console.log('✅ Admin access confirmed, proceeding with enrollment');

    const body = await request.json()
    console.log('📥 Request body received:', body);
    const { email, source, transaction_id, manual_data } = body

    if (!email) {
      console.error('❌ Missing email in request');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!['transaction', 'systemeio', 'manual'].includes(source)) {
      console.error('❌ Invalid source:', source);
      return NextResponse.json(
        { error: 'Invalid source. Must be transaction, systemeio, or manual' },
        { status: 400 }
      )
    }

    console.log('✅ Validation passed, proceeding with enrollment');
    
    const supabase = await createServiceRoleClient()
    const normalizedEmail = email.toLowerCase().trim()
    const P2P_COURSE_ID = '7e386720-8839-4252-bd5f-09a33c3e1afb'

    // 1. Check if user already enrolled in P2P
    const { data: existingProfile } = await supabase
      .from('unified_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existingProfile) {
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', existingProfile.id)
        .eq('course_id', P2P_COURSE_ID)
        .single()

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'User is already enrolled in P2P course' },
          { status: 400 }
        )
      }
    }

    let userId: string
    let transactionId: string | null = null
    let firstName = 'Unknown'
    let lastName = ''

    // 2. Handle different enrollment sources
    if (source === 'transaction' && transaction_id) {
      // Enrolling based on existing transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transaction_id)
        .single()

      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        )
      }

      transactionId = transaction_id
      firstName = (transaction.metadata as any)?.first_name || 'Unknown'
      lastName = (transaction.metadata as any)?.last_name || ''
    } else if (source === 'systemeio') {
      // Enrolling based on systemeio record
      const { data: systemeioRecord } = await supabase
        .from('systemeio')
        .select('*')
        .ilike('Email', normalizedEmail)
        .single()

      if (systemeioRecord) {
        firstName = (systemeioRecord as any)['First Name'] || (systemeioRecord as any)['First name'] || 'Unknown'
        lastName = (systemeioRecord as any)['Last Name'] || (systemeioRecord as any)['Last name'] || ''
      }
    } else if (source === 'manual' && manual_data) {
      // Manual enrollment with provided data
      firstName = manual_data.firstName || 'Unknown'
      lastName = manual_data.lastName || ''
    }

    // 3. Ensure auth user exists
    const { data: usersData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    const existingUser = usersData?.users?.find((u: any) => 
      u.email?.toLowerCase() === normalizedEmail
    )

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new auth user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          source: `diagnostic_${source}`,
          created_at: new Date().toISOString()
        }
      })

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return NextResponse.json(
          { error: `Failed to create user: ${createUserError.message}` },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // 4. Create or update unified profile
    const profileData = {
      id: userId,
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      tags: source === 'manual' ? ['manual'] : ['p2p_customer'],
      acquisition_source: source === 'manual' ? 'manual' : 
                         source === 'systemeio' ? 'migrated' : 'payment_flow',
      is_student: true,
      status: 'active',
      admin_metadata: {
        source: `diagnostic_${source}`,
        enrolled_via_diagnostic: true,
        enrollment_date: new Date().toISOString(),
        ...(transactionId && { last_purchase_date: new Date().toISOString() })
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error: profileError } = await supabase
      .from('unified_profiles')
      .upsert(profileData)

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      return NextResponse.json(
        { error: `Failed to create/update profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // 5. Create transaction if needed (for systemeio/manual sources)
    if (!transactionId && (source === 'systemeio' || source === 'manual')) {
      transactionId = uuidv4()
      const transactionData = {
        id: transactionId,
        user_id: userId, // Link transaction to user
        contact_email: normalizedEmail,
        amount: 500, // Standard P2P price
        currency: 'PHP',
        status: 'SUCCEEDED',
        transaction_type: source === 'manual' ? 'manual_enrollment' : 'migration_remediation',
        metadata: {
          first_name: firstName,
          last_name: lastName,
          course: 'p2p-course-2023',
          source: `diagnostic_${source}`,
          enrollment_via: 'user_diagnostic'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
        return NextResponse.json(
          { error: `Failed to create transaction: ${transactionError.message}` },
          { status: 500 }
        )
      }
    } else if (transactionId && source === 'transaction') {
      // Update existing transaction with user_id to link records properly
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (updateError) {
        console.error('Error updating transaction with user_id:', updateError)
        // Don't fail the enrollment for this, but log it
      }
    }

    // 6. Create enrollment
    const enrollmentId = uuidv4()
    const enrollmentData = {
      id: enrollmentId,
      user_id: userId,
      course_id: P2P_COURSE_ID,
      transaction_id: transactionId, // Link enrollment to transaction
      status: 'active',
      enrolled_at: new Date().toISOString(),
      metadata: {
        source: `diagnostic_${source}`,
        enrolled_by: 'admin_diagnostic'
      }
    }

    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .insert(enrollmentData)

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError)
      return NextResponse.json(
        { error: `Failed to create enrollment: ${enrollmentError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        email: normalizedEmail,
        enrollment_id: enrollmentId,
        transaction_id: transactionId,
        source,
        message: `Successfully enrolled ${normalizedEmail} in P2P course`
      }
    })

  } catch (error) {
    console.error('Error in P2P enrollment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 