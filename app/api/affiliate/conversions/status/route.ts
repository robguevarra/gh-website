import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { updateConversionStatus, batchUpdateConversionStatus } from "@/lib/services/affiliate/status-service/conversion-status";
import { z } from "zod";
import { conversionStatusSchema } from "@/lib/validation/affiliate/conversion-schema";

// Input validation schema for single conversion update
const statusUpdateSchema = z.object({
  conversionId: z.string().uuid(),
  newStatus: conversionStatusSchema,
  notes: z.string().optional(),
});

// Input validation schema for batch conversion update
const batchStatusUpdateSchema = z.object({
  conversionIds: z.array(z.string().uuid()).min(1),
  newStatus: conversionStatusSchema,
  notes: z.string().optional(),
});

/**
 * API endpoint to update the status of an affiliate conversion
 * This will be used by admin interfaces to manage conversion status lifecycle
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const data = await request.json();

    // Check if this is a single update or batch update
    const isBatchUpdate = Array.isArray(data.conversionIds) && data.conversionIds.length > 0;
    
    if (isBatchUpdate) {
      // Validate batch update request
      const validationResult = batchStatusUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validationResult.error.format() },
          { status: 400 }
        );
      }

      // Process batch update
      const result = await batchUpdateConversionStatus({
        supabase,
        conversionIds: data.conversionIds,
        newStatus: data.newStatus,
        notes: data.notes,
      });

      return NextResponse.json(result);
    } else {
      // Validate single update request
      const validationResult = statusUpdateSchema.safeParse(data);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid request data", details: validationResult.error.format() },
          { status: 400 }
        );
      }

      // Process single update
      const result = await updateConversionStatus({
        supabase,
        conversionId: data.conversionId,
        newStatus: data.newStatus,
        notes: data.notes,
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error updating conversion status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint to get a list of conversions with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const status = searchParams.get("status");
    const affiliateId = searchParams.get("affiliateId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Build the query
    let query = supabase
      .from("affiliate_conversions")
      .select(`
        id,
        affiliate_id,
        click_id,
        order_id,
        customer_id,
        gmv,
        commission_amount,
        level,
        status,
        sub_id,
        created_at,
        updated_at,
        affiliates:affiliate_id(slug, user_id, status)
      `, { count: "exact" })
      .order("created_at", { ascending: false });
    
    // Apply filters if provided
    if (status) {
      const validationResult = conversionStatusSchema.safeParse(status);
      if (validationResult.success) {
        // Assert the type to be a valid conversion status
        const validStatus = status as 'pending' | 'cleared' | 'paid' | 'flagged';
        query = query.eq("status", validStatus);
      }
    }
    
    if (affiliateId) {
      query = query.eq("affiliate_id", affiliateId);
    }
    
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }
    
    if (toDate) {
      query = query.lte("created_at", toDate);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error("Error fetching conversions:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversions" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching conversions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
