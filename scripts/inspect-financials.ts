
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectFinancials(email: string) {
    console.log(`Inspecting financials for: ${email}`);

    // 1. Transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, status, transaction_type, created_at, metadata')
        .eq('contact_email', email);

    // DEBUG: Fetch ANY 5 transactions to verify DB connection
    const { data: anyTxns, error: anyError } = await supabase.from('transactions').select('id, contact_email').limit(5);
    console.log('DEBUG: Any 5 transactions in DB:', anyTxns);
    if (anyError) console.error('DEBUG Error:', anyError);

    console.log('\n--- TRANSACTIONS ---');
    let txnTotal = 0;
    transactions?.forEach(t => {
        console.log(`[${t.status}] ${t.transaction_type} - ${t.amount} (ID: ${t.id})`);
        if (['paid', 'succeeded', 'success'].includes(t.status)) {
            txnTotal += t.amount || 0;
        }
    });
    console.log(`Calculated Transaction Total (Paid): ${txnTotal}`);

    // 2. Ecommerce Orders
    // First get user ID from profiles
    const { data: profile } = await supabase
        .from('unified_profiles')
        .select('id')
        .eq('email', email)
        .single();

    let ecommerceTotal = 0;
    if (profile) {
        const { data: ecommerceOrders } = await supabase
            .from('ecommerce_orders')
            .select('id, total_amount, order_status, created_at')
            .eq('user_id', profile.id);

        console.log('\n--- ECOMMERCE ORDERS ---');
        ecommerceOrders?.forEach(o => {
            console.log(`[${o.order_status}] ${o.total_amount} (ID: ${o.id})`);
            const status = o.order_status?.toLowerCase();
            if (status === 'completed' || status === 'paid' || status === 'success') {
                ecommerceTotal += o.total_amount || 0;
            }
        });
    }
    console.log(`Calculated Ecommerce Total (Paid): ${ecommerceTotal}`);

    // 3. Shopify Orders
    const { data: shopifyOrders } = await supabase
        .from('shopify_orders')
        .select('id, total_price, financial_status, cancelled_at')
        .eq('email', email);

    console.log('\n--- SHOPIFY ORDERS ---');
    let shopifyTotal = 0;
    shopifyOrders?.forEach(o => {
        console.log(`[${o.financial_status}] ${o.total_price} (Cancelled: ${o.cancelled_at})`);
        if (o.financial_status === 'paid' && !o.cancelled_at) {
            shopifyTotal += Number(o.total_price);
        }
    });

    console.log(`Calculated Shopify Total (Paid): ${shopifyTotal}`);

    console.log('\n--- GRAND TOTALS ---');
    console.log(`Simple Sum: ${txnTotal + ecommerceTotal + shopifyTotal}`);
}

inspectFinancials('robneil@gmail.com');
