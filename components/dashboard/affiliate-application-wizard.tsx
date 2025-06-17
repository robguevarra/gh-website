"use client"

import { useState, useEffect } from "react"
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
  ArrowRight 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

export function AffiliateApplicationWizard({ 
  isOpen, 
  onClose, 
  onComplete 
}: AffiliateApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setIsSubmitting(false)
      setSubmitError(null)
      setSubmitSuccess(false)
      setApplicationData({
        agreestoTerms: false,
        confirmAgreement: false,
        gcashNumber: '',
        gcashName: '',
        acceptsLiability: false,
        understandsPayout: false
      })
    }
  }, [isOpen])

  // Check if current step is valid
  const isCurrentStepValid = () => {
    const step = WIZARD_STEPS[currentStep]
    switch (step.id) {
      case 'overview':
        return true // Always valid, just informational
      case 'terms':
        return true // Always valid, just informational
      case 'agreement':
        return applicationData.agreestoTerms && applicationData.confirmAgreement
      case 'payment':
        return applicationData.gcashNumber.length === 11 && 
               applicationData.gcashNumber.startsWith('09') &&
               applicationData.gcashName.trim().length > 0
      case 'review':
        return true // Always valid if we got here
      case 'confirmation':
        return applicationData.acceptsLiability && applicationData.understandsPayout
      default:
        return false
    }
  }

  // Navigation functions
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1 && isCurrentStepValid()) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === WIZARD_STEPS.length - 1 && isCurrentStepValid()) {
      // Last step - submit application
      submitApplication()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Submit application
  const submitApplication = async () => {
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
      
      // Update user context to reflect new affiliate status
      // Note: The user context will be refreshed when they navigate or reload
      
      if (onComplete) {
        onComplete()
      }
      
      // Refresh the page to update affiliate status
      window.location.reload()
      
      // Close the modal after a short delay to show success
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error) {
      console.error('Application submission error:', error)
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update application data
  const updateApplicationData = (updates: Partial<ApplicationData>) => {
    setApplicationData(prev => ({ ...prev, ...updates }))
  }

  if (!isOpen) return null

  const currentStepConfig = WIZARD_STEPS[currentStep]
  const StepComponent = currentStepConfig.component

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
                  <h2 className="text-xl font-medium">{currentStepConfig.title}</h2>
                  <p className="text-white/80 text-sm">{currentStepConfig.description}</p>
                </div>
              </div>

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
                    Application Submitted Successfully!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your affiliate application is now pending review. You'll receive an email confirmation shortly.
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
                        Submitting...
                      </>
                    ) : currentStep < WIZARD_STEPS.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Submit Application
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