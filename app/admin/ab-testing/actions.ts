'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Snapshots the current A/B test statistics and resets the test start date.
 * This effectively "archives" the current test run and starts a new one.
 */
export async function snapshotAndResetStats(description: string) {
    const supabase = getAdminClient();

    try {
        // 1. Get current stats using the RPC function (same as dashboard)
        const { data: statsData, error: statsError } = await supabase.rpc('get_ab_test_stats');

        if (statsError) {
            console.error('Snapshot failed: Error fetching stats', statsError);
            return { success: false, error: 'Failed to fetch current stats for snapshot.' };
        }

        // 2. Insert into history
        const { error: insertError } = await supabase
            .from('ab_test_history')
            .insert({
                description,
                stats: statsData, // Save the full JSON result
                // snapshot_date defaults to now()
                // created_by auto-filled if triggers exist, but here we are in admin context.
                // If we need created_by, we'd need getUser(), but this is an admin action.
            });

        if (insertError) {
            console.error('Snapshot failed: Error inserting history', insertError);
            return { success: false, error: 'Failed to save snapshot to history.' };
        }

        // 3. Update the start date to NOW()
        const { error: updateError } = await supabase
            .from('ab_test_config')
            .upsert({
                key: 'current_test_start_date',
                value: { start_date: new Date().toISOString() },
                updated_at: new Date().toISOString()
            });

        if (updateError) {
            console.error('Reset failed: Error updating start date', updateError);
            return { success: false, error: 'Failed to reset test start date.' };
        }

        // 4. Revalidate the dashboard page
        revalidatePath('/admin/ab-testing');

        return { success: true };
    } catch (e) {
        console.error('Unexpected error during snapshot/reset:', e);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
