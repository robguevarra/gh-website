"use client"

import { motion } from "framer-motion"
import { 
  FileText, 
  Shield, 
  DollarSign, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApplicationData } from "../affiliate-application-wizard"

interface TermsConditionsStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function TermsConditionsStep({ 
  data, 
  updateData, 
  isValid 
}: TermsConditionsStepProps) {
  
  const termsSection = [
    {
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      title: "Commission Structure",
      items: [
        "Course Enrollee Tier: 25% commission on all sales",
        "Commissions calculated on net sale amount (after taxes)",
        "Minimum payout threshold: ₱1,000.00",
        "Monthly payment cycle (cutoff: 25th of each month)"
      ]
    },
    {
      icon: <Users className="h-5 w-5 text-blue-600" />,
      title: "Affiliate Responsibilities",
      items: [
        "Promote products honestly and ethically",
        "Only use approved marketing materials",
        "Disclose affiliate relationship when required",
        "Maintain professional conduct in all communications"
      ]
    },
    {
      icon: <Shield className="h-5 w-5 text-purple-600" />,
      title: "Code of Conduct",
      items: [
        "No spam or unsolicited marketing",
        "No false or misleading claims about products",
        "Respect intellectual property rights",
        "Follow all applicable laws and regulations"
      ]
    },
    {
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      title: "Program Duration & Termination",
      items: [
        "Agreement effective until terminated by either party",
        "Either party may terminate with 30 days notice",
        "Unpaid commissions will be paid upon termination",
        "Non-compete clause applies for 90 days after termination"
      ]
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
          Affiliate Program Terms & Conditions
        </h3>
        <p className="text-gray-600">
          Please review these terms carefully before proceeding with your application
        </p>
      </div>

      {/* Important Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> By proceeding, you acknowledge that you have read, 
          understood, and agree to be bound by these terms and conditions.
        </AlertDescription>
      </Alert>

      {/* Terms Sections */}
      <div className="space-y-4">
        {termsSection.map((section, index) => (
          <Card key={index} className="border-l-4 border-l-brand-purple">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <div className="bg-gray-100 rounded-full p-2 mr-3">
                  {section.icon}
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Terms */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Additional Important Terms
          </h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Payment Method:</strong> Payouts are made exclusively through GCash. 
              You must provide valid GCash account details.
            </p>
            <p>
              <strong>Tax Responsibility:</strong> You are responsible for reporting and 
              paying any applicable taxes on your affiliate earnings.
            </p>
            <p>
              <strong>Modification of Terms:</strong> We reserve the right to modify these 
              terms with 30 days notice. Continued participation constitutes acceptance.
            </p>
            <p>
              <strong>Dispute Resolution:</strong> Any disputes will be resolved through 
              binding arbitration under Philippine law.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Questions about these terms? Contact our affiliate support team at{" "}
          <a href="mailto:affiliates@gracefulhomeschooling.com" className="text-brand-purple hover:underline">
            affiliates@gracefulhomeschooling.com
          </a>
        </p>
      </div>
    </motion.div>
  )
} 