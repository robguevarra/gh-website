'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

type VerificationState = 
  | 'verifying'
  | 'success'
  | 'expired'
  | 'used'
  | 'invalid'
  | 'error'
  | 'profile_exists' // New state for already set up profiles

interface MagicLinkVerifyContentProps {
  token: string
}

export default function MagicLinkVerifyContent({ token }: MagicLinkVerifyContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerificationState>('verifying')
  const [email, setEmail] = useState<string>('')
  const [purpose, setPurpose] = useState<string>('')
  const [redirectPath, setRedirectPath] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Prevent double API calls
  const verificationAttempted = useRef(false)

  useEffect(() => {
    // Only verify once
    if (!verificationAttempted.current) {
      verificationAttempted.current = true
      verifyMagicLink()
    }
  }, [token])

  const verifyMagicLink = async () => {
    try {
      setState('verifying')
      
      console.log('[MagicLinkVerify] Verifying token:', token.substring(0, 20) + '...')

      // Use the API route instead of calling the service directly
      const redirectTo = searchParams.get('redirect')
      
      // For account setup, we need to create a session
      const isAccountSetup = redirectTo?.includes('setup-account') || 
                            searchParams.get('purpose') === 'account_setup'
      
      if (isAccountSetup) {
        // Use POST method to create session for account setup
        const response = await fetch(`/api/auth/magic-link/verify/${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            createSession: true,
            redirectTo: redirectTo
          })
        })

        const result = await response.json()

        if (!result.success) {
          console.error('[MagicLinkVerify] API validation failed:', result.error)
          
          if (result.expired) {
            setState('expired')
            setEmail(result.email || '')
          } else if (result.used) {
            setState('used')
            // Store email for used tokens too
            setEmail(result.email || '')
          } else {
            setState('invalid')
            setErrorMessage(result.error || 'Invalid magic link')
          }
          return
        }

        console.log('[MagicLinkVerify] Token validated successfully with session:', {
          email: result.verification.email,
          purpose: result.verification.purpose,
          sessionCreated: result.session?.success,
          profileStatus: result.profileStatus?.isComplete ? 'complete' : 'incomplete'
        })

        // Store validated information
        setEmail(result.verification.email)
        setPurpose(result.verification.purpose)
        setRedirectPath(result.authFlow.redirectPath)
        
        // Check if user already has a complete profile
        if (result.profileStatus?.isComplete) {
          console.log('[MagicLinkVerify] User already has a complete profile')
          setState('profile_exists')
          // Set a short timeout to show the profile exists message before redirecting
          setTimeout(() => {
            router.push(result.authFlow.redirectPath)
          }, 3000)
          return
        } else {
          setState('success')
        }

        console.log('[MagicLinkVerify] Redirecting to:', result.authFlow.redirectPath)

        // Redirect after short delay for user feedback
        // Pass user information as URL parameters to skip profile step
        setTimeout(() => {
          const redirectUrl = new URL(result.authFlow.redirectPath, window.location.origin)
          redirectUrl.searchParams.set('email', result.verification.email)
          redirectUrl.searchParams.set('verified', 'true')
          if (result.verification.purpose) {
            redirectUrl.searchParams.set('purpose', result.verification.purpose)
          }
          router.push(redirectUrl.pathname + redirectUrl.search)
        }, 2000)
        
      } else {
        // Use GET method for regular verification (no session creation)
        const apiUrl = `/api/auth/magic-link/verify/${encodeURIComponent(token)}`
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
            // Store email for used tokens too
            setEmail(result.email || '')
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
        // Pass user information as URL parameters to skip profile step
        setTimeout(() => {
          const redirectUrl = new URL(result.authFlow.redirectPath, window.location.origin)
          redirectUrl.searchParams.set('email', result.verification.email)
          redirectUrl.searchParams.set('verified', 'true')
          if (result.verification.purpose) {
            redirectUrl.searchParams.set('purpose', result.verification.purpose)
          }
          router.push(redirectUrl.pathname + redirectUrl.search)
        }, 2000)
      }

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
      
      console.log('[MagicLinkVerify] Refreshing expired token for email:', email)
      
      // Use the dedicated refresh endpoint with the expired token
      const response = await fetch('/api/auth/magic-link/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiredToken: token, // Pass the expired token
          email,
          purpose
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('[MagicLinkVerify] Successfully refreshed magic link:', {
          emailSent: result.emailSent,
          expiresAt: result.expiresAt
        })
        
        if (result.emailSent) {
          alert(`A new magic link has been sent to ${email}. Please check your inbox (and spam folder).`)
        } else {
          // Email generation succeeded but email sending failed
          console.error('[MagicLinkVerify] Magic link generated but email failed to send:', result.emailError)
          alert(`The magic link was generated but we couldn't send the email. Please try again or contact support.`)
        }
        
        router.push('/auth/signin')
      } else {
        console.error('[MagicLinkVerify] Failed to refresh link:', result.error)
        alert('Failed to send new magic link: ' + (result.error || 'Unknown error'))
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
              <div className="bg-brand-purple/5 rounded-lg p-3 mb-4">
                <p className="text-sm text-[#6d4c41]">
                  To access your account, you can request a new magic link or sign in with your password (if you've set one up).
                </p>
              </div>
              <div className="text-center space-y-3">
                <Button 
                  onClick={() => {
                    // Get the email address so we can generate a new magic link
                    console.log('[MagicLinkVerify] Refresh button clicked, email state:', email)
                    
                    if (email) {
                      // We have the email from verification, use it
                      handleRefreshLink()
                    } else {
                      // No email available - ask user for it
                      const userEmail = prompt('Please enter your email address to receive a new magic link:')
                      if (userEmail && userEmail.includes('@')) {
                        console.log('[MagicLinkVerify] User entered email:', userEmail)
                        setEmail(userEmail)
                        // Use setTimeout to ensure state is updated before calling the function
                        setTimeout(() => {
                          console.log('[MagicLinkVerify] Calling handleRefreshLink with:', userEmail)
                          handleRefreshLink()
                        }, 100)
                      } else if (userEmail) {
                        alert('Please enter a valid email address')
                      } else {
                        // User cancelled - redirect to sign in
                        router.push('/auth/signin')
                      }
                    }
                  }}
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
                      Request New Magic Link
                    </>
                  )}
                </Button>
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

      case 'profile_exists':
        return (
          <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-brand-purple/10 shadow-[0_25px_50px_-12px_rgba(176,139,165,0.15)]">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-serif text-[#5d4037]">Account Already Set Up</CardTitle>
              <CardDescription className="text-[#6d4c41]">
                Your account has already been set up. Redirecting you to sign in...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Good news!</span> Your account is already set up. 
                  You can sign in using your email and password.
                </p>
              </div>
              <div className="flex justify-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
              </div>
              <p className="text-sm text-[#6d4c41] text-center mt-2">
                Redirecting to <span className="font-medium">sign in page</span>
              </p>
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

  return renderContent()
} 