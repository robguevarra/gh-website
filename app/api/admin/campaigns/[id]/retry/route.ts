
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess, handleServerError, handleNotFound } from '@/lib/supabase/route-handler';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await params;
    console.log(`[RETRY] Starting retry process for campaign ${campaignId}`);

    try {
        const validation = await validateAdminAccess();
        if ('error' in validation) {
            console.warn(`[RETRY] Admin access validation failed for campaign ${campaignId}`);
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const adminClient = getAdminClient();

        // 1. Reset 'failed' jobs to 'pending'
        const { data: updatedJobs, error: updateError } = await adminClient
            .from('email_jobs')
            .update({
                status: 'pending',
                error_message: null,
                // We might want to increment retry_count, or just leave it. 
                // If we want to track how many times we manually retried, we could add a manual_retry_count column, 
                // but typically 'retry_count' tracks automatic retries. 
                // Let's reset created_at to now to ensure FIFO pick up if sorting by created_at.
                updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaignId)
            .eq('status', 'failed')
            .select('id');

        if (updateError) {
            throw updateError;
        }

        const retriedCount = updatedJobs?.length || 0;
        console.log(`[RETRY] Reset ${retriedCount} failed jobs for campaign ${campaignId}`);

        if (retriedCount > 0) {
            // 2. Trigger Worker (Fire and Forget)
            adminClient.functions.invoke('email-worker', { body: { type: 'process_queue' } }).catch(e => console.error(e));
        }

        return NextResponse.json({
            success: true,
            retried: retriedCount,
            message: `Successfully queued ${retriedCount} failed jobs for retry`
        });

    } catch (error: any) {
        console.error(`[RETRY] Unhandled error:`, error);
        return handleServerError(error, 'Failed to retry campaign');
    }
}
