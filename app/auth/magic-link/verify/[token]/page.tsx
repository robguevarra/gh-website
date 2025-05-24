'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface PageProps {
  params: {
    token: string
  }
}

type VerificationState = 
  | 'verifying'
  | 'success'
  | 'expired'
  | 'used'
  | 'invalid'
  | 'error'

// Loading component for Suspense fallback
function MagicLinkVerifyLoading() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex flex-col">
      {/* Header with Logo */}
      <header className="w-full p-6">
        <div className="container mx-auto">
          <Logo size="medium" />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-purple/30 border-t-brand-purple"></div>
              </div>
            </div>
            <CardTitle className="text-xl font-serif text-[#5d4037]">Loading Magic Link...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

// Main component that uses useSearchParams
function MagicLinkVerifyContent({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerificationState>('verifying')
  const [email, setEmail] = useState<string>('')
  const [purpose, setPurpose] = useState<string>('')
  const [redirectPath, setRedirectPath] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    verifyMagicLink()
  }, [params.token])

  const verifyMagicLink = async () => {
    try {
      setState('verifying')
      
      console.log('[MagicLinkVerify] Verifying token:', params.token.substring(0, 20) + '...')

      // Use the API route instead of calling the service directly
      const redirectTo = searchParams.get('redirect')
      const apiUrl = `/api/auth/magic-link/verify/${encodeURIComponent(params.token)}`
      const fullUrl = redirectTo ? `${apiUrl}?redirect=${encodeURIComponent(redirectTo)}` : apiUrl

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!result.success) {
        console.error('[MagicLinkVerify] API validation failed:', result.error)
        
        if (result.expired) {
          setState('expired')
          setEmail(result.email || '')
        } else if (result.used) {
          setState('used')
        } else {
          setState('invalid')
          setErrorMessage(result.error || 'Invalid magic link')
        }
        return
      }

      console.log('[MagicLinkVerify] Token validated successfully:', {
        email: result.verification.email,
        purpose: result.verification.purpose
      })

      // Store validated information
      setEmail(result.verification.email)
      setPurpose(result.verification.purpose)
      setRedirectPath(result.authFlow.redirectPath)
      setState('success')

      console.log('[MagicLinkVerify] Redirecting to:', result.authFlow.redirectPath)

      // Redirect after short delay for user feedback
      setTimeout(() => {
        router.push(result.authFlow.redirectPath)
      }, 2000)

    } catch (error) {
      console.error('[MagicLinkVerify] Verification error:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unknown verification error')
    }
  }

  const handleRefreshLink = async () => {
    if (!email) return

    try {
      setIsRefreshing(true)
      
      // Request new magic link via API
      const response = await fetch('/api/auth/magic-link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          purpose,
          sendEmail: true
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('A new magic link has been sent to your email address.')
        router.push('/auth/signin')
      } else {
        alert('Failed to send new magic link. Please try again.')
      }
    } catch (error) {
      console.error('[MagicLinkVerify] Refresh error:', error)
      alert('Failed to send new magic link. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Verifying Magic Link</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                Please wait while we verify your authentication link...
              </CardDescription>
            </CardHeader>
          </Card>
        )

      case 'success':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Authentication Successful!</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                Welcome back, <span className="font-medium text-brand-purple">{email}</span>! 
                Redirecting you to your account...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
              </div>
              <p className="text-sm text-[#6d4c41] mt-3">
                Redirecting to <span className="font-medium">{redirectPath}</span>
              </p>
            </CardContent>
          </Card>
        )

      case 'expired':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-pink/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-brand-pink" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Magic Link Expired</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                This magic link has expired for security reasons. You can request a new one below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-brand-purple/5 rounded-lg p-3 mb-4">
                  <p className="text-sm text-[#6d4c41]">
                    Email: <span className="font-medium text-brand-purple">{email}</span>
                  </p>
                </div>
                <Button 
                  onClick={handleRefreshLink}
                  disabled={isRefreshing}
                  className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white transition-all duration-200"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending New Link...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Send New Magic Link
                    </>
                  )}
                </Button>
              </div>
              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/auth/signin')}
                  className="w-full border-brand-purple/20 text-brand-purple hover:bg-brand-purple/5 transition-all duration-200"
                >
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'used':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-blue/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-brand-blue" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Magic Link Already Used</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                This magic link has already been used and cannot be used again for security reasons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button 
                  onClick={() => router.push('/auth/signin')}
                  className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white transition-all duration-200"
                >
                  Request New Magic Link
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'invalid':
      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Invalid Magic Link</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                This magic link is invalid or has been tampered with.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}
              <div className="text-center">
                <Button 
                  onClick={() => router.push('/auth/signin')}
                  className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white transition-all duration-200"
                >
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f6f2] flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23b08ba5' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-10v-10h-4v10h-10v4h10v10h4v-10h10zM40 0H0v40h40V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        
        {/* Decorative circles */}
        <div className="absolute right-0 top-1/4 w-48 h-48 rounded-full bg-brand-blue/10 blur-3xl opacity-60"></div>
        <div className="absolute left-1/4 bottom-1/4 w-64 h-64 rounded-full bg-brand-pink/10 blur-3xl opacity-40"></div>
        <div className="absolute right-1/3 top-1/2 w-36 h-36 rounded-full bg-brand-purple/10 blur-2xl opacity-50"></div>
      </div>

      {/* Header with Logo */}
      <header className="w-full p-6 z-10 relative">
        <div className="container mx-auto">
          <Logo size="medium" />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 z-10 relative">
        <div className="w-full max-w-md">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default function MagicLinkVerifyPage({ params }: PageProps) {
  return (
    <Suspense fallback={<MagicLinkVerifyLoading />}>
      <MagicLinkVerifyContent params={params} />
    </Suspense>
  )
} 