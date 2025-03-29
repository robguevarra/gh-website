'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
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
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      const { error: resetError } = await resetPassword(email);
      
      if (resetError) {
        setError(resetError.message);
        return;
      }
      
      setIsSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      {showHeader && (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-serif text-foreground">Reset Your Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>
      )}
      
      {isSuccess ? (
        <div className="space-y-4">
          <Alert className="bg-primary/10 border-primary">
            <AlertDescription>
              Password reset link sent! Please check your email for instructions to reset your password.
            </AlertDescription>
          </Alert>
        </div>
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