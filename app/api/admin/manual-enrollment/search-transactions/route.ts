import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'

/**
 * Search P2P-related transactions with pagination
 * GET /api/admin/manual-enrollment/search-transactions
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 50, max: 100)
 * - status: Filter by transaction status (paid, pending, etc.)
 * - transaction_type: Filter by type (p2p, migration_remediation, etc.)
 * - search: Search in contact_email or metadata
 * - course_id: Filter by specific course ID (default: P2P course)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const { isAdmin, error, status, user } = await checkAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json({ error }, { status })
    }

    const supabase = await createServerSupabaseClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const status_filter = searchParams.get('status')
    const transactionType = searchParams.get('transaction_type')
    const searchTerm = searchParams.get('search')
    const courseId = searchParams.get('course_id') || '7e386720-8839-4252-bd5f-09a33c3e1afb' // P2P course ID

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build query with filters
    let query = supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        contact_email,
        amount,
        currency,
        status,
        transaction_type,
        metadata,
        created_at,
        updated_at,
        paid_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status_filter) {
      query = query.eq('status', status_filter)
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    } else {
      // Default to P2P-related transaction types
      query = query.in('transaction_type', [
        'p2p',
        'p2p_course', 
        'migration_remediation',
        'enrollment'
      ])
    }

    if (searchTerm) {
      query = query.or(`contact_email.ilike.%${searchTerm}%,metadata->first_name.ilike.%${searchTerm}%,metadata->last_name.ilike.%${searchTerm}%`)
    }

    const { data: transactions, error: queryError, count } = await query

    if (queryError) {
      console.error('Error searching transactions:', queryError)
      return NextResponse.json({ error: 'Failed to search transactions' }, { status: 500 })
    }

    // Check enrollment status for each transaction
    const transactionsWithEnrollmentStatus = await Promise.all(
      (transactions || []).map(async (transaction: any) => {
        // Check if user is enrolled in P2P course
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id, status, enrolled_at')
          .eq('transaction_id', transaction.id)
          .eq('course_id', courseId)
          .single()

        return {
          ...transaction,
          enrollment_status: enrollment ? enrollment.status : 'not_enrolled',
          enrolled_at: enrollment?.enrolled_at || null,
          needs_enrollment: !enrollment
        }
      })
    )

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      data: transactionsWithEnrollmentStatus,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        status: status_filter,
        transaction_type: transactionType,
        search: searchTerm,
        course_id: courseId
      }
    })

  } catch (error) {
    console.error('Error in search-transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 