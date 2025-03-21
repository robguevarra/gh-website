'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export interface SignInFormProps {
  redirectUrl?: string;
}

export function SignInForm({ redirectUrl = '/dashboard' }: SignInFormProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }
      
      // Show success state before redirect
      setIsSuccess(true);
      
      // Redirect after a short delay to show success animation
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1200);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
      setIsLoading(false);
    }
  }

  const inputVariants = {
    focus: { scale: 1.02, borderColor: '#b08ba5' },
    blur: { scale: 1, borderColor: '#e2e8f0' }
  };

  // Loading animation variants
  const loadingBarVariants = {
    initial: { width: 0 },
    animate: { 
      width: "100%", 
      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  // Success animation variants
  const successVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      transition: { 
        duration: 0.5, 
        ease: "easeOut" 
      } 
    }
  };

  return (
    <motion.div 
      className="w-full space-y-6 rounded-2xl border border-[#e7d9ce] bg-white/80 backdrop-blur-sm p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive" className="bg-red-50 text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div className="space-y-2">
          <Label htmlFor="email" className="text-[#5d4037] font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#b08ba5]" />
            <motion.div
              whileFocus="focus"
              whileTap="focus"
              variants={inputVariants}
            >
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isSuccess}
                className="pl-10 bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
              />
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[#5d4037] font-medium">Password</Label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/auth/reset-password" 
                className="text-xs text-brand-purple hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </motion.div>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#b08ba5]" />
            <motion.div
              whileFocus="focus"
              whileTap="focus"
              variants={inputVariants}
            >
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isSuccess}
                className="pl-10 bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
              />
            </motion.div>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={!isLoading && !isSuccess ? { scale: 1.03 } : {}} 
          whileTap={!isLoading && !isSuccess ? { scale: 0.97 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="relative"
        >
          <Button 
            type="submit" 
            className={`w-full h-11 relative overflow-hidden group ${isSuccess ? 'bg-green-500' : ''}`}
            disabled={isLoading || isSuccess}
          >
            {/* Background gradient */}
            <span className={`absolute inset-0 w-full h-full transition-all duration-500 ${isSuccess ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105'}`}></span>
            
            {/* Hover effect */}
            {!isSuccess && (
              <span className="absolute inset-0 w-full h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            )}
            
            {/* Loading progress bar */}
            {isLoading && (
              <motion.span
                className="absolute bottom-0 left-0 h-1 bg-white/70"
                variants={loadingBarVariants}
                initial="initial"
                animate="animate"
              />
            )}
            
            {/* Button content */}
            <span className="relative flex items-center justify-center gap-2 z-10 text-white font-medium">
              {isSuccess ? (
                <motion.div 
                  className="flex items-center justify-center"
                  variants={successVariants}
                  initial="initial"
                  animate="animate"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Success!
                </motion.div>
              ) : isLoading ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    Signing in...
                  </motion.span>
                </>
              ) : (
                'Sign In'
              )}
            </span>
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
} 