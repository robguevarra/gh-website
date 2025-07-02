"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  CreditCard, 
  Smartphone, 
  Shield,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApplicationData } from "../affiliate-application-wizard"

interface PaymentDetailsStepProps {
  data: ApplicationData
  updateData: (updates: Partial<ApplicationData>) => void
  isValid: boolean
}

export function PaymentDetailsStep({ 
  data, 
  updateData, 
  isValid 
}: PaymentDetailsStepProps) {
  
  const handleNumberChange = (value: string) => {
    // Allow digits and a single leading '+'. Limit to 15 digits per E.164.
    let cleaned = value
      .replace(/[^+\d]/g, '')      // keep digits or '+'
      .replace(/(?!^)\+/g, '')     // allow '+' only at start

    const digitsOnly = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned
    if (digitsOnly.length <= 15) {
      updateData({ gcashNumber: cleaned })
    }
  }

  const handleNameChange = (value: string) => {
    updateData({ gcashName: value })
  }

  // Validation helpers
  const isValidPhoneNumber = (number: string) => {
    // Valid if PH local (09XXXXXXXXX), international E.164 (+1234567890...), or local digits (10-15)
    return (
      /^09\d{9}$/.test(number) ||        // PH numbers
      /^\+\d{10,15}$/.test(number) ||    // International numbers with '+'
      /^\d{10,15}$/.test(number)          // Digits only, 10-15 characters
    )
  }

  const isValidName = (name: string) => {
    return name.trim().length >= 2
  }

  const formatPhoneNumber = (number: string) => {
    // Only format standard PH numbers for readability
    if (/^09\d{9}$/.test(number)) {
      return `${number.slice(0, 4)}-${number.slice(4, 7)}-${number.slice(7)}`
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
          Set Up Your GCash Payment Details
        </h3>
        <p className="text-gray-600">
          Add your GCash account information to receive your affiliate commissions
        </p>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Smartphone className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Why GCash?</strong> We use GCash for faster, more convenient payouts with 24-hour processing 
          and no additional fees. All affiliate commissions are paid exclusively through GCash.
        </AlertDescription>
      </Alert>

      {/* GCash Form */}
      <Card className="border-l-4 border-l-brand-purple">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
            </div>
            GCash Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* GCash Number */}
          <div className="space-y-2">
            <Label htmlFor="gcash-number" className="text-sm font-medium">
              GCash Mobile Number *
            </Label>
            <Input
              id="gcash-number"
              type="tel"
              value={data.gcashNumber}
              onChange={(e) => handleNumberChange(e.target.value)}
              placeholder="09XXXXXXXXX or +1234567890"
              maxLength={16}
              className={`font-mono ${
                data.gcashNumber && !isValidPhoneNumber(data.gcashNumber) 
                  ? 'border-red-300 focus:border-red-500' 
                  : ''
              }`}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Enter a valid mobile number. PH numbers should start with 09; international numbers must include the country code (e.g., +1...).
              </p>
              {data.gcashNumber && (
                <div className="flex items-center text-sm">
                  {isValidPhoneNumber(data.gcashNumber) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-green-600">Valid format</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">Invalid format</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {data.gcashNumber && isValidPhoneNumber(data.gcashNumber) && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Formatted Number:</strong> {formatPhoneNumber(data.gcashNumber)}
                </p>
              </div>
            )}
          </div>

          {/* GCash Name */}
          <div className="space-y-2">
            <Label htmlFor="gcash-name" className="text-sm font-medium">
              Account Holder Name *
            </Label>
            <Input
              id="gcash-name"
              type="text"
              value={data.gcashName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Full name as registered in GCash"
              className={`${
                data.gcashName && !isValidName(data.gcashName) 
                  ? 'border-red-300 focus:border-red-500' 
                  : ''
              }`}
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Must match your GCash account name exactly
              </p>
              {data.gcashName && (
                <div className="flex items-center text-sm">
                  {isValidName(data.gcashName) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-green-600">Valid name</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">Name too short</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-2">Important Requirements:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Your GCash account must be fully verified</li>
                  <li>The name must exactly match your GCash registration</li>
                  <li>Number must be active and able to receive funds</li>
                  <li>Account will be verified before first payout</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      {!isValid && (data.gcashNumber || data.gcashName) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please ensure both GCash number and account name are valid before proceeding.
          </AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {isValid && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Payment details validated!</strong> Your GCash information will be used for commission payouts.
          </AlertDescription>
        </Alert>
      )}

      {/* Payout Information */}
      <Card className="bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 border-brand-purple/20">
        <CardContent className="p-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Payout Schedule & Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p><strong>Cutoff Date:</strong> 25th of each month</p>
              <p><strong>Processing:</strong> End of month</p>
            </div>
            <div>
              <p><strong>Minimum Payout:</strong> ₱1,000.00</p>
              <p><strong>Transfer Time:</strong> Within 24 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <div className="text-center bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-center mb-2">
          <Shield className="h-5 w-5 text-gray-600 mr-2" />
          <span className="text-sm font-medium text-gray-900">Your Information is Secure</span>
        </div>
        <p className="text-sm text-gray-600">
          All payment information is encrypted and stored securely. 
          We never store your GCash PIN or password.
        </p>
      </div>
    </motion.div>
  )
} 