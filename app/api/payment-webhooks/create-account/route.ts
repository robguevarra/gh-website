import { NextRequest, NextResponse } from 'next/server';
import { createAccountAfterPayment } from '@/lib/supabase/account-creation';

// This endpoint will be called by payment webhooks or the payment success page
// to create an account for the user and send them a setup email

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if needed (for production)
    // const signature = request.headers.get('x-webhook-signature');
    // ... validate signature ...
    
    // Parse the payment information
    const paymentInfo = await request.json();
    
    // Required fields validation
    if (!paymentInfo.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Create account and send setup email
    const result = await createAccountAfterPayment({
      email: paymentInfo.email,
      firstName: paymentInfo.firstName,
      lastName: paymentInfo.lastName,
      phone: paymentInfo.phone,
      membershipTierId: paymentInfo.membershipTierId,
    });
    
    return NextResponse.json(
      { message: 'Account created and setup email sent', email: result.email },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in account creation webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process account creation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 