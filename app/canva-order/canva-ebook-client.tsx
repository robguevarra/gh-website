"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Shield, Heart, Loader } from "lucide-react"
import Head from "next/head"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { useMobile } from "@/hooks/use-mobile"
import { createPaymentIntent } from "@/app/actions/payment-actions"

// --- Ebook Details ---
const ebookDetails = {
  id: "canva-ebook-01",
  name: "My Canva Business Ebook",
  tagline: "Learn How to Earn Using Canva!",
  description: "In this book, I share my learnings and experiences in creating and selling physical and digital products using Canva. My prayer is that this helps you and brings a breakthrough to your own journey!",
  price: 4900, // Price in cents (Php 49.00)
  currency: "PHP",
  imageUrl: "/canva-ebook.jpg",
  author: {
    name: "Grace",
    title: "Homeschooling Mom & Canva Expert", 
    imageUrl: "/Grace Edited.png",
  },
  features: [
    "Personal experiences and learnings",
    "Tips for creating physical products",
    "Guidance on selling digital products", 
    "Using Canva effectively for business",
    "Actionable insights for your breakthrough",
  ],
};

// Loading component for Suspense
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <Loader className="h-12 w-12 animate-spin text-[#ad8174] mx-auto mb-4" />
        <h2 className="text-xl font-serif text-[#5d4037]">Loading...</h2>
        <p className="text-[#6d4c41] mt-2">Please wait a moment.</p>
      </div>
    </div>
  );
}

