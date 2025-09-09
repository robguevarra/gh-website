"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Shield, Heart, Loader, Star, Gift, Users, TrendingUp, Zap } from "lucide-react"
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
  id: "spiritual-life-planner-400",
  name: "Planner Bundle Sale",
  tagline: "Balance + Faith + Organization",
  description:
    "A comprehensive planner that blends practical organization with spiritual reflection. More than just a place to write tasks, it's a companion that encourages intentional living and daily faith.",
  originalPrice: 60000, // ₱600.00 reference price (not displayed)
  salePrice: 40000, // ₱400.00 starting price (Early Bird tier)
  currency: "PHP",
  imageUrl: "/Planner/main.jpeg",
  galleryImages: [
    "/Planner/main.jpeg",
    "/Planner/planner1.jpeg",
    "/Planner/planner2.jpeg",
    "/Planner/planner3.jpeg",
  ],
  author: {
    name: "Graceful Homeschooling",
    title: "Faith-Based Life Organization Resources",
    imageUrl: "/Grace Edited.png",
  },
  features: [
    "Monthly budget plan for financial stewardship",
    "Password tracker for digital security",
    "Weekly devotion pages for spiritual growth",
    "Answered prayer log to track God's faithfulness",
    "Weekly planner for intentional time management",
    "Weekly wellness tracker for holistic health",
    "Weekly meal planner for family nutrition",
    "Weekly checklist for productivity",
    "Weekly cleaning schedule for organized living",
    "Personal notes section for reflection and thoughts",
  ],
  // Limited‑time message timer – set to Dec 31, 2025 23:59 (Asia/Manila, UTC+8)
  saleEndDate: new Date("2025-12-31T23:59:00+08:00"),
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

