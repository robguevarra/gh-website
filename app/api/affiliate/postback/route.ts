import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * API endpoint to handle postback notifications to network partners
 * This endpoint will be used by the system to notify network partners of conversions
 * and also to manually trigger retries for failed postbacks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getAdminClient();
    const data = await request.json();
    
    // Validate input data
    if (!data.postbackId && !data.conversionId) {
      return NextResponse.json(
        { error: "Either postbackId or conversionId is required" },
        { status: 400 }
      );
    }

    // If we have a specific postback ID, retry that one
    if (data.postbackId) {
      const { data: postback, error } = await supabase
        .from("network_postbacks")
        .select("*")
        .eq("id", data.postbackId)
        .single();

      if (error || !postback) {
        return NextResponse.json(
          { error: "Postback not found" },
          { status: 404 }
        );
      }
      
      // Send the postback to the network partner
      const result = await sendPostbackToPartner(postback);
      
      // Update the postback record
      await updatePostbackStatus(supabase, postback.id, result);
      
      return NextResponse.json({
        success: result.success,
        message: result.message
      });
    }
    
    // If we have a conversion ID, find all pending postbacks for that conversion
    if (data.conversionId) {
      const { data: postbacks, error } = await supabase
        .from("network_postbacks")
        .select("*")
        .eq("conversion_id", data.conversionId)
        .in("status", ["pending", "failed", "retrying"]);

      if (error) {
        return NextResponse.json(
          { error: "Error fetching postbacks" },
          { status: 500 }
        );
      }

      if (!postbacks || postbacks.length === 0) {
        return NextResponse.json(
          { message: "No pending postbacks found for this conversion" },
          { status: 404 }
        );
      }
      
      // Process all postbacks
      const results = await Promise.all(
        postbacks.map(async (postback) => {
          const result = await sendPostbackToPartner(postback);
          await updatePostbackStatus(supabase, postback.id, result);
          return {
            postbackId: postback.id,
            networkName: postback.network_name,
            success: result.success,
            message: result.message
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        results
      });
    }
    
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing postback request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Send a postback notification to a network partner
 * @param postback The postback record from the database
 * @returns Object with success status and message
 */
async function sendPostbackToPartner(postback: any): Promise<{ success: boolean; message: string }> {
  try {
    // Don't retry too many times
    if (postback.attempts >= 5) {
      return {
        success: false,
        message: "Maximum retry attempts reached"
      };
    }
    
    // Send the postback to the network partner
    const response = await fetch(postback.postback_url, {
      method: "GET", // Most network postbacks use GET requests
      headers: {
        "User-Agent": "GH-Affiliate-Tracker/1.0"
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        message: `Network responded with status ${response.status}: ${response.statusText}`
      };
    }
    
    return {
      success: true,
      message: "Postback sent successfully"
    };
  } catch (error) {
    return {
      success: false,
      message: `Error sending postback: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Update the status of a postback record
 * @param supabase Supabase client
 * @param postbackId ID of the postback record
 * @param result Result of the postback attempt
 */
async function updatePostbackStatus(
  supabase: any,
  postbackId: string,
  result: { success: boolean; message: string }
): Promise<void> {
  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    attempts: supabase.rpc("increment", { x: 1, row_id: postbackId, table: "network_postbacks", column: "attempts" }),
    last_attempt_at: now,
  };
  
  if (result.success) {
    updateData.status = "sent";
    updateData.error_message = null;
  } else {
    updateData.status = "failed";
    updateData.error_message = result.message;
  }
  
  await supabase
    .from("network_postbacks")
    .update(updateData)
    .eq("id", postbackId);
}
