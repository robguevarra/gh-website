'use client';

import { AdventCalendar } from '@/components/advent/AdventCalendar';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Snowfall } from '@/components/advent/Snowfall';

export default function AdventPage() {
    return (
        <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
            <PublicHeader />
            <main className="flex-1 relative overflow-hidden">
                {/* Hero Section */}
                <section className="relative bg-[#f9f6f2] pt-32 pb-20 px-4 text-center overflow-hidden">
                    {/* Background Elements */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        {/* Subtle snowfall effect can be added here or via a separate component if desired. 
                             For now, keeping it clean with the site's texture feel. */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10" />
                    </div>
                    <Snowfall />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="relative z-10 max-w-4xl mx-auto"
                    >
                        <span className="inline-block py-1.5 px-4 rounded-full bg-brand-purple/10 text-brand-purple font-medium text-sm tracking-widest mb-6 border border-brand-purple/20">
                            LIMITED TIME EVENT
                        </span>
                        <h1 className="text-5xl md:text-7xl font-serif text-[#5d4037] mb-6 leading-tight">
                            12 Days of Christmas
                        </h1>
                        <p className="text-xl text-[#6d4c41] max-w-2xl mx-auto font-light leading-relaxed">
                            Discover a new special gift every day. Exclusive resources to help you with your paper products business journey.
                        </p>
                    </motion.div>
                </section>

                {/* Calendar Section */}
                <section className="relative z-20 pb-32">
                    <AdventCalendar />
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
