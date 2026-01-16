'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function ShopHero() {
    return (
        <div className="relative w-full bg-[#f9f6f2] border-b border-[#e7d9ce] overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-[-10%] w-[50%] h-[150%] bg-gradient-to-bl from-primary/5 via-transparent to-transparent rotate-12 blur-3xl opacity-60" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[120%] bg-gradient-to-tr from-secondary/5 via-transparent to-transparent -rotate-12 blur-3xl opacity-60" />
            </div>

            <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#5d4037] tracking-tight">
                            Curated Resources for Your <span className="text-primary italic">Journey</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                    >
                        Discover high-quality printables, guides, and tools designed to bring grace and ease to your home-based printing business.
                    </motion.p>
                </div>
            </div>
        </div>
    );
}
