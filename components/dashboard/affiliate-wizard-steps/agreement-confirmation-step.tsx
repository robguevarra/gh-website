"use client"

import { motion } from "framer-motion"
import { 
  CheckCircle, 
  FileText, 
  Shield,
  AlertCircle,
  HandHeart
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApplicationData } from "../affiliate-application-wizard"

interface AgreementConfirmationStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function AgreementConfirmationStep({ 
  data, 
  updateData, 
  isValid 
}: AgreementConfirmationStepProps) {
  
  const handleTermsChange = (checked: boolean) => {
    updateData({ agreestoTerms: checked })
  }

  const handleConfirmationChange = (checked: boolean) => {
    updateData({ confirmAgreement: checked })
  }

  const agreementPoints = [
    {
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      title: "Terms & Conditions",
      description: "I have read and understood the affiliate program terms and conditions"
    },
    {
      icon: <Shield className="h-5 w-5 text-purple-600" />,
      title: "Code of Conduct",
      description: "I agree to follow all ethical guidelines and promotional standards"
    },
    {
      icon: <HandHeart className="h-5 w-5 text-green-600" />,
      title: "Commitment",
      description: "I understand my responsibilities as a Graceful Homeschooling affiliate"
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
          Confirm Your Agreement
        </h3>
        <p className="text-gray-600">
          Please confirm that you understand and agree to the terms of our affiliate program
        </p>
      </div>

      {/* Agreement Summary */}
      <div className="space-y-4 mb-8">
        {agreementPoints.map((point, index) => (
          <Card key={index} className="border-l-4 border-l-brand-purple">
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

      {/* Agreement Checkboxes */}
      <div className="space-y-6">
        {/* Terms Agreement */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="agree-terms"
                checked={data.agreestoTerms}
                onCheckedChange={handleTermsChange}
                className="mt-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor="agree-terms" 
                  className="text-sm font-medium text-gray-900 cursor-pointer block mb-2"
                >
                  I agree to the Terms & Conditions
                </label>
                <p className="text-sm text-gray-600">
                  By checking this box, I acknowledge that I have read, understood, and agree to be 
                  bound by the Graceful Homeschooling Affiliate Program Terms & Conditions, including 
                  the commission structure, payment terms, and code of conduct.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Agreement */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="confirm-agreement"
                checked={data.confirmAgreement}
                onCheckedChange={handleConfirmationChange}
                className="mt-1"
              />
              <div className="flex-1">
                <label 
                  htmlFor="confirm-agreement" 
                  className="text-sm font-medium text-gray-900 cursor-pointer block mb-2"
                >
                  I confirm my commitment to ethical promotion
                </label>
                <p className="text-sm text-gray-600">
                  I understand that as an affiliate, I represent Graceful Homeschooling and commit to 
                  promoting our courses honestly and ethically. I will only use approved marketing 
                  materials and maintain professional conduct in all affiliate activities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Alert */}
      {!isValid && (data.agreestoTerms || data.confirmAgreement) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please check both boxes to confirm your agreement before proceeding.
          </AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Thank you!</strong> Your agreement has been confirmed. 
            You can now proceed to set up your payment details.
          </AlertDescription>
        </Alert>
      )}

      {/* Next Steps Preview */}
      <div className="bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 rounded-lg p-6 text-center">
        <h4 className="font-semibold text-gray-900 mb-2">
          Next: Payment Setup
        </h4>
        <p className="text-sm text-gray-600">
          Once you confirm your agreement, we'll help you set up your GCash payment details 
          for receiving your affiliate commissions.
        </p>
      </div>
    </motion.div>
  )
} 