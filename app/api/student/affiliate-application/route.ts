import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { assignMembershipTier, MembershipTier } from "@/lib/services/affiliate/membership-service/tier-management"
import { z } from "zod"

// Helper function to validate phone numbers (PH local or international E.164)
const isValidPhoneNumber = (number: string): boolean => {
  return (
    /^09\d{9}$/.test(number) ||      // PH numbers (09XXXXXXXXX)
    /^\+\d{10,15}$/.test(number) ||  // International with + (10-15 digits)
    /^\d{10,15}$/.test(number)       // Digits only 10-15 digits (international without +)
  )
}

// Validation schema for affiliate application
const affiliateApplicationSchema = z.object({
  userId: z.string().uuid(),
  applicationData: z.object({
    agreestoTerms: z.boolean(),
    confirmAgreement: z.boolean(),
    gcashNumber: z.string().refine(isValidPhoneNumber, {
      message: "GCash number must be either PH format (09XXXXXXXXX) or international format (+CountryCode + 10-15 digits)"
    }),
    gcashName: z.string().min(2, "GCash name must be at least 2 characters"),
    acceptsLiability: z.boolean(),
    understandsPayout: z.boolean()
  })
})

/**
 * POST /api/student/affiliate-application
 * Process student affiliate application and assign roles/tiers
 */
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = getAdminClient()
    const userSupabase = await createServerSupabaseClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Validate request data
    const body = await request.json()
    const validationResult = affiliateApplicationSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid application data', 
          details: validationResult.error.format() 
        },
        { status: 400 }
      )
    }

    const { userId, applicationData } = validationResult.data

    // Verify the authenticated user matches the request
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - user ID mismatch' },
        { status: 403 }
      )
    }

    // Check if all required agreements are confirmed
    if (!applicationData.agreestoTerms || !applicationData.confirmAgreement || 
        !applicationData.acceptsLiability || !applicationData.understandsPayout) {
      return NextResponse.json(
        { error: 'All agreements must be accepted before submission' },
        { status: 400 }
      )
    }

    // Get user profile to check if they already have affiliate profile
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('unified_profiles')
      .select('id, email, first_name, last_name, affiliate_id')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user already has affiliate role by checking if they have an affiliate profile
    const hasAffiliateRole = !!userProfile.affiliate_id
    let affiliateId = userProfile.affiliate_id

    // Create affiliate profile if doesn't exist
    if (!affiliateId) {
      const { data: newAffiliate, error: affiliateError } = await adminSupabase
        .from('affiliates')
        .insert({
          user_id: userId,
          slug: `student-${userId.slice(0, 8)}`, // Generate a slug
          status: 'pending',
          commission_rate: 0.25, // 25% commission rate for Course Enrollee Tier
          payout_method: 'gcash',
          gcash_number: applicationData.gcashNumber,
          gcash_name: applicationData.gcashName,
          is_member: true // Student affiliates are considered members
        })
        .select('id')
        .single()

      if (affiliateError) {
        console.error('Error creating affiliate profile:', affiliateError)
        return NextResponse.json(
          { error: 'Failed to create affiliate profile' },
          { status: 500 }
        )
      }

      affiliateId = newAffiliate.id

      // Update user profile with affiliate_id
      const { error: updateProfileError } = await adminSupabase
        .from('unified_profiles')
        .update({ affiliate_id: affiliateId })
        .eq('id', userId)

      if (updateProfileError) {
        console.error('Error updating user profile with affiliate_id:', updateProfileError)
        // Don't fail the request, just log the error
      }
    } else {
      // Update existing affiliate profile with GCash details
      const { error: updateAffiliateError } = await adminSupabase
        .from('affiliates')
        .update({
          payout_method: 'gcash',
          gcash_number: applicationData.gcashNumber,
          gcash_name: applicationData.gcashName,
          status: 'pending',
          is_member: true
        })
        .eq('id', affiliateId)

      if (updateAffiliateError) {
        console.error('Error updating affiliate profile:', updateAffiliateError)
        return NextResponse.json(
          { error: 'Failed to update affiliate profile' },
          { status: 500 }
        )
      }
    }

    // Note: User roles are managed through the affiliate profile relationship
    // The existence of an affiliate_id in unified_profiles indicates affiliate status

    // Assign Course Enrollee Tier membership
    const tierResult = await assignMembershipTier({
      supabase: adminSupabase,
      userId: userId,
      tierName: MembershipTier.COURSE_ENROLLEE,
      notes: 'Automatically assigned via student affiliate application'
    })

    if (!tierResult.success) {
      console.error('Error assigning membership tier:', tierResult.message)
      // Don't fail the request, but log the error
      console.warn('Continuing despite tier assignment failure:', tierResult.message)
    }

    // Log successful application (could be added to activity log in the future)
    console.log(`Student affiliate application processed for user ${userId}, affiliate ${affiliateId}`)

    // Send confirmation email (optional - implement if needed)
    // await sendAffiliateApplicationConfirmation(userProfile.email, userProfile.first_name)

    return NextResponse.json({
      success: true,
      message: 'Affiliate application submitted successfully',
      data: {
        affiliateId,
        status: 'pending',
        membershipTier: 'Course Enrollee Tier',
        commissionRate: 25,
        hasAffiliateRole: true
      }
    })

  } catch (error) {
    console.error('Unexpected error in affiliate application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 