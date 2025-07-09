import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/auth/check-admin-access'

/**
 * Search systemeio records with P2P-related tags
 * GET /api/admin/manual-enrollment/search-systemeio
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 50, max: 100)
 * - tag: Filter by tag (imported, PaidP2P, etc.)
 * - search: Search in Email, First Name, Last Name
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
    const tagFilter = searchParams.get('tag')
    const searchTerm = searchParams.get('search')
    const courseId = searchParams.get('course_id') || '7e386720-8839-4252-bd5f-09a33c3e1afb' // P2P course ID

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build query with filters
    let query = supabase
      .from('systemeio')
      .select(`
        "Email",
        "First Name",
        "Last Name", 
        "Date Registered",
        "Tag"
      `, { count: 'exact' })
      .order('Date Registered', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters - default to P2P-related tags
    if (tagFilter) {
      query = query.ilike('Tag', `%${tagFilter}%`)
    } else {
      // Default to P2P-related tags
      query = query.or('Tag.ilike.%imported%,Tag.ilike.%PaidP2P%')
    }

    if (searchTerm) {
      query = query.or(`Email.ilike.%${searchTerm}%,"First Name".ilike.%${searchTerm}%,"Last Name".ilike.%${searchTerm}%`)
    }

    const { data: systemeioRecords, error: queryError, count } = await query

    if (queryError) {
      console.error('Error searching systemeio records:', queryError)
      return NextResponse.json({ error: 'Failed to search systemeio records' }, { status: 500 })
    }

    // Check enrollment status for each record
    const recordsWithEnrollmentStatus = await Promise.all(
      (systemeioRecords || []).map(async (record: any) => {
        const email = record.Email?.toLowerCase()
        
        // Check if user exists in auth.users
        const { data: existingUser } = await supabase
          .from('unified_profiles')
          .select('id, is_student')
          .eq('email', email)
          .single()

        let enrollmentStatus = 'not_enrolled'
        let enrolledAt = null
        
        if (existingUser) {
          // Check if user is enrolled in P2P course
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id, status, enrolled_at')
            .eq('user_id', existingUser.id)
            .eq('course_id', courseId)
            .single()

          enrollmentStatus = enrollment ? enrollment.status : 'not_enrolled'
          enrolledAt = enrollment?.enrolled_at || null
        }

        return {
          ...record,
          user_exists: !!existingUser,
          is_student: existingUser?.is_student || false,
          enrollment_status: enrollmentStatus,
          enrolled_at: enrolledAt,
          needs_enrollment: enrollmentStatus === 'not_enrolled'
        }
      })
    )

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      data: recordsWithEnrollmentStatus,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        tag: tagFilter,
        search: searchTerm,
        course_id: courseId
      }
    })

  } catch (error) {
    console.error('Error in search-systemeio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 