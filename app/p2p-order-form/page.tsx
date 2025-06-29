"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion"
import { BookOpen, ChevronRight, ArrowRight, Star, Check, Shield, Play, Clock, Heart } from "lucide-react"
import Head from "next/head"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { useMobile } from "@/hooks/use-mobile"
import { createPaymentIntent } from "@/app/actions/payment-actions"

export default function PapersToProfit() {
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

  // Update the handleSubmit function to properly handle the redirect
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsProcessing(true)

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

  // Module data
  const modules = [
    {
      title: "Module 1: Foundations of Paper Products",
      description: "Learn the basics of paper types, tools, and design principles",
      lessons: [
        "Understanding paper weights and types",
        "Essential tools for paper crafting",
        "Basic design principles for paper products",
        "Planning your first journal or planner",
      ],
      duration: "2 hours",
    },
    {
      title: "Module 2: Design & Layout",
      description: "Master the art of creating functional and beautiful layouts",
      lessons: [
        "Creating user-friendly page layouts",
        "Typography for readability and style",
        "Color theory for paper products",
        "Designing covers that sell",
      ],
      duration: "3 hours",
    },
    {
      title: "Module 3: Binding Techniques",
      description: "Learn various binding methods to create professional products",
      lessons: [
        "Spiral and coil binding basics",
        "Perfect binding for professional look",
        "Japanese stab binding for decorative journals",
        "Choosing the right binding for your product",
      ],
      duration: "2.5 hours",
    },
    {
      title: "Module 4: Business Fundamentals",
      description: "Transform your skills into a profitable business",
      lessons: [
        "Pricing strategies for handmade products",
        "Building your brand identity",
        "Marketing to the homeschooling community",
        "Scaling your production efficiently",
      ],
      duration: "3.5 hours",
    },
  ]

  // FAQ data
  const faqs = [
    {
      question: "How long do I have access to the course?",
      answer:
        "You'll have lifetime access to all course materials, including any future updates. Once you enroll, the content is yours forever.",
    },
    {
      question: "Do I need any special equipment or supplies?",
      answer:
        "The course is designed to start with basic supplies that are affordable and easy to find. We provide a complete supply list, and as you progress, you can invest in more specialized tools if you choose.",
    },
    {
      question: "I'm not very artistic. Can I still create beautiful paper products?",
      answer:
        "The course includes step-by-step instructions and templates that make it easy for anyone to create professional-looking products, regardless of artistic ability.",
    },
    {
      question: "How much time do I need to commit to the course?",
      answer:
        "The course is self-paced, so you can work through it on your own schedule. Each module takes approximately 2-3 hours to complete, and you can spread this out over days or weeks as needed.",
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
      {/* Facebook Meta Pixel Code for analytics and ad attribution */}
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1174901340768236');
            fbq('track', 'PageView');`
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1174901340768236&ev=PageView&noscript=1"
            alt="fb pixel"
          />
        </noscript>
      </Head>
      <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
        <PublicHeader />

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

          {/* Empathy Section - New! */}
          <section
            ref={empathyRef}
            className="w-full py-12 md:py-20 bg-gradient-to-b from-brand-purple/20 to-brand-purple/5 relative overflow-hidden"
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
                {/* Left side - Instructor's Message */}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-purple/80 via-brand-purple/30 to-transparent"></div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="space-y-3"
                      >
                        <h3 className="text-2xl font-serif">Grace</h3>
                        <p className="text-white/90 text-sm">Homeschooling Mom of 3</p>
                        <div className="flex items-center gap-2 text-white/80">
                          <Heart className="h-4 w-4 text-brand-pink" />
                          <span className="text-sm font-light">Passionate about helping you succeed</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Quote bubble */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="absolute top-8 -right-4 md:-right-12 bg-white rounded-2xl p-4 shadow-lg max-w-[200px] z-10"
                  >
                    <p className="text-[#6d4c41] text-sm italic">{"Let me guide you on this journey..."}</p>
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45"></div>
                  </motion.div>
                </motion.div>

                {/* Right side - Empathy Message */}
                <motion.div
                  initial="hidden"
                  animate={isEmpathyInView ? "visible" : "hidden"}
                  variants={staggerContainer}
                  className="flex flex-col justify-center space-y-6"
                >
                  <motion.div variants={fadeIn} className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-serif tracking-tight text-[#5d4037]">
                      I understand your journey as a homeschooling mom
                    </h2>
                    <p className="text-[#6d4c41] text-lg font-light">
                      As a stay-at-home mom homeschooling 3 kids, I know the challenges you face every day:
                    </p>
                  </motion.div>

                  <div className="space-y-4">{renderChallenges()}</div>

                  <motion.div variants={fadeIn} className="pt-4">
                    <p className="text-[#6d4c41] text-lg border-l-4 border-brand-purple pl-4 italic">
                      That is why I created Papers to Profits - to help moms like us create beautiful paper products that
                      sell while still being present for our families.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="pt-4">
                    <motion.div animate={pulseAnimation} className="inline-block">
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
                          Join Me on This Journey
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </span>
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Hero Section with Immediate Enrollment Form */}
          <section ref={heroRef} className="w-full py-12 md:py-20 bg-white relative overflow-hidden">
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
                  className="flex flex-col justify-center space-y-6"
                  style={{ y: heroTextY }}
                >
                  <motion.div variants={fadeIn} className="space-y-2">
                    <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-medium text-brand-purple mb-4">
                      <Star className="h-3 w-3 mr-1" />
                      <span>Limited Time Offer</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif tracking-tight text-[#5d4037]">
                      Papers to Profits
                    </h1>
                    <p className="text-xl md:text-2xl text-brand-purple font-light">
                      Transform Your Passion for Paper Products Into A Thriving Business
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-4">
                    <p className="text-[#6d4c41] text-lg">
                      Create beautiful, functional paper products that sell while being present for your family.
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
                          <span className="font-medium">3,000+ students</span> enrolled
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
                        Enroll Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="border-brand-purple text-brand-purple hover:bg-brand-purple/10 px-8 py-6 text-lg rounded-full"
                      onClick={() => {
                        const element = document.getElementById("course-details")
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" })
                        }
                      }}
                    >
                      Learn More
                    </Button>
                  </motion.div>
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
                  <div className="bg-gradient-to-r from-brand-purple to-brand-pink p-6 text-white">
                    <h2 className="text-2xl font-serif">Enroll Now</h2>
                    <p className="text-white/90">Get instant access to the full course</p>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`bg-white ${errors.phone ? "border-red-500" : ""}`}
                        placeholder="+63 XXX XXX XXXX"
                      />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div className="bg-brand-purple/5 rounded-lg p-4 flex items-center text-sm text-[#6d4c41]">
                      <Shield className="h-5 w-5 text-brand-purple mr-2 flex-shrink-0" />
                      <p>You'll be redirected to our secure payment page after submitting your information.</p>
                    </div>

                    {errors.payment && (
                      <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm">{errors.payment}</div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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
                          Proceed to Payment
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Course Details Section */}
          <section id="course-details" className="w-full py-20 md:py-28 bg-brand-purple/5">
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
                  Our comprehensive curriculum covers everything you need to create beautiful, functional paper products
                  that sell.
                </p>
              </motion.div>

              <Tabs defaultValue="curriculum" className="w-full">
                <TabsList className="w-full p-1 bg-white rounded-full grid grid-cols-3 mb-8 overflow-x-auto">
                  {["curriculum", "instructor", "faq"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-full data-[state=active]:bg-brand-purple data-[state=active]:text-white transition-all duration-500 capitalize"
                    >
                      {tab === "curriculum" ? "Curriculum" : tab === "instructor" ? "Your Instructor" : "FAQ"}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="curriculum" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {modules.map((module, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                      >
                        <Card className="h-full bg-white border-none shadow-lg hover:shadow-xl transition-all duration-300">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-xl font-serif text-[#5d4037]">{module.title}</CardTitle>
                              <div className="flex items-center text-xs text-[#6d4c41] bg-brand-purple/5 px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3 mr-1" />
                                {module.duration}
                              </div>
                            </div>
                            <p className="text-[#6d4c41] text-sm">{module.description}</p>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {module.lessons.map((lesson, j) => (
                                <li key={j} className="flex items-start gap-2 text-sm">
                                  <Play className="h-4 w-4 text-brand-purple mt-0.5" />
                                  <span className="text-[#6d4c41]">{lesson}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

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

                <TabsContent value="instructor" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 items-start">
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
                          <div className="text-3xl font-bold text-brand-purple mb-1">3,000+</div>
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
                </TabsContent>

                <TabsContent value="faq" className="space-y-6">
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

                  <div className="bg-brand-purple/5 rounded-lg p-6 mt-8">
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
                    Join Our Community
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Button>
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
                  Ready to Transform Your Passion into Profit?
                </h2>
                <p className="text-xl text-white/90">
                  Enroll Today and Start Creating Beautiful Paper Products That Sell!
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-brand-purple hover:bg-white/90 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
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

                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-brand-purple hover:bg-white/10 px-8 py-6 text-lg rounded-full"
                    onClick={() => {
                      const element = document.getElementById("course-details")
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" })
                      }
                    }}
                  >
                    Learn More
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  )
}

