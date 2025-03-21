'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };
  
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f9f6f2] overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute right-0 top-1/4 w-96 h-96 rounded-full bg-brand-blue/20 blur-3xl opacity-60"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        <motion.div 
          className="absolute left-1/4 bottom-1/4 w-64 h-64 rounded-full bg-brand-pink/20 blur-3xl opacity-40"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      </div>
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23b08ba5' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-10v-10h-4v10h-10v4h10v10h4v-10h10zM40 0H0v40h40V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 z-10">
        <motion.div 
          className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex overflow-hidden"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#b08ba5] to-[#9ac5d9]" />
          
          {/* Decorative mesh gradient */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" className="absolute inset-0">
              <filter id='noiseFilter'>
                <feTurbulence type="fractalNoise" baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/>
              </filter>
              <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
            </svg>
          </div>

          <div className="relative z-20 flex items-center text-lg font-medium">
            <Logo size="small" />
          </div>
          
          <motion.div 
            className="relative z-20 mt-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <blockquote className="space-y-2">
              <p className="text-lg">
                "Graceful Homeschooling gives me the confidence to guide my children's education journey with wisdom and patience."
              </p>
              <footer className="text-sm">Jennifer Williams</footer>
            </blockquote>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="flex h-full w-full items-center justify-center lg:p-8"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="mx-auto w-full max-w-sm space-y-6">
            <motion.div variants={fadeIn} className="flex flex-col space-y-2 text-center">
              <h1 className="text-3xl font-serif font-semibold tracking-tight text-[#5d4037]">
                Reset your password
              </h1>
              <p className="text-sm text-[#6d4c41]">
                Enter your email address and we'll send you a link to reset your password
              </p>
              <motion.div 
                className="mx-auto h-1 w-12 bg-gradient-to-r from-brand-purple to-brand-pink rounded-full mt-2"
                initial={{ width: 0 }}
                animate={{ width: '3rem' }}
                transition={{ duration: 1, delay: 1 }}
              />
            </motion.div>
            
            <motion.div variants={fadeIn}>
              <ResetPasswordForm showHeader={false} />
            </motion.div>
            
            <motion.div variants={fadeIn} className="text-center text-sm text-[#6d4c41]">
              <Link href="/auth/signin" className="text-brand-purple font-medium hover:underline">
                Back to sign in
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 