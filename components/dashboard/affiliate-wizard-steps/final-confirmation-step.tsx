"use client"

import { motion } from "framer-motion"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Handshake,
  Star,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApplicationData } from "../affiliate-application-wizard"

interface FinalConfirmationStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function FinalConfirmationStep({ 
  data, 
  updateData, 
  isValid 
}: FinalConfirmationStepProps) {
  
  const handleLiabilityChange = (checked: boolean) => {
    updateData({ acceptsLiability: checked })
  }

  const handlePayoutChange = (checked: boolean) => {
    updateData({ understandsPayout: checked })
  }

  const liabilityPoints = [
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "Independent Contractor Status",
      description: "You operate as an independent contractor, not an employee of Graceful Homeschooling"
    },
    {
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      title: "Tax Responsibilities",
      description: "You are responsible for reporting and paying all applicable taxes on your affiliate earnings"
    },
    {
      icon: <Handshake className="h-5 w-5 text-green-600" />,
      title: "Ethical Promotion",
      description: "You agree to promote our products honestly and maintain professional conduct"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Final Confirmation & Disclaimers
        </h3>
        <p className="text-gray-600">
          Please review these important disclaimers and confirm your understanding before submitting
        </p>
      </div>

      {/* Liability & Responsibility Summary */}
      <div className="space-y-4 mb-8">
        {liabilityPoints.map((point, index) => (
          <Card key={index} className="border-l-4 border-l-yellow-400">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 rounded-full p-2 mt-1">
                  {point.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {point.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {point.description}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Important Disclaimers */}
      <Alert className="border-yellow-300 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Important Legal Notice:</strong> By proceeding, you acknowledge that you understand 
          your responsibilities as an affiliate and agree to comply with all applicable laws and regulations 
          in your jurisdiction regarding affiliate marketing and income reporting.
        </AlertDescription>
      </Alert>

      {/* Final Confirmation Checkboxes */}
      <div className="space-y-6">
        {/* Liability Acceptance */}
        <Card className="border-2 border-dashed border-red-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="accept-liability"
                checked={data.acceptsLiability}
                onCheckedChange={handleLiabilityChange}
                className="mt-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor="accept-liability" 
                  className="text-sm font-medium text-gray-900 cursor-pointer block mb-2"
                >
                  I accept all liability and responsibility as an independent affiliate
                </label>
                <p className="text-sm text-gray-600">
                  I understand that I am operating as an independent contractor and am solely responsible 
                  for my promotional activities, tax obligations, and compliance with applicable laws. 
                  Graceful Homeschooling is not liable for my actions as an affiliate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Understanding */}
        <Card className="border-2 border-dashed border-blue-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="understand-payout"
                checked={data.understandsPayout}
                onCheckedChange={handlePayoutChange}
                className="mt-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor="understand-payout" 
                  className="text-sm font-medium text-gray-900 cursor-pointer block mb-2"
                >
                  I understand the payout terms and conditions
                </label>
                <p className="text-sm text-gray-600">
                  I acknowledge that commissions are paid monthly (cutoff 25th), require a minimum 
                  threshold of ₱1,000, and that my GCash account will need verification before the first 
                  payout. I understand that Graceful Homeschooling reserves the right to withhold 
                  payments for fraudulent or policy-violating activities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alert */}
      {!isValid && (data.acceptsLiability || data.understandsPayout) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please confirm both acknowledgments above to complete your affiliate application.
          </AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Ready to submit!</strong> All confirmations completed. 
            Click "Submit Application" to finalize your affiliate registration.
          </AlertDescription>
        </Alert>
      )}

      {/* What Happens After Submission */}
      <Card className="bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border-brand-purple/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="bg-brand-purple/20 rounded-full p-2 mr-3">
              <Star className="h-5 w-5 text-brand-purple" />
            </div>
            After Submission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-brand-purple mr-2" />
              <span>Immediate affiliate role assignment and portal access</span>
            </div>
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-brand-purple mr-2" />
              <span>Course Enrollee Tier membership (25% commission rate)</span>
            </div>
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-brand-purple mr-2" />
              <span>Email confirmation with affiliate resources and getting started guide</span>
            </div>
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-brand-purple mr-2" />
              <span>Access to marketing materials and affiliate community</span>
            </div>
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-brand-purple mr-2" />
              <span>Application status: "Pending" until first activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Legal Notice */}
      <div className="text-center bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          By submitting this application, you agree to the Graceful Homeschooling Affiliate Program 
          Terms & Conditions, Privacy Policy, and all applicable legal requirements. Your information 
          will be used solely for affiliate program administration and commission payments.
        </p>
      </div>
    </motion.div>
  )
} 