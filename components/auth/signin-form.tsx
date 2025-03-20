'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
        return;
      }
      
      // Redirect after successful login
      router.push(redirectUrl);
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
                  Signing in...
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