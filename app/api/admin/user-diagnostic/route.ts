import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdminAccess } from '@/lib/supabase/route-handler';

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const validation = await validateAdminAccess();
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const searchEmail = email.toLowerCase().trim();

    try {
      // 1. Check unified_profiles
      const unifiedProfileResult = await adminClient
        .from('unified_profiles')
        .select('*')
        .eq('email', searchEmail)
        .maybeSingle();

      // 2. Check transactions table 
      const transactionsResult = await adminClient
        .from('transactions')
        .select('*')
        .eq('contact_email', searchEmail)
        .order('created_at', { ascending: false });

      // 3. Check shopify_customers
      const shopifyCustomersResult = await adminClient
        .from('shopify_customers')
        .select('*')
        .eq('email', searchEmail);

      // 4. Check shopify_orders
      const shopifyOrdersResult = await adminClient
        .from('shopify_orders')
        .select('*')
        .eq('email', searchEmail)
        .order('created_at', { ascending: false });

      // 5. Check enrollments if we have a unified profile
      let enrollmentsResult: any = { data: [], error: null };
      if (unifiedProfileResult.data?.id) {
        enrollmentsResult = await adminClient
          .from('enrollments')
          .select(`
            *,
            course:courses(
              id,
              title,
              slug
            )
          `)
          .eq('user_id', unifiedProfileResult.data.id)
          .order('enrolled_at', { ascending: false });
      }

      // **NEW: Search ebook_contacts for Canva buyers**
      const ebookContactResult = await adminClient
        .from('ebook_contacts')
        .select('*')
        .eq('email', searchEmail)
        .maybeSingle();

      // Transform data to match UI expectations
      const userProfile = unifiedProfileResult.data ? {
        id: unifiedProfileResult.data.id,
        email: unifiedProfileResult.data.email,
        first_name: unifiedProfileResult.data.first_name,
        last_name: unifiedProfileResult.data.last_name,
        status: unifiedProfileResult.data.status || 'active',
        created_at: unifiedProfileResult.data.created_at,
        last_login_at: unifiedProfileResult.data.last_login_at,
        admin_metadata: unifiedProfileResult.data.admin_metadata
      } : null;

      // Transform enrollments
      const transformedEnrollments = (enrollmentsResult.data || []).map((enrollment: any) => ({
        id: enrollment.id,
        course_title: enrollment.course?.title || 'Unknown Course',
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status || 'active'
      }));

      // Find unlinked Shopify customers  
      const unlinkedShopifyCustomers = (shopifyCustomersResult.data || []).filter(
        (customer: any) => !customer.unified_profile_id
      );

      // **NEW: P2P ENROLLMENT DETECTION**
      const P2P_COURSE_ID = '7e386720-8839-4252-bd5f-09a33c3e1afb';
      const successStatuses = ['success', 'succeeded', 'paid', 'SUCCEEDED'];
      
      // Check if user is already enrolled in P2P course
      const hasP2PEnrollment = transformedEnrollments.some((enrollment: any) => 
        enrollment.course_title?.toLowerCase().includes('papers to profits') ||
        enrollment.course_title?.toLowerCase().includes('p2p')
      );

      // Check for qualifying P2P transactions
      const qualifyingTransactions = (transactionsResult.data || []).filter((transaction: any) => {
        const isSuccessful = successStatuses.includes(transaction.status);
        const isP2PRelated = 
          transaction.transaction_type?.includes('p2p') ||
          transaction.transaction_type?.includes('migration_remediation') ||
          transaction.metadata?.course?.includes('p2p') ||
          (transaction.amount >= 500 && transaction.currency === 'PHP'); // Standard P2P price
        return isSuccessful && isP2PRelated;
      });

      // Check systemeio records for P2P indicators
      let hasSystemeioP2PRecord = false;
      try {
        const systemeioResult = await adminClient
          .from('systemeio')
          .select('Tag')
          .ilike('Email', searchEmail)
          .maybeSingle();
        
        if (systemeioResult.data?.Tag) {
          const tags = systemeioResult.data.Tag.toLowerCase();
          hasSystemeioP2PRecord = tags.includes('imported') || tags.includes('paidp2p');
        }
      } catch (systemeioError) {
        console.log('Systemeio lookup error (non-critical):', systemeioError);
      }

      // Determine P2P enrollment status
      const shouldBeEnrolledInP2P = qualifyingTransactions.length > 0 || hasSystemeioP2PRecord;
      const p2pEnrollmentGap = shouldBeEnrolledInP2P && !hasP2PEnrollment;

      // Build response matching UI expectations
      const diagnosticData = {
        user: userProfile,
        ebookContact: ebookContactResult.data,
        transactions: transactionsResult.data || [],
        shopifyCustomers: shopifyCustomersResult.data || [],
        shopifyOrders: shopifyOrdersResult.data || [],
        enrollments: transformedEnrollments,
        attributionGaps: {
          unlinkedShopifyCustomers: unlinkedShopifyCustomers
        },
        // **NEW: P2P enrollment analysis**
        p2pEnrollmentAnalysis: {
          isEnrolledInP2P: hasP2PEnrollment,
          shouldBeEnrolledInP2P,
          hasEnrollmentGap: p2pEnrollmentGap,
          qualifyingTransactions: qualifyingTransactions.map(t => ({
            id: t.id,
            amount: t.amount,
            currency: t.currency,
            status: t.status,
            transaction_type: t.transaction_type,
            created_at: t.created_at,
            metadata: t.metadata
          })),
          hasSystemeioP2PRecord,
          canManuallyEnroll: true // Always allow manual enrollment regardless of existing records
        }
      };

      console.log('Diagnostic API Response:', {
        searchEmail,
        userFound: !!userProfile,
        transactionCount: diagnosticData.transactions.length,
        shopifyCustomerCount: diagnosticData.shopifyCustomers.length,
        enrollmentCount: diagnosticData.enrollments.length,
        unlinkedCount: unlinkedShopifyCustomers.length
      });

      return NextResponse.json(diagnosticData);

    } catch (dbError) {
      console.error('Database error in user diagnostic:', dbError);
      return NextResponse.json(
        { error: 'Database query failed', details: dbError },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in user diagnostic:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 