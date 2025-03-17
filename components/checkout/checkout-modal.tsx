"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, ArrowLeft, CheckCircle, CreditCard, ShieldCheck, Lock } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createPaymentIntent, type PaymentMethod } from "@/app/actions/payment-actions"

type CheckoutStep = "course" | "details" | "payment" | "confirmation"
type PaymentMethodUI = "card" | "ewallet" | "direct_debit" | "invoice" | "other"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>("course")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    promoCode: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [animateCard, setAnimateCard] = useState(false)

  // Course details
  const courseDetails = {
    name: "Papers to Profits",
    description: "Learn to create and sell beautiful paper products",
    price: 19999, // in cents (199.99)
    discountedPrice: 14999, // in cents (149.99)
    duration: "8 weeks",
    startDate: "March 15, 2025",
    features: [
      "Full course access",
      "One-on-one coaching sessions",
      "Private community access",
      "Lifetime updates",
      "Certificate of completion",
    ],
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  useEffect(() => {
    // Reset errors when step changes
    setErrors({})
  }, [step])

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  // Format card expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return value
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "cardNumber") {
      setFormData({ ...formData, [name]: formatCardNumber(value) })
    } else if (name === "cardExpiry") {
      setFormData({ ...formData, [name]: formatExpiryDate(value) })
    } else if (name === "cardCvc") {
      setFormData({ ...formData, [name]: value.replace(/[^0-9]/g, "").substring(0, 3) })
    } else {
      setFormData({ ...formData, [name]: value })
    }

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (step === "details") {
      if (!formData.firstName) newErrors.firstName = "First name is required"
      if (!formData.lastName) newErrors.lastName = "Last name is required"
      if (!formData.email) {
        newErrors.email = "Email is required"
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid"
      }
      if (!formData.phone) newErrors.phone = "Phone number is required"
    }

    if (step === "payment" && paymentMethod === "card") {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length < 16) {
        newErrors.cardNumber = "Valid card number is required"
      }
      if (!formData.cardExpiry || formData.cardExpiry.length < 5) {
        newErrors.cardExpiry = "Valid expiry date is required"
      }
      if (!formData.cardCvc || formData.cardCvc.length < 3) {
        newErrors.cardCvc = "Valid CVC is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep()) {
      if (step === "course") setStep("details")
      else if (step === "details") setStep("payment")
      else if (step === "payment") processPayment()
    }
  }

  const handlePrevStep = () => {
    if (step === "details") setStep("course")
    else if (step === "payment") setStep("details")
  }

  const processPayment = async () => {
    setIsProcessing(true)
    setAnimateCard(true)

    try {
      // Call the server action to create a payment intent with Xendit
      const response = await createPaymentIntent({
        amount: courseDetails.discountedPrice,
        currency: "PHP",
        paymentMethod,
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
      })

      // Check if there was an error
      if (response.error) {
        throw new Error(response.message || "Payment processing failed")
      }

      // For redirect-based payment methods like GCash or PayMaya
      if (paymentMethod !== "card" && response.invoice_url) {
        // Redirect to the Xendit-hosted payment page
        window.location.href = response.invoice_url
        return
      }

      // For credit card payments processed directly
      // Simulate processing time for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setPaymentSuccess(true)
      setStep("confirmation")
    } catch (error) {
      console.error("Payment failed:", error)
      setErrors({
        payment:
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Payment processing failed. Please try again.",
      })
    } finally {
      setIsProcessing(false)
      setAnimateCard(false)
    }
  }

  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: 50,
      scale: 0.95,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  }

  const cardVariants = {
    idle: { rotateY: 0 },
    flip: {
      rotateY: 180,
      transition: { duration: 0.6 },
    },
  }

  if (!isOpen) return null

  const renderStepIndicator = () => {
    const steps = [
      { id: "course", label: "Course" },
      { id: "details", label: "Details" },
      { id: "payment", label: "Payment" },
      { id: "confirmation", label: "Confirmation" },
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                s.id === step || (s.id === "confirmation" && paymentSuccess)
                  ? "border-[#ad8174] bg-[#ad8174] text-white"
                  : "border-gray-300 bg-white text-gray-500"
              }`}
            >
              {s.id === step ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 rounded-full bg-[#ad8174]"
                />
              ) : null}
              <span className="relative z-10 text-sm font-medium">{i + 1}</span>
            </div>
            <span
              className={`hidden sm:block ml-2 text-sm font-medium ${
                s.id === step ? "text-[#ad8174]" : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-12 sm:w-16 h-0.5 mx-2 ${
                  steps.indexOf({ id: step } as any) > i ? "bg-[#ad8174]" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderCourseStep = () => (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={stepVariants} className="space-y-6">
      <div className="bg-[#f9f6f2] rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden">
            <Image
              src="/placeholder.svg?height=200&width=300&text=Papers+to+Profits"
              alt="Papers to Profits Course"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-2 bg-[#ad8174] text-white text-xs px-2 py-1 rounded-full">
              Most Popular
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-serif text-[#5d4037] mb-2">{courseDetails.name}</h3>
            <p className="text-[#6d4c41] mb-4">{courseDetails.description}</p>
            <div className="flex items-baseline mb-4">
              <span className="text-2xl font-bold text-[#ad8174]">
                ₱{(courseDetails.discountedPrice / 100).toFixed(2)}
              </span>
              <span className="ml-2 text-sm text-gray-500 line-through">₱{(courseDetails.price / 100).toFixed(2)}</span>
              <span className="ml-2 text-xs bg-[#f0e6dd] text-[#ad8174] px-2 py-1 rounded-full">
                Save {Math.round(100 - (courseDetails.discountedPrice / courseDetails.price) * 100)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-[#6d4c41]">
                <span className="font-medium">Duration:</span>
                <span className="ml-2">{courseDetails.duration}</span>
              </div>
              <div className="flex items-center text-sm text-[#6d4c41]">
                <span className="font-medium">Start Date:</span>
                <span className="ml-2">{courseDetails.startDate}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-[#5d4037] mb-3">What's included:</h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {courseDetails.features.map((feature, i) => (
              <li key={i} className="flex items-center text-sm text-[#6d4c41]">
                <CheckCircle className="h-4 w-4 text-[#ad8174] mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-[#f0e6dd] rounded-lg p-4 text-sm text-[#6d4c41]">
        <p>By proceeding, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </motion.div>
  )

  const renderDetailsStep = () => (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={stepVariants} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName" className="text-[#5d4037]">
              First Name
            </Label>
            <div className="relative">
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`bg-white ${errors.firstName ? "border-red-500" : ""}`}
                placeholder="John"
              />
              {errors.firstName && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.firstName}
                </motion.p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="lastName" className="text-[#5d4037]">
              Last Name
            </Label>
            <div className="relative">
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`bg-white ${errors.lastName ? "border-red-500" : ""}`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.lastName}
                </motion.p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[#5d4037]">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`bg-white ${errors.email ? "border-red-500" : ""}`}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-[#5d4037]">
              Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`bg-white ${errors.phone ? "border-red-500" : ""}`}
                placeholder="+63 XXX XXX XXXX"
              />
              {errors.phone && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.phone}
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="address" className="text-[#5d4037]">
          Address (Optional)
        </Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          className="bg-white"
          placeholder="Your address"
        />
      </div>
      <div>
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
          <Button variant="outline" className="border-[#ad8174] text-[#ad8174] hover:bg-[#f0e6dd] hover:text-[#ad8174]">
            Apply
          </Button>
        </div>
      </div>
    </motion.div>
  )

  const renderPaymentStep = () => (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={stepVariants} className="space-y-6">
      <div className="bg-[#f9f6f2] rounded-lg p-6">
        <h3 className="text-lg font-medium text-[#5d4037] mb-4">Payment Method</h3>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
          className="space-y-3"
        >
          <div
            className={`flex items-center space-x-2 rounded-lg border p-4 cursor-pointer ${
              paymentMethod === "card" ? "border-[#ad8174] bg-[#f0e6dd]/50" : "border-gray-200 bg-white"
            }`}
          >
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex items-center cursor-pointer">
              <CreditCard className="h-5 w-5 mr-2 text-[#5d4037]" />
              Credit / Debit Card
            </Label>
            <div className="ml-auto flex items-center space-x-1">
              <Image src="/placeholder.svg?height=24&width=36&text=Visa" alt="Visa" width={36} height={24} />
              <Image src="/placeholder.svg?height=24&width=36&text=MC" alt="Mastercard" width={36} height={24} />
            </div>
          </div>
          <div
            className={`flex items-center space-x-2 rounded-lg border p-4 cursor-pointer ${
              paymentMethod === "ewallet" ? "border-[#ad8174] bg-[#f0e6dd]/50" : "border-gray-200 bg-white"
            }`}
          >
            <RadioGroupItem value="ewallet" id="ewallet" />
            <Label htmlFor="ewallet" className="flex items-center cursor-pointer">
              <Image src="/placeholder.svg?height=24&width=24&text=GCash" alt="GCash" width={24} height={24} />
              <span className="ml-2">GCash</span>
            </Label>
          </div>
          <div
            className={`flex items-center space-x-2 rounded-lg border p-4 cursor-pointer ${
              paymentMethod === "direct_debit" ? "border-[#ad8174] bg-[#f0e6dd]/50" : "border-gray-200 bg-white"
            }`}
          >
            <RadioGroupItem value="direct_debit" id="direct_debit" />
            <Label htmlFor="direct_debit" className="flex items-center cursor-pointer">
              <Image src="/placeholder.svg?height=24&width=24&text=Maya" alt="PayMaya" width={24} height={24} />
              <span className="ml-2">PayMaya</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {paymentMethod === "card" && (
        <div className="space-y-6">
          <div className="relative perspective">
            <motion.div
              className="relative w-full h-56 rounded-xl overflow-hidden shadow-lg"
              variants={cardVariants}
              animate={animateCard ? "flip" : "idle"}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ad8174] to-[#8d6e63] p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="w-12 h-8 rounded bg-white/20"></div>
                    <div className="pt-8">
                      <p className="text-white/80 text-xs mb-1">Card Number</p>
                      <p className="text-white font-mono text-lg tracking-wider">
                        {formData.cardNumber || "•••• •••• •••• ••••"}
                      </p>
                    </div>
                  </div>
                  <div className="text-white/90 text-xs">
                    <p>CREDIT</p>
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/80 text-xs mb-1">Card Holder</p>
                      <p className="text-white font-mono">
                        {formData.firstName && formData.lastName
                          ? `${formData.firstName} ${formData.lastName}`.toUpperCase()
                          : "YOUR NAME"}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/80 text-xs mb-1">Expires</p>
                      <p className="text-white font-mono">{formData.cardExpiry || "MM/YY"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cardNumber" className="text-[#5d4037]">
                Card Number
              </Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  className={`bg-white ${errors.cardNumber ? "border-red-500" : ""}`}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
                {errors.cardNumber && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs mt-1"
                  >
                    {errors.cardNumber}
                  </motion.p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cardExpiry" className="text-[#5d4037]">
                  Expiry Date
                </Label>
                <div className="relative">
                  <Input
                    id="cardExpiry"
                    name="cardExpiry"
                    value={formData.cardExpiry}
                    onChange={handleInputChange}
                    className={`bg-white ${errors.cardExpiry ? "border-red-500" : ""}`}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  {errors.cardExpiry && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-1"
                    >
                      {errors.cardExpiry}
                    </motion.p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="cardCvc" className="text-[#5d4037]">
                  CVC
                </Label>
                <div className="relative">
                  <Input
                    id="cardCvc"
                    name="cardCvc"
                    value={formData.cardCvc}
                    onChange={handleInputChange}
                    className={`bg-white ${errors.cardCvc ? "border-red-500" : ""}`}
                    placeholder="123"
                    maxLength={3}
                  />
                  {errors.cardCvc && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-1"
                    >
                      {errors.cardCvc}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#f0e6dd] rounded-lg p-4 flex items-center text-sm text-[#6d4c41]">
        <ShieldCheck className="h-5 w-5 text-[#ad8174] mr-2 flex-shrink-0" />
        <p>Your payment information is secure. We use industry-standard encryption to protect your data.</p>
      </div>

      {errors.payment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-500 p-4 rounded-lg text-sm"
        >
          {errors.payment}
        </motion.div>
      )}
    </motion.div>
  )

  const renderConfirmationStep = () => (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={stepVariants}
      className="text-center space-y-6 py-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 rounded-full bg-[#f0e6dd] flex items-center justify-center mx-auto"
      >
        <CheckCircle className="h-10 w-10 text-[#ad8174]" />
      </motion.div>
      <div>
        <h3 className="text-2xl font-serif text-[#5d4037] mb-2">Thank You for Your Purchase!</h3>
        <p className="text-[#6d4c41]">
          Your enrollment in <span className="font-medium">{courseDetails.name}</span> has been confirmed.
        </p>
      </div>
      <div className="bg-white rounded-lg p-6 text-left">
        <h4 className="text-lg font-medium text-[#5d4037] mb-4">Order Summary</h4>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-[#6d4c41]">Course:</span>
            <span className="font-medium text-[#5d4037]">{courseDetails.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6d4c41]">Start Date:</span>
            <span className="font-medium text-[#5d4037]">{courseDetails.startDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6d4c41]">Duration:</span>
            <span className="font-medium text-[#5d4037]">{courseDetails.duration}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6d4c41]">Payment Method:</span>
            <span className="font-medium text-[#5d4037]">
              {paymentMethod === "card" ? "Credit Card" : 
               paymentMethod === "ewallet" ? "E-Wallet" : 
               paymentMethod === "direct_debit" ? "Direct Debit" : 
               paymentMethod === "invoice" ? "Invoice" : "Other"}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="flex justify-between">
            <span className="font-medium text-[#5d4037]">Total Paid:</span>
            <span className="font-bold text-[#ad8174]">₱{(courseDetails.discountedPrice / 100).toFixed(2)}</span>
          </div>
        </div>
        <div className="text-sm text-[#6d4c41]">
          <p>
            A confirmation email has been sent to <span className="font-medium">{formData.email}</span>
          </p>
        </div>
      </div>
      <div className="pt-4">
        <p className="text-sm text-[#6d4c41] mb-4">
          If you have any questions, please contact our support team at{" "}
          <span className="text-[#ad8174]">support@gracefulhomeschooling.com</span>
        </p>
        <Button onClick={onClose} className="bg-[#ad8174] hover:bg-[#8d6e63] text-white">
          Close
        </Button>
      </div>
    </motion.div>
  )

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={backdropVariants}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-xl">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-serif text-[#5d4037]">
                {step === "confirmation" ? "Order Confirmation" : "Checkout"}
              </h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {step !== "confirmation" && renderStepIndicator()}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === "course" && renderCourseStep()}
              {step === "details" && renderDetailsStep()}
              {step === "payment" && renderPaymentStep()}
              {step === "confirmation" && renderConfirmationStep()}
            </AnimatePresence>
          </div>

          {step !== "confirmation" && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-b-xl">
              <div className="flex justify-between items-center">
                {step !== "course" ? (
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={isProcessing}
                    className="border-[#ad8174] text-[#ad8174] hover:bg-[#f0e6dd] hover:text-[#ad8174]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="border-gray-300 text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                )}
                <div className="flex items-center">
                  {step === "payment" && (
                    <div className="flex items-center mr-4 text-sm text-[#6d4c41]">
                      <Lock className="h-4 w-4 mr-1 text-[#ad8174]" />
                      Secure Checkout
                    </div>
                  )}
                  <Button
                    onClick={handleNextStep}
                    disabled={isProcessing}
                    className={`bg-[#ad8174] hover:bg-[#8d6e63] text-white ${
                      isProcessing ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        {step === "course" && "Continue"}
                        {step === "details" && "Continue to Payment"}
                        {step === "payment" && "Complete Purchase"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

