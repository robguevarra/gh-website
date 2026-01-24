"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion"
import { BookOpen, ChevronRight, ArrowRight, Star, Check, Shield, Heart, Printer, Lightbulb, Package, Rocket } from "lucide-react"


import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { useMobile } from "@/hooks/use-mobile"
import { createPaymentIntent } from "@/app/actions/payment-actions"
import { PageTracker } from "@/components/tracking/page-tracker"
import { useTracking } from '@/hooks/use-tracking';

export default function PapersToProfitVariantB({ variant = 'B' }: { variant?: string }) {
  const { track } = useTracking();
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("full")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(true) // Pre-checked as requested


  const heroRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const empathyRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const isHeroInView = useInView(heroRef, { once: true })
  const isFormInView = useInView(formRef, { once: true, margin: "-100px" })
  const isEmpathyInView = useInView(empathyRef, { once: true, margin: "-100px" })
  const isMobile = useMobile()

  // Parallax effect
  const { scrollYProgress } = useScroll({
    container: pageRef
  })
  const heroImageY = useTransform(scrollYProgress, [0, 0.5], [0, 100])
  const heroTextY = useTransform(scrollYProgress, [0, 0.5], [0, -50])

  // Course details
  const courseDetails = {
    name: "Papers to Profits",
    description:
      "Learn to create and sell beautiful paper products that transform your homeschooling passion into a sustainable business",
    fullPrice: 130000, // in cents (199.99)
    discountedPrice: 130000, // in cents (149.99)
    monthlyPrice: 4999, // in cents (49.99)
    duration: "8 weeks",
    startDate: "Immediate Access",
    features: [
      "Full course access for life",
      "Over 20+ recorded videos to teach you everything you need to know",
      "Private community access",
      "Lifetime updates",
      "Access to live classes",
      "Bonus: Design templates worth Php 5000+",
    ],
  }

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Facebook CAPI ViewContent tracking (fires on page load)
  useEffect(() => {
    // Helper to get cookie value by name
    function getCookie(name: string) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : undefined;
    }

    // Prepare payload for CAPI
    const payload = {
      eventName: 'ViewContent',
      eventSourceUrl: window.location.href,
      userData: {
        clientUserAgent: navigator.userAgent,
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc'),
        // Optionally add email, phone, etc. if available
      }
    };

    // Replace with your actual deployed function URL
    const functionUrl = 'https://cidenjydokpzpsnpywcf.functions.supabase.co/send-facebook-capi-event';

    // Client-side Pixel Tracking (ViewContent)
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: 'Papers to Profits Course',
        content_ids: ['7e386720-8839-4252-bd5f-09a33c3e1afb'],
        content_type: 'product',
      });
    }

    fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        // TEMP LOGS: Output captured fbp and fbc cookies for debugging
        // Remove these logs after confirming correct capture
        console.log('[DEBUG] Facebook _fbp cookie:', getCookie('_fbp'));
        console.log('[DEBUG] Facebook _fbc cookie:', getCookie('_fbc'));

        // ------------------------------------------------------------------------
      })
      .catch(err => {
        // Optionally log errors
        // console.error('Facebook CAPI error:', err);
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName) newErrors.firstName = "First name is required"
    if (!formData.lastName) newErrors.lastName = "Last name is required"
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }
    if (!formData.phone) {
      newErrors.phone = "Phone number is required"
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      // Basic check: optional +, digits, spaces, hyphens, parens, at least 10 digits total (adjust regex as needed)
      newErrors.phone = "Phone number format is invalid"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEmailBlur = async () => {
    // Trigger tracking on blur (Abandoned Cart signal)
    if (formData.email && /\S+@\S+\.\S+/.test(formData.email)) {
      try {
        // We call the capture endpoint to log the "checkout.started" / "abandoned" signal
        // which also triggers the backend automation
        await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName || 'Guest',
            lastName: formData.lastName || 'Guest',
            productType: 'P2P',
            sourcePage: '/p2p-order-form-b',
            marketingOptIn: marketingOptIn,
            metadata: { event: 'email_blur', variant: variant }
          })
        });
      } catch (e) {
        console.error("[Tracking] Email blur capture failed", e);
      }
    }
  }

  // Update the handleSubmit function to properly handle the redirect
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsProcessing(true)

    // Track initiate checkout
    track('initiate_checkout', {
      step: 'form_submit',
      product: 'p2p_system',
      plan: selectedPlan,
      variant: variant // Track variant for funnel analysis
    });

    try {
      // Get the price based on the selected plan
      const planPrice = selectedPlan === "full"
        ? courseDetails.fullPrice
        : courseDetails.monthlyPrice;

      // --- Facebook Attribution: Capture fbp/fbc cookies for CAPI attribution ---
      function getCookie(name: string) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : undefined;
      }
      const fbp = getCookie('_fbp');
      const fbc = getCookie('_fbc');
      // ------------------------------------------------------------------------

      // --- STEP 1: CAPTURE LEAD BEFORE PAYMENT (Industry Best Practice) ---
      // This ensures we don't lose potential customers who abandon payment
      let leadId: string | undefined;

      try {
        const leadCaptureResponse = await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            productType: 'P2P',
            amount: planPrice,
            currency: process.env.PAYMENT_CURRENCY || 'PHP',
            sourcePage: '/p2p-order-form',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            metadata: {
              plan: selectedPlan,
              course_id: '7e386720-8839-4252-bd5f-09a33c3e1afb',
              ...(fbp && { fbp }),
              ...(fbc && { fbc }),
              marketing_opt_in: marketingOptIn,
            }
          })
        });

        const leadResult = await leadCaptureResponse.json();

        if (leadResult.success) {
          leadId = leadResult.leadId;
          console.log('[Lead] Successfully captured lead before payment:', leadId);
        } else {
          console.error('[Lead] Failed to capture lead:', leadResult.error);
          // Continue with payment anyway - lead capture failure shouldn't block purchase
        }
      } catch (leadError) {
        console.error('[Lead] Error capturing lead:', leadError);
        // Continue with payment anyway
      }

      // --- Facebook CAPI: Send InitiateCheckout event ---
      // This is best practice: fire when user starts checkout (form submit)
      try {
        // Client-side Pixel Tracking (InitiateCheckout)
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'InitiateCheckout', {
            content_name: 'Papers to Profits Course',
            content_ids: ['7e386720-8839-4252-bd5f-09a33c3e1afb'],
            content_type: 'product',
            currency: process.env.PAYMENT_CURRENCY || 'PHP',
            value: planPrice / 100,
            num_items: 1,
            payment_plan: selectedPlan
          });
        }

        const capiPayload = {
          eventName: 'InitiateCheckout',
          eventSourceUrl: window.location.href,
          userData: {
            email: formData.email,
            phone: formData.phone,
            firstName: formData.firstName,
            lastName: formData.lastName,
            clientUserAgent: navigator.userAgent,
            fbp,
            fbc,
          },
          customData: {
            currency: process.env.PAYMENT_CURRENCY || 'PHP',
            value: planPrice / 100,
            plan: selectedPlan,
            course_id: '7e386720-8839-4252-bd5f-09a33c3e1afb',
          },
        };
        const functionUrl = 'https://cidenjydokpzpsnpywcf.functions.supabase.co/send-facebook-capi-event';
        fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capiPayload),
        })
        // No need to await; fire-and-forget for tracking
      } catch (capiErr) {
        // Log but do not block checkout
        console.error('[CAPI] Failed to send InitiateCheckout event:', capiErr);
      }
      // ------------------------------------------------------------------------

      // --- STEP 2: CREATE PAYMENT INTENT WITH LEAD TRACKING ---
      // Call the server action to create a payment intent with Xendit
      const response = await createPaymentIntent({
        amount: planPrice,
        currency: process.env.PAYMENT_CURRENCY || "PHP",
        paymentMethod: "invoice",
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        description: `Papers to Profits Course - ${selectedPlan === "full" ? "Full Payment" : "Monthly Plan"}`,
        metadata: {
          plan: selectedPlan,
          source: "website",
          course_id: "7e386720-8839-4252-bd5f-09a33c3e1afb",
          ...(leadId && { lead_id: leadId }), // Include lead_id for tracking
          ...(fbp && { fbp }),
          ...(fbc && { fbc }),
          variant, // Track A/B variant in payment metadata
          marketing_opt_in: marketingOptIn
        },
      })

      // Check if there was an error
      if (response.error) {
        throw new Error(response.message || "Payment processing failed")
      }

      // Redirect to the Xendit-hosted payment page
      if (response.invoice_url) {
        // Use window.location.href for a full page redirect
        window.location.href = response.invoice_url
        return
      }

      // If no redirect URL is provided, show success message
      setShowSuccess(true)

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Payment failed:", error)
      setErrors({
        payment:
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Payment processing failed. Please try again later.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const fadeInFromLeft = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 },
    },
  }

  const fadeInFromRight = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 },
    },
  }

  const pulseAnimation = {
    scale: [1, 1.05, 1] as [number, number, number],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "loop" as const,
    },
  }

  // Features section
  const renderFeatures = () => {
    return courseDetails.features.map((feature, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 + 0.5 }}
        className="flex items-start gap-2"
      >
        <div className="mt-1">
          <Check className="h-4 w-4 text-green-500" />
        </div>
        <span className="text-[#6d4c41]">{feature}</span>
      </motion.div>
    ))
  }

  // Challenges section
  const challenges = [
    "Trying to balance teaching your children while managing your home",
    "Wanting to contribute financially to your family without sacrificing precious time",
    "Feeling that there's a creative business inside you, but not knowing where to start",
    "Doubting if your paper product ideas could really turn into income",
  ]

  const renderChallenges = () => {
    return challenges.map((challenge, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -20 }}
        animate={isEmpathyInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
        className="flex items-start gap-3 bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm"
      >
        <div className="mt-0.5">
          <Heart className="h-4 w-4 text-brand-pink" />
        </div>
        <p className="text-[#6d4c41]">{challenge}</p>
      </motion.div>
    ))
  }

  // Header visibility logic
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const { scrollY } = useScroll()
  const lastScrollY = useRef(0)

  useEffect(() => {
    return scrollY.onChange((latest) => {
      const currentScrollY = latest
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsHeaderVisible(false)
      } else {
        setIsHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    })
  }, [scrollY])

  // FAQ data

  // FAQ data
  const faqs = [
    {
      question: "How long do I have access to the course?",
      answer:
        "You'll have lifetime access to all course materials, including any future updates. Once you enroll, the content is yours forever.",
    },
    {
      question: "Do I need to buy a printer immediately?",
      answer:
        "No. You get access to our partner printer, allowing you to start selling and fulfilling orders without buying your own equipment first. You can invest in your own printer later once you're profitable.",
    },
    {
      question: "I'm not very artistic. Can I still create beautiful paper products?",
      answer:
        "The course includes step-by-step instructions and templates that make it easy for anyone to create professional-looking products, regardless of artistic ability. Plus, we have free digital products you can use immediately to start selling right away.",
    },
    {
      question: "How much time do I need to commit to the course?",
      answer:
        "The course is self-paced, so you can work through it on your own schedule. Each module takes approximately 5-20 minutes to complete, and you can spread this out over days or weeks as needed.",
    },
    {
      question: "Can I really make money selling paper products?",
      answer:
        "Yes! Many of our students have built successful businesses selling their paper products. The course includes specific strategies for pricing, marketing, and scaling your business to maximize profitability.",
    },
    {
      question: "Pano kung di ako available sa class schedule?",
      answer:
        "Recorded ang livestream classes. You can watch them anytime.",
    },

  ]

  // Testimonial data
  const testimonials = [
    {
      name: "EMJ ALFARO",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials1.jpg-vdiuWnYVM7nV2SaQDk81F9HXwPJVQE.jpeg",
      text: "I want to take a moment to thank Ms. Emigrace Bacani Guevarra and her incredible team for their humility and generosity in sharing their knowledge with us—strangers—seeking to grow our own small businesses. Your guidance has been such a blessing, and I couldn't have made it this far without your support.",
    },
    {
      name: "GIE CRAFTY",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials2-pX2f6lNy6Aa6QnwvxHcosIfvJbB5xu.png",
      text: "One of the most transformative moments in my journey was working with my mentor, Mam Emigrace Guevarra. Late one night, as I struggled with a challenging project, she was there, ready to answer my questions and guide me through it. Her dedication and willingness to help, even in the late hours, deeply touched me.",
    },
    {
      name: "LEIGH HER GON",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials3.jpg-WvXqdRpJPDdys6889dNWwP0cRayabK.jpeg",
      text: "The guides are amazing - when you answer the questions, you're actually creating your own printing business plan! I wish my college professors had taught this way; it would have made creating business plans so much easier back then.",
    },
  ]

  return (
    <>
      <PageTracker metadata={{ variant }} />
      <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
        <motion.header
          className="sticky top-0 z-50 w-full"
          initial={{ y: 0 }}
          animate={{ y: isHeaderVisible ? 0 : -100 }}
          transition={{ duration: 0.3 }}
        >
          <PublicHeader />
        </motion.header>

        <main ref={pageRef} className="relative min-h-screen overflow-x-hidden">
          {/* Success Message */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              >
                <motion.div
                  className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-serif text-[#5d4037]">Enrollment Successful!</h2>
                    <p className="text-[#6d4c41]">
                      Thank you for enrolling in Papers to Profits. You will receive a confirmation email shortly with all
                      the details.
                    </p>
                    <div className="pt-4">
                      <Button
                        className="bg-brand-purple hover:bg-[#8d6e63] text-white"
                        onClick={() => setShowSuccess(false)}
                      >
                        Continue Exploring
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero Section (Variant B) - Replaces Empathy Section */}
          <section
            ref={empathyRef}
            className="w-full py-8 md:py-20 bg-gradient-to-b from-brand-purple/20 to-brand-purple/5 relative overflow-hidden snap-start shrink-0"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-20 left-[5%] w-24 h-24 rounded-full border border-brand-purple opacity-10"
                animate={{
                  y: [0, 20, 0],
                  rotate: [0, 15, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              />
              <motion.div
                className="absolute bottom-40 right-[10%] w-16 h-16 rounded-full border-2 border-brand-pink opacity-20"
                animate={{
                  y: [0, -30, 0],
                  rotate: [0, -20, 0],
                }}
                transition={{
                  duration: 18,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  delay: 5,
                }}
              />
            </div>

            <div className="container px-4 md:px-6">
              <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
                {/* Left side - Image */}
                <motion.div
                  initial="hidden"
                  animate={isEmpathyInView ? "visible" : "hidden"}
                  variants={fadeInFromLeft}
                  className="relative"
                >
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl w-full max-w-md mx-auto">
                    <Image
                      src="/Grace Edited.png"
                      alt="Grace - Your Instructor"
                      width={400}
                      height={500}
                      className="h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-purple/80 via-transparent to-transparent"></div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="space-y-3"
                      >
                        <h3 className="text-2xl font-serif">Grace</h3>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Right side - New Hero Content */}
                <motion.div
                  initial="hidden"
                  animate={isEmpathyInView ? "visible" : "hidden"}
                  variants={staggerContainer}
                  className="flex flex-col justify-center space-y-4 md:space-y-6"
                >
                  <motion.div variants={fadeIn} className="space-y-4">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif tracking-tight text-[#5d4037]">
                      Start a Home-Based Printing Business and Earn From Home — <span className="text-brand-purple">Even Without Your Own Printer</span>
                    </h1>
                    <p className="text-[#6d4c41] text-lg font-light">
                      Papers to Profits teaches you how to create paper products people actually buy — with access to our partner printer so you can start selling even without your own equipment.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-4">
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-[#6d4c41] text-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Beginner-friendly (no experience required)</span>
                      </li>
                      <li className="flex items-center gap-2 text-[#6d4c41] text-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>One-time payment, lifetime access</span>
                      </li>
                      <li className="flex items-center gap-2 text-[#6d4c41] text-lg">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Includes bonus design templates worth Php 5000+</span>
                      </li>
                    </ul>

                    <div className="pt-4 space-y-3">
                      {/* Optimization 2: Strengthen proof right before the CTA */}
                      <div className="mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm text-[#6d4c41] italic font-medium">
                          "I earned 6 figures in 3 months using what I learned inside Papers to Profits."
                          <span className="block text-xs font-bold not-italic mt-1 text-[#5d4037]">— Myca Andrea</span>
                        </p>
                      </div>

                      <Button
                        size="lg"
                        className="bg-brand-purple hover:bg-[#8d6e63] text-white px-6 py-4 text-lg md:px-8 md:py-6 md:text-xl rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                        onClick={() => {
                          const element = document.getElementById("enrollment-form")
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth" })
                          }
                        }}
                      >
                        <span className="flex items-center">
                          {/* Optimization 1: Change primary CTA copy */}
                          Start My Printing Business — ₱1300
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </span>
                      </Button>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Secure checkout via Xendit • Pay with GCash / Maya / Cards
                      </p>
                      <p className="text-xs font-medium text-[#6d4c41]/80 mt-1">
                        ⭐⭐⭐⭐⭐ Trusted by 4,000+ students across the Philippines
                      </p>
                    </div>


                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>



          {/* Partner Printer Access (Standalone Section) */}
          <section className="w-full py-16 md:py-24 bg-white snap-start shrink-0">
            <div className="container px-4 md:px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-4 py-1.5 mb-4">
                    <Printer className="h-4 w-4 text-brand-purple mr-1" />
                    <span className="font-medium text-brand-purple">Exclusive Benefit</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-[#5d4037] mb-4">Partner Printer Access</h2>
                  <p className="text-xl text-[#6d4c41]">Print Without Heavy Equipment</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-center bg-brand-purple/5 rounded-3xl p-6 md:p-10">
                  <div className="space-y-4">
                    <p className="text-[#6d4c41] text-lg leading-relaxed">
                      When you enroll in Papers to Profits, you don’t just learn how to print —
                      you also get access to our partner printer to help you fulfill orders.
                    </p>
                    {/* Optimization 3: Clarify Partner Printer = access, not outsourcing confusion */}
                    <div className="bg-brand-purple/10 p-4 rounded-lg border border-brand-purple/20">
                      <p className="text-xs font-bold text-brand-purple uppercase tracking-wider mb-1">Important:</p>
                      <p className="text-sm text-[#5d4037] font-medium">
                        You own the product, the customer, and the pricing.
                        The partner printer is simply a fulfillment option while you’re starting.
                      </p>
                    </div>
                    <p className="text-[#6d4c41] italic">
                      Many students begin by using the partner printer, then transition to DIY printing later once they’re confident and profitable.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <p className="text-sm font-semibold text-brand-purple mb-4">This allows you to:</p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-[#6d4c41]">
                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        </div>
                        <span>Start selling without immediately buying expensive equipment</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#6d4c41]">
                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        </div>
                        <span>Use our partner printer while you’re getting started</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#6d4c41]">
                        <div className="mt-1 bg-green-100 p-1 rounded-full">
                          <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        </div>
                        <span>Learn the printing process properly before deciding to invest in your own setup</span>
                      </li>
                    </ul>
                    <p className="text-xs text-[#6d4c41]/80 mt-4 border-t border-gray-100 pt-3">
                      Partner printer access details are explained inside the course after enrollment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Hero Section with Immediate Enrollment Form */}
          <section ref={heroRef} className="w-full py-8 md:py-20 bg-white relative overflow-hidden snap-start shrink-0">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <svg
                className="absolute top-0 left-0 right-0 w-full text-brand-purple/5 -mt-1"
                preserveAspectRatio="none"
                viewBox="0 0 1440 54"
                height="54"
              >
                <path
                  fill="currentColor"
                  d="M0 22L60 16.7C120 11 240 1 360 0C480 -1 600 9 720 16C840 23 960 27 1080 25.3C1200 23 1320 16 1380 12.7L1440 9V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z"
                ></path>
              </svg>

              <motion.div
                className="absolute top-40 right-10 w-32 h-32 rounded-full bg-brand-blue/10 blur-xl opacity-50"
                animate={{
                  y: [0, 30, 0],
                  x: [0, 15, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              />
              <motion.div
                className="absolute -bottom-10 left-20 w-40 h-40 rounded-full bg-brand-pink/10 blur-xl opacity-50"
                animate={{
                  y: [0, -20, 0],
                  x: [0, 25, 0],
                }}
                transition={{
                  duration: 18,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  delay: 2,
                }}
              />
            </div>

            <div className="container px-4 md:px-6">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
                {/* Left side - Hero Content */}
                <motion.div
                  initial="hidden"
                  animate={isHeroInView ? "visible" : "hidden"}
                  variants={staggerContainer}
                  className="flex flex-col justify-center space-y-4 md:space-y-6"
                  style={{ y: heroTextY }}
                >
                  <motion.div variants={fadeIn} className="space-y-4">
                    <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-medium text-brand-purple mb-4">
                      <Star className="h-3 w-3 mr-1" />
                      <span>Limited Time Offer</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif tracking-tight text-[#5d4037]">
                      Papers to Profits
                    </h1>
                    <p className="text-xl md:text-2xl text-brand-purple font-light">
                      A step-by-step course to create, price, and sell paper products that actually sell
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-4">
                    <p className="text-[#6d4c41] text-lg">
                      Learn the exact process to go from idea → product → profit — even if you’re starting from zero.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {[
                            "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face&auto=format&q=80",
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&auto=format&q=80",
                            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face&auto=format&q=80",
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face&auto=format&q=80"
                          ].map((src, i) => (
                            <div key={i} className="relative">
                              <Image
                                src={src}
                                alt={`Student ${i + 1}`}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-[#6d4c41]">
                          <span className="font-medium">4,000+ students</span> enrolled
                        </span>
                      </div>

                      <div className="flex items-center">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-[#6d4c41]">
                          <span className="font-medium">4.9/5</span> rating
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold text-brand-purple">
                        ₱{(courseDetails.fullPrice / 100).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">{renderFeatures()}</div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      size="lg"
                      className="bg-brand-purple hover:bg-[#8d6e63] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => {
                        const element = document.getElementById("enrollment-form")
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" })
                        }
                      }}
                    >
                      <span className="flex items-center">
                        Get Instant Access
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>
                  </motion.div>

                  {/* ABOVE-THE-FOLD TESTIMONIALS (New Placement) */}
                  <div className="pt-8 border-t border-gray-100">
                    <p className="text-sm font-semibold text-brand-purple uppercase tracking-wider mb-4">Trusted by thousands of students</p>
                    <div className="space-y-4">
                      {/* Testimonial 1 */}
                      <div className="bg-brand-purple/5 p-4 rounded-xl">
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                          <span className="ml-2 text-xs font-bold text-[#5d4037]">MYCA ANDREA</span>
                        </div>
                        <p className="text-sm text-[#6d4c41] italic leading-relaxed">
                          "What started as a simple hobby has now turned into a small business I genuinely enjoy. Papers to Profits gave me the structure, motivation, and support I needed to actually start and sell my own handmade products."
                        </p>
                      </div>

                      {/* Testimonial 2 */}
                      <div className="bg-brand-purple/5 p-4 rounded-xl">
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                          <span className="ml-2 text-xs font-bold text-[#5d4037]">LEIGH HER GON</span>
                        </div>
                        <p className="text-sm text-[#6d4c41] italic leading-relaxed">
                          "The guides don’t just teach concepts — they actually help you create your own printing business plan. It made starting feel much easier."
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right side - Enrollment Form */}
                <motion.div
                  ref={formRef}
                  id="enrollment-form"
                  initial="hidden"
                  animate={isFormInView ? "visible" : "hidden"}
                  variants={fadeInFromRight}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
                >
                  <div className="bg-gradient-to-r from-brand-purple to-brand-pink p-4 md:p-6 text-white">
                    <h2 className="text-xl md:text-2xl font-serif">Enroll Now</h2>
                    <p className="text-white/90 text-sm md:text-base">Get instant access to the full course</p>
                  </div>

                  <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="email" className="text-[#5d4037]">
                        Email
                      </Label>

                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleEmailBlur}
                        className={`bg-white ${errors.email ? "border-red-500" : ""}`}
                        placeholder="your.email@example.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="phone" className="text-[#5d4037]">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`bg-white ${errors.phone ? "border-red-500" : ""}`}
                        placeholder="+63 XXX XXX XXXX"
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div className="bg-brand-purple/5 rounded-lg p-4 flex items-center justify-between text-sm text-[#6d4c41] flex-wrap gap-3">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-brand-purple mr-2 flex-shrink-0" />
                        <p>You'll be redirected to our secure payment page after submitting your information.</p>
                      </div>

                      {/* Powered by Xendit Badge */}
                      <div className="h-10 flex items-center rounded px-1 ml-auto">
                        <img src="/logos/xendit-badge-blue-transparent.png" alt="Powered by Xendit" className="h-8 w-auto object-contain" />
                      </div>
                    </div>

                    {errors.payment && (
                      <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm">{errors.payment}</div>
                    )}

                    <div className="flex items-start space-x-2 my-4">
                      <Checkbox
                        id="marketing-opt-in"
                        checked={marketingOptIn}
                        onCheckedChange={(checked) => setMarketingOptIn(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="marketing-opt-in"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#5d4037]"
                        >
                          Email me guidance, reminders, occasional offers and discounts related to this purchase
                        </label>
                        <p className="text-xs text-muted-foreground">
                          You can unsubscribe anytime. We don’t spam.
                        </p>
                      </div>
                    </div>


                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-[#6d4c41] font-medium uppercase tracking-wide text-center">Secure Payment via:</p>
                        <div className="flex items-center justify-center gap-4 flex-wrap opacity-90 grayscale-[0.2] hover:grayscale-0 transition-all duration-300">
                          {/* GCash Logo */}
                          <div className="h-6 flex items-center bg-transparent rounded px-1">
                            <img src="/logos/gcash-logo.svg" alt="GCash" className="h-5 w-auto object-contain" />
                          </div>

                          {/* Maya Logo */}
                          <div className="h-6 flex items-center bg-transparent rounded px-1">
                            <img src="/logos/maya-logo.svg" alt="Maya" className="h-5 w-auto object-contain" />
                          </div>

                          {/* Cards (Visa/MC) */}
                          <div className="flex gap-3 items-center ml-2">
                            <img src="/logos/visa-logo.svg" alt="Visa" className="h-4 w-auto object-contain" />
                            <img src="/logos/mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto object-contain" />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-4 md:py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
                            Get Instant Access — ₱1300
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>

                      <div className="pt-2 text-center border-t border-gray-100 mt-2">
                        <div className="flex justify-center items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-brand-purple" />
                          <span className="font-serif text-[#5d4037] font-semibold text-sm">48-Hour Confidence Guarantee</span>
                        </div>
                        <p className="text-xs text-[#6d4c41] leading-relaxed px-4">
                          Enroll today and explore the course. If within 48 hours you feel Papers to Profits isn’t right for you,
                          message us and we’ll refund your payment.
                        </p>
                      </div>

                      <p className="text-xs text-center text-[#6d4c41]/70 mt-3 flex items-center justify-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        Secure checkout • 48-Hour Confidence Guarantee
                      </p>
                    </div>
                  </form>
                </motion.div>
              </div >
            </div >
          </section >


          {/* Do I Need a Printer Section (Variant B - Updated) */}
          <section className="w-full py-10 md:py-16 bg-white border-t border-gray-100 snap-start shrink-0">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto text-center space-y-6">
                <h2 className="text-3xl md:text-4xl font-serif text-[#5d4037]">Do I need to buy a printer to start?</h2>
                <div className="text-lg text-[#6d4c41] leading-relaxed space-y-4">
                  <p className="font-semibold">Not right away.</p>
                  <p>
                    Inside Papers to Profits, you’ll learn how to start in a way that fits your budget — including how to use our partner printer while you’re getting started, and when it makes sense to invest in your own equipment later.
                  </p>
                  <p>
                    Many students begin by selling first using the partner printer, then move to DIY printing once they’re ready.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Course Details Section - Updated Modules */}
          <section id="course-details" className="w-full py-12 md:py-20 bg-brand-purple/5 snap-start shrink-0">
            <div className="container px-4 md:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center space-y-4 text-center mb-16"
              >
                <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-4 py-1.5 mb-4">
                  <BookOpen className="h-4 w-4 text-brand-purple mr-1" />
                  <span className="font-medium text-brand-purple">Course Overview</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif tracking-tighter text-[#5d4037]">What You'll Learn</h2>
                <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
                  A complete, step-by-step foundation for building and launching your own paper-based products.
                </p>
                <p className="text-sm font-medium text-[#5d4037]/80">
                  Each module is designed to help you move from idea → product → selling, step by step.
                </p>
              </motion.div>

              <Tabs defaultValue="curriculum" className="w-full">
                <TabsList className="w-full p-1 bg-white rounded-full grid grid-cols-3 mb-8 overflow-x-auto max-w-2xl mx-auto">
                  <TabsTrigger value="curriculum" className="rounded-full data-[state=active]:bg-brand-purple data-[state=active]:text-white transition-all duration-500 capitalize">Curriculum</TabsTrigger>
                  <TabsTrigger value="instructor" className="rounded-full data-[state=active]:bg-brand-purple data-[state=active]:text-white transition-all duration-500 capitalize">Your Instructor</TabsTrigger>
                  <TabsTrigger value="faq" className="rounded-full data-[state=active]:bg-brand-purple data-[state=active]:text-white transition-all duration-500 capitalize">FAQ</TabsTrigger>
                </TabsList>

                <TabsContent value="curriculum" className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {/* MODULE GROUP 1 */}
                    <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6 md:p-8 space-y-4">
                        <div className="bg-brand-purple/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                          <Printer className="h-6 w-6 text-brand-purple" />
                        </div>
                        <h3 className="text-xl font-serif text-[#5d4037] mb-2">MODULE 1 — PRINT FOUNDATIONS</h3>
                        <p className="text-sm text-[#6d4c41]/80 italic mb-3">Learn how printing actually works before spending money.</p>
                        <p className="text-[#6d4c41] leading-relaxed">
                          You’ll understand materials, printers, papers, binding machines, and realistic setup options — including how to start without buying everything upfront.
                        </p>
                      </CardContent>
                    </Card>

                    {/* MODULE GROUP 2 */}
                    <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6 md:p-8 space-y-4">
                        <div className="bg-brand-pink/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                          <Lightbulb className="h-6 w-6 text-brand-pink" />
                        </div>
                        <h3 className="text-xl font-serif text-[#5d4037] mb-2">MODULE 2 — PRODUCT CREATION</h3>
                        <p className="text-sm text-[#6d4c41]/80 italic mb-3">Turn ideas into real, sellable paper products.</p>
                        <p className="text-[#6d4c41] leading-relaxed">
                          From idea generation and niche selection to pricing and production timelines, this module helps you create products people actually want to buy.
                        </p>
                      </CardContent>
                    </Card>

                    {/* MODULE GROUP 3 */}
                    <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6 md:p-8 space-y-4">
                        <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                          <Package className="h-6 w-6 text-brand-blue" />
                        </div>
                        <h3 className="text-xl font-serif text-[#5d4037] mb-2">MODULE 3 — BINDING & FINISHING</h3>
                        <p className="text-sm text-[#6d4c41]/80 italic mb-3">Make your products look clean, professional, and premium.</p>
                        <p className="text-[#6d4c41] leading-relaxed">
                          Learn multiple binding and finishing techniques so your journals, planners, and notebooks stand out.
                        </p>
                      </CardContent>
                    </Card>

                    {/* MODULE GROUP 4 & 5 */}
                    <Card className="bg-white border-none shadow-md hover:shadow-xl transition-all duration-300 md:col-span-2 lg:col-span-3">
                      <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <Rocket className="h-6 w-6 text-green-600" />
                          </div>
                          <h3 className="text-xl font-serif text-[#5d4037] mb-2">MODULE 4 — LAUNCH & SELLING</h3>
                          <p className="text-sm text-[#6d4c41]/80 italic mb-3">Prepare, launch, and start selling your products.</p>
                          <p className="text-[#6d4c41] leading-relaxed">
                            Learn how to build demand, choose the right platform, and prepare for launch day with clarity.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-yellow-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                            <Star className="h-6 w-6 text-yellow-500" />
                          </div>
                          <h3 className="text-xl font-serif text-[#5d4037] mb-2">MODULE 5 — PRICING & COSTING (BONUS)</h3>
                          <p className="text-sm text-[#6d4c41]/80 italic mb-3">Price your products properly so you don’t undercharge.</p>
                          <p className="text-[#6d4c41] leading-relaxed">
                            Understand costing and margins so every sale makes sense.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                  </div>



                  <p className="text-center text-[#6d4c41] max-w-2xl mx-auto italic mt-8 border-t border-gray-100 pt-6">
                    All lessons are short, practical, and designed for beginners. Full lesson breakdown is available inside the course.
                  </p>

                  <div className="flex justify-center mt-8">
                    <Button
                      className="bg-brand-purple hover:bg-[#8d6e63] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => {
                        const element = document.getElementById("enrollment-form")
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" })
                        }
                      }}
                    >
                      <span className="flex items-center">
                        Enroll Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="instructor" className="mt-8">
                  <div className="pt-8 pb-16">
                    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 items-start max-w-5xl mx-auto">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-xl">
                          <Image
                            src="/Grace Edited.png"
                            alt="Grace - Your Instructor"
                            width={400}
                            height={500}
                            className="h-auto"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="text-white">
                              <h3 className="text-xl font-serif">Grace</h3>
                              <p className="text-white/80 text-sm">Homeschooling Expert & Paper Crafting Specialist</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="space-y-6"
                      >
                        <div>
                          <h3 className="text-2xl font-serif text-[#5d4037] mb-4">Meet Your Instructor</h3>
                          <p className="text-[#6d4c41] mb-4">
                            As a stay-at-home mom homeschooling 3 kids, I understand the unique challenges and joys of
                            educating your children at home. My journey into paper crafting began as a way to create
                            customized educational materials for my own children.
                          </p>
                          <p className="text-[#6d4c41] mb-4">
                            What started as a passion project quickly grew into a thriving business as other homeschooling
                            parents began requesting my journals and planners. Over the past 5 years, I've refined my
                            techniques and business strategies, and now I'm excited to share everything I've learned with
                            you.
                          </p>
                          <p className="text-[#6d4c41]">
                            In this course, I'll guide you step-by-step through the entire process of creating beautiful
                            paper products that not only enhance your homeschooling journey but can also become a
                            sustainable source of income for your family.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                          <div className="bg-brand-purple/5 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-brand-purple mb-1">5+</div>
                            <div className="text-sm text-[#6d4c41]">Years of Experience</div>
                          </div>
                          <div className="bg-brand-purple/5 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-brand-purple mb-1">4,000+</div>
                            <div className="text-sm text-[#6d4c41]">Students Taught</div>
                          </div>
                          <div className="bg-brand-purple/5 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-brand-purple mb-1">$100k+</div>
                            <div className="text-sm text-[#6d4c41]">Revenue Generated</div>
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button
                            className="bg-brand-purple hover:bg-[#8d6e63] text-white"
                            onClick={() => {
                              const element = document.getElementById("enrollment-form")
                              if (element) {
                                element.scrollIntoView({ behavior: "smooth" })
                              }
                            }}
                          >
                            <span className="flex items-center">
                              Learn from Grace
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="faq" className="mt-8">
                  <div className="py-8">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-serif text-[#5d4037]">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-6 max-w-3xl mx-auto">
                      {faqs.map((faq, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                          <Card className="bg-white border-none shadow-md hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg font-medium text-[#5d4037]">{faq.question}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-[#6d4c41]">{faq.answer}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-brand-purple/5 rounded-lg p-6 mt-12 max-w-3xl mx-auto text-center">
                      <h3 className="text-lg font-medium text-[#5d4037] mb-4">Still have questions?</h3>
                      <p className="text-[#6d4c41] mb-4">
                        We're here to help! Contact us at{" "}
                        <span className="text-brand-purple">help@gracefulhomeschooling.com</span> and we'll get back to
                        you as soon as possible.
                      </p>
                      <Button
                        className="bg-brand-purple hover:bg-[#8d6e63] text-white"
                        onClick={() => {
                          const element = document.getElementById("enrollment-form")
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth" })
                          }
                        }}
                      >
                        <span className="flex items-center">
                          Enroll Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="w-full py-20 md:py-28 bg-white">
            <div className="container px-4 md:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center space-y-4 text-center mb-16"
              >
                <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-4 py-1.5 mb-4">
                  <Star className="h-4 w-4 text-brand-purple mr-1" />
                  <span className="font-medium text-brand-purple">Success Stories</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif tracking-tighter text-[#5d4037]">What Our Students Say</h2>
                <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
                  Join hundreds of successful students who have transformed their passion into profit
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ y: -10 }}
                  >
                    <Card className="h-full bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden">
                            <Image
                              src={testimonial.image || "/placeholder.svg"}
                              alt={`${testimonial.name}'s testimonial`}
                              width={100}
                              height={125}
                              className="h-auto"
                            />
                          </div>
                          <div>
                            <h3 className="font-medium text-[#5d4037]">{testimonial.name}</h3>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, index) => (
                                <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-[#6d4c41] italic">{testimonial.text}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center mt-12">
                <Button
                  className="bg-brand-purple hover:bg-[#8d6e63] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => {
                    const element = document.getElementById("enrollment-form")
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" })
                    }
                  }}
                >
                  <span className="flex items-center">
                    Get Instant Access — ₱1300
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Button>
              </div>
            </div>
          </section>

          <section className="w-full py-16 bg-[#f9f6f2]">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center border border-brand-purple/10">
                <div className="bg-brand-purple/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-brand-purple" />
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-[#5d4037] mb-4">
                  48-Hour Confidence Guarantee
                </h2>
                <p className="text-[#6d4c41] mb-8 leading-relaxed">
                  We're confident that Papers to Profits will give you the clarity and skills you need to start your printing business. If you join and feel it's not the right fit for you, simply let us know within 48 hours of enrollment, and we'll process a full refund—no questions asked.
                </p>
                <div className="flex justify-center">
                  <Button
                    className="bg-brand-purple hover:bg-[#8d6e63] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {
                      const element = document.getElementById("enrollment-form")
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                  >
                    <span className="flex items-center">
                      Join Risk-Free — ₱1300
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  </Button>
                </div>
                <p className="text-sm text-[#6d4c41]/60 mt-4">
                  Secure checkout via Xendit • Instant Access
                </p>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="w-full py-16 md:py-24 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
            <div className="container px-4 md:px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="space-y-6 max-w-3xl mx-auto"
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif">
                  Ready to Start Your Home-Based Printing Business?
                </h2>
                <p className="text-xl text-white/90">
                  Enroll today and get lifetime access for ₱1300.
                </p>

                <div className="flex flex-col gap-4 justify-center pt-4 items-center">
                  <Button
                    size="lg"
                    className="bg-white text-brand-purple hover:bg-white/90 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                    onClick={() => {
                      const element = document.getElementById("enrollment-form")
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                  >
                    <span className="flex items-center justify-center">
                      Start My Printing Business — ₱1300
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  </Button>

                  <p className="text-sm text-white/80 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    48-Hour Confidence Guarantee • Secure checkout via Xendit
                  </p>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div >
    </>
  )
}