// Main content component
function CanvaEbookContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // For potential future success message
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isMobile = useMobile();

  useEffect(() => {
    setIsLoaded(true);
    // Add any other on-load effects if needed
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.phone) {
       newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) { 
       newErrors.phone = "Phone number format is invalid";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
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
            productType: 'Canva',
            amount: ebookDetails.price,
            currency: ebookDetails.currency,
            sourcePage: '/canva-order',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            metadata: {
              product_type: "ebook",
              product_id: ebookDetails.id,
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

      // --- STEP 2: CREATE PAYMENT INTENT WITH LEAD TRACKING ---
      const response = await createPaymentIntent({
        amount: ebookDetails.price,
        currency: ebookDetails.currency,
        paymentMethod: "invoice", // Defaulting to invoice
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        description: ebookDetails.name,
        metadata: {
          source: "website",
          product_type: "ebook", // Explicitly mark as ebook
          product_id: ebookDetails.id,
          ...(leadId && { lead_id: leadId }), // Include lead_id for tracking
        },
      });

      if (response.error) {
        throw new Error(response.message || "Payment processing failed");
      }

      if (response.invoice_url) {
        window.location.href = response.invoice_url;
        // No return needed after redirect
      } else {
        // Fallback if no invoice URL is returned (should not happen with Xendit invoice)
        console.error("No invoice URL received from payment intent");
        setErrors({ payment: "Could not initiate payment. Please try again." });
      }
    } catch (error) {
      console.error("Payment failed:", error);
      setErrors({
        payment:
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again later.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Animation variants (simplified)
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  return (
    <>
      <Head>
        <title>{ebookDetails.name} - Graceful Homeschooling</title>
        <meta name="description" content={ebookDetails.tagline} />
        {/* Add relevant meta tags */}
      </Head>

      <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
        <PublicHeader />

        <main className="flex-grow">
          {/* Hero Section with Integrated Form*/}
          <section className="w-full py-16 md:py-24 bg-gradient-to-b from-brand-pink/10 to-[#f9f6f2]">
            <div className="container px-4 md:px-6">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
                {/* Left Column: Ebook Info */}
                <motion.div
                  variants={staggerContainer} initial="hidden" animate="visible"
                  className="flex flex-col justify-center space-y-6 pt-4 lg:pt-0"
                >
                  <motion.div variants={fadeIn} className="mb-4">
                    <Image
                      src={ebookDetails.imageUrl}
                      alt={ebookDetails.name}
                      width={600}
                      height={600}
                      className="mx-auto aspect-[5/5] overflow-hidden rounded-xl object-cover object-center shadow-xl sm:w-full lg:mx-0 max-w-md"
                      priority
                    />
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-[#5d4037]">
                      {ebookDetails.name}
                    </h1>
                    <p className="text-xl text-brand-purple font-light">
                      {ebookDetails.tagline}
                    </p>
                    <p className="text-[#6d4c41] text-lg max-w-prose">
                      {ebookDetails.description}
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="flex items-baseline gap-4">
                     <span className="text-4xl font-bold text-brand-purple">
                       ₱{(ebookDetails.price / 100).toFixed(2)}
                     </span>
                  </motion.div>

                  <motion.div variants={fadeIn}>
                    <Button
                      size="lg"
                      className="bg-brand-purple hover:bg-[#8d6e63] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => {
                         document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span className="flex items-center">
                        Buy Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Right Column: Order Form */}
                <motion.div 
                  id="order-form"
                  variants={fadeIn} 
                  initial="hidden" 
                  animate="visible" 
                  transition={{ delay: 0.2 }}
                  className="sticky top-24"
                 > 
                   <Card className="shadow-xl border border-gray-100">
                     <CardHeader className="bg-gradient-to-r from-brand-purple to-brand-pink p-6 text-white rounded-t-lg">
                       <CardTitle className="text-2xl font-serif">Get Your Ebook Now!</CardTitle>
                       <p className="text-white/90">Complete your details to purchase.</p>
                     </CardHeader>
                     <CardContent className="p-6 space-y-6">
                       <form onSubmit={handleSubmit}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                           <div className="space-y-2">
                             <Label htmlFor="firstName" className="text-[#5d4037]">First Name</Label>
                             <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className={`bg-white ${errors.firstName ? "border-red-500" : ""}`} placeholder="Your first name" required />
                             {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="lastName" className="text-[#5d4037]">Last Name</Label>
                             <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className={`bg-white ${errors.lastName ? "border-red-500" : ""}`} placeholder="Your last name" required />
                             {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                           </div>
                         </div>
   
                         <div className="space-y-2 mb-4">
                           <Label htmlFor="email" className="text-[#5d4037]">Email</Label>
                           <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className={`bg-white ${errors.email ? "border-red-500" : ""}`} placeholder="your.email@example.com" required />
                           {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                         </div>
   
                         <div className="space-y-2 mb-6">
                           <Label htmlFor="phone" className="text-[#5d4037]">Phone Number</Label>
                           <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className={`bg-white ${errors.phone ? "border-red-500" : ""}`} placeholder="+63 XXX XXX XXXX" required />
                           {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                         </div>
   
                         <div className="bg-brand-purple/5 rounded-lg p-4 flex items-center text-sm text-[#6d4c41] mb-6">
                           <Shield className="h-5 w-5 text-brand-purple mr-2 flex-shrink-0" />
                           <p>You'll be redirected to a secure payment page to complete your purchase.</p>
                         </div>
   
                         {errors.payment && (
                           <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm mb-6">{errors.payment}</div>
                         )}
   
                         <Button
                           type="submit"
                           className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                           disabled={isProcessing}
                         >
                           {isProcessing ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Processing...
                              </>
                           ) : (
                             <>
                               Proceed to Payment (₱{(ebookDetails.price / 100).toFixed(2)})
                               <ArrowRight className="ml-2 h-5 w-5" />
                             </>
                           )}
                         </Button>
                         <p className="text-xs text-center text-gray-500 mt-4">
                             Your personal data will be used to process your order, support your experience, and for purposes described in our privacy policy.
                         </p>
                       </form>
                     </CardContent>
                   </Card>
                </motion.div>
              </div>
            </div>
          </section>

           {/* Features Section */}
          <section className="w-full py-16 md:py-24 bg-white">
             <div className="container px-4 md:px-6">
                <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   transition={{ duration: 0.6 }}
                   className="flex flex-col items-center space-y-4 text-center mb-12"
                >
                   <h2 className="text-3xl font-serif tracking-tight text-[#5d4037]">What You'll Discover Inside</h2>
                   <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
                      Actionable strategies and personal insights to kickstart your Canva business.
                   </p>
                </motion.div>
                <motion.div
                   variants={staggerContainer}
                   initial="hidden"
                   whileInView="visible"
                   viewport={{ once: true, margin: "-100px" }}
                   className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                >
                   {ebookDetails.features.map((feature, i) => (
                      <motion.div key={i} variants={fadeIn} className="flex items-start gap-3 p-4 bg-brand-purple/5 rounded-lg">
                         <Check className="h-5 w-5 text-brand-purple mt-1 flex-shrink-0" />
                         <p className="text-[#6d4c41]">{feature}</p>
                      </motion.div>
                   ))}
                </motion.div>
             </div>
          </section>


          {/* Author Section */}
          <section className="w-full py-16 md:py-24 bg-brand-purple/5">
             <div className="container px-4 md:px-6">
               <div className="grid gap-8 md:grid-cols-2 items-center max-w-5xl mx-auto">
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                      <Image
                         src={ebookDetails.author.imageUrl}
                         alt={ebookDetails.author.name}
                         width={400}
                         height={500}
                         className="rounded-xl shadow-lg mx-auto aspect-[4/5] object-cover"
                      />
                  </motion.div>
                  <motion.div
                      initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                      className="space-y-4"
                    >
                      <h2 className="text-3xl font-serif text-[#5d4037]">Meet the Author: {ebookDetails.author.name}</h2>
                      <p className="text-lg text-brand-purple font-light">{ebookDetails.author.title}</p>
                      <p className="text-[#6d4c41]">
                          As a homeschooling mom who turned a creative passion into a business using Canva, I understand the desire to contribute financially while being present for family. I've poured my practical experience and hard-earned lessons into this ebook to help you navigate your own path to success.
                      </p>
                      <p className="text-[#6d4c41] italic">
                          My hope is this ebook empowers you to take confident steps towards your goals!
                      </p>
                      <div className="flex items-center gap-2 text-[#6d4c41]">
                         <Heart className="h-4 w-4 text-brand-pink"/>
                         <span>Sharing insights with love</span>
                      </div>
                  </motion.div>
               </div>
             </div>
          </section>

        </main>

        <PublicFooter />
      </div>
    </>
  );
}

// Main wrapper with Suspense
export default function CanvaEbookPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CanvaEbookContent />
    </Suspense>
  );
} 