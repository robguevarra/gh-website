import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'

/**
 * Validate enrollment data and check for conflicts
 * POST /api/admin/manual-enrollment/validate
 * 
 * Request body:
 * {
 *   source: 'transaction' | 'systemeio' | 'manual',
 *   transaction_id?: string,
 *   systemeio_record?: object,
 *   manual_data?: {
 *     email: string,
 *     firstName: string,
 *     lastName: string
 *   },
 *   course_id?: string
 * }
 * 
 * Response:
 * {
 *   valid: boolean,
 *   conflicts: string[],
 *   warnings: string[],
 *   user_exists: boolean,
 *   already_enrolled: boolean,
 *   enrollment_details?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const { isAdmin, error, status, user } = await checkAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json({ error }, { status })
    }

    const body = await request.json()
    const { 
      source, 
      transaction_id, 
      systemeio_record, 
      manual_data, 
      course_id = '7e386720-8839-4252-bd5f-09a33c3e1afb' // P2P course ID
    } = body

    const supabase = await createServerSupabaseClient()
    const conflicts: string[] = []
    const warnings: string[] = []
    let email: string = ''
    let firstName: string = ''
    let lastName: string = ''

    // Validate source and extract data
    if (!source || !['transaction', 'systemeio', 'manual'].includes(source)) {
      conflicts.push('Invalid source. Must be: transaction, systemeio, or manual')
    }

    // Extract user data based on source
    switch (source) {
      case 'transaction':
        if (!transaction_id) {
          conflicts.push('transaction_id is required for transaction source')
        } else {
          // Validate transaction exists
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select('id, contact_email, metadata, status')
            .eq('id', transaction_id)
            .single()

          if (transactionError || !transaction) {
            conflicts.push('Transaction not found')
          } else {
            email = transaction.contact_email || ''
            const metadata = transaction.metadata as any
            firstName = metadata?.first_name || ''
            lastName = metadata?.last_name || ''

            if (transaction.status !== 'SUCCEEDED' && transaction.status !== 'paid') {
              warnings.push(`Transaction status is ${transaction.status}, not SUCCEEDED/paid`)
            }
          }
        }
        break

      case 'systemeio':
        if (!systemeio_record) {
          conflicts.push('systemeio_record is required for systemeio source')
        } else {
          email = systemeio_record.Email || ''
          firstName = systemeio_record['First Name'] || ''
          lastName = systemeio_record['Last Name'] || ''

          if (!email) {
            conflicts.push('Email is required in systemeio record')
          }
          if (!firstName) {
            warnings.push('First Name is missing in systemeio record')
          }
        }
        break

      case 'manual':
        if (!manual_data) {
          conflicts.push('manual_data is required for manual source')
        } else {
          email = manual_data.email || ''
          firstName = manual_data.firstName || ''
          lastName = manual_data.lastName || ''

          if (!email) {
            conflicts.push('Email is required for manual enrollment')
          }
          if (!firstName) {
            conflicts.push('First Name is required for manual enrollment')
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (email && !emailRegex.test(email)) {
            conflicts.push('Invalid email format')
          }
        }
        break
    }

    // Early return if there are conflicts
    if (conflicts.length > 0) {
      return NextResponse.json({
        valid: false,
        conflicts,
        warnings,
        user_exists: false,
        already_enrolled: false
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in auth.users
    const { data: usersData, error: userLookupError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Will search through users to find matching email
    })
    
    const existingUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail) || null
    const userExists = !!existingUser

    let profileData = null
    let enrollmentData = null
    let alreadyEnrolled = false

    if (userExists) {
      // Get unified profile
      const { data: profile } = await supabase
        .from('unified_profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .single()

      profileData = profile

      // Check if already enrolled in the course
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id, status, enrolled_at, transaction_id')
        .eq('user_id', existingUser.id)
        .eq('course_id', course_id)
        .single()

      if (enrollment) {
        alreadyEnrolled = true
        enrollmentData = enrollment
        conflicts.push(`User is already enrolled in this course (Status: ${enrollment.status})`)
      }

      // Check for existing transaction for this source
      if (source === 'transaction' && transaction_id) {
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('transaction_id', transaction_id)
          .eq('course_id', course_id)
          .single()

        if (existingEnrollment) {
          conflicts.push('This transaction already has an enrollment')
        }
      }
    }

    // Additional validation checks
    if (source === 'manual' && !userExists) {
      warnings.push('New user will be created for manual enrollment')
    }

    if (profileData?.is_student) {
      warnings.push('User is already marked as a student')
    }

    if (profileData?.is_affiliate) {
      warnings.push('User is also an affiliate - please verify this is intended')
    }

    const isValid = conflicts.length === 0

    return NextResponse.json({
      valid: isValid,
      conflicts,
      warnings,
      user_exists: userExists,
      already_enrolled: alreadyEnrolled,
      enrollment_details: enrollmentData,
      user_profile: profileData,
      extracted_data: {
        email: normalizedEmail,
        firstName,
        lastName
      }
    })

  } catch (error) {
    console.error('Error in validate enrollment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 