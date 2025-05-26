'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface UpdatePasswordFormProps {
  errorMessage?: string | null;
  redirectUrl?: string;
  email?: string;
  token?: string;
  isMagicLink?: boolean;
}

export function UpdatePasswordForm({ 
  errorMessage, 
  redirectUrl = '/auth/signin?updated=true', 
  email,
  token,
  isMagicLink
}: UpdatePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Listen for auth state changes and log token for debugging
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    
    // Log the token if it exists
    if (token) {
      console.log('[UpdatePasswordForm] Received token (truncated):', token.substring(0, 10) + '...');
      console.log('[UpdatePasswordForm] Using magic link flow:', isMagicLink);
      console.log('[UpdatePasswordForm] Email from props:', email);
    } else {
      console.warn('[UpdatePasswordForm] No token provided');
    }
    
    // Setup listener for PASSWORD_RECOVERY event for debugging
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[UpdatePasswordForm] Auth event:', event, session);
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [token, email, isMagicLink]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Password validation
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    // Password strength checks
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLowercase || !hasUppercase || !hasNumber) {
      setError('Password must include at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    console.time('password-update-total');
    
    try {
      // Determine which flow to use: magic link or standard Supabase
      // Always check if we have a valid token first
      if (!token) {
        console.error('[UpdatePasswordForm] No token provided but isMagicLink is true');
        setError('No password reset token provided. Please request a new password reset link.');
        setIsLoading(false);
        return;
      }
      
      if (isMagicLink) {
        // Custom magic link flow - call our API
        console.log('[UpdatePasswordForm] Using custom magic link flow for password reset');
        console.log('[UpdatePasswordForm] Token (truncated):', token.substring(0, 10) + '...');
        const response = await fetch('/api/auth/password-reset/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            password,
            email: email || '',
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          console.error('Error updating password via magic link:', result.error);
          setError(result.error || 'Failed to update password. Please try again.');
          setIsLoading(false);
          console.timeEnd('password-update-total');
          return;
        }
        
        // Success path for magic link flow
        setIsSuccess(true);
        
        // Redirect after success animation
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1000);
      } else {
        // Standard Supabase flow
        console.log('Using standard Supabase flow for password reset');
        const supabase = createBrowserSupabaseClient();
        
        // Update the password
        console.time('supabase-update-user');
        const { data, error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        console.timeEnd('supabase-update-user');
        
        if (updateError) {
          console.error('Error updating password:', updateError);
          setError(updateError.message || 'Failed to update password. Please try again.');
          setIsLoading(false);
          console.timeEnd('password-update-total');
          return;
        }

        if (data) {
          // Success path
          setIsSuccess(true);
          
          // Sign out after success to ensure clean state
          console.time('supabase-sign-out');
          try {
            await supabase.auth.signOut();
            console.log('[UpdatePasswordForm] Successfully signed out after password update');
          } catch (signOutError) {
            console.error('[UpdatePasswordForm] Error signing out:', signOutError);
            // Continue with the flow even if sign out fails
          }
          console.timeEnd('supabase-sign-out');
          
          // Redirect after success animation
          setTimeout(() => {
            router.push(redirectUrl);
          }, 1000);
        }
      }
      
      // Log analytics event
      try {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          // @ts-ignore
          window.gtag('event', 'password_reset_completed', {
            method: isMagicLink ? 'magic_link' : 'supabase_flow'
          });
        }
      } catch (analyticsError) {
        console.error('Analytics error:', analyticsError);
      }
      
      console.timeEnd('password-update-total');
    } catch (err) {
      console.error('Unexpected error during password update:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
      console.timeEnd('password-update-total');
    }
  }

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
        
        {/* Email indicator when provided */}
        {email && (
          <motion.div 
            className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-blue-100 rounded-full p-1">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <span className="font-medium">Setting password for: </span> 
              {email}
            </div>
          </motion.div>
        )}

        {/* Password requirements */}
        <div className="space-y-1">
          <p className="text-xs text-[#6d4c41] mb-1">Your password must have:</p>
          <ul className="text-xs text-[#6d4c41] list-disc pl-5 space-y-0.5">
            <li>At least 8 characters</li>
            <li>At least 1 uppercase letter (A-Z)</li>
            <li>At least 1 lowercase letter (a-z)</li>
            <li>At least 1 number (0-9)</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#5d4037] font-medium">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || isSuccess}
              className="bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm" className="text-[#5d4037] font-medium">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              disabled={isLoading || isSuccess}
              className="bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className={`w-full h-11 relative overflow-hidden group ${isSuccess ? 'bg-green-500' : ''}`}
          disabled={isLoading || isSuccess}
        >
          <span className={`absolute inset-0 w-full h-full transition-all duration-500 ${isSuccess ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105'}`}></span>
          
          <span className="relative flex items-center justify-center gap-2 z-10 text-white font-medium">
            {isSuccess ? (
              <motion.div 
                className="flex items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
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
      
      </form>
    </motion.div>
  );
} 