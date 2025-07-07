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
  id: "pillow-talk-commercial-license-77",
  name: "Pillow Talk: A Married Couple's Intimacy Planner",
  tagline: "Commercial License - Limited Time Offer!",
  description: "A thoughtful guide to help couples nurture their bond, deepen connection, and grow in love. With tools like a 30-day Bible Reading Plan, shared vision board, faith and marriage goals, and creative date night ideas, this planner fosters meaningful communication and intentional living.",
  originalPrice: 80000, // Original price in cents (₱800.00)
  salePrice: 35000, // Sale price in cents (₱350.00) - 7.7 sale
  currency: "PHP",
  imageUrl: "/Pillow talk/2D59D4CD-61C5-4139-B56C-1422805E077C.png",
  galleryImages: [
    "/Pillow talk/4BF898CB-6CC4-4025-A901-5D1EE19279FD.png",
    "/Pillow talk/4F0DE2C2-0144-4FFB-A910-7BF86ADB3E63.png",
    "/Pillow talk/7D66B9AB-B384-48EF-861F-1291E29FE8C8.png",
    "/Pillow talk/628B69BF-F759-40F9-ACC6-BC3D36469A8F.png"
  ],
  author: {
    name: "Grace",
    title: "Homeschooling Mom & Creator", 
    imageUrl: "/Grace Edited.png",
  },
  features: [
    "Bible Verse to Claim this Year",
    "Our Favorite Quotes",
    "30-Day Bible Reading Plan",
    "Our Vision Board",
    "Our Faith Goals",
    "Our Marriage Goals",
    "Date Night Ideas & Intentional Plans",
    "Biblical Manhood & Womanhood",
    "10 Marriage Prayers",
    "Conversation Starters (10 Pages)",
    "Things I Love About You",
    "The Power of Praying Together",
    "Conflicts & Communication in Marriage",
    "Intimacy Guidelines",
    "Finance + Finance Goals",
    "The Power of Words",
    "1 Corinthians 13 (10 Days Devotional)",
    "30-Day Love Dare Challenge",
    "Love Bank & Reconnect (10-Day Devotional)",
    "Recommitting Vows"
  ],
  saleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
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
            productType: 'Pillow Talk Commercial License',
            amount: productDetails.salePrice,
            currency: productDetails.currency,
            sourcePage: '/specialsale',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '77sale',
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'pillow-talk-77-sale',
            metadata: {
              product_type: "commercial_license",
              product_id: productDetails.id,
              sale_event: "77_anniversary_sale",
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
        description: `${productDetails.name} - 7.7 Anniversary Sale`,
        productCode: "pillow_talk",
        productName: productDetails.name,
        originalPrice: productDetails.originalPrice,
        metadata: {
          source: "website",
          product_type: "commercial_license",
          product_id: productDetails.id,
          sale_event: "77_anniversary_sale",
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '77sale',
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'pillow-talk-77-sale',
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
        <meta name="description" content={`Special Sale! Get the ${productDetails.name} commercial license for only ₱350 (${discountPercentage}% off). Limited time offer!`} />
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
                  <span className="font-bold text-lg">SPECIAL SALE - {discountPercentage}% OFF!</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <span className="text-sm font-medium">Sale Ends In:</span>
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
                      LIMITED TIME - SPECIAL OFFER
                    </Badge>
                    <Badge className="bg-green-500 text-white hover:bg-green-600 ml-2">
                      COMMERCIAL LICENSE INCLUDED
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
                            alt={`${productDetails.name} - Page ${currentImageIndex + 1}`}
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
                        <p className="font-semibold text-[#5d4037]">Special Anniversary Offer!</p>
                        <p className="text-sm text-[#6d4c41]">
                          Usually exclusive to Papers to Profits students, now available to everyone for a limited time during our anniversary month!
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
                        Claim Your License Now - ₱350 Only!
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
                       <CardTitle className="text-2xl font-serif">🎉 Special Sale!</CardTitle>
                       <p className="text-white/90">Complete your order now - Limited time offer!</p>
                       <div className="bg-white/20 rounded-lg p-3 mt-4">
                         <div className="flex justify-between items-center text-sm">
                           <span>Regular Price:</span>
                           <span className="line-through">₱{(productDetails.originalPrice / 100).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center text-lg font-bold">
                           <span>Anniversary Price:</span>
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
                             <p className="font-semibold text-green-800">Commercial License Included!</p>
                             <p>You'll receive full commercial rights to use and resell this planner.</p>
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
                               🎉 Get Commercial License - ₱{(productDetails.salePrice / 100).toFixed(2)}
                               <ArrowRight className="ml-2 h-5 w-5" />
                             </>
                           )}
                         </Button>
                         <p className="text-xs text-center text-gray-500 mt-4">
                             Secure payment powered by Xendit. Your data is protected and encrypted.
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
                   <h2 className="text-3xl font-serif tracking-tight text-[#5d4037]">What's Inside Your Planner</h2>
                   <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
                      A comprehensive guide with everything you need to strengthen your marriage and deepen your connection.
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

          {/* Author Section */}
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
                      <h2 className="text-3xl font-serif text-[#5d4037]">Created by {productDetails.author.name}</h2>
                      <p className="text-lg text-brand-purple font-light">{productDetails.author.title}</p>
                      <p className="text-[#6d4c41]">
                          As a homeschooling mom who understands the importance of strong family foundations, I created this planner to help couples strengthen their bond while balancing family life. This comprehensive guide provides practical tools for meaningful connection and intentional relationship building.
                      </p>
                      <p className="text-[#6d4c41] italic">
                          My hope is that this planner helps couples create deeper connections and build stronger marriages that serve as the foundation for thriving families.
                      </p>
                      <div className="flex items-center gap-2 text-[#6d4c41]">
                         <Heart className="h-4 w-4 text-brand-pink"/>
                         <span>Building stronger marriages, one couple at a time</span>
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
                  <h2 className="text-3xl md:text-4xl font-serif">Don't Miss This Special Offer!</h2>
                  <p className="text-xl text-white/90">
                    This is a rare opportunity to get our commercial license at this special price. 
                    Once this sale ends, this exclusive offer goes back to Papers to Profits students only.
                  </p>
                  <div className="bg-white/20 rounded-lg p-6 max-w-md mx-auto">
                    <div className="text-sm font-semibold mb-2">⏰ Sale Ends In:</div>
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
                      Secure Your License Now!
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