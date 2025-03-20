'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface SignUpFormProps {
  redirectUrl?: string;
}

export function SignUpForm({ redirectUrl = '/dashboard' }: SignUpFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      const { error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      
      setIsSuccess(true);
      
      // Redirect after signup is processed
      // Note: User will need to verify email before accessing protected routes
      setTimeout(() => {
        router.push(redirectUrl);
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const inputVariants = {
    focus: { scale: 1.02, borderColor: '#b08ba5' },
    blur: { scale: 1, borderColor: '#e2e8f0' }
  };

  return (
    <motion.div 
      className="w-full space-y-6 rounded-2xl border border-[#e7d9ce] bg-white/80 backdrop-blur-sm p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <Alert className="bg-brand-purple/10 border-brand-purple text-brand-purple flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-brand-purple" />
            <AlertDescription className="text-brand-purple font-medium">
              Success! Please check your email to verify your account.
            </AlertDescription>
          </Alert>
          <motion.div 
            className="mt-6 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative w-16 h-16">
              <motion.div 
                className="absolute inset-0 rounded-full bg-brand-purple/20"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              >
                <CheckCircle2 className="h-8 w-8 text-brand-purple" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive" className="bg-red-50 text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          
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
                  disabled={isLoading}
                  className="pl-10 bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
                />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div className="space-y-2">
            <Label htmlFor="password" className="text-[#5d4037] font-medium">Password</Label>
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
                  disabled={isLoading}
                  className="pl-10 bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
                />
              </motion.div>
            </div>
            <div className="mt-1">
              <div className="w-full bg-[#e7d9ce]/50 h-1 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brand-purple to-brand-pink"
                  initial={{ width: "0%" }}
                  animate={{ width: password.length < 1 ? "0%" : password.length < 6 ? "33%" : password.length < 10 ? "66%" : "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
          
          <motion.div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[#5d4037] font-medium">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#b08ba5]" />
              <motion.div
                whileFocus="focus"
                whileTap="focus"
                variants={inputVariants}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 bg-white/80 border-[#e7d9ce] focus:border-brand-purple focus:ring-brand-purple/20 transition-all duration-300"
                />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Button 
              type="submit" 
              className="w-full h-11 relative overflow-hidden group"
              disabled={isLoading}
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105 transition-transform duration-500"></span>
              <span className="absolute inset-0 w-full h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
              <span className="relative flex items-center justify-center gap-2 z-10 text-white font-medium">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </span>
            </Button>
          </motion.div>
          
          <motion.p 
            className="text-center text-xs text-[#6d4c41]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-brand-purple hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-brand-purple hover:underline">
              Privacy Policy
            </a>
          </motion.p>
        </form>
      )}
    </motion.div>
  );
} 