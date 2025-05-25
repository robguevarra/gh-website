'use client';

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Loader2, Eye, EyeOff, CheckCircle, User, Lock, BookOpen } from 'lucide-react'
import { z } from 'zod'

type SetupFlow = 'p2p' | 'new' | 'general'
type SetupStep = 'profile' | 'password' | 'complete'

// Validation schemas
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required')
})

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

interface ProfileData {
  firstName: string
  lastName: string
  email: string
}

interface PasswordData {
  password: string
  confirmPassword: string
}

// Loading component for Suspense fallback
function SetupAccountLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
          <CardTitle>Loading Account Setup...</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

// Main component that uses useSearchParams
function SetupAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Setup flow and step state
  const [flow, setFlow] = useState<SetupFlow>('general')
  const [step, setStep] = useState<SetupStep>('profile')
  const [isLoading, setIsLoading] = useState(false)
  
  // Form data
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [passwordData, setPasswordData] = useState<PasswordData>({
    password: '',
    confirmPassword: ''
  })
  
  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Determine setup flow from URL parameters
    const flowParam = searchParams.get('flow')
    if (flowParam === 'p2p' || flowParam === 'new') {
      setFlow(flowParam)
    }

    // Check if coming from verified magic link
    const isVerified = searchParams.get('verified') === 'true'
    const emailParam = searchParams.get('email')
    
    if (isVerified && emailParam) {
      // Skip profile step and go directly to password creation
      setProfileData(prev => ({ 
        ...prev, 
        email: emailParam,
        // For verified users, we'll get the name from the database
        firstName: 'Loading...',
        lastName: 'Loading...'
      }))
      setStep('password')
      
      // Fetch user profile data from the database
      fetchUserProfile(emailParam)
    } else if (emailParam) {
      // Pre-fill email if provided (from magic link validation)
      setProfileData(prev => ({ ...prev, email: emailParam }))
    }
  }, [searchParams])

  const fetchUserProfile = async (email: string) => {
    try {
      // Fetch user profile from unified_profiles table
      const { data, error } = await supabase
        .from('unified_profiles')
        .select('first_name, last_name, email')
        .eq('email', email)
        .maybeSingle()

      if (data) {
        setProfileData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // If we can't fetch profile, fall back to profile step
      setStep('profile')
    }
  }

  const getFlowConfig = () => {
    switch (flow) {
      case 'p2p':
        return {
          title: 'Welcome to Papers to Profits!',
          subtitle: 'Let\'s set up your account to access your course',
          icon: <BookOpen className="h-8 w-8 text-purple-600" />,
          completionMessage: 'Your account is ready! You can now access your Papers to Profits course.',
          redirectPath: '/dashboard/course'
        }
      case 'new':
        return {
          title: 'Create Your Account',
          subtitle: 'Join the Graceful Homeschooling community',
          icon: <User className="h-8 w-8 text-purple-600" />,
          completionMessage: 'Welcome to Graceful Homeschooling! Your account has been created.',
          redirectPath: '/dashboard'
        }
      default:
        return {
          title: 'Complete Your Account Setup',
          subtitle: 'Just a few more details to get you started',
          icon: <User className="h-8 w-8 text-purple-600" />,
          completionMessage: 'Your account setup is complete!',
          redirectPath: '/dashboard'
        }
    }
  }

  const getProgressValue = () => {
    switch (step) {
      case 'profile': return 33
      case 'password': return 66
      case 'complete': return 100
      default: return 0
    }
  }

  const validateProfileStep = () => {
    try {
      profileSchema.parse(profileData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const validatePasswordStep = () => {
    try {
      passwordSchema.parse(passwordData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleProfileNext = () => {
    if (validateProfileStep()) {
      setStep('password')
    }
  }

  const handlePasswordNext = async () => {
    if (!validatePasswordStep()) return

    setIsLoading(true)
    try {
      const isVerified = searchParams.get('verified') === 'true'
      
      if (isVerified) {
        // User came from verified magic link - they already have a Supabase Auth account
        // We need to update their password using the Admin API
        console.log('[AccountSetup] Setting password for verified user:', profileData.email)
        
        try {
          // Use our API endpoint to update the password for existing user
          const response = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: profileData.email,
              password: passwordData.password,
              userData: {
                first_name: profileData.firstName,
                last_name: profileData.lastName,
                setup_flow: flow,
                setup_completed_at: new Date().toISOString()
              }
            })
          })

          const result = await response.json()

          if (!result.success) {
            console.error('[AccountSetup] Password update failed:', result.error)
            setErrors({ submit: result.error || 'Failed to set password. Please try again.' })
            return
          }

          console.log('[AccountSetup] Password updated successfully for:', profileData.email)
          
          // Now sign in the user with their new password
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: profileData.email,
            password: passwordData.password
          })

          if (signInError) {
            console.error('[AccountSetup] Sign in failed after password update:', signInError)
            setErrors({ submit: 'Password set successfully, but sign in failed. Please try signing in manually.' })
            return
          }

          console.log('[AccountSetup] User signed in successfully:', signInData.user?.id)
          setStep('complete')

        } catch (error) {
          console.error('[AccountSetup] Password update error:', error)
          setErrors({ submit: 'Failed to set password. Please try again.' })
          return
        }
        
      } else {
        // New user flow - create account normally
        console.log('[AccountSetup] Creating new account for:', profileData.email)
        
        const { data, error } = await supabase.auth.signUp({
          email: profileData.email,
          password: passwordData.password,
          options: {
            data: {
              first_name: profileData.firstName,
              last_name: profileData.lastName,
              setup_flow: flow,
              setup_completed_at: new Date().toISOString()
            }
          }
        })

        if (error) {
          console.error('[AccountSetup] Signup error:', error)
          setErrors({ submit: error.message })
          return
        }

        if (data.user) {
          console.log('[AccountSetup] User created successfully:', data.user.id)
          
          // Update unified_profiles if needed
          await updateUnifiedProfile(data.user.id)
          
          // User should already be signed in after signup
          setStep('complete')
        }
      }
      
    } catch (error) {
      console.error('[AccountSetup] Account setup error:', error)
      setErrors({ submit: 'Failed to complete account setup. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const updateUnifiedProfile = async (userId: string) => {
    try {
      // This would update the unified_profiles table with additional information
      // For now, we'll rely on Supabase Auth triggers to handle profile creation
      console.log('[AccountSetup] Profile update placeholder for user:', userId)
    } catch (error) {
      console.error('[AccountSetup] Profile update error:', error)
      // Don't fail account creation for profile update issues
    }
  }

  const handleComplete = () => {
    const config = getFlowConfig()
    router.push(config.redirectPath)
  }

  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={profileData.firstName}
            onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
            className={errors.firstName ? 'border-red-500' : ''}
            placeholder="Enter your first name"
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={profileData.lastName}
            onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
            className={errors.lastName ? 'border-red-500' : ''}
            placeholder="Enter your last name"
          />
          {errors.lastName && (
            <p className="text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
            className={errors.email ? 'border-red-500' : ''}
            placeholder="Enter your email address"
            disabled={!!searchParams.get('email')} // Disable if pre-filled from magic link
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>
      </div>

      <Button 
        onClick={handleProfileNext}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        Continue to Password Setup
      </Button>
    </div>
  )

  const renderPasswordStep = () => {
    const isVerified = searchParams.get('verified') === 'true'
    
    return (
      <div className="space-y-6">
        {/* Show user info if coming from verified magic link */}
        {isVerified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-800">Email Verified</h4>
            </div>
            <p className="text-sm text-green-700">
              Setting up password for: <span className="font-medium">{profileData.email}</span>
            </p>
            {profileData.firstName && profileData.firstName !== 'Loading...' && (
              <p className="text-sm text-green-700">
                Welcome, {profileData.firstName} {profileData.lastName}!
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
                className={errors.password ? 'border-red-500' : ''}
                placeholder="Create a secure password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={errors.confirmPassword ? 'border-red-500' : ''}
                placeholder="Confirm your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Password requirements */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>Password must contain:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>
        </div>

        {errors.submit && (
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-700">{errors.submit}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handlePasswordNext}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Create Account
              </>
            )}
          </Button>

          {/* Only show back button if not coming from verified magic link */}
          {!isVerified && (
            <Button 
              variant="outline"
              onClick={() => setStep('profile')}
              className="w-full"
              disabled={isLoading}
            >
              Back to Profile
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderCompleteStep = () => {
    const config = getFlowConfig()
    
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-green-800">Account Created Successfully!</h3>
          <p className="text-gray-600">
            {config.completionMessage}
          </p>
        </div>

        {flow === 'p2p' && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>✓ Access your course materials</li>
              <li>✓ Join the private community</li>
              <li>✓ Start your business journey</li>
            </ul>
          </div>
        )}

        <Button 
          onClick={handleComplete}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {flow === 'p2p' ? 'Access My Course' : 'Go to Dashboard'}
        </Button>
      </div>
    )
  }

  const config = getFlowConfig()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          <CardTitle className="text-2xl text-purple-900">{config.title}</CardTitle>
          <CardDescription className="text-lg">
            {config.subtitle}
          </CardDescription>
          
          {/* Progress bar */}
          <div className="mt-6">
            <Progress value={getProgressValue()} className="w-full" />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span className={step === 'profile' ? 'text-purple-600 font-medium' : ''}>
                Profile
              </span>
              <span className={step === 'password' ? 'text-purple-600 font-medium' : ''}>
                Password
              </span>
              <span className={step === 'complete' ? 'text-purple-600 font-medium' : ''}>
                Complete
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {step === 'profile' && renderProfileStep()}
          {step === 'password' && renderPasswordStep()}
          {step === 'complete' && renderCompleteStep()}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<SetupAccountLoading />}>
      <SetupAccountContent />
    </Suspense>
  )
} 