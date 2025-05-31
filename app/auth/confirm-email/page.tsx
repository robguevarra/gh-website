import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-10 w-10 text-green-500 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Email Confirmed!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your affiliate application is now pending review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            Thank you for confirming your email address. Our team will review your affiliate application shortly.
            You will receive an email notification once your application status is updated.
          </p>
          <p className="text-sm text-muted-foreground">
            In the meantime, you can learn more about our affiliate program by visiting our{' '}
            <Link href="/affiliate-terms" className="font-medium text-primary hover:underline">
              Affiliate Terms & Conditions
            </Link>
            .
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
