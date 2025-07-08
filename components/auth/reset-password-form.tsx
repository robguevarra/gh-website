'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ResetPasswordFormProps {
  showHeader?: boolean;
}

export function ResetPasswordForm({ showHeader = true }: ResetPasswordFormProps) {
  const { resetPassword } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [directSetup, setDirectSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call our custom API endpoint instead of Supabase's resetPassword
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          // Include device information for security tracking
          requestOrigin: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to send reset link. Please try again.');
        return;
      }
      
      // Check if user needs direct password setup
      if (result.directSetup) {
        console.log('[ResetPasswordForm] Direct setup required for user');
        setDirectSetup(true);
        setEmail(result.email || email); // Use the normalized email from response
        return;
      }
      
      setIsSuccess(true);
      
      // Log analytics event (if you have analytics)
      try {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          // @ts-ignore
          window.gtag('event', 'password_reset_requested', {
            email_domain: email.split('@')[1]
          });
        }
      } catch (analyticsError) {
        console.error('Analytics error:', analyticsError);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password reset request error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordSetup(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    
    // Validate password
    if (!password) {
      setPasswordError('Please enter a password');
      return;
    }
    
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (!confirmPassword) {
      setPasswordError('Please confirm your password');
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setPasswordError(result.error || 'Failed to create password. Please try again.');
        return;
      }
      
      console.log('[ResetPasswordForm] Password setup completed successfully');
      setIsSuccess(true);
      
      // Redirect to signin page after a short delay
      setTimeout(() => {
        router.push(`/auth/signin?email=${encodeURIComponent(email)}&message=${encodeURIComponent('Welcome to our new platform! Your account is now ready. Please sign in to explore all the exciting features we\'ve prepared for you.')}`);
      }, 2000);
      
    } catch (err) {
      setPasswordError('An unexpected error occurred. Please try again.');
      console.error('Password setup error:', err);
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      {showHeader && (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-serif text-foreground">
            {directSetup ? 'Welcome to Our New Site!' : 'Reset Your Password'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {directSetup 
              ? 'We\'ve detected your account as an existing user from our previous platform. To ensure the best experience on our updated site, please set up your password below so you can access all the new features we\'ve prepared for you!'
              : 'Enter your email and we\'ll send you a link to reset your password'
            }
          </p>
        </div>
      )}
      
      {isSuccess ? (
        <div className="space-y-4">
          <Alert className="bg-primary/10 border-primary">
            <AlertDescription>
              {directSetup 
                ? 'Perfect! Your account is now set up and ready to go. Redirecting you to sign in so you can explore all the exciting new features...'
                : 'Password reset link sent! Please check your email for instructions to reset your password.'
              }
            </AlertDescription>
          </Alert>
        </div>
      ) : directSetup ? (
        <form onSubmit={handlePasswordSetup} className="space-y-4">
          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email-display">Email</Label>
            <Input
              id="email-display"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmittingPassword}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmittingPassword}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Re-enter the same password to confirm
            </p>
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmittingPassword}>
            {isSubmittingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating password...
              </>
            ) : (
              'Create Password'
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        
        </form>
      )}
    </div>
  );
} 