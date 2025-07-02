"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  FileText, 
  CheckCircle, 
  CreditCard, 
  Eye, 
  Shield,
  ArrowRight,
  Clock,
  AlertCircle,
  Star,
  ExternalLink,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/context/auth-context"
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"

// Import individual step components
import { ProgramOverviewStep } from "./affiliate-wizard-steps/program-overview-step"
import { TermsConditionsStep } from "./affiliate-wizard-steps/terms-conditions-step"
import { AgreementConfirmationStep } from "./affiliate-wizard-steps/agreement-confirmation-step"
import { PaymentDetailsStep } from "./affiliate-wizard-steps/payment-details-step"
import { PaymentReviewStep } from "./affiliate-wizard-steps/payment-review-step"
import { FinalConfirmationStep } from "./affiliate-wizard-steps/final-confirmation-step"

interface AffiliateApplicationWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

// Storage key for permanent dismissal
const AFFILIATE_WIZARD_DISMISSED_KEY = 'gh_affiliate_wizard_dismissed'

// Cache configuration for affiliate status
const STATUS_CACHE_KEY = 'affiliate_status_cache'
const STATUS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Define the wizard steps configuration
const WIZARD_STEPS = [
  {
    id: 'overview',
    title: 'Affiliate Program Overview',
    description: 'Learn about our affiliate program benefits and opportunities',
    icon: <Users className="h-6 w-6 text-brand-purple" />,
    component: ProgramOverviewStep
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    description: 'Review the affiliate program terms and conditions',
    icon: <FileText className="h-6 w-6 text-brand-blue" />,
    component: TermsConditionsStep
  },
  {
    id: 'agreement',
    title: 'Agreement Confirmation',
    description: 'Confirm your agreement to the terms and conditions',
    icon: <CheckCircle className="h-6 w-6 text-green-600" />,
    component: AgreementConfirmationStep
  },
  {
    id: 'payment',
    title: 'Payment Details',
    description: 'Set up your GCash payment information for payouts',
    icon: <CreditCard className="h-6 w-6 text-brand-pink" />,
    component: PaymentDetailsStep
  },
  {
    id: 'review',
    title: 'Payment Review',
    description: 'Review your payment information before submission',
    icon: <Eye className="h-6 w-6 text-brand-purple" />,
    component: PaymentReviewStep
  },
  {
    id: 'confirmation',
    title: 'Final Confirmation',
    description: 'Review liability disclaimers and submit your application',
    icon: <Shield className="h-6 w-6 text-green-600" />,
    component: FinalConfirmationStep
  }
]

// Application data interface
export interface ApplicationData {
  agreestoTerms: boolean
  confirmAgreement: boolean
  gcashNumber: string
  gcashName: string
  acceptsLiability: boolean
  understandsPayout: boolean
}

// Affiliate status interface
interface AffiliateStatus {
  isAffiliate: boolean
  status: string | null
  existingData?: {
    gcashNumber?: string
    gcashName?: string
  }
}

// Cached status interface
interface CachedStatus {
  data: AffiliateStatus
  timestamp: number
}

/**
 * Check if wizard should be permanently dismissed for approved affiliates
 */
function isWizardPermanentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AFFILIATE_WIZARD_DISMISSED_KEY) === 'true'
}

/**
 * Mark wizard as permanently dismissed
 */
function markWizardPermanentlyDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AFFILIATE_WIZARD_DISMISSED_KEY, 'true')
}

/**
 * Get cached affiliate status if still valid
 */
function getCachedAffiliateStatus(): AffiliateStatus | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(STATUS_CACHE_KEY)
    if (!cached) return null
    
    const cachedData: CachedStatus = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is still valid
    if (now - cachedData.timestamp < STATUS_CACHE_DURATION) {
      return cachedData.data
    }
    
    // Cache expired, remove it
    localStorage.removeItem(STATUS_CACHE_KEY)
    return null
  } catch (error) {
    console.error('Error reading cached affiliate status:', error)
    localStorage.removeItem(STATUS_CACHE_KEY)
    return null
  }
}

/**
 * Cache affiliate status
 */
function setCachedAffiliateStatus(data: AffiliateStatus): void {
  if (typeof window === 'undefined') return
  
  try {
    const cachedData: CachedStatus = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(cachedData))
  } catch (error) {
    console.error('Error caching affiliate status:', error)
  }
}

/**
 * Congratulations Modal for Approved Affiliates
 */
