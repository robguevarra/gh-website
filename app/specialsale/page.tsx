"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Shield, Heart, Loader, Star, Timer, Gift } from "lucide-react"
import Head from "next/head"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { useMobile } from "@/hooks/use-mobile"
import { createPublicSalePaymentIntent } from "@/app/actions/public-sale-actions"

// --- Product Details ---
const productDetails = {
  id: "teacher-gift-set-100",
  name: "Teacher Gift Set",
  tagline: "Ready‑to‑Print + Canva Editable",
  description:
    "Show your appreciation to teachers with this beautifully curated Teacher Gift Set. Perfect for Teacher’s Day, end‑of‑year gifts, or just because. Practical, heartfelt, and ready to assemble.",
  originalPrice: 15000, // ₱150.00 shown as crossed out
  salePrice: 10000, // ₱100.00 current price
  currency: "PHP",
  imageUrl: "/Teacher%20Gift%20Set/PXL_20250811_102453024%20copy.png",
  galleryImages: [
    "/Teacher%20Gift%20Set/PXL_20250811_102453024%20copy.png",
    "/Teacher%20Gift%20Set/23da00cb-6209-4a2e-9358-9d4d2335a857.png",
    "/Teacher%20Gift%20Set/23fdad69-6775-48d8-8b32-3087ec74158f.jpeg",
    "/Teacher%20Gift%20Set/ed80a598-f57c-4484-8d7c-3d585901399d.jpeg",
    "/Teacher%20Gift%20Set/e889edc9-5254-40eb-ba42-db55aeba94ab.jpeg",
  ],
  author: {
    name: "Graceful Homeschooling",
    title: "Printable Craft + Classroom Resources",
    imageUrl: "/Teacher%20Gift%20Set/23da00cb-6209-4a2e-9358-9d4d2335a857.png",
  },
  features: [
    "Backing cards for pens, notepads, and magnetic bookmarks",
    "Pen sleeves for an elegant finish",
    "Notepads for quick notes and reminders",
    "Magnetic bookmarks – stylish and functional",
    "Notebooks for lesson plans or journaling",
    "Ready‑to‑print files for quick production",
    "Canva editable link to customize style or school theme",
    "Print guide to ensure perfect results",
  ],
  // Limited‑time message timer – set to Oct 20, 2025 00:00 (Asia/Manila, UTC+8)
  saleEndDate: new Date("2025-10-20T00:00:00+08:00"),
};

// Countdown Timer Component
function CountdownTimer({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance > 0) {
        return {
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        };
      } else {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }
    };

    // Set initial time immediately
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center gap-4 text-white">
        <div className="text-center">
          <div className="text-2xl font-bold">--</div>
          <div className="text-xs">DAYS</div>
        </div>
        <div className="text-xl">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold">--</div>
          <div className="text-xs">HOURS</div>
        </div>
        <div className="text-xl">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold">--</div>
          <div className="text-xs">MINS</div>
        </div>
        <div className="text-xl">:</div>
        <div className="text-center">
          <div className="text-2xl font-bold">--</div>
          <div className="text-xs">SECS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 text-white">
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.days.toString().padStart(2, '0')}</div>
        <div className="text-xs">DAYS</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</div>
        <div className="text-xs">HOURS</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</div>
        <div className="text-xs">MINS</div>
      </div>
      <div className="text-xl">:</div>
      <div className="text-center">
        <div className="text-2xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</div>
        <div className="text-xs">SECS</div>
      </div>
    </div>
  );
}

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
function PillowTalkSaleContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
    // Auto-rotate gallery images
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => 
        (prev + 1) % productDetails.galleryImages.length
      );
    }, 4000);

    return () => clearInterval(interval);
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
      // --- STEP 1: CAPTURE LEAD BEFORE PAYMENT ---
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
            productType: 'Teacher Gift Set',
            amount: productDetails.salePrice,
            currency: productDetails.currency,
            sourcePage: '/specialsale',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || 'site',
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'teacher-gift-set',
            metadata: {
              product_type: "teacher_gift_set",
              product_id: productDetails.id,
              original_price: productDetails.originalPrice,
              sale_price: productDetails.salePrice
            }
          })
        });

        const leadResult = await leadCaptureResponse.json();
        
        if (leadResult.success) {
          leadId = leadResult.leadId;
          console.log('[Lead] Successfully captured lead before payment:', leadId);
        } else {
          console.error('[Lead] Failed to capture lead:', leadResult.error);
        }
      } catch (leadError) {
        console.error('[Lead] Error capturing lead:', leadError);
      }

      // --- STEP 2: CREATE PUBLIC SALE PAYMENT INTENT ---
      const response = await createPublicSalePaymentIntent({
        amount: productDetails.salePrice,
        currency: productDetails.currency,
        paymentMethod: "invoice",
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        description: `${productDetails.name} – Printable Set`,
        productCode: "teacher_gift_set",
        productName: productDetails.name,
        originalPrice: productDetails.originalPrice,
        metadata: {
          source: "website",
          product_type: "teacher_gift_set",
          product_id: productDetails.id,
          sale_event: "special_offer",
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || 'site',
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'teacher-gift-set',
          ...(leadId && { lead_id: leadId }),
        },
      });

      if (response.error) {
        throw new Error(response.message || "Payment processing failed");
      }

      if (response.invoice_url) {
        window.location.href = response.invoice_url;
      } else {
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

  const discountPercentage = Math.round(((productDetails.originalPrice - productDetails.salePrice) / productDetails.originalPrice) * 100);

  // Animation variants
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
        <title>Special Sale - {productDetails.name} - Graceful Homeschooling</title>
        <meta name="description" content={`Get the ${productDetails.name} for only ₱${(productDetails.salePrice/100).toFixed(0)}. Ready‑to‑print files, Canva editable link, and print guide included.`} />
      </Head>

      <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
        <PublicHeader />

        <main className="flex-grow">
          {/* Sale Banner */}
          <section className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white py-4">
            <div className="container px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-6 w-6" />
                  <span className="font-bold text-lg">TEACHER GIFT SET – ₱{(productDetails.salePrice/100).toFixed(0)} ONLY</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <span className="text-sm font-medium">Offer Ends In:</span>
                  <CountdownTimer endDate={productDetails.saleEndDate} />
                </div>
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section className="w-full py-16 md:py-24 bg-gradient-to-b from-brand-pink/10 to-[#f9f6f2]">
            <div className="container px-4 md:px-6">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
                {/* Left Column: Product Info */}
                <motion.div
                  variants={staggerContainer} 
                  initial="hidden" 
                  animate="visible"
                  className="flex flex-col justify-center space-y-6 pt-4 lg:pt-0"
                >
                  <motion.div variants={fadeIn} className="space-y-2">
                    <Badge className="bg-brand-purple text-white hover:bg-[#8d6e63]">
                      READY‑TO‑PRINT + CANVA LINK
                    </Badge>
                    <Badge className="bg-green-500 text-white hover:bg-green-600 ml-2">
                      PRINT GUIDE INCLUDED
                    </Badge>
                  </motion.div>

                  <motion.div variants={fadeIn} className="mb-4 relative">
                    <div className="relative overflow-hidden rounded-xl shadow-xl max-w-md mx-auto lg:mx-0">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentImageIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Image
                            src={productDetails.galleryImages[currentImageIndex]}
                            alt={`${productDetails.name} - Photo ${currentImageIndex + 1}`}
                            width={600}
                            height={600}
                            className="aspect-[5/5] object-cover object-center w-full"
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                      
                      {/* Image indicators */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {productDetails.galleryImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-[#5d4037]">
                      {productDetails.name}
                    </h1>
                    <p className="text-xl text-brand-purple font-light">
                      {productDetails.tagline}
                    </p>
                    <p className="text-[#6d4c41] text-lg max-w-prose">
                      {productDetails.description}
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="flex items-baseline gap-4">
                     <span className="text-4xl font-bold text-brand-purple">
                       ₱{(productDetails.salePrice / 100).toFixed(2)}
                     </span>
                     <span className="text-2xl text-gray-500 line-through">
                       ₱{(productDetails.originalPrice / 100).toFixed(2)}
                     </span>
                     <Badge className="bg-brand-purple text-white hover:bg-[#8d6e63]">
                       SAVE {discountPercentage}%
                     </Badge>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#5d4037]">Thoughtful and Practical</p>
                        <p className="text-sm text-[#6d4c41]">
                          Perfect for Teacher’s Day, end‑of‑year gifts, or small business bundles. Print, assemble, and gift with love.
                        </p>
                      </div>
                    </div>
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
                        Get the Teacher Gift Set – ₱{(productDetails.salePrice / 100).toFixed(2)}
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
                       <CardTitle className="text-2xl font-serif">🎁 Teacher Gift Set</CardTitle>
                       <p className="text-white/90">Complete your order now – Instant access after payment</p>
                       <div className="bg-white/20 rounded-lg p-3 mt-4">
                         <div className="flex justify-between items-center text-sm">
                           <span>Regular Price:</span>
                           <span className="line-through">₱{(productDetails.originalPrice / 100).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center text-lg font-bold">
                           <span>Today’s Price:</span>
                           <span>₱{(productDetails.salePrice / 100).toFixed(2)}</span>
                         </div>
                         <div className="text-center text-sm mt-2 font-semibold">
                           You Save ₱{((productDetails.originalPrice - productDetails.salePrice) / 100).toFixed(2)}!
                         </div>
                       </div>
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
   
                         <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start text-sm text-[#6d4c41] mb-6">
                           <Shield className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                           <div>
                             <p className="font-semibold text-green-800">Ready‑to‑Print + Canva Link Included</p>
                             <p>You’ll receive ready‑to‑print files, a Canva editable link, and a print guide. The download link will be emailed after payment.</p>
                           </div>
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
                               🛒 Buy Now – ₱{(productDetails.salePrice / 100).toFixed(2)}
                               <ArrowRight className="ml-2 h-5 w-5" />
                             </>
                           )}
                         </Button>
                         <p className="text-xs text-center text-gray-500 mt-4">
                             Secure payment powered by Xendit. Your download link will be sent via email.
                         </p>
                       </form>
                     </CardContent>
                   </Card>
                </motion.div>
              </div>
            </div>
          </section>

           {/* What's Inside Section */}
          <section className="w-full py-16 md:py-24 bg-white">
             <div className="container px-4 md:px-6">
                <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   transition={{ duration: 0.6 }}
                   className="flex flex-col items-center space-y-4 text-center mb-12"
                >
                   <h2 className="text-3xl font-serif tracking-tight text-[#5d4037]">What’s Inside</h2>
                   <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
                      Everything you need to prepare thoughtful teacher gifts without starting from scratch.
                   </p>
                </motion.div>
                <motion.div
                   variants={staggerContainer}
                   initial="hidden"
                   whileInView="visible"
                   viewport={{ once: true, margin: "-100px" }}
                   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
                >
                   {productDetails.features.map((feature, i) => (
                      <motion.div key={i} variants={fadeIn} className="flex items-start gap-3 p-4 bg-brand-purple/5 rounded-lg">
                         <Check className="h-5 w-5 text-brand-purple mt-1 flex-shrink-0" />
                         <p className="text-[#6d4c41] text-sm">{feature}</p>
                      </motion.div>
                   ))}
                </motion.div>
             </div>
          </section>

          {/* Preview / About Section */}
          <section className="w-full py-16 md:py-24 bg-brand-purple/5">
             <div className="container px-4 md:px-6">
               <div className="grid gap-8 md:grid-cols-2 items-center max-w-5xl mx-auto">
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                      <Image
                         src={productDetails.author.imageUrl}
                         alt={productDetails.author.name}
                         width={400}
                         height={500}
                         className="rounded-xl shadow-lg mx-auto aspect-[4/5] object-cover"
                      />
                  </motion.div>
                  <motion.div
                      initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                      className="space-y-4"
                    >
                      <h2 className="text-3xl font-serif text-[#5d4037]">Designed for Busy Parents and Crafters</h2>
                      <p className="text-lg text-brand-purple font-light">{productDetails.author.title}</p>
                      <p className="text-[#6d4c41]">
                          Print, cut, assemble, and gift. Use the Canva link to match your school colors or personal style, then follow the included print guide for best results.
                      </p>
                      <p className="text-[#6d4c41] italic">
                          After checkout, you’ll receive a secure Google Drive link via email to download all files.
                      </p>
                      <div className="flex items-center gap-2 text-[#6d4c41]">
                         <Heart className="h-4 w-4 text-brand-pink"/>
                         <span>Make teachers feel valued and loved ♥</span>
                      </div>
                  </motion.div>
               </div>
             </div>
          </section>

          {/* Urgency Section */}
          <section className="w-full py-16 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
            <div className="container px-4 md:px-6">
              <div className="text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <h2 className="text-3xl md:text-4xl font-serif">Ready to Create Meaningful Gifts?</h2>
                  <p className="text-xl text-white/90">
                    Get instant access to print‑ready files, a Canva editable link, and a step‑by‑step print guide.
                  </p>
                  <div className="bg-white/20 rounded-lg p-6 max-w-md mx-auto">
                    <div className="text-sm font-semibold mb-2">⏰ Offer Ends In:</div>
                    <CountdownTimer endDate={productDetails.saleEndDate} />
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-brand-purple hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {
                       document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span className="flex items-center">
                      Get the Teacher Gift Set Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </span>
                  </Button>
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
export default function PillowTalkSalePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PillowTalkSaleContent />
    </Suspense>
  );
} 