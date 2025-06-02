import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  assignMembershipTier,
  getAllMembershipTiers,
  getUserMembershipTier,
  checkAndAssignCourseEnrolleeTier,
  MembershipTierLevel
} from "@/lib/services/affiliate/membership-service/tier-management";

// Define validation schema for membership tier updates
const membershipTierUpdateSchema = z.object({
  userId: z.string().uuid(),
  tierName: z.string(),
  notes: z.string().optional(),
});

/**
 * API endpoint to update an affiliate's membership tier
 * This allows admin users to manually upgrade/downgrade affiliates to different tiers
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const data = await request.json();
    
    // Validate the request data
    const validationResult = membershipTierUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Verify the user exists and is an affiliate
    const { data: profile, error: profileError } = await supabase
      .from("unified_profiles")
      .select("affiliate_id")
      .eq("id", data.userId)
      .single();
    
    if (profileError || !profile || !profile.affiliate_id) {
      return NextResponse.json(
        { error: "User is not an affiliate or does not exist" },
        { status: 404 }
      );
    }
    
    // Assign the membership tier
    const result = await assignMembershipTier({
      supabase,
      userId: data.userId,
      tierName: data.tierName as MembershipTierLevel,
      notes: data.notes,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error updating membership tier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint to get all available membership tiers
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    
    // If userId is provided, get that user's current membership tier
    if (userId) {
      const userTier = await getUserMembershipTier({
        supabase,
        userId,
      });
      
      if (!userTier) {
        return NextResponse.json(
          { error: "Failed to fetch user membership tier" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(userTier);
    }
    
    // Otherwise, get all available membership tiers
    const tiers = await getAllMembershipTiers(supabase);
    
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Error fetching membership tiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint to auto-assign the Course Enrollee tier based on course enrollment status
 * This is used for automatic tier assignment when a user enrolls in a course
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const data = await request.json();
    
    if (!data.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }
    
    // Check if the user is enrolled in a course and assign tier accordingly
    const result = await checkAndAssignCourseEnrolleeTier({
      supabase,
      userId: data.userId,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking course enrollment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