function CongratulationsModal({ 
  onClose, 
  onNeverShowAgain 
}: { 
  onClose: () => void
  onNeverShowAgain: () => void 
}) {
  const [neverShowAgain, setNeverShowAgain] = useState(false)

  // Early exit if already dismissed to prevent phantom loads
  if (isWizardPermanentlyDismissed()) {
    return null
  }

  const handleClose = useCallback(() => {
    if (neverShowAgain) {
      onNeverShowAgain()
    }
    onClose()
  }, [neverShowAgain, onClose, onNeverShowAgain])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Celebration Header - Brand Aligned */}
          <div className="relative bg-gradient-to-r from-brand-purple via-brand-pink to-brand-purple p-4 sm:p-6 md:p-8 overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/10 rounded-full -translate-y-6 sm:-translate-y-8 md:-translate-y-10 translate-x-6 sm:translate-x-8 md:translate-x-10" />
            <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/5 rounded-full translate-y-4 sm:translate-y-6 md:translate-y-8 -translate-x-4 sm:-translate-x-6 md:-translate-x-8" />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors duration-200"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Celebration Animation */}
            <div className="text-center text-white relative z-10">
              <motion.div
                className="mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, duration: 0.3 }}
              >
                <div className="relative">
                  <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                    <CheckCircle className="h-12 w-12 mx-auto" />
                  </div>
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Sparkles className="h-6 w-6 text-yellow-300" />
                  </motion.div>
                </div>
              </motion.div>
              
              <motion.h2 
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 font-serif"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.25 }}
              >
                🎉 Congratulations!
              </motion.h2>
              
              <motion.p 
                className="text-white/90 text-base sm:text-lg font-medium"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.25 }}
              >
                You're now an approved affiliate!
              </motion.p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 font-serif">
                Welcome to the Graceful Homeschooling Affiliate Program!
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                You're now earning 25% commission on every successful referral. Here's how to get started:
              </p>
            </div>

            {/* Action Steps */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-brand-purple/10 rounded-xl p-3 sm:p-4 border border-brand-purple/20 shadow-sm">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="bg-brand-purple rounded-full p-1.5 sm:p-2 mt-1 shadow-sm flex-shrink-0">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                      Access Your Affiliate Portal
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                      Click on your profile name in the top right corner, then select "Affiliate Portal" 
                      from the dropdown menu to manage your account and track performance.
                    </p>
                    <Button
                      onClick={() => window.open('/affiliate-portal', '_blank')}
                      className="bg-brand-purple hover:bg-brand-purple/90 text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 transition-colors duration-200 w-full sm:w-auto"
                    >
                      <ExternalLink className="h-3 w-3 mr-1 sm:mr-2" />
                      Open Affiliate Portal
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-brand-blue/10 rounded-xl p-3 sm:p-4 border border-brand-blue/20 shadow-sm">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="bg-brand-blue rounded-full p-1.5 sm:p-2 mt-1 shadow-sm flex-shrink-0">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                      Join Our Affiliate Facebook Group
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                      Connect with other affiliates, get marketing tips, and stay updated on new resources 
                      in our exclusive affiliate community.
                    </p>
                    <Button
                      onClick={() => window.open('https://facebook.com/groups/gracefulhomeschooling-affiliates', '_blank')}
                      variant="outline"
                      className="border-brand-blue text-brand-blue hover:bg-brand-blue/10 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 transition-colors duration-200 w-full sm:w-auto"
                    >
                      <ExternalLink className="h-3 w-3 mr-1 sm:mr-2" />
                      Join Facebook Group
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Highlight */}
            <div className="bg-gradient-to-r from-brand-pink/20 to-brand-purple/20 rounded-xl p-3 sm:p-4 text-center border border-brand-pink/30 shadow-sm">
              <div className="flex justify-center mb-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-brand-purple" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                You're earning <span className="text-base sm:text-lg font-bold text-brand-purple">25%</span> commission on all sales
              </p>
              <p className="text-xs text-gray-600 mt-1">
                That's ₱250 for every Papers to Profits course sold!
              </p>
            </div>

            {/* Never Show Again Option */}
            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="never-show-again"
                  checked={neverShowAgain}
                  onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
                  className="data-[state=checked]:bg-brand-purple data-[state=checked]:border-brand-purple mt-0.5 flex-shrink-0"
                />
                <label
                  htmlFor="never-show-again"
                  className="text-xs sm:text-sm text-gray-600 cursor-pointer leading-relaxed"
                >
                  Don't show this congratulations message again
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                className="flex-1 bg-gradient-to-r from-brand-purple to-brand-pink hover:from-brand-purple/90 hover:to-brand-pink/90 text-white font-medium transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
              >
                Get Started!
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function AffiliateApplicationWizard({ 
  isOpen, 
  onClose, 
  onComplete 
}: AffiliateApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [affiliateStatus, setAffiliateStatus] = useState<AffiliateStatus | null>(null)
  const [initialCheckComplete, setInitialCheckComplete] = useState(false)
  
  // Helper to validate phone numbers (PH local or international E.164)
  const isValidPhoneNumber = (number: string) => {
    return (
      /^09\d{9}$/.test(number) ||      // PH numbers
      /^\+\d{10,15}$/.test(number) ||  // International with +
      /^\d{10,15}$/.test(number)        // Digits only 10-15
    )
  }

  // Application data state
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    agreestoTerms: false,
    confirmAgreement: false,
    gcashNumber: '',
    gcashName: '',
    acceptsLiability: false,
    understandsPayout: false
  })

  const { user } = useAuth()
  const userContext = useStudentDashboardStore((state) => state.userContext)

  // Use ref to track if we've already checked status to prevent multiple calls
  const hasCheckedStatusRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Memoized functions to prevent unnecessary re-renders
  const handleNeverShowAgain = useCallback(() => {
    markWizardPermanentlyDismissed()
    onClose()
  }, [onClose])

  // Debounced status check function with caching
  const checkAffiliateStatus = useCallback(async (force = false) => {
    if (!user?.id || (!force && hasCheckedStatusRef.current)) return

    // Check cache first
    if (!force) {
      const cachedStatus = getCachedAffiliateStatus()
      if (cachedStatus) {
        setAffiliateStatus(cachedStatus)
        setInitialCheckComplete(true)
        hasCheckedStatusRef.current = true
        
        // Pre-populate form with cached data
        if (cachedStatus.existingData) {
          setApplicationData(prev => ({
            ...prev,
            gcashNumber: cachedStatus.existingData?.gcashNumber || '',
            gcashName: cachedStatus.existingData?.gcashName || ''
          }))
        }
        return
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoadingStatus(true)
    try {
      const response = await fetch(`/api/student/affiliate-status?userId=${user.id}`, {
        signal: abortControllerRef.current.signal
      })
      
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return
      }

      const data = await response.json()
      
      if (response.ok) {
        setAffiliateStatus(data)
        setCachedAffiliateStatus(data) // Cache the result
        hasCheckedStatusRef.current = true
        
        // Pre-populate form with existing data
        if (data.existingData) {
          setApplicationData(prev => ({
            ...prev,
            gcashNumber: data.existingData.gcashNumber || '',
            gcashName: data.existingData.gcashName || ''
          }))
        }
      } else {
        console.error('Error checking affiliate status:', data.error)
      }
    } catch (error) {
      // Don't log abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error checking affiliate status:', error)
      }
    } finally {
      setIsLoadingStatus(false)
      setInitialCheckComplete(true)
    }
  }, [user?.id])

  // Initial check when modal opens - run only once per modal session
  useEffect(() => {
    if (isOpen && !initialCheckComplete) {
      // Check dismissal status immediately
      if (isWizardPermanentlyDismissed()) {
        setInitialCheckComplete(true)
        onClose()
        return
      }
      
      // Only check affiliate status if we haven't already
      if (user?.id && !hasCheckedStatusRef.current) {
        checkAffiliateStatus()
      } else {
        setInitialCheckComplete(true)
      }
    }
  }, [isOpen, user?.id, checkAffiliateStatus, onClose, initialCheckComplete])

  // Reset state when modal opens - separate from status check
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setIsSubmitting(false)
      setSubmitError(null)
      setSubmitSuccess(false)
      
      // Only reset application data if no cached data
      const cachedStatus = getCachedAffiliateStatus()
      if (!cachedStatus?.existingData) {
        setApplicationData({
          agreestoTerms: false,
          confirmAgreement: false,
          gcashNumber: '',
          gcashName: '',
          acceptsLiability: false,
          understandsPayout: false
        })
      }
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Reset status check flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasCheckedStatusRef.current = false
    }
  }, [isOpen])

  // Memoized step validation
  const isCurrentStepValid = useCallback(() => {
    const step = WIZARD_STEPS[currentStep]
    switch (step.id) {
      case 'overview':
        return true // Always valid, just informational
      case 'terms':
        return true // Always valid, just informational
      case 'agreement':
        return applicationData.agreestoTerms && applicationData.confirmAgreement
      case 'payment':
        return isValidPhoneNumber(applicationData.gcashNumber) &&
               applicationData.gcashName.trim().length > 0
      case 'review':
        return true // Always valid if we got here
      case 'confirmation':
        return applicationData.acceptsLiability && applicationData.understandsPayout
      default:
        return false
    }
  }, [currentStep, applicationData])

  // Memoized navigation functions
  const nextStep = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1 && isCurrentStepValid()) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === WIZARD_STEPS.length - 1 && isCurrentStepValid()) {
      // Last step - submit application
      submitApplication()
    }
  }, [currentStep, isCurrentStepValid])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  // Submit application with proper error handling
  const submitApplication = useCallback(async () => {
    if (!user?.id) {
      setSubmitError('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/student/affiliate-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          applicationData
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Application submission failed')
      }

      setSubmitSuccess(true)
      
      // Clear cache to force fresh data on next check
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STATUS_CACHE_KEY)
      }
      
      // Reset status check flag to allow fresh check
      hasCheckedStatusRef.current = false
      
      if (onComplete) {
        onComplete()
      }
      
      // Update affiliate status optimistically
      setAffiliateStatus(prev => prev ? { ...prev, status: 'pending' } : null)
      
      // Close the modal after showing success
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error) {
      console.error('Application submission error:', error)
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [user?.id, applicationData, onComplete, onClose])

  // Memoized application data update
  const updateApplicationData = useCallback((updates: Partial<ApplicationData>) => {
    setApplicationData(prev => ({ ...prev, ...updates }))
  }, [])

  if (!isOpen) return null

  // Don't render anything until initial dismissal check is complete
  if (!initialCheckComplete) {
    return null
  }

  // Early check: If wizard is permanently dismissed for approved affiliates, don't render anything
  if (affiliateStatus?.status === 'active' && isWizardPermanentlyDismissed()) {
    return null
  }

  // Show loading state while checking affiliate status
  if (isLoadingStatus) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
              <p className="text-gray-600">Checking your application status...</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Show congratulations modal for approved affiliates (unless permanently dismissed)
  if (affiliateStatus?.status === 'active' && !isWizardPermanentlyDismissed()) {
    return (
      <CongratulationsModal 
        onClose={onClose}
        onNeverShowAgain={handleNeverShowAgain}
      />
    )
  }

  // Show pending status if application already exists
  if (affiliateStatus?.status === 'pending') {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="relative bg-gradient-to-r from-brand-purple to-brand-pink p-6">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="text-center text-white">
                <Clock className="h-12 w-12 mx-auto mb-3" />
                <h2 className="text-xl font-medium">Application Under Review</h2>
                <p className="text-white/80 text-sm">Your affiliate application is being processed</p>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                Your affiliate application is currently under review. We'll notify you by email once it's been approved. Thank you for your patience!
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    // Allow user to update their application
                    setAffiliateStatus({ ...affiliateStatus, status: null })
                    // Clear cache to force fresh data
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(STATUS_CACHE_KEY)
                    }
                    hasCheckedStatusRef.current = false
                  }}
                  variant="ghost"
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Update My Application
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  const currentStepConfig = WIZARD_STEPS[currentStep]
  const StepComponent = currentStepConfig.component
  const isUpdatingExisting = affiliateStatus?.isAffiliate && !affiliateStatus?.status

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="relative">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-brand-purple to-brand-pink p-6">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700"
                onClick={onClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 rounded-full p-2">
                  {currentStepConfig.icon}
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-medium">
                    {isUpdatingExisting ? 'Update Your Application' : currentStepConfig.title}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {isUpdatingExisting ? 'Modify your affiliate application details' : currentStepConfig.description}
                  </p>
                </div>
              </div>

              {/* Show update notice if applicable */}
              {isUpdatingExisting && (
                <Alert className="bg-white/10 border-white/20 text-white mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-white/90">
                    You're updating an existing application. Changes will be reviewed before approval.
                  </AlertDescription>
                </Alert>
              )}

              {/* Progress bar */}
              <div className="flex gap-1 mt-4">
                {WIZARD_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      index <= currentStep ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {isUpdatingExisting ? 'Application Updated Successfully!' : 'Application Submitted Successfully!'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {isUpdatingExisting 
                      ? 'Your affiliate application updates have been submitted for review.' 
                      : 'Your affiliate application is now pending review. You\'ll receive an email confirmation shortly.'
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    You can check your application status in your dashboard.
                  </p>
                </div>
              ) : (
                <StepComponent
                  data={applicationData}
                  updateData={updateApplicationData}
                  isValid={isCurrentStepValid()}
                />
              )}

              {submitError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Footer */}
            {!submitSuccess && (
              <div className="flex items-center justify-between p-6 bg-gray-50 border-t">
                <div className="text-sm text-gray-500">
                  Step {currentStep + 1} of {WIZARD_STEPS.length}
                </div>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={prevStep}
                      disabled={isSubmitting}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  
                  <Button 
                    onClick={nextStep}
                    disabled={!isCurrentStepValid() || isSubmitting}
                    className="bg-brand-purple hover:bg-brand-purple/90"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {isUpdatingExisting ? 'Updating...' : 'Submitting...'}
                      </>
                    ) : currentStep < WIZARD_STEPS.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        {isUpdatingExisting ? 'Update Application' : 'Submit Application'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 