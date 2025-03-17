"use client"

import type React from "react"

import { useState } from "react"
import { XenditPayment } from "@/components/checkout/xendit-payment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Check } from "lucide-react"

interface PaymentFormProps {
  amount: number
  onSuccess: () => void
}

export function PaymentForm({ amount, onSuccess }: PaymentFormProps) {
  const [step, setStep] = useState<"details" | "payment" | "success">("details")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    promoCode: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateDetailsForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName) newErrors.firstName = "First name is required"
    if (!formData.lastName) newErrors.lastName = "Last name is required"
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }
    if (!formData.phone) newErrors.phone = "Phone number is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateDetailsForm()) {
      setStep("payment")
    }
  }

  const handlePaymentSuccess = (id: string) => {
    setPaymentId(id)
    setStep("success")
    onSuccess()
  }

  const handlePaymentError = (error: string) => {
    setErrors({ payment: error })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-brand-purple to-brand-pink p-6 text-white">
        <h2 className="text-2xl font-serif">Enroll Now</h2>
        <p className="text-white/90">Get instant access to the full course</p>

        {/* Progress steps */}
        <div className="flex items-center mt-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "details" ? "bg-white text-brand-purple" : "bg-white/20 text-white"
            }`}
          >
            1
          </div>
          <div className={`h-1 w-12 ${step === "details" ? "bg-white/20" : "bg-white"}`}></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "payment" ? "bg-white text-brand-purple" : "bg-white/20 text-white"
            }`}
          >
            2
          </div>
          <div className={`h-1 w-12 ${step === "success" ? "bg-white" : "bg-white/20"}`}></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "success" ? "bg-white text-brand-purple" : "bg-white/20 text-white"
            }`}
          >
            {step === "success" ? <Check className="h-4 w-4" /> : "3"}
          </div>
        </div>
      </div>

      <div className="p-6">
        {step === "details" && (
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[#5d4037]">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`bg-white ${errors.firstName ? "border-red-500" : ""}`}
                  placeholder="Your first name"
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[#5d4037]">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`bg-white ${errors.lastName ? "border-red-500" : ""}`}
                  placeholder="Your last name"
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#5d4037]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`bg-white ${errors.email ? "border-red-500" : ""}`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#5d4037]">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`bg-white ${errors.phone ? "border-red-500" : ""}`}
                placeholder="+63 XXX XXX XXXX"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoCode" className="text-[#5d4037]">
                Promo Code (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="promoCode"
                  name="promoCode"
                  value={formData.promoCode}
                  onChange={handleInputChange}
                  className="bg-white"
                  placeholder="Enter promo code"
                />
                <Button variant="outline" className="border-brand-purple text-brand-purple hover:bg-brand-purple/10">
                  Apply
                </Button>
              </div>
            </div>

            <div className="bg-brand-purple/5 rounded-lg p-4 flex items-center text-sm text-[#6d4c41]">
              <Shield className="h-5 w-5 text-brand-purple mr-2 flex-shrink-0" />
              <p>Your information is secure. We'll proceed to payment after this step.</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Continue to Payment
            </Button>
          </form>
        )}

        {step === "payment" && (
          <XenditPayment amount={amount} onSuccess={handlePaymentSuccess} onError={handlePaymentError} />
        )}

        {step === "success" && (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-serif text-[#5d4037] mb-2">Payment Successful!</h3>
            <p className="text-[#6d4c41] mb-6">
              Thank you for enrolling in Papers to Profits. Your payment has been processed successfully.
            </p>
            <p className="text-[#6d4c41] mb-6">
              Payment ID: <span className="font-mono text-sm">{paymentId}</span>
            </p>
            <p className="text-[#6d4c41]">You will receive a confirmation email shortly with all the details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