// Compact Sales Progress Component with Tiered Pricing
function SalesProgressTracker() {
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    currentPrice: 40000, // ₱400.00 in cents
    loading: true
  });
  const [mounted, setMounted] = useState(false);

  // Define the sales tiers with brand colors
  const tiers = [
    { max: 200, price: 40000, label: "Early Bird", color: "hsl(200 35% 75%)", bgColor: "hsl(200 35% 95%)", accent: "#9ac5d9" },
    { max: 500, price: 75000, label: "Regular", color: "hsl(315 15% 60%)", bgColor: "hsl(315 15% 95%)", accent: "#b08ba5" },
    { max: 1000, price: 100000, label: "Final", color: "hsl(355 70% 70%)", bgColor: "hsl(355 70% 95%)", accent: "#f1b5bc" }
  ];

  useEffect(() => {
    setMounted(true);
    fetchSalesCount();
    
    // Update sales count every 30 seconds
    const interval = setInterval(fetchSalesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSalesCount = async () => {
    try {
      const response = await fetch('/api/sales/count?product=spiritual_life_planner');
      const data = await response.json();
      
      if (data.success) {
        const count = data.count || 0;
        const currentTier = getCurrentTier(count);
        
        setSalesData({
          totalSales: count,
          currentPrice: currentTier.price,
          loading: false
        });

        // Emit price update event
        window.dispatchEvent(new CustomEvent('priceUpdate', {
          detail: { currentPrice: currentTier.price }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch sales count:', error);
      setSalesData(prev => ({ ...prev, loading: false }));
    }
  };

  const getCurrentTier = (sales: number) => {
    for (const tier of tiers) {
      if (sales < tier.max) {
        return tier;
      }
    }
    return tiers[tiers.length - 1]; // Last tier if all others exceeded
  };

  const getProgressPercentage = (sales: number) => {
    const currentTier = getCurrentTier(sales);
    const tierIndex = tiers.indexOf(currentTier);
    const prevMax = tierIndex > 0 ? tiers[tierIndex - 1].max : 0;
    const tierRange = currentTier.max - prevMax;
    const tierProgress = sales - prevMax;
    
    return Math.min((tierProgress / tierRange) * 100, 100);
  };

  const getRemainingInTier = (sales: number) => {
    const currentTier = getCurrentTier(sales);
    return Math.max(currentTier.max - sales, 0);
  };

  if (!mounted) {
    return (
      <div className="w-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-xl p-4 shadow-xl">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg"></div>
          <div className="relative z-10 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-6 w-6 bg-white/20 rounded-lg"></div>
              <div className="h-4 bg-white/20 rounded w-32"></div>
            </div>
            <div className="h-2 bg-white/20 rounded-full mb-3"></div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-white/20 rounded-lg"></div>
              <div className="h-8 flex-1 bg-white/20 rounded-lg"></div>
              <div className="h-8 flex-1 bg-white/20 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTier = getCurrentTier(salesData.totalSales);
  const progress = getProgressPercentage(salesData.totalSales);
  const remaining = getRemainingInTier(salesData.totalSales);
  const tierIndex = tiers.indexOf(currentTier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-xl p-4 shadow-xl relative overflow-hidden"
    >
      {/* Elegant overlay for content readability */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      
      <div className="relative z-10">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 rounded-lg shadow-sm bg-white/20 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <TrendingUp className="h-4 w-4 text-white" />
            </motion.div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">
                  ₱{(currentTier.price / 100).toFixed(0)}
                </span>
                <span className="text-xs text-white/90 bg-white/20 px-2 py-1 rounded-full">
                  {currentTier.label}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1">
                {salesData.totalSales} sold • {remaining > 0 ? `${remaining} left` : 'Sold out'}
              </p>
            </div>
          </div>
          
          {remaining > 0 && remaining <= 50 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="bg-white/30 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm backdrop-blur-sm"
            >
              {remaining} left!
            </motion.div>
          )}
        </div>

        {/* Compact Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/90 mb-1">
            <span>Tier Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full relative bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Elegant shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
            </motion.div>
          </div>
        </div>

        {/* Compact Tier Indicators */}
        <div className="flex gap-2">
          {tiers.map((tier, index) => {
            const isActive = index === tierIndex;
            const isPassed = salesData.totalSales >= tier.max;
            
            return (
              <motion.div
                key={tier.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`flex-1 text-center px-2 py-2 rounded-lg border transition-all text-xs ${
                  isActive 
                    ? 'border-white bg-white/30 shadow-md text-white' 
                    : isPassed 
                    ? 'border-white/60 bg-white/20 text-white'
                    : 'border-white/40 bg-white/10 text-white/80 hover:border-white/60'
                }`}
              >
                <div className="font-bold">₱{(tier.price / 100).toFixed(0)}</div>
                <div className="text-xs opacity-75">{tier.label}</div>
                {isActive && (
                  <div className="text-xs font-medium mt-1">ACTIVE</div>
                )}
                {isPassed && !isActive && (
                  <div className="text-xs font-medium mt-1">✓</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
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
  const [currentPrice, setCurrentPrice] = useState(productDetails.salePrice);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isMobile = useMobile();

  // Listen for price updates from SalesProgressTracker
  useEffect(() => {
    const handlePriceUpdate = (event: CustomEvent) => {
      setCurrentPrice(event.detail.currentPrice);
    };

    window.addEventListener('priceUpdate', handlePriceUpdate as EventListener);
    return () => {
      window.removeEventListener('priceUpdate', handlePriceUpdate as EventListener);
    };
  }, []);

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
            productType: 'Planner Bundle Sale',
            amount: currentPrice,
            currency: productDetails.currency,
            sourcePage: '/specialsale',
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || 'site',
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'spiritual-life-planner',
            metadata: {
              product_type: "spiritual_life_planner",
              product_id: productDetails.id,
              current_tier_price: currentPrice,
              starting_price: productDetails.salePrice
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
        amount: currentPrice,
        currency: productDetails.currency,
        paymentMethod: "invoice",
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        description: `${productDetails.name} – Digital Planner`,
        productCode: "spiritual_life_planner",
        productName: productDetails.name,
        originalPrice: currentPrice, // Use current tier price as the "original" for this transaction
        metadata: {
          source: "website",
          product_type: "spiritual_life_planner",
          product_id: productDetails.id,
          sale_event: "tiered_pricing",
          current_tier_price: currentPrice,
          starting_price: productDetails.salePrice,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || 'organic',
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || 'site',
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || 'spiritual-life-planner',
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
        <meta name="description" content={`Get the ${productDetails.name} starting at ₱${(productDetails.salePrice/100).toFixed(0)}. A comprehensive planner that blends practical organization with spiritual reflection. Price increases with demand!`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        <style>{`
          .touch-target {
            min-height: 44px;
            min-width: 44px;
          }
          @media (max-width: 768px) {
            .touch-target {
              min-height: 48px;
              min-width: 48px;
            }
          }
        `}</style>
      </Head>

      <div className="flex min-h-screen flex-col bg-[#f9f6f2]">
        <PublicHeader />

        <main className="flex-grow">
          {/* Sale Banner */}
          <section className="w-full bg-gradient-to-r from-brand-purple to-brand-pink text-white py-4">
            <div className="container px-4">
              <div className="flex items-center justify-center gap-2">
                <Gift className="h-6 w-6" />
                <span className="font-bold text-lg">Planner Bundle Sale – Starting at ₱{(productDetails.salePrice/100).toFixed(0)}</span>
              </div>
            </div>
          </section>

          {/* Sales Progress Section */}
          <section className="w-full py-6 bg-gray-50">
            <div className="container px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4"
                >
                  <h2 className="text-xl md:text-2xl font-serif font-medium text-[#5d4037] mb-2 tracking-tight">
                    ⚡ Price Increases With Demand
                  </h2>
                  <p className="text-[#6d4c41] text-sm md:text-base font-light max-w-lg mx-auto">
                    Get yours before the price increases!
                  </p>
                </motion.div>
                <SalesProgressTracker />
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section className="w-full py-8 md:py-16 lg:py-24 bg-gradient-to-b from-brand-pink/10 to-[#f9f6f2]">
            <div className="container px-4 md:px-6">
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-start">
                {/* Left Column: Product Info */}
                <motion.div
                  variants={staggerContainer} 
                  initial="hidden" 
                  animate="visible"
                  className="flex flex-col justify-center space-y-4 md:space-y-6 order-2 lg:order-1"
                >
                  <motion.div variants={fadeIn} className="space-y-2">
                    <Badge className="bg-brand-purple text-white hover:bg-[#8d6e63]">
                      DIGITAL DOWNLOAD + PRINTABLE
                    </Badge>
                    <Badge className="bg-green-500 text-white hover:bg-green-600 ml-2">
                      FAITH + ORGANIZATION
                    </Badge>
                  </motion.div>

                  <motion.div variants={fadeIn} className="mb-4 relative order-1 lg:order-2">
                    <div className="relative overflow-hidden rounded-xl shadow-xl max-w-sm mx-auto lg:max-w-md lg:mx-0">
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
                            width={400}
                            height={400}
                            className="aspect-square object-cover object-center w-full"
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                      
                      {/* Image indicators */}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {productDetails.galleryImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-3 h-3 rounded-full transition-all touch-target ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="space-y-3 text-center lg:text-left">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif tracking-tight text-[#5d4037]">
                      {productDetails.name}
                    </h1>
                    <p className="text-lg md:text-xl text-brand-purple font-light">
                      {productDetails.tagline}
                    </p>
                    <p className="text-[#6d4c41] text-base md:text-lg max-w-prose mx-auto lg:mx-0">
                      {productDetails.description}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mt-4">
                      <p className="text-[#6d4c41] text-sm md:text-base italic">
                        "With each page, you are invited to pause and reflect on what truly matters. Every page is a fresh opportunity to grow, be mindful, and celebrate even the smallest victories."
                      </p>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-4 justify-center lg:justify-start">
                     <span className="text-3xl md:text-4xl font-bold text-brand-purple">
                       ₱{(currentPrice / 100).toFixed(2)}
                     </span>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                       <Badge className="bg-gradient-to-r from-brand-pink to-accent-blue text-white text-xs md:text-sm">
                         PRICE INCREASES WITH DEMAND
                       </Badge>
                       <span className="text-sm text-[#6d4c41] font-medium">
                         Current Tier Price
                       </span>
                     </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#5d4037]">Faith-Centered Organization</p>
                        <p className="text-sm text-[#6d4c41]">
                          More than just a planner - it's your companion for intentional living that nurtures both your practical needs and spiritual growth.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="w-full">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-brand-purple hover:bg-[#8d6e63] text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => {
                         document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span className="flex items-center justify-center">
                        <span className="hidden sm:inline">Get the Planner Bundle Sale – </span>
                        <span className="sm:hidden">Get Bundle – </span>
                        ₱{(currentPrice / 100).toFixed(2)}
                        <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
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
                  className="order-1 lg:order-2 lg:sticky lg:top-24"
                 > 
                   <Card className="shadow-xl border border-gray-100">
                     <CardHeader className="bg-gradient-to-r from-brand-purple to-brand-pink p-6 text-white rounded-t-lg">
                       <CardTitle className="text-2xl font-serif">📖 Planner Bundle Sale</CardTitle>
                       <p className="text-white/90">Complete your order now – Instant access after payment</p>
                       <div className="bg-white/20 rounded-lg p-3 mt-4">
                         <div className="flex justify-between items-center text-lg font-bold">
                           <span>Current Tier Price:</span>
                           <span>₱{(currentPrice / 100).toFixed(2)}</span>
                         </div>
                         <div className="text-center text-sm mt-2 font-semibold">
                           📈 Price increases as slots fill up!
                         </div>
                         <div className="text-center text-xs mt-1 opacity-90">
                           Early Bird: ₱400 • Regular: ₱750 • Final: ₱1000
                         </div>
                       </div>
                     </CardHeader>
                     <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                       <form onSubmit={handleSubmit}>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                           <div className="space-y-2">
                             <Label htmlFor="firstName" className="text-[#5d4037] text-sm md:text-base">First Name</Label>
                             <Input 
                               id="firstName" 
                               name="firstName" 
                               value={formData.firstName} 
                               onChange={handleInputChange} 
                               className={`bg-white h-12 text-base ${errors.firstName ? "border-red-500" : ""}`} 
                               placeholder="Your first name" 
                               required 
                             />
                             {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="lastName" className="text-[#5d4037] text-sm md:text-base">Last Name</Label>
                             <Input 
                               id="lastName" 
                               name="lastName" 
                               value={formData.lastName} 
                               onChange={handleInputChange} 
                               className={`bg-white h-12 text-base ${errors.lastName ? "border-red-500" : ""}`} 
                               placeholder="Your last name" 
                               required 
                             />
                             {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                           </div>
                         </div>
   
                         <div className="space-y-2 mb-4">
                           <Label htmlFor="email" className="text-[#5d4037] text-sm md:text-base">Email</Label>
                           <Input 
                             id="email" 
                             name="email" 
                             type="email" 
                             value={formData.email} 
                             onChange={handleInputChange} 
                             className={`bg-white h-12 text-base ${errors.email ? "border-red-500" : ""}`} 
                             placeholder="your.email@example.com" 
                             required 
                           />
                           {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                         </div>
   
                         <div className="space-y-2 mb-6">
                           <Label htmlFor="phone" className="text-[#5d4037] text-sm md:text-base">Phone Number</Label>
                           <Input 
                             id="phone" 
                             name="phone" 
                             type="tel" 
                             value={formData.phone} 
                             onChange={handleInputChange} 
                             className={`bg-white h-12 text-base ${errors.phone ? "border-red-500" : ""}`} 
                             placeholder="+63 XXX XXX XXXX" 
                             required 
                           />
                           {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                         </div>
   
                         <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start text-sm text-[#6d4c41] mb-6">
                           <Shield className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                           <div>
                             <p className="font-semibold text-green-800">Digital Planner + Printable Pages</p>
                             <p>You'll receive the complete digital planner with all organizational and spiritual sections. The download link will be emailed after payment.</p>
                           </div>
                         </div>
   
                         {errors.payment && (
                           <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm mb-6">{errors.payment}</div>
                         )}
   
                         <Button
                           type="submit"
                           className="w-full bg-brand-purple hover:bg-[#8d6e63] text-white py-4 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 touch-target"
                           disabled={isProcessing}
                         >
                           {isProcessing ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Processing...
                              </>
                           ) : (
                             <>
                               <span className="hidden sm:inline">📖 Get My Planner – </span>
                               <span className="sm:hidden">📖 Get Bundle – </span>
                               ₱{(currentPrice / 100).toFixed(2)}
                               <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
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
          <section className="w-full py-12 md:py-16 lg:py-24 bg-white">
             <div className="container px-4 md:px-6">
                <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   transition={{ duration: 0.6 }}
                   className="flex flex-col items-center space-y-3 md:space-y-4 text-center mb-8 md:mb-12"
                >
                   <h2 className="text-2xl md:text-3xl font-serif tracking-tight text-[#5d4037]">What's Inside</h2>
                   <p className="max-w-[700px] text-[#6d4c41] text-base md:text-lg font-light px-4">
                      Everything you need to bring balance into your everyday life through practical organization and spiritual reflection.
                   </p>
                </motion.div>
                <motion.div
                   variants={staggerContainer}
                   initial="hidden"
                   whileInView="visible"
                   viewport={{ once: true, margin: "-100px" }}
                   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto"
                >
                   {productDetails.features.map((feature, i) => (
                      <motion.div key={i} variants={fadeIn} className="flex items-start gap-3 p-3 md:p-4 bg-brand-purple/5 rounded-lg">
                         <Check className="h-4 w-4 md:h-5 md:w-5 text-brand-purple mt-1 flex-shrink-0" />
                         <p className="text-[#6d4c41] text-sm md:text-base">{feature}</p>
                      </motion.div>
                   ))}
                </motion.div>
             </div>
          </section>

          {/* Preview / About Section */}
          <section className="w-full py-12 md:py-16 lg:py-24 bg-brand-purple/5">
             <div className="container px-4 md:px-6">
               <div className="grid gap-6 md:gap-8 md:grid-cols-2 items-center max-w-5xl mx-auto">
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                      <Image
                         src={productDetails.author.imageUrl}
                         alt={productDetails.author.name}
                         width={300}
                         height={375}
                         className="rounded-xl shadow-lg mx-auto aspect-[4/5] object-cover max-w-xs md:max-w-sm"
                      />
                  </motion.div>
                  <motion.div
                      initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                      className="space-y-3 md:space-y-4 text-center md:text-left"
                    >
                      <h2 className="text-2xl md:text-3xl font-serif text-[#5d4037]">Your Companion for Intentional Living</h2>
                      <p className="text-base md:text-lg text-brand-purple font-light">{productDetails.author.title}</p>
                      <p className="text-[#6d4c41] text-sm md:text-base">
                          This planner is more than just a place to write down tasks. It's designed to help you live with clarity, manage your time and resources wisely, and walk with God daily through every page.
                      </p>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 md:p-4 mt-4">
                        <p className="text-[#6d4c41] text-xs md:text-sm">
                          <strong>Faith Journey Support:</strong> Weekly devotions and a prayer log remind you that life is not only about routines but about walking with God daily. As you write down your thoughts and answered prayers, you'll be reminded of His goodness and faithfulness.
                        </p>
                      </div>
                      <p className="text-[#6d4c41] italic text-sm md:text-base">
                          After checkout, you'll receive a secure Google Drive link via email to download your complete planner.
                      </p>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-[#6d4c41]">
                         <Heart className="h-4 w-4 text-brand-pink"/>
                         <span className="text-sm md:text-base">Live each day with intention and grace ♥</span>
                      </div>
                  </motion.div>
               </div>
             </div>
          </section>

          {/* Urgency Section */}
          <section className="w-full py-12 md:py-16 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
            <div className="container px-4 md:px-6">
              <div className="text-center max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="space-y-4 md:space-y-6"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif">Ready to Live with Purpose?</h2>
                  <p className="text-lg md:text-xl text-white/90 px-4">
                    Get instant access to your complete Planner Bundle Sale with all organizational and faith-building sections.
                  </p>
                  <div className="bg-white/20 rounded-lg p-3 md:p-4 max-w-2xl mx-auto mb-4 md:mb-6">
                    <p className="text-white/95 text-sm md:text-base italic text-center">
                      "As you begin this journey with your planner, may it bring you clarity, peace, and joy. Let it remind you that even small steps forward are meaningful. Use it as a daily reminder to stay rooted in gratitude, anchored in faith, and focused on what truly matters."
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3 md:p-4 max-w-md mx-auto">
                    <div className="text-sm font-semibold text-center">⏰ Limited Time Offer</div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-brand-purple hover:bg-gray-100 px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 touch-target"
                    onClick={() => {
                       document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span className="flex items-center justify-center">
                      <span className="hidden sm:inline">Get My Planner Bundle Sale Now</span>
                      <span className="sm:hidden">Get Bundle Now</span>
                      <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
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