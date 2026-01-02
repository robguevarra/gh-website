import { redirect } from 'next/navigation';
import { ADVENT_DAYS, getAdventDayStatus } from '@/lib/advent-config';
import { getAdventProductByHandle } from '@/app/actions/store-actions';
import { AdventDayView } from '@/components/advent/AdventDayView';
import { Gift } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdventDayPage({ params }: { params: Promise<{ day: string }> }) {
    const resolvedParams = await params;
    const dayNumber = parseInt(resolvedParams.day, 10);

    // 1. Find the Day Config
    const config = ADVENT_DAYS.find(d => d.day === dayNumber);

    if (!config) {
        redirect('/advent');
    }

    // 2. Check Status
    const status = getAdventDayStatus(config);
    if (status === 'locked') {
        redirect('/advent');
    }

    // 3. Fetch Product
    const product = await getAdventProductByHandle(config.shopifyHandle);

    if (!product) {
        return (
            <div className="min-h-screen bg-[#f9f6f2] flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-serif text-[#5d4037] mb-2">Oops!</h1>
                    <p className="text-slate-600 mb-6">Product not found for Day {dayNumber}.</p>
                    <Link href="/advent">
                        <Button variant="outline">Back to Calendar</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AdventDayView
            dayNumber={dayNumber}
            dayConfig={config}
            product={product}
        />
    );
}
