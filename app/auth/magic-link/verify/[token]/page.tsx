'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateMagicLink } from '@/lib/auth/magic-link-service'
import { classifyCustomer, getAuthenticationFlow } from '@/lib/auth/customer-classification-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export default function MagicLinkVerifyPage({ params }: PageProps) {
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
      
      // Get client information for security logging
      const userAgent = navigator.userAgent
      const ipAddress = await getClientIP()

      console.log('[MagicLinkVerify] Verifying token:', params.token.substring(0, 20) + '...')

      // Validate magic link token
      const validation = await validateMagicLink(params.token, ipAddress, userAgent)

      if (!validation.success) {
        console.error('[MagicLinkVerify] Validation failed:', validation.error)
        
        if (validation.expired) {
          setState('expired')
          setEmail(validation.email || '')
        } else if (validation.used) {
          setState('used')
        } else {
          setState('invalid')
          setErrorMessage(validation.error || 'Invalid magic link')
        }
        return
      }

      console.log('[MagicLinkVerify] Token validated successfully:', {
        email: validation.email,
        purpose: validation.purpose
      })

      // Store validated information
      setEmail(validation.email!)
      setPurpose(validation.purpose!)

      // Re-classify customer to get current flow recommendations
      const classificationResult = await classifyCustomer(validation.email!)
      
      if (classificationResult.success && classificationResult.classification) {
        const authFlow = getAuthenticationFlow(classificationResult.classification)
        const finalRedirectPath = searchParams.get('redirect') || authFlow.redirectPath
        
        setRedirectPath(finalRedirectPath)
        setState('success')

        console.log('[MagicLinkVerify] Redirecting to:', finalRedirectPath)

        // Redirect after short delay for user feedback
        setTimeout(() => {
          router.push(finalRedirectPath)
        }, 2000)
      } else {
        console.error('[MagicLinkVerify] Customer classification failed:', classificationResult.error)
        // Fallback to default dashboard
        setRedirectPath('/dashboard')
        setState('success')
        setTimeout(() => {
          router.push('/dashboard')
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

  // Get client IP for security logging (simplified version)
  const getClientIP = async (): Promise<string> => {
    try {
      // In production, this would come from headers or a service
      // For now, return a placeholder
      return 'client-ip'
    } catch {
      return 'unknown'
    }
  }

  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
              </div>
              <CardTitle className="text-xl text-purple-900">Verifying Magic Link</CardTitle>
              <CardDescription>
                Please wait while we verify your authentication link...
              </CardDescription>
            </CardHeader>
          </Card>
        )

      case 'success':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-800">Authentication Successful!</CardTitle>
              <CardDescription>
                Welcome back, {email}! Redirecting you to your account...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Redirecting to {redirectPath}
              </p>
            </CardContent>
          </Card>
        )

      case 'expired':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-amber-600" />
              </div>
              <CardTitle className="text-xl text-amber-800">Magic Link Expired</CardTitle>
              <CardDescription>
                This magic link has expired for security reasons. You can request a new one below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Email: <strong>{email}</strong>
                </p>
                <Button 
                  onClick={handleRefreshLink}
                  disabled={isRefreshing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
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
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'used':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-orange-600" />
              </div>
              <CardTitle className="text-xl text-orange-800">Magic Link Already Used</CardTitle>
              <CardDescription>
                This magic link has already been used and cannot be used again for security reasons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button 
                  onClick={() => router.push('/auth/signin')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
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
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-800">Invalid Magic Link</CardTitle>
              <CardDescription>
                This magic link is invalid or has been tampered with.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}
              <div className="text-center">
                <Button 
                  onClick={() => router.push('/auth/signin')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderContent()}
      </div>
    </div>
  )
} 