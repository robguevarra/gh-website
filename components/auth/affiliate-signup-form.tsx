'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, MailWarning } from 'lucide-react'; // Added MailWarning
import Link from 'next/link'; // Added Link

interface ApiErrorResponse {
  error: string;
  issues?: {
    _errors?: string[];
    email?: { _errors: string[] };
    password?: { _errors: string[] };
    preferred_slug?: { _errors: string[] };
    terms_agreed?: { _errors: string[] };
  };
}

export function AffiliateSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredSlug, setPreferredSlug] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiErrorResponse['issues'] | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state for resend email functionality
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendEmailError, setResendEmailError] = useState<string | null>(null);
  const [resendEmailSuccessMessage, setResendEmailSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors(null);
    setSuccessMessage(null);
    setResendEmailError(null); // Clear resend errors on new signup attempt
    setResendEmailSuccessMessage(null); // Clear resend success on new signup attempt

    if (!termsAgreed) {
      setFieldErrors({ terms_agreed: { _errors: ['You must agree to the terms and conditions.'] } });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/affiliate/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          preferred_slug: preferredSlug || undefined, // Send undefined if empty
          terms_agreed: termsAgreed,
        }),
      });

      const data: ApiErrorResponse | { message: string } = await response.json();

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        setError(errorData.error || 'An unknown error occurred.');
        if (errorData.issues) {
          setFieldErrors(errorData.issues);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      setSuccessMessage((data as { message: string }).message);
      // Optionally redirect or clear form here
      // router.push('/auth/signin?signup=success'); // Example redirect
      setEmail('');
      setPassword('');
      setPreferredSlug('');
      setTermsAgreed(false);

    } catch (err: any) {
      console.error('Signup failed:', err);
      if (!error && !fieldErrors) { // Set general error if not already set by API response
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmationEmail = async () => {
    if (!email) {
      setResendEmailError('Please enter your email address in the form above to resend the confirmation.');
      return;
    }
    setIsResendingEmail(true);
    setResendEmailError(null);
    setResendEmailSuccessMessage(null);
    setError(null); // Clear main form errors
    setSuccessMessage(null); // Clear main form success

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendEmailError(data.error || 'Failed to resend confirmation email.');
      } else {
        setResendEmailSuccessMessage(data.message || 'Confirmation email resent successfully. Please check your inbox.');
      }
    } catch (err) {
      console.error('Resend confirmation email fetch error:', err);
      setResendEmailError('Failed to connect to the server. Please try again later.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const getFieldError = (fieldName: keyof NonNullable<ApiErrorResponse['issues']>) => {
    return fieldErrors?.[fieldName]?._errors?.[0];
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="default" className="bg-green-50 border-green-200 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={getFieldError('email') ? 'border-red-500' : ''}
        />
        {getFieldError('email') && <p className="text-xs text-red-600 mt-1">{getFieldError('email')}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={getFieldError('password') ? 'border-red-500' : ''}
        />
        {getFieldError('password') && <p className="text-xs text-red-600 mt-1">{getFieldError('password')}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredSlug">Preferred Referral Slug (Optional)</Label>
        <Input
          id="preferredSlug"
          name="preferredSlug"
          type="text"
          value={preferredSlug}
          onChange={(e) => setPreferredSlug(e.target.value)}
          placeholder="e.g., yourname or yourbrand"
          className={getFieldError('preferred_slug') ? 'border-red-500' : ''}
        />
        {getFieldError('preferred_slug') && <p className="text-xs text-red-600 mt-1">{getFieldError('preferred_slug')}</p>}
         <p className="text-xs text-gray-500 mt-1">This will be part of your unique referral link. If left blank, one will be generated for you.</p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="termsAgreed" 
          checked={termsAgreed} 
          onCheckedChange={(checked) => setTermsAgreed(checked as boolean)}
          className={getFieldError('terms_agreed') ? 'border-red-500' : ''}
        />
        <Label htmlFor="termsAgreed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          I agree to the{' '}
          <Link href="/terms-of-service" className="text-primary hover:underline" target="_blank">
            terms and conditions
          </Link>
        </Label>
      </div>
      {getFieldError('terms_agreed') && <p className="text-xs text-red-600 mt-1">{getFieldError('terms_agreed')}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait</>
        ) : (
          'Create Affiliate Account'
        )}
      </Button>
    </form>

      {/* Resend Confirmation Email Section */}
      <div className="mt-6 pt-6 border-t border-border">
        {resendEmailError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Resend Error</AlertTitle>
            <AlertDescription>{resendEmailError}</AlertDescription>
          </Alert>
        )}
        {resendEmailSuccessMessage && (
          <Alert variant="default" className="mb-4 bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400">
            <MailWarning className="h-4 w-4 text-blue-600 dark:text-blue-500" /> {/* Changed icon */}
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>{resendEmailSuccessMessage}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground mb-2 text-center">
          Didn't receive a confirmation email or has your link expired?
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResendConfirmationEmail}
          disabled={isResendingEmail || !email} // Disable if no email entered or already resending
        >
          {isResendingEmail ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resending...</>
          ) : (
            'Resend Confirmation Email'
          )}
        </Button>
         <p className="text-xs text-muted-foreground mt-2 text-center">
          Ensure the email address above is correct before resending.
        </p>
      </div>
    </>
  );
}
