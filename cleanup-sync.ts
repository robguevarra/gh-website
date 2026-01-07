
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup() {
    console.log('Cleaning up incomplete syncs...');

    // 1. Find the transaction for Order 1490
    const shopifyOrderId = '9566a39a-5128-4e7b-ad90-504609f15e00'; // ID for 1490

    const { data: txs } = await supabase
        .from('transactions')
        .select('id, external_id')
        .eq('external_id', shopifyOrderId); // This matches referencing logic

    if (txs && txs.length > 0) {
        console.log(`Found ${txs.length} blocking transactions for 1490.`);
        for (const tx of txs) {
            // Delete related ecommerce orders first
            const { error: ecoErr } = await supabase.from('ecommerce_orders').delete().eq('transaction_id', tx.id);
            if (ecoErr) console.error('Error deleting eco order:', ecoErr);
            else console.log(`Deleted eco orders for tx ${tx.id}`);

            // Delete transaction
            const { error: txErr } = await supabase.from('transactions').delete().eq('id', tx.id);
            if (txErr) console.error('Error deleting tx:', txErr);
            else console.log(`Deleted transaction ${tx.id}`);
        }
    } else {
        console.log('No blocking transactions found for 1490.');
    }

    // Check 1227 too if possible, but 1490 is the one user showed
}

cleanup();
