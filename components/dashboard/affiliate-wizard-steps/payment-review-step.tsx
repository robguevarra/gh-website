"use client"

import { motion } from "framer-motion"
import { 
  Eye, 
  Smartphone, 
  CheckCircle, 
  Edit,
  CreditCard,
  Shield,
  Calendar,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ApplicationData } from "../affiliate-application-wizard"

interface PaymentReviewStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function PaymentReviewStep({ 
  data, 
  updateData, 
  isValid 
}: PaymentReviewStepProps) {
  
  const formatPhoneNumber = (number: string) => {
    if (number.length === 11) {
      return `${number.slice(0, 4)}-${number.slice(4, 7)}-${number.slice(7)}`
    }
    return number
  }

  const formatPhoneNumberMasked = (number: string) => {
    if (number.length === 11) {
      return `${number.slice(0, 4)}-***-${number.slice(-4)}`
    }
    return number
  }

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
          Review Your Payment Information
        </h3>
        <p className="text-gray-600">
          Please verify that all your payment details are correct before proceeding
        </p>
      </div>

      {/* Payment Method Summary */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 mr-3">
                <Smartphone className="h-5 w-5 text-green-600" />
              </div>
              <span>GCash Payment Method</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GCash Number */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  GCash Mobile Number
                </p>
                <p className="text-lg font-mono text-gray-700">
                  {formatPhoneNumber(data.gcashNumber)}
                </p>
              </div>
            </div>
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Verified Format</span>
            </div>
          </div>

          {/* Account Name */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Account Holder Name
                </p>
                <p className="text-lg text-gray-700">
                  {data.gcashName}
                </p>
              </div>
            </div>
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Valid</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="bg-brand-purple/10 rounded-full p-2 mr-3">
              <Calendar className="h-5 w-5 text-brand-purple" />
            </div>
            Payout Schedule & Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Cutoff Date:</span>
                <span className="ml-auto font-medium">25th of each month</span>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Processing:</span>
                <span className="ml-auto font-medium">End of month</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Minimum Payout</span>
                <span className="ml-auto font-medium">₱1,000.00</span>
              </div>
              <div className="flex items-center">
                <Smartphone className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Transfer Time:</span>
                <span className="ml-auto font-medium">Within 24 hours</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Structure Reminder */}
      <Card className="bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border-brand-purple/20">
        <CardContent className="p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-brand-purple" />
            Your Commission Structure
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-brand-purple">25%</p>
              <p className="text-sm text-gray-600">Commission Rate</p>
              <p className="text-xs text-gray-500">Course Enrollee Tier</p>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">₱250</p>
              <p className="text-sm text-gray-600">Per ₱1,000.00 Papers to Profits Course</p>
              <p className="text-xs text-gray-500">Your 25% commission</p>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">24hrs</p>
              <p className="text-sm text-gray-600">Payout Speed</p>
              <p className="text-xs text-gray-500">Via GCash</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Security & Privacy
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Your GCash information is encrypted and stored securely</p>
                <p>• We never store your GCash PIN or access credentials</p>
                <p>• Account verification will be required before first payout</p>
                <p>• You can update your payment details anytime in your affiliate portal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Next */}
      <div className="text-center bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-2">
          What Happens Next?
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          After submitting your application, you'll be granted affiliate access and can start 
          earning commissions immediately. Your first payout will require account verification.
        </p>
        <div className="flex items-center justify-center gap-2 text-brand-purple">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Continue to final confirmation
          </span>
        </div>
      </div>
    </motion.div>
  )
} 