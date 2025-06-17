import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * PATCH /api/affiliate/payment-method
 * Update affiliate payment method details
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { payoutMethod, gcashNumber, gcashName, bankName, accountNumber, accountHolderName } = body;

    // Get affiliate profile
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: 'Affiliate profile not found' },
        { status: 404 }
      );
    }

    // Prepare update data based on payment method
    let updateData: any = {
      payout_method: payoutMethod,
      updated_at: new Date().toISOString()
    };

    if (payoutMethod === 'gcash') {
      updateData = {
        ...updateData,
        gcash_number: gcashNumber,
        gcash_name: gcashName,
        // Reset bank fields when switching to GCash
        bank_name: null,
        account_number: null,
        account_holder_name: null,
        // Reset verification status - will need re-verification
        gcash_verified: false,
        gcash_verification_date: null,
        bank_account_verified: false
      };
    } else if (payoutMethod === 'bank_transfer') {
      updateData = {
        ...updateData,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder_name: accountHolderName,
        // Reset GCash fields when switching to bank
        gcash_number: null,
        gcash_name: null,
        // Reset verification status
        gcash_verified: false,
        gcash_verification_date: null,
        bank_account_verified: false
      };
    }

    // Update affiliate record
    const { data: updatedAffiliate, error: updateError } = await supabase
      .from('affiliates')
      .update(updateData)
      .eq('id', affiliate.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating affiliate payment method:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment method' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedAffiliate,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('Error in payment method API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate/payment-method
 * Get current affiliate payment method details
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get affiliate profile with payment details
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select(`
        id,
        payout_method,
        gcash_number,
        gcash_name,
        gcash_verified,
        gcash_verification_date,
        bank_name,
        account_number,
        account_holder_name,
        bank_account_verified
      `)
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: 'Affiliate profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: affiliate.id,
        payout_method: affiliate.payout_method,
        gcash_number: affiliate.gcash_number ? 
          `${affiliate.gcash_number.slice(0, 3)}****${affiliate.gcash_number.slice(-2)}` : null,
        gcash_name: affiliate.gcash_name,
        gcash_verified: affiliate.gcash_verified,
        gcash_verification_date: affiliate.gcash_verification_date,
        bank_name: affiliate.bank_name,
        account_number: affiliate.account_number ? 
          `****${affiliate.account_number.slice(-4)}` : null,
        account_holder_name: affiliate.account_holder_name,
        bank_account_verified: affiliate.bank_account_verified,
        // Mock verification status for now (would come from gcash_verifications table)
        gcash_verification_status: affiliate.gcash_verified ? 'verified' : 'unverified'
      }
    });

  } catch (error) {
    console.error('Error in payment method GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 