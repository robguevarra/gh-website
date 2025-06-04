import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, handleServerError, handleUnauthorized } from '@/lib/supabase/route-handler';
import { qrCodeRequestSchema, qrCodeResponseSchema } from '@/lib/validation/affiliate/qrcode-schema';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

/**
 * Verifies that the authenticated user is an active affiliate
 * @returns Object containing supabase client and affiliate data if valid, throws otherwise
 */
async function verifyActiveAffiliate() {
  const supabase = await createRouteHandlerClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  // Get user's affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from('unified_profiles')
    .select('affiliate_id, affiliate_general_status')
    .eq('id', session.user.id)
    .single();
  
  if (profileError || !profile || !profile.affiliate_id) {
    throw new Error('Unauthorized: User is not an affiliate');
  }
  
  // Verify affiliate status is active
  if (profile.affiliate_general_status !== 'active') {
    throw new Error(`Unauthorized: Affiliate status is '${profile.affiliate_general_status}', must be 'active'`);
  }
  
  return { supabase, userId: session.user.id, affiliateId: profile.affiliate_id };
}

/**
 * Generates a QR code URL for the given parameters
 * @param qrData The QR code request data
 * @returns A URL to the generated QR code image
 */
async function generateQrCode(qrData: any, affiliateId: string, supabase: any) {
  try {
    const {
      referral_link_id,
      url,
      size = 300,
      dark_color = '#000000',
      light_color = '#FFFFFF',
      include_logo = true,
    } = qrData;
    
    // If a referral link ID is provided, fetch the URL from the database
    let targetUrl = url;
    if (referral_link_id) {
      // Fetch the referral link details
      const { data: link, error: linkError } = await supabase
        .from('affiliate_referral_links')
        .select('slug')
        .eq('id', referral_link_id)
        .eq('affiliate_id', affiliateId)
        .single();
      
      if (linkError || !link) {
        throw new Error('Referral link not found or does not belong to you');
      }
      
      // Construct the URL for this referral link
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
      targetUrl = `${baseUrl}/ref/${link.slug}`;
    }
    
    if (!targetUrl) {
      throw new Error('No URL could be determined for QR code generation');
    }
    
    // We could use a third-party QR code generation service here,
    // but for simplicity we'll use the Google Charts API
    const encodedUrl = encodeURIComponent(targetUrl);
    const darkColorNoHash = dark_color.replace('#', '');
    const lightColorNoHash = light_color.replace('#', '');
    
    // Create a QR code URL
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedUrl}&chco=${darkColorNoHash}`;
    
    return { qr_code_url: qrCodeUrl, original_url: targetUrl };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * POST /api/affiliate/qrcode
 * Generates a QR code for an affiliate link or custom URL
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, affiliateId } = await verifyActiveAffiliate();
    
    // Parse and validate request body
    const requestBody = await request.json();
    const validatedData = qrCodeRequestSchema.parse(requestBody);
    
    // Generate QR code
    const qrCodeData = await generateQrCode(validatedData, affiliateId, supabase);
    
    // Validate the response against our schema
    const validatedResponse = qrCodeResponseSchema.parse(qrCodeData);
    
    // Set cache headers (1 day, QR codes are stable)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    return NextResponse.json(validatedResponse, { 
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error in POST /api/affiliate/qrcode:', error);
    
    if (error instanceof Error) {
      if (error.message.startsWith('Unauthorized:')) {
        return handleUnauthorized();
      }
      
      if (error.message === 'Referral link not found or does not belong to you') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      // Check for Zod validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return handleServerError('Failed to generate QR code');
  }
}
