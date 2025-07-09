import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'
import { v4 as uuidv4 } from 'uuid'

interface TransactionData {
  id: string
  contact_email: string
  amount: number
  currency: string
  status: string
  transaction_type: string
  metadata: any
  created_at: string
  updated_at: string
}

/**
 * Create manual enrollment for P2P course
 * POST /api/admin/manual-enrollment/create
 * 
 * Request body:
 * {
 *   source: 'transaction' | 'systemeio' | 'manual',
 *   transaction_id?: string,  // For transaction source
 *   systemeio_record?: object, // For systemeio source
 *   manual_data?: {           // For manual source
 *     email: string,
 *     firstName: string,
 *     lastName: string,
 *     phone?: string
 *   },
 *   course_id?: string // Default to P2P course
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

    // Validate required fields
    if (!source || !['transaction', 'systemeio', 'manual'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be: transaction, systemeio, or manual' },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const supabase = await createServiceRoleClient()

    let email: string
    let firstName: string
    let lastName: string
    let userEmail: string
    let transactionId: string
    let enrollmentData: any = {}
    let newTransaction: TransactionData | null = null

    // Process based on source type
    switch (source) {
      case 'transaction':
        if (!transaction_id) {
          return NextResponse.json(
            { error: 'transaction_id is required for transaction source' },
            { status: 400 }
          )
        }

        // Get transaction details
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transaction_id)
          .single()

        if (transactionError || !transaction) {
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          )
        }

        email = transaction.contact_email || ''
        const metadata = transaction.metadata as any
        firstName = metadata?.first_name || 'Unknown'
        lastName = metadata?.last_name || ''
        transactionId = transaction.id
        enrollmentData = {
          acquisition_source: 'payment_flow',
          tags: ['p2p_customer'],
          admin_metadata: {
            last_purchase_date: transaction.created_at,
            registration_source: 'payment_webhook',
            enrollment_source: 'manual_admin',
            enrolled_by: user?.id
          }
        }
        break

      case 'systemeio':
        if (!systemeio_record) {
          return NextResponse.json(
            { error: 'systemeio_record is required for systemeio source' },
            { status: 400 }
          )
        }

        email = systemeio_record.Email
        firstName = systemeio_record['First Name'] || 'Unknown'
        lastName = systemeio_record['Last Name'] || ''
        
        // Create a transaction for systemeio enrollment
        transactionId = uuidv4()
        newTransaction = {
          id: transactionId,
          contact_email: email.toLowerCase(),
          amount: 500, // Standard P2P amount
          currency: 'PHP',
          status: 'SUCCEEDED',
          transaction_type: 'migration_remediation',
          metadata: {
            first_name: firstName,
            last_name: lastName,
            course: 'p2p-course-2023',
            source: 'systemeio_manual',
            original_tags: systemeio_record.Tag || '',
            acquisition_source: 'migrated'
          },
          created_at: systemeio_record['Date Registered'] || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        enrollmentData = {
          acquisition_source: 'migrated',
          tags: systemeio_record.Tag ? [systemeio_record.Tag] : ['imported'],
          admin_metadata: {
            source: 'clean_migration',
            migrated_at: new Date().toISOString(),
            enrollment_source: 'manual_admin',
            enrolled_by: user?.id
          }
        }
        break

      case 'manual':
        if (!manual_data?.email || !manual_data?.firstName) {
          return NextResponse.json(
            { error: 'Email and firstName are required for manual source' },
            { status: 400 }
          )
        }

        email = manual_data.email
        firstName = manual_data.firstName
        lastName = manual_data.lastName || ''
        
        // Create a transaction for manual enrollment
        transactionId = uuidv4()
        newTransaction = {
          id: transactionId,
          contact_email: email.toLowerCase(),
          amount: 500, // Standard P2P amount
          currency: 'PHP',
          status: 'SUCCEEDED',
          transaction_type: 'manual_enrollment',
          metadata: {
            first_name: firstName,
            last_name: lastName,
            phone: manual_data.phone,
            course: 'p2p-course-2023',
            source: 'manual_admin',
            enrolled_by: user?.id
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        enrollmentData = {
          acquisition_source: 'manual',
          tags: ['manual'],
          admin_metadata: {
            source: 'manual',
            migrated_at: new Date().toISOString(),
            enrollment_source: 'manual_admin',
            enrolled_by: user?.id
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid source type' },
          { status: 400 }
        )
    }

    userEmail = email.toLowerCase()

    // Check for duplicate enrollment
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .or(`transaction_id.eq.${transactionId}`)
      .single()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'User is already enrolled in this course' },
        { status: 409 }
      )
    }

    // Start manual enrollment process
    let userId: string
    let enrollmentId: string

    // 1. Ensure auth user exists
    const { data: existingUser, error: userLookupError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Will need to implement proper pagination for large user bases
    })

    const foundUser = existingUser?.users?.find((u: any) => u.email?.toLowerCase() === userEmail)

    if (foundUser) {
      userId = foundUser.id
    } else {
      // Create new auth user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          source: source,
          created_at: new Date().toISOString()
        }
      })

      if (createUserError) {
        console.error('Failed to create user:', createUserError)
        return NextResponse.json(
          { error: `Failed to create user: ${createUserError.message}` },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // 2. Create or update unified profile
    const { error: profileError } = await supabase
      .from('unified_profiles')
      .upsert({
        id: userId,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        ...enrollmentData,
        is_student: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Failed to create/update profile:', profileError)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // 3. Create transaction if needed
    if (newTransaction) {
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          ...newTransaction,
          user_id: userId
        })

      if (transactionError) {
        console.error('Failed to create transaction:', transactionError)
        return NextResponse.json(
          { error: `Failed to create transaction: ${transactionError.message}` },
          { status: 500 }
        )
      }
    }

    // 4. Create enrollment
    enrollmentId = uuidv4()
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        id: enrollmentId,
        user_id: userId,
        course_id: course_id,
        transaction_id: transactionId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        metadata: {
          enrollment_source: 'manual_admin',
          enrolled_by: user?.id,
          original_source: source
        }
      })

    if (enrollmentError) {
      console.error('Failed to create enrollment:', enrollmentError)
      return NextResponse.json(
        { error: `Failed to create enrollment: ${enrollmentError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      data: {
        user_id: userId,
        enrollment_id: enrollmentId,
        transaction_id: transactionId,
        source,
        email: userEmail
      }
    })

  } catch (error) {
    console.error('Error in manual enrollment creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 