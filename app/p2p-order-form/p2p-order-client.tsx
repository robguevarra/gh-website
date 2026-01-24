"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion"
import { BookOpen, ChevronRight, ArrowRight, Star, Check, Shield, Heart, Printer, Lightbulb, Package, Rocket, Clock } from "lucide-react"


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

export default function PapersToProfit({ variant = 'A' }: { variant?: string }) {
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
            sourcePage: '/p2p-order-form', // Changed back to main path
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
                          Get Instant Access — ₱1300
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
                }}
              />
            </div>

            <div className="container px-4 md:px-6 relative z-10">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h2 className="text-3xl md:text-4xl font-serif text-[#5d4037]">
                        Enrollment is Open for Papers to Profits!
                      </h2>
                      <p className="text-lg text-[#6d4c41]">
                        Get immediate access to the course and start your journey to a profitable printing business.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <Card className="border-brand-purple/20 shadow-md">
                        <CardHeader className="bg-brand-purple/5 pb-4">
                          <CardTitle className="flex items-center gap-2 text-[#5d4037]">
                            <BookOpen className="h-5 w-5 text-brand-purple" />
                            What's Included:
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid gap-3">
                            {renderFeatures()}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                        <div className="flex items-start gap-3">
                          <Star className="h-6 w-6 text-orange-400 fill-orange-400 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-[#5d4037] mb-1">Risk-Free Enrollment</h3>
                            <p className="text-sm text-[#6d4c41]">
                              We're confident you'll love the course. Join thousands of other happy students today!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="enrollment-form" ref={formRef} className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 sticky top-24">
                    <div className="mb-6 text-center">
                      <h3 className="text-2xl font-bold text-[#5d4037] mb-2">Secure Your Spot</h3>
                      <p className="text-sm text-[#6d4c41]">Choose your payment plan below</p>
                    </div>

                    <Tabs defaultValue="full" onValueChange={setSelectedPlan} className="w-full mb-6">
                      <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-gray-100/50">
                        <TabsTrigger
                          value="full"
                          className="py-3 data-[state=active]:bg-white data-[state=active]:text-brand-purple data-[state=active]:shadow-sm"
                        >
                          <div className="text-center">
                            <div className="font-bold">Full Payment</div>
                            <div className="text-xs opacity-90">Save ₱1,000</div>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger
                          value="monthly"
                          className="py-3 data-[state=active]:bg-white data-[state=active]:text-brand-purple data-[state=active]:shadow-sm"
                        >
                          <div className="text-center">
                            <div className="font-bold">Installment</div>
                            <div className="text-xs opacity-90">3 Monthly Payments</div>
                          </div>
                        </TabsTrigger>
                      </TabsList>

                      <AnimatePresence mode="wait">
                        <TabsContent value="full" className="mt-4">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center mb-6"
                          >
                            <div className="text-4xl font-bold text-brand-purple">₱1,300</div>
                            <div className="text-sm text-[#6d4c41] line-through">Regular Price: ₱2,300</div>
                            <div className="mt-2 inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                              Best Value - Save 19%
                            </div>
                          </motion.div>
                        </TabsContent>
                        <TabsContent value="monthly" className="mt-4">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center mb-6"
                          >
                            <div className="text-4xl font-bold text-brand-purple">₱499</div>
                            <div className="text-sm text-[#6d4c41]">billed monthly for 3 months</div>
                            <div className="mt-2 inline-block bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                              Flexible Option
                            </div>
                          </motion.div>
                        </TabsContent>
                      </AnimatePresence>
                    </Tabs>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="Maria"
                            className={errors.firstName ? "border-red-500" : ""}
                          />
                          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Santos"
                            className={errors.lastName ? "border-red-500" : ""}
                          />
                          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleEmailBlur}
                          placeholder="maria@example.com"
                          className={errors.email ? "border-red-500" : ""}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex">
                          <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">
                            +63
                          </div>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="912 345 6789"
                            className={`rounded-l-none ${errors.phone ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                      </div>

                      <div className="flex items-top space-x-2 pt-2">
                        <Checkbox
                          id="marketing"
                          checked={marketingOptIn}
                          onCheckedChange={(checked) => setMarketingOptIn(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="marketing"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#5d4037]"
                          >
                            Email me guidance and tips for starting my printing business (Unsubscribe anytime)
                          </label>
                        </div>
                      </div>

                      {errors.payment && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {errors.payment}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            Enroll Now <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </Button>

                      <p className="text-xs text-center text-gray-500 mt-4">
                        By enrolling, you agree to our Terms of Service and Privacy Policy.
                        Secure payment processing powered by Xendit.
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Module Curriculum */}
          <section className="w-full py-16 md:py-24 bg-[#f3e5f5]">
            <div className="container px-4 md:px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-serif text-[#5d4037] mb-4">Course Curriculum</h2>
                <p className="text-lg text-[#6d4c41] max-w-2xl mx-auto">
                  A comprehensive step-by-step guide to building your paper products business
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                {/* Module 1 */}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#5d4037]">Module 1: Print Class</CardTitle>
                    <p className="text-[#6d4c41]">
                      Start strong with the core foundations of creating profitable paper products.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        How to turn your creative ideas into tangible, high-quality products
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Basics of printing and paper crafting for beginners
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        The essential mindset to start your paperpreneur journey
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Clarifying your purpose, passion, vision, mission, and values
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Building a strong foundation before moving to design and production
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Module 2 */}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#5d4037]">Module 2: Product Creation Class</CardTitle>
                    <p className="text-[#6d4c41]">
                      Learn how to confidently turn your ideas into polished, sellable products.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        The full process of developing your own paper product from idea to output
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        How to bring your unique ideas to life, whether you're a beginner or already selling
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Ways to improve or refine existing designs for better quality and appeal
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        A clear, step-by-step approach to creating with purpose and strategy
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Module 3 */}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#5d4037]">Module 3: Launch Class</CardTitle>
                    <p className="text-[#6d4c41]">
                      Turn your product into profit with a successful and strategic launch.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        A step-by-step guide to launching your paper products with confidence
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Key strategies to bring your product to market successfully
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        How to plan, prepare, and execute a strong product launch
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Tips for launching a new collection or expanding an existing line
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Insights to help you stand out and sell well from day one
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Module 4 */}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#5d4037]">Module 4: Binding Techniques</CardTitle>
                    <p className="text-[#6d4c41]">Upgrade your paper products with professional binding skills.</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        How binding methods impact product quality, durability, and appearance
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Choosing the best binding technique for your journals, planners, or notepads
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Practical tips to make your products look polished and premium
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Skills that elevate your brand and set your products apart
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Module 5 */}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#5d4037]">Module 5: Bonus Elective</CardTitle>
                    <p className="text-[#6d4c41]">
                      Strengthen the backbone of your paper product business with practical tools and strategies.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Core principles every paperpreneur needs to run a sustainable business
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        How to manage and price your products with confidence
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Key mindset shifts for growth and long-term success
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Practical systems to help you stay organized and profitable
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#6d4c41]">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full flex-shrink-0" />
                        Foundations that prepare you to scale your brand with purpose
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="w-full py-16 md:py-24 bg-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[#f9f6f2] transform -skew-y-3 z-0 origin-right scale-110"></div>
            <div className="container px-4 md:px-6 relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-serif text-[#5d4037] mb-4">Moms Like You Taking Action</h2>
                <p className="text-lg text-[#6d4c41]">
                  Join a community of homeschooling moms building their own businesses
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-brand-purple/20">
                      <Image
                        src={testimonial.image || "/placeholder.svg"}
                        alt={testimonial.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-[#6d4c41] italic text-sm">"{testimonial.text}"</p>
                    </div>
                    <div className="mt-auto">
                      <span className="font-bold text-[#5d4037] block">{testimonial.name}</span>
                      <span className="text-xs text-[#6d4c41]">Verified Student</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="w-full py-20 md:py-32 bg-brand-purple relative overflow-hidden text-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/5"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
              <motion.div
                className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white/5"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: 2,
                }}
              />
            </div>

            <div className="container px-4 md:px-6 relative z-10">
              <div className="max-w-3xl mx-auto space-y-8">
                <h2 className="text-3xl md:text-5xl font-serif text-white">
                  Ready to Start Your Paper Products Business?
                </h2>
                <p className="text-xl text-white/90">
                  Don't let doubt hold you back. You have everything you need to start today.
                </p>
                <div className="pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-brand-purple hover:bg-gray-100 px-8 py-6 text-xl rounded-full shadow-xl transition-all duration-300"
                    onClick={() => {
                      const element = document.getElementById("enrollment-form")
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                  >
                    Enroll Now
                  </Button>
                </div>
                <div className="pt-8 flex justify-center gap-8 text-white/70 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Secure Payment
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Lifetime Access
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  )
}
