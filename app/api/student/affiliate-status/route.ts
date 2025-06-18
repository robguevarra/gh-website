import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check if user is already an affiliate and get their data
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, status, gcash_number, gcash_name')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking affiliate status:', error)
      return NextResponse.json(
        { error: 'Failed to check affiliate status' },
        { status: 500 }
      )
    }

    const response = {
      isAffiliate: !!affiliate,
      status: affiliate?.status || null,
      existingData: affiliate ? {
        gcashNumber: affiliate.gcash_number || '',
        gcashName: affiliate.gcash_name || ''
      } : undefined
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Affiliate status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 