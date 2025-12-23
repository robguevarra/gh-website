import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdventDay, ADVENT_DAYS, getAdventDayStatus, AdventDayStatus } from '@/lib/advent-config';
import { AdventDayCard } from './AdventDayCard';
import { AdventProductModal } from './AdventProductModal'; // Note: This is now unused and should be removed, but keeping import for now if not deleted
import { useAdventProgress } from '@/lib/hooks/use-advent-progress';
import { getAdventProducts } from '@/app/actions/store-actions';
import { ProductData } from '@/lib/stores/student-dashboard';

export function AdventCalendar() {
    // const [mounted, setMounted] = useState(false); // Helper moved to hook
    const { openedDays, markAsOpened, mounted } = useAdventProgress();
    const [selectedDay, setSelectedDay] = useState<AdventDay | null>(null);
    const [products, setProducts] = useState<Record<string, ProductData>>({});
    const [productsLoading, setProductsLoading] = useState(false);

    // Bulk fetch products on mount
    useEffect(() => {
        const fetchProducts = async () => {
            setProductsLoading(true);
            const handles = ADVENT_DAYS.map(d => d.shopifyHandle).filter(Boolean);
            if (handles.length > 0) {
                const fetchedProducts = await getAdventProducts(handles);
                const productMap: Record<string, ProductData> = {};
                fetchedProducts.forEach(p => {
                    if (p.handle) productMap[p.handle] = p;
                });
                setProducts(productMap);
            }
            setProductsLoading(false);
        };

        fetchProducts();
    }, []);

    const handleDayClick = (day: AdventDay) => {
        // Navigation is handled by Link in Card now, this might be unused unless we revert
        // But for "locked" days usually we show a toast or shake
        setSelectedDay(day);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (!mounted) return null; // Or a loading skeleton

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
                {ADVENT_DAYS.map((dayConfig) => {
                    let status = getAdventDayStatus(dayConfig);

                    // If it's available (past) OR today, we treat it as opened/revealable
                    if (status === 'available') {
                        status = 'opened';
                    } else if (status === 'today' && openedDays.includes(dayConfig.day)) {
                        // Today is only opened if specifically clicked/marked
                        status = 'opened';
                    }

                    return (
                        <motion.div key={dayConfig.day} variants={item}>
                            <AdventDayCard
                                dayConfig={dayConfig}
                                status={status}
                                onClick={handleDayClick}
                                preloadedProduct={products[dayConfig.shopifyHandle]}
                                isLoading={productsLoading}
                            />
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Modal removed intentionally as per migration plan */}
        </div>
    );
}
