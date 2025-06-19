'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignInForm } from '@/components/auth/signin-form';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

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

function SignInContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const [showPasswordUpdatedAlert, setShowPasswordUpdatedAlert] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if redirected after password update
    const updated = searchParams.get('updated');
    if (updated === 'true') {
      setShowPasswordUpdatedAlert(true);
      
      // Auto-hide the alert after 5 seconds
      const timer = setTimeout(() => {
        setShowPasswordUpdatedAlert(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }
  
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
        <motion.div 
          className="absolute right-1/3 top-1/2 w-36 h-36 rounded-full bg-brand-purple/30 blur-2xl opacity-50"
          animate={{
            y: [0, 15, 0],
            x: [0, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
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

          {/* Floating paper elements */}
          <motion.div 
            className="absolute w-20 h-28 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
            style={{ top: '15%', left: '20%', rotate: '-10deg' }}
            animate={{ y: [0, -10, 0], rotate: ['-10deg', '-5deg', '-10deg'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute w-24 h-32 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
            style={{ bottom: '20%', right: '15%', rotate: '12deg' }}
            animate={{ y: [0, 15, 0], rotate: ['12deg', '8deg', '12deg'] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          
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
                "Graceful Homeschooling has transformed our approach to education.
                The resources and community have been invaluable on our journey."
              </p>
              <footer className="text-sm">Sarah Johnson</footer>
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
                Welcome back
              </h1>
              <p className="text-sm text-[#6d4c41]">
                Enter your credentials to sign in to your account
              </p>
              <motion.div 
                className="mx-auto h-1 w-12 bg-gradient-to-r from-brand-purple to-brand-pink rounded-full mt-2"
                initial={{ width: 0 }}
                animate={{ width: '3rem' }}
                transition={{ duration: 1, delay: 1 }}
              />
            </motion.div>
            
            {/* Password Updated Success Alert */}
            {showPasswordUpdatedAlert && (
              <motion.div 
                variants={fadeIn}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert className="bg-green-50 text-green-800 border border-green-200">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  <AlertDescription>
                    Password successfully updated! Please sign in with your new password.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
            
            <motion.div variants={fadeIn}>
              <SignInForm />
            </motion.div>
            
            <motion.div variants={fadeIn} className="text-center text-sm text-[#6d4c41]">
              Don't have an account?{' '}
              <Link href="/papers-to-profits" className="text-brand-purple font-medium hover:underline">
                Sign up
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
} 