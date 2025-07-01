'use client';

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Loader2, Eye, EyeOff, CheckCircle, User, Lock, BookOpen, Heart, ArrowRight, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { z } from 'zod'

type SetupFlow = 'p2p' | 'new' | 'general' | 'migration'
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

// Animations
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const fadeInFromLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

const fadeInFromRight = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

// Loading component for Suspense fallback
function SetupAccountLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(315,15%,93%)] to-[hsl(355,70%,95%)] flex flex-col justify-center items-center p-4">
      <div className="absolute top-0 right-0 w-full h-64 bg-[url('/images/pattern-dots.svg')] bg-repeat-x opacity-10" />
      
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Logo size="large" />
        </div>
        
        <Card className="w-full max-w-lg border border-[hsl(315,15%,80%)] shadow-lg">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center py-6">
              <div className="relative">
                <div className="animate-ping absolute h-12 w-12 rounded-full bg-[hsl(315,15%,60%)]/30"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(315,15%,60%)]"></div>
              </div>
            </div>
            <CardTitle className="text-2xl font-serif text-[hsl(315,15%,30%)]">
              Preparing Your Account
            </CardTitle>
            <CardDescription className="text-lg text-[hsl(315,15%,50%)]">
              Just a moment while we set everything up...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-64 bg-[url('/images/pattern-waves.svg')] bg-repeat-x opacity-10" />
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
          icon: <BookOpen className="h-10 w-10 text-[hsl(315,15%,60%)]" />,
          bgImage: '/images/papers-to-profit-bg.jpg',
          completionMessage: 'Your account is ready! You can now access your Papers to Profits course.',
          redirectPath: '/dashboard'
        }
      case 'migration':
        return {
          title: 'Welcome Back!',
          subtitle: 'Complete your account setup to access all your materials',
          icon: <User className="h-10 w-10 text-[hsl(315,15%,60%)]" />,
          bgImage: '/images/homeschool-pattern-bg.jpg',
          completionMessage: 'Your account is fully set up! You can now access all your materials.',
          redirectPath: '/dashboard'
        }
      case 'new':
        return {
          title: 'Create Your Account',
          subtitle: 'Join the Graceful Homeschooling community',
          icon: <Heart className="h-10 w-10 text-[hsl(315,15%,60%)]" />,
          bgImage: '/images/homeschool-community-bg.jpg',
          completionMessage: 'Welcome to Graceful Homeschooling! Your account has been created.',
          redirectPath: '/dashboard'
        }
      default:
        return {
          title: 'Complete Your Account Setup',
          subtitle: 'Just a few more details to get you started',
          icon: <User className="h-10 w-10 text-[hsl(315,15%,60%)]" />,
          bgImage: '/images/homeschool-pattern-bg.jpg',
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
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div className="space-y-4" variants={staggerContainer}>
        <motion.div className="space-y-2" variants={fadeIn}>
          <Label htmlFor="firstName" className="text-[hsl(315,15%,30%)] font-medium">
            First Name
          </Label>
          <div className="relative">
            <Input
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              className={`pl-10 border-[hsl(315,15%,80%)] focus:border-[hsl(315,15%,60%)] focus:ring-[hsl(315,15%,60%)] ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your first name"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(315,15%,60%)]" />
          </div>
          {errors.firstName && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
              {errors.firstName}
            </p>
          )}
        </motion.div>

        <motion.div className="space-y-2" variants={fadeIn}>
          <Label htmlFor="lastName" className="text-[hsl(315,15%,30%)] font-medium">
            Last Name
          </Label>
          <div className="relative">
            <Input
              id="lastName"
              value={profileData.lastName}
              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              className={`pl-10 border-[hsl(315,15%,80%)] focus:border-[hsl(315,15%,60%)] focus:ring-[hsl(315,15%,60%)] ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your last name"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(315,15%,60%)]" />
          </div>
          {errors.lastName && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
              {errors.lastName}
            </p>
          )}
        </motion.div>

        <motion.div className="space-y-2" variants={fadeIn}>
          <Label htmlFor="email" className="text-[hsl(315,15%,30%)] font-medium">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className={`pl-10 border-[hsl(315,15%,80%)] focus:border-[hsl(315,15%,60%)] focus:ring-[hsl(315,15%,60%)] ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your email address"
              disabled={!!searchParams.get('email')} // Disable if pre-filled from magic link
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(315,15%,60%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          {errors.email && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
              {errors.email}
            </p>
          )}
        </motion.div>
      </motion.div>

      <motion.div variants={fadeInFromRight}>
        <Button 
          onClick={handleProfileNext}
          className="w-full bg-[hsl(315,15%,60%)] hover:bg-[hsl(315,15%,50%)] text-white font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md"
        >
          Continue to Password Setup
          <ChevronRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  )

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length contribution (up to 25%)
    strength += Math.min(password.length * 2.5, 25);
    
    // Character variety contribution
    if (/[A-Z]/.test(password)) strength += 15; // uppercase
    if (/[a-z]/.test(password)) strength += 15; // lowercase
    if (/[0-9]/.test(password)) strength += 15; // numbers
    if (/[^A-Za-z0-9]/.test(password)) strength += 15; // special chars
    
    // Word pattern penalty
    if (/password|123456|qwerty/i.test(password)) strength -= 20;
    
    // Ensure strength is between 0-100
    return Math.max(0, Math.min(100, strength));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPasswordData(prev => ({ ...prev, password: newPassword }));
  };

  const renderPasswordStep = () => {
    const isVerified = searchParams.get('verified') === 'true';
    const passwordStrength = calculatePasswordStrength(passwordData.password);
    
    const passwordStrengthColor = () => {
      if (!passwordData.password) return 'bg-gray-200';
      if (passwordStrength < 33) return 'bg-red-500';
      if (passwordStrength < 66) return 'bg-yellow-500';
      return 'bg-green-500';
    };
    
    const passwordStrengthLabel = () => {
      if (!passwordData.password) return '';
      if (passwordStrength < 33) return 'Weak';
      if (passwordStrength < 66) return 'Medium';
      return 'Strong';
    };
    
    return (
      <motion.div 
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Show user info if coming from verified magic link */}
        {isVerified && (
          <motion.div variants={fadeIn} className="bg-[hsl(315,15%,97%)] border border-[hsl(315,15%,80%)] rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-[hsl(315,15%,60%)]" />
              <h4 className="font-medium text-[hsl(315,15%,30%)]">Email Verified</h4>
            </div>
            <p className="text-sm text-[hsl(315,15%,40%)]">
              Setting up password for: <span className="font-medium">{profileData.email}</span>
            </p>
            {profileData.firstName && profileData.firstName !== 'Loading...' && (
              <p className="text-sm text-[hsl(315,15%,40%)]">
                Welcome, {profileData.firstName} {profileData.lastName}!
              </p>
            )}
          </motion.div>
        )}

        <motion.div className="space-y-4" variants={staggerContainer}>
          <motion.div className="space-y-2" variants={fadeIn}>
            <Label htmlFor="password" className="text-[hsl(315,15%,30%)] font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.password}
                onChange={handlePasswordChange}
                className={`pl-10 border-[hsl(315,15%,80%)] focus:border-[hsl(315,15%,60%)] focus:ring-[hsl(315,15%,60%)] ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}`}
                placeholder="Create a strong password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(315,15%,60%)]" />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(315,15%,60%)] hover:text-[hsl(315,15%,40%)] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                {errors.password}
              </p>
            )}
            {passwordData.password && !errors.password && (
              <div className="space-y-1">
                <div className="h-2 w-full bg-[hsl(315,15%,90%)] rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${passwordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength}%` }}
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
                <p className="text-xs text-[hsl(315,15%,50%)] flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${passwordStrengthColor()}`}></span>
                  Password strength: {passwordStrengthLabel()}
                </p>
              </div>
            )}
            
            {/* Password requirements */}
            <div className="text-xs text-[hsl(315,15%,50%)] mt-1 space-y-1 border-t border-[hsl(315,15%,90%)] pt-2">
              <p>Password must contain:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${/^.{8,}$/.test(passwordData.password) ? 'bg-green-500' : 'bg-[hsl(315,15%,80%)]'}`}></span>
                  At least 8 characters
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(passwordData.password) ? 'bg-green-500' : 'bg-[hsl(315,15%,80%)]'}`}></span>
                  One uppercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${/[a-z]/.test(passwordData.password) ? 'bg-green-500' : 'bg-[hsl(315,15%,80%)]'}`}></span>
                  One lowercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(passwordData.password) ? 'bg-green-500' : 'bg-[hsl(315,15%,80%)]'}`}></span>
                  One number
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div className="space-y-2" variants={fadeIn}>
            <Label htmlFor="confirmPassword" className="text-[hsl(315,15%,30%)] font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`pl-10 border-[hsl(315,15%,80%)] focus:border-[hsl(315,15%,60%)] focus:ring-[hsl(315,15%,60%)] ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500 pr-10' : 'pr-10'}`}
                placeholder="Confirm your password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(315,15%,60%)]" />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(315,15%,60%)] hover:text-[hsl(315,15%,40%)] transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                {errors.confirmPassword}
              </p>
            )}
          </motion.div>
        </motion.div>

        <motion.div 
          className="flex flex-col space-y-3"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInFromRight}>
            <Button 
              onClick={handlePasswordNext}
              disabled={isLoading}
              className="w-full bg-[hsl(315,15%,60%)] hover:bg-[hsl(315,15%,50%)] text-white font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <CheckCircle className="h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
          
          {/* Only show back button if not coming from verified magic link */}
          {!isVerified && (
            <motion.div variants={fadeIn}>
              <Button 
                onClick={() => setStep('profile')}
                variant="outline"
                disabled={isLoading}
                className="w-full border-[hsl(315,15%,80%)] text-[hsl(315,15%,40%)] hover:bg-[hsl(315,15%,97%)] hover:text-[hsl(315,15%,30%)] font-medium"
              >
                Back to Profile
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  const renderCompleteStep = () => {
    const config = getFlowConfig()
    
    return (
      <motion.div 
        className="space-y-8 text-center py-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div 
          className="flex justify-center"
          variants={fadeIn}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20 h-20 w-20"></div>
            <CheckCircle className="h-20 w-20 text-[hsl(315,15%,60%)]" />
          </div>
        </motion.div>
        
        <motion.div className="space-y-2" variants={fadeIn}>
          <h3 className="text-2xl font-serif text-[hsl(315,15%,30%)]">Account Created Successfully!</h3>
          <p className="text-[hsl(315,15%,50%)] text-lg">
            {config.completionMessage}
          </p>
        </motion.div>

        {flow === 'p2p' && (
          <motion.div 
            className="bg-[hsl(315,15%,97%)] border border-[hsl(315,15%,80%)] p-5 rounded-lg shadow-sm"
            variants={fadeInFromRight}
          >
            <h4 className="font-medium text-[hsl(315,15%,40%)] mb-3 text-lg">What's Next?</h4>
            <ul className="text-[hsl(315,15%,50%)] space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Access your course materials</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Join the private community</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Start your business journey</span>
              </li>
            </ul>
          </motion.div>
        )}

        <motion.div variants={fadeInFromRight}>
          <Button 
            onClick={handleComplete}
            className="w-full bg-[hsl(315,15%,60%)] hover:bg-[hsl(315,15%,50%)] text-white font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md text-lg"
          >
            {flow === 'p2p' ? 'Access My Course' : 'Go to Dashboard'}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  const config = getFlowConfig()
  const inViewRef = useRef(null)
  const isInView = useInView(inViewRef, { once: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(315,15%,93%)] to-[hsl(355,70%,95%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-full h-64 bg-[url('/images/pattern-dots.svg')] bg-repeat-x opacity-10" />
      <div className="absolute bottom-0 left-0 w-full h-64 bg-[url('/images/pattern-waves.svg')] bg-repeat-x opacity-10" />
      
      {/* Optional background image */}
      {config.bgImage && (
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <Image 
            src={config.bgImage} 
            alt="Background" 
            fill 
            style={{ objectFit: 'cover' }} 
            priority 
          />
        </div>
      )}
      
      <div className="relative w-full max-w-xl mx-auto" ref={inViewRef}>
        <div className="flex justify-center mb-6">
          <Logo size="large" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="w-full border border-[hsl(315,15%,80%)] shadow-lg overflow-hidden">
            <CardHeader className="text-center pb-4 relative">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-[hsl(315,15%,95%)] border border-[hsl(315,15%,85%)]">
                  {config.icon}
                </div>
              </div>
              <CardTitle className="text-2xl font-serif text-[hsl(315,15%,30%)]">{config.title}</CardTitle>
              <CardDescription className="text-lg text-[hsl(315,15%,50%)]">
                {config.subtitle}
              </CardDescription>
              
              {/* Progress bar */}
              <div className="mt-6">
                <Progress 
                  value={getProgressValue()} 
                  className="w-full h-2 bg-[hsl(315,15%,90%)]" 
                />
                <div className="flex justify-between text-sm mt-2">
                  <span className={`transition-colors ${step === 'profile' ? 'text-[hsl(315,15%,60%)] font-medium' : 'text-[hsl(315,15%,60%)]'}`}>
                    Profile
                  </span>
                  <span className={`transition-colors ${step === 'password' ? 'text-[hsl(315,15%,60%)] font-medium' : 'text-[hsl(315,15%,60%)]'}`}>
                    Password
                  </span>
                  <span className={`transition-colors ${step === 'complete' ? 'text-[hsl(315,15%,60%)] font-medium' : 'text-[hsl(315,15%,60%)]'}`}>
                    Complete
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 'profile' && renderProfileStep()}
                  {step === 'password' && renderPasswordStep()}
                  {step === 'complete' && renderCompleteStep()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
            
            <CardFooter className="text-center text-xs text-[hsl(315,15%,60%)] border-t border-[hsl(315,15%,90%)] p-4">
              <div className="w-full flex justify-center">
                <span>© {new Date().getFullYear()} Graceful Homeschooling. All rights reserved.</span>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
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