'use client';

import { useState, useEffect, Suspense } from 'react';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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

// Component that uses searchParams
function UpdatePasswordContent() {
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'expired' | 'used' | 'loading' | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get token and type from URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    // Handle token-based authentication if present in URL
    const handleTokenAuth = async () => {
      if (token && type === 'recovery') {
        try {
          setTokenStatus('loading');
          console.log('Processing recovery token from email link');
          const supabase = createBrowserSupabaseClient();
          
          // Verify the token
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (error) {
            console.error('Token verification error:', error);
            // Check for specific error messages
            if (error.message.includes('Token has expired')) {
              setTokenStatus('expired');
              setError('This password reset link has expired. Please request a new one.');
            } else if (error.message.includes('Token has been used')) {
              setTokenStatus('used');
              setError('This password reset link has already been used. If you need to reset your password again, please request a new link.');
            } else if (error.message.includes('Invalid token')) {
              setTokenStatus('invalid');
              setError('Invalid password reset link. Please request a new one.');
            } else {
              setTokenStatus('invalid');
              setError('Invalid or expired recovery link. Please request a new password reset.');
            }
          } else {
            setTokenStatus('valid');
          }
        } catch (err) {
          console.error('Unexpected error during token verification:', err);
          setTokenStatus('invalid');
          setError('An unexpected error occurred. Please try again.');
        }
      }
    };

    handleTokenAuth();
  }, [token, type]);

  return (
    <>
      {/* Show token used/expired errors as an alert above the form */}
      {(tokenStatus === 'used' || tokenStatus === 'expired' || tokenStatus === 'invalid') && (
        <motion.div
          variants={fadeIn}
          className="w-full"
        >
          <Alert variant="destructive" className="bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <motion.div 
            className="mt-4 text-center" 
            variants={fadeIn}
          >
            <Link href="/auth/reset-password" 
              className="text-brand-purple font-medium hover:underline text-sm"
            >
              Request a new password reset link
            </Link>
          </motion.div>
        </motion.div>
      )}
      
      {/* Show the form only if token is valid or there's no token */}
      {(tokenStatus === 'valid' || tokenStatus === 'loading' || (!token && !tokenStatus)) && (
        <motion.div variants={fadeIn}>
          <UpdatePasswordForm errorMessage={error} />
        </motion.div>
      )}
    </>
  );
}

export default function UpdatePasswordPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                "Graceful Homeschooling has transformed our approach to education.
                We've found resources tailored to our family's unique journey."
              </p>
              <footer className="text-sm">Melissa Roberts</footer>
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
                Update your password
              </h1>
              <p className="text-sm text-[#6d4c41]">
                Create a new secure password for your account
              </p>
              <motion.div 
                className="mx-auto h-1 w-12 bg-gradient-to-r from-brand-purple to-brand-pink rounded-full mt-2"
                initial={{ width: 0 }}
                animate={{ width: '3rem' }}
                transition={{ duration: 1, delay: 1 }}
              />
            </motion.div>
            
            <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
              <UpdatePasswordContent />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 