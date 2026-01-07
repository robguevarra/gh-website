
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function simulate() {
    const targetProductId = '028575f5-c6d6-45e4-a9a1-1a376a7cc140';
    const shopifyOrderId = '9566a39a-5128-4e7b-ad90-504609f15e00'; // Order #1490

    console.log(`Simulating sync for Order ID: ${shopifyOrderId}`);

    // 1. Fetch Items
    const { data: items, error: itemsError } = await supabase
        .from('shopify_order_items')
        .select('*')
        .eq('order_id', shopifyOrderId);

    if (itemsError) { console.error(itemsError); return; }
    console.log(`Found ${items.length} items.`);

    for (const item of items) {
        console.log(`\nProcessing Item: ${item.title}`);
        console.log(`  product_id: ${item.product_id} (${typeof item.product_id})`);
        console.log(`  shopify_product_id: ${item.shopify_product_id} (${typeof item.shopify_product_id})`);

        let product = null;

        // Logic from server action
        if (item.shopify_product_id) {
            console.log('  Checking by shopify_product_id...');
            const { data: p } = await supabase
                .from('shopify_products')
                .select('id, title')
                .eq('shopify_product_id', item.shopify_product_id)
                .maybeSingle();
            product = p;
        }

        if (!product && item.product_id) {
            console.log('  Checking by product_id (fallback)...');
            const { data: p, error } = await supabase
                .from('shopify_products')
                .select('id, title')
                .eq('id', item.product_id)
                .maybeSingle();
            if (error) console.log('  Error:', error);
            product = p;
        }

        console.log('  Product Found:', product ? product.title : 'NO MATCH');
    }
}
simulate();
