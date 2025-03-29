'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface UpdatePasswordFormProps {
  errorMessage?: string | null;
  redirectUrl?: string;
}

export function UpdatePasswordForm({ errorMessage, redirectUrl = '/auth/signin?updated=true' }: UpdatePasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, updatePassword } = useAuth();
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Update error state if errorMessage prop changes
  useEffect(() => {
    setError(errorMessage || null);
  }, [errorMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const supabase = createBrowserSupabaseClient();
      
      if (token && type === 'recovery') {
        // For recovery flow, verify the token and update password in one call
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        }, {
          emailRedirectTo: redirectUrl
        });
        
        if (updateError) {
          console.error('Error updating password:', updateError);
          // Handle specific error cases
          if (updateError.message.includes('Token has expired')) {
            setError('This password reset link has expired. Please request a new one.');
          } else if (updateError.message.includes('Token has been used')) {
            setError('This password reset link has already been used. Please request a new link.');
          } else if (updateError.message.includes('Invalid token')) {
            setError('Invalid password reset link. Please request a new one.');
          } else {
            setError(updateError.message || 'Failed to update password. Please try again.');
          }
          setIsLoading(false);
          return;
        }
      } else if (session) {
        // Session-based password update (user is logged in)
        const { error: updateError } = await updatePassword(password);
        
        if (updateError) {
          console.error('Error updating password with session:', updateError);
          setError(updateError.message || 'Failed to update password. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // No token and no session - should not happen in normal flow
        setError('Authentication error. Please request a new password reset link.');
        setIsLoading(false);
        return;
      }
      
      // Success path
      setIsSuccess(true);
      
      // Redirect after success animation
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1500);
    } catch (err) {
      console.error('Unexpected error during password update:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  // Animation variants
  const loadingBarVariants = {
    initial: { width: 0 },
    animate: { 
      width: "100%", 
      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

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
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#5d4037] font-medium">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || isSuccess}
              className="bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm" className="text-[#5d4037] font-medium">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              disabled={isLoading || isSuccess}
              className="bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
            />
          </div>
        </div>
        
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
                  Password Updated!
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
                    Updating Password...
                  </motion.span>
                </>
              ) : (
                'Update Password'
              )}
            </span>
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
} 