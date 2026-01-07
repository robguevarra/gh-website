
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sbUrl || !sbKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(sbUrl, sbKey);

async function verify() {
    const targetProductId = '028575f5-c6d6-45e4-a9a1-1a376a7cc140'; // From previous log
    console.log(`Checking Product ID: ${targetProductId}`);

    const { data: product, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('id', targetProductId)
        .maybeSingle();

    if (error) console.error('Error:', error);
    console.log('Product Found:', product ? 'YES' : 'NO');
    if (product) console.log(product);

    // Also check if there are ANY shopify products
    const { count } = await supabase.from('shopify_products').select('*', { count: 'exact', head: true });
    console.log(`Total Shopify Products in DB: ${count}`);
}

verify();
