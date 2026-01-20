
import { recalculateCampaignAnalytics } from '@/lib/supabase/data-access/campaign-management';

const campaignId = '35563d02-2be2-42c5-8be2-2a6fbe60810c';

async function main() {
    console.log('Starting manual recalculation for:', campaignId);
    try {
        const result = await recalculateCampaignAnalytics(campaignId);
        console.log('SUCCESS:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('ERROR:', err);
    }
}

main();
