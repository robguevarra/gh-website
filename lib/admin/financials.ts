import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export interface FinancialSummary {
    transactions: any[];
    shopifyOrders: any[];
    enrollments: any[];
    ecommerceOrders: any[];
    summary: {
        totalSpent: number;
        currency: string;
        lastPurchaseDate: string | null;
        totalOrders: number;
    }
}

/**
 * Fetches comprehensive financial history for a contact by email.
 * This aggregates data from:
 * 1. Transactions (Stripe/Systeme.io)
 * 2. Shopify Orders (External Store)
 * 3. Ecommerce Orders (Internal Store)
 * 4. Enrollments (Course Access)
 */
export async function getContactFinancials(email: string): Promise<FinancialSummary> {
    const adminClient = getAdminClient();
    const searchEmail = email.toLowerCase().trim();

    // Parallelize queries for performance
    const [
        transactionsResult,
        shopifyCustomerResult,
        shopifyOrdersResult,
        profileResult,
        ebookContactResult
    ] = await Promise.all([
        // 1. Transactions
        adminClient
            .from('transactions')
            .select('*')
            .eq('contact_email', searchEmail)
            .order('created_at', { ascending: false }),

        // 2. Shopify Customer (to link metadata if needed)
        adminClient
            .from('shopify_customers')
            .select('id, total_spent, orders_count')
            .eq('email', searchEmail)
            .maybeSingle(),

        // 3. Shopify Orders
        adminClient
            .from('shopify_orders')
            .select('*')
            .eq('email', searchEmail)
            .order('created_at', { ascending: false }),

        // 4. Unified Profile (needed for ID-based lookups like enrollments)
        adminClient
            .from('unified_profiles')
            .select('id')
            .eq('email', searchEmail)
            .maybeSingle(),

        // 5. Ebook Contacts (just in case we need to link Canva buyers)
        adminClient
            .from('ebook_contacts')
            .select('*')
            .eq('email', searchEmail)
            .maybeSingle()
    ]);

    let enrollments: any[] = [];
    let ecommerceOrders: any[] = [];

    // If we found a user profile, fetch ID-based records
    if (profileResult.data?.id) {
        const userId = profileResult.data.id;
        const [enrollmentRes, ecommerceRes] = await Promise.all([
            adminClient
                .from('enrollments')
                .select(`
                    *,
                    course:courses(id, title, slug, thumbnail_url)
                `)
                .eq('user_id', userId)
                .order('enrolled_at', { ascending: false }),

            adminClient
                .from('ecommerce_orders')
                .select(`
                    *,
                    items:ecommerce_order_items (
                        *,
                        product:shopify_products(title, featured_image_url)
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
        ]);

        if (enrollmentRes.data) enrollments = enrollmentRes.data;
        if (ecommerceRes.data) ecommerceOrders = ecommerceRes.data;
    }

    const transactions = transactionsResult.data || [];
    const shopifyOrders = shopifyOrdersResult.data || [];

    // Normalize Public Store Transactions into Ecommerce Orders
    // This ensures they appear in the "Licenses" tab and are counted in the total (since we exclude them from transaction sum)
    transactions.forEach(t => {
        if (t.transaction_type === 'PUBLIC_STORE_SALE' && t.status === 'paid') {
            const meta = t.metadata as any || {};
            const cartItems = meta.cartItems || [];

            // Map metadata items to match ecommerce_order_items structure
            const normalizedItems = cartItems.map((item: any, idx: number) => ({
                id: `tx-item-${t.id}-${idx}`,
                quantity: item.quantity || 1,
                price_at_purchase: item.price || 0,
                product: {
                    title: item.title || item.productTitle || 'Digital Product',
                    featured_image_url: item.image || item.imageUrl || null
                }
            }));

            // Only add if it doesn't already exist (deduplication check, though unlikely to overlap if guest)
            // We use the transaction ID as the order ID for these
            if (!ecommerceOrders.find(o => o.id === t.id)) {
                ecommerceOrders.push({
                    id: t.id,
                    created_at: t.created_at,
                    order_status: 'completed', // Map 'paid' to 'completed'
                    total_amount: t.amount,
                    items: normalizedItems,
                    payment_method: 'Public Store',
                    is_public_order: true // Flag for UI
                });
            }
        }
    });

    // Calculate Summary Stats
    // Note: This is a rough approximation mixing currencies potentially, 
    // but in this context most are PHP. A more robust solution would separate by currency.
    let totalSpent = 0;

    // Sum Transactions
    transactions.forEach(t => {
        // Exclude redundant transactions already counted in Orders tables
        const type = t.transaction_type?.toUpperCase();
        if (type === 'SHOPIFY_ECOM') return; // Covered by shopifyOrders
        if (type === 'PUBLIC_STORE_SALE') return; // Covered by ecommerceOrders
        if (type === 'PUBLIC_SALE') return; // Legacy/Redundant

        if (t.status === 'succeeded' || t.status === 'paid' || t.status === 'success') {
            totalSpent += Number(t.amount || 0);
        }
    });

    // Sum Shopify Orders
    shopifyOrders.forEach(o => {
        // Only count paid orders
        if (o.financial_status === 'paid' && o.cancelled_at === null) {
            totalSpent += Number(o.total_price || 0);
        }
    });

    // Sum Ecommerce Orders
    ecommerceOrders.forEach(o => {
        // Only count completed/paid orders
        const status = o.order_status?.toLowerCase();
        if (status === 'completed' || status === 'paid' || status === 'success') {
            totalSpent += Number(o.total_amount || 0);
        }
    });

    // Determine last purchase date
    const dates = [
        ...transactions.map(t => t.created_at),
        ...shopifyOrders.map(o => o.created_at),
        ...ecommerceOrders.map(o => o.created_at)
    ].filter(Boolean).map(d => new Date(d).getTime());

    const lastPurchaseDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    return {
        transactions,
        shopifyOrders,
        enrollments,
        ecommerceOrders,
        summary: {
            totalSpent,
            currency: 'PHP', // Default assumption for now
            lastPurchaseDate,
            totalOrders: transactions.length + shopifyOrders.length + ecommerceOrders.length
        }
    };
}
