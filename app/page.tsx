"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { BookOpen, Heart, Calendar, PenTool, Bookmark, ChevronRight, ArrowRight, Star } from "lucide-react"
import { motion, useScroll, useInView, useTransform } from "framer-motion"
import dynamic from 'next/dynamic'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
// Import SocialIntegration component dynamically
const SocialIntegration = dynamic(() => import('@/components/social-proof/social-integration').then(mod => mod.SocialIntegration), {
  loading: () => <div className="w-full py-20 md:py-32 bg-brand-blue/10 flex items-center justify-center">
    <div className="animate-pulse bg-gray-200 h-40 w-full max-w-4xl rounded-lg"></div>
  </div>,
  ssr: false
})
import { useMobile } from "@/hooks/use-mobile"

// Component with the actual content
function HomeContent() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const isHeroInView = useInView(heroRef, { once: true })
  const isMobile = useMobile()



  // Parallax effect
  const { scrollYProgress } = useScroll({
    container: pageRef
  })
  const heroImageScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2])
  const heroImageOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.5])
  const heroTextY = useTransform(scrollYProgress, [0, 0.5], [0, -50])
  const decorativeCircleScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.5])
  const decorativeCircleOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const graceImageY = useTransform(scrollYProgress, [0, 0.5], [0, 30])

  useEffect(() => {
    setIsLoaded(true)
  }, [])

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

  // Split the hero text properly to avoid awkward line breaks
  const heroTextLines = ["Kumita Habang", "Nasa Bahay"]

  // Animation for text reveal
  const textReveal = {
    hidden: { y: 100, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.33, 1, 0.68, 1],
        delay: i * 0.2,
      },
    }),
  }

  // Split the page into sections for better code splitting
  const renderHeroSection = () => (
    <section ref={heroRef} className="w-full min-h-screen flex items-center py-12 md:py-0 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Main background image with overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Banner%201366x768-UFjnYSrbc7qq2FtAUa7UFdZalgDTAT.png"
            alt="Grace's workspace"
            fill
            sizes="100vw"
            quality={85}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTM2NiIgaGVpZ2h0PSI3NjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/60 to-brand-pink/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-[#f9f6f2]/90"></div>
        </div>

        {/* Decorative circles */}
        <motion.div
          className="absolute right-0 top-1/4 w-48 h-48 rounded-full bg-brand-blue blur-3xl opacity-60"
          style={{
            scale: decorativeCircleScale,
            opacity: decorativeCircleOpacity,
          }}
        />
        <motion.div
          className="absolute left-1/4 bottom-1/4 w-64 h-64 rounded-full bg-brand-pink/20 blur-3xl opacity-40"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute right-1/3 top-1/2 w-36 h-36 rounded-full bg-brand-purple/30 blur-2xl opacity-50"
          animate={{
            y: [0, 15, 0],
            x: [0, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
          }}
        />
      </div>

      {/* Workspace pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23b08ba5' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-10v-10h-4v10h-10v4h10v10h4v-10h10zM40 0H0v40h40V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Animated Pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <svg className="absolute w-full h-full" width="100%" height="100%">
          <pattern
            id="pattern-circles"
            x="0"
            y="0"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
            patternContentUnits="userSpaceOnUse"
          >
            <circle id="pattern-circle" cx="10" cy="10" r="1.6257413380501518" fill="#b08ba5" />
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
        </svg>
      </div>

      <div className="container px-4 md:px-6 z-10 relative">
        <div className="grid gap-6 lg:grid-cols-[600px_1fr] lg:gap-12 xl:grid-cols-[800px_1fr] min-h-[600px] lg:min-h-[700px]">
          <motion.div
            initial="hidden"
            animate={isHeroInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="flex flex-col justify-center space-y-6 md:space-y-8 order-2 lg:order-2"
            style={{ y: heroTextY }}
          >
            {/* Badge */}
            <motion.div
              variants={fadeIn}
              className="inline-flex items-center rounded-full bg-white/80 backdrop-blur-sm px-3 py-1.5 text-sm max-w-max shadow-sm"
            >
              <Star className="h-4 w-4 mr-2 text-brand-purple" />
              <span className="text-[#5d4037] font-medium">From YouTube to Your Business Partner</span>
            </motion.div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif tracking-tighter text-[#5d4037] overflow-hidden">
                {heroTextLines.map((line, lineIndex) => (
                  <div key={lineIndex} className="overflow-hidden relative">
                    <motion.div custom={lineIndex} variants={textReveal} className="inline-block">
                      {line}
                    </motion.div>
                  </div>
                ))}
              </h1>

              {/* Animated underline */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100px" }}
                transition={{ duration: 1, delay: 1.2 }}
                className="h-1 bg-gradient-to-r from-brand-purple to-brand-pink rounded-full"
              />

              <motion.p variants={fadeIn} className="max-w-[600px] text-[#6d4c41] text-base sm:text-lg md:text-xl font-light leading-relaxed">
                From a YouTube channel empowering parents to raise leaders and learners, we've evolved into your business partner. Learn to create income-generating paper products while staying true to your homeschooling values.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div variants={fadeIn} className="flex flex-col gap-3 sm:flex-row">
              <Link href="/papers-to-profits">
                <Button
                  size="lg"
                  className="h-12 sm:h-14 px-6 sm:px-8 overflow-hidden relative group w-full sm:w-auto"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105 transition-transform duration-500"></span>
                  <span className="absolute inset-0 w-full h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md"></span>
                  <span className="relative flex items-center gap-2 z-10 text-white">
                    Start Papers to Profits
                    <ArrowRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 sm:h-14 px-6 sm:px-8 border-brand-purple text-brand-purple relative overflow-hidden group w-full sm:w-auto"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span className="absolute inset-0 w-0 bg-brand-blue/30 transition-all duration-500 ease-out group-hover:w-full"></span>
                <span className="relative z-10">View Resources</span>
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="flex items-center space-x-4 mt-8"
            >
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
              <div className="text-sm text-[#6d4c41]">
                <span className="font-medium">3,000+ students</span> already enrolled
              </div>
            </motion.div>
          </motion.div>

          {/* Left side with Grace's portrait and workspace */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ perspective: 1000 }}
            className="mx-auto flex items-center justify-center lg:justify-start relative order-1 lg:order-1 h-[400px] lg:h-auto"
          >
            {/* Decorative elements */}
            <motion.div
              className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-4 border-brand-pink/20 z-10"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            <motion.div
              className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full border-2 border-brand-purple/30 z-10"
              animate={{
                rotate: [360, 0],
              }}
              transition={{
                duration: 15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            {/* Grace's Portrait */}
            <motion.div
              className="relative w-[360px] sm:w-[400px] md:w-[450px] lg:w-[500px] mx-auto lg:mx-0 lg:absolute lg:-right-12 lg:bottom-0 z-20"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{ y: graceImageY }}
            >
              <Image
                src="/Grace Edited.png"
                alt="Grace from Graceful Homeschooling"
                width={500}
                height={620}
                quality={90}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjYyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
                className="h-auto w-full"
                priority
              />

              {/* Floating badge - positioned well away from Grace's face */}
              <motion.div
                className="absolute bottom-16 left-2 sm:bottom-20 sm:left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg max-w-[160px] sm:max-w-[180px]"
                initial={{ opacity: 0, y: 20, rotate: -5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <div className="text-xs sm:text-sm font-medium text-brand-purple">Meet Grace</div>
                <div className="text-[10px] sm:text-xs text-[#6d4c41] leading-tight">Your Partner in raising leaders and learners</div>
              </motion.div>
            </motion.div>

            {/* Featured Content Card - Hidden on mobile/tablet, shown on desktop */}
            <motion.div
              className="relative w-full max-w-[600px] aspect-video rounded-xl overflow-hidden ml-auto hidden lg:block"
              whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                scale: heroImageScale,
                opacity: heroImageOpacity,
              }}
            >
              {/* Card frame with gradient border */}
              <div className="absolute inset-0 p-[3px] rounded-xl bg-gradient-to-br from-white via-brand-pink/40 to-brand-purple z-10">
                <div className="absolute inset-0 rounded-xl bg-white/90 backdrop-blur-md"></div>
              </div>

              <div className="relative w-full h-full rounded-xl overflow-hidden">
                {/* Card content */}
                <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                      className="bg-brand-purple/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-brand-purple"
                    >
                      Featured Course
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1, duration: 0.6, type: "spring" }}
                      className="bg-white/80 backdrop-blur-sm rounded-full h-10 w-10 flex items-center justify-center"
                    >
                      <Heart className="h-5 w-5 text-brand-pink" />
                    </motion.div>
                  </div>

                  <div>
                    <motion.h3
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, duration: 0.6 }}
                      className="text-2xl font-serif text-[#5d4037] mb-2"
                    >
                      Papers to Profits
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1, duration: 0.6 }}
                      className="text-sm text-[#6d4c41] mb-4"
                    >
                      Turn your passion for paper products into a sustainable business
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.6 }}
                    >
                      <Link href="/papers-to-profits">
                        <Button className="bg-brand-purple/90 hover:bg-brand-purple text-white" size="sm">
                          Learn More
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </div>

                {/* Background pattern */}
                <div className="absolute inset-0 z-10 opacity-5">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23b08ba5' fillOpacity='0.4' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: "30px 30px",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 hidden md:flex flex-col items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <span className="text-[#5d4037] text-sm mb-2">Scroll to explore</span>
        <motion.div
          className="w-6 h-10 border-2 border-[#5d4037] rounded-full flex justify-center p-1"
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
        >
          <motion.div
            className="w-1.5 h-1.5 bg-brand-purple rounded-full"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
          />
        </motion.div>
      </motion.div>
    </section>
  )

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f6f2] overflow-hidden">


      <PublicHeader onHoverChange={setIsHovering} />
      <main ref={pageRef} className="relative min-h-screen overflow-x-hidden">
        {renderHeroSection()}
        
        <section className="w-full py-20 md:py-32 bg-white relative overflow-hidden">
          {/* Decorative elements */}
          <svg
            className="absolute top-0 left-0 right-0 w-full h-12 text-[#f9f6f2] -mt-1"
            preserveAspectRatio="none"
            viewBox="0 0 1440 54"
          >
            <path
              fill="currentColor"
              d="M0 22L60 16.7C120 11 240 1 360 0C480 -1 600 9 720 16C840 23 960 27 1080 25.3C1200 23 1320 16 1380 12.7L1440 9V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z"
            ></path>
          </svg>

          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
              className="flex flex-col items-center justify-center space-y-4 text-center"
            >
              <div className="inline-flex items-center space-x-1 rounded-full bg-brand-blue/30 px-4 py-1.5 mb-8">
                <span className="font-medium text-brand-purple">Our Journey</span>
              </div>
              <div className="space-y-8 max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-serif tracking-tighter text-[#5d4037]">From Community to Business Empowerment</h2>
                <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
                  Graceful Homeschooling began as a YouTube channel and community dedicated to empowering parents to raise leaders and learners. Today, we've grown into a comprehensive platform offering real income opportunities while staying true to our homeschooling roots.
                </p>
                <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
                  We believe you shouldn't have to choose between being present for your family and earning an income. That's why we offer proven business training and digital resources to help you "Kumita habang nasa bahay."
                </p>
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24"
            >
              {[
                {
                  icon: <PenTool className="h-6 w-6" />,
                  title: "Papers to Profits Course",
                  description:
                    "Our flagship program teaches you to create and sell beautiful paper products, turning your homeschooling passion into sustainable income.",
                },
                {
                  icon: <BookOpen className="h-6 w-6" />,
                  title: "Digital Resources",
                  description:
                    "Access our growing library of homeschooling templates, planners, and educational materials (shop opening soon).",
                },
                {
                  icon: <Calendar className="h-6 w-6" />,
                  title: "Business Training",
                  description:
                    "Learn proven strategies for building your home-based business while maintaining your focus on family and education.",
                },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn} whileHover={{ y: -10, transition: { duration: 0.3 } }}>
                  <Card className="bg-white border-none shadow-[0_25px_50px_-12px_rgba(176,139,165,0.1)] hover:shadow-[0_25px_50px_-12px_rgba(176,139,165,0.2)] transition-all duration-500">
                    <CardHeader className="pb-2">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-blue to-brand-purple/30 mb-6">
                        {item.icon}
                      </div>
                      <CardTitle className="text-2xl font-serif text-[#5d4037]">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[#6d4c41]">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32 bg-brand-blue/20 relative">
          {/* Decorative elements */}
          <svg
            className="absolute top-0 left-0 right-0 w-full h-12 text-white -mt-1"
            preserveAspectRatio="none"
            viewBox="0 0 1440 54"
          >
            <path
              fill="currentColor"
              d="M0 22L60 16.7C120 11 240 1 360 0C480 -1 600 9 720 16C840 23 960 27 1080 25.3C1200 23 1320 16 1380 12.7L1440 9V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z"
            ></path>
          </svg>

          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInFromLeft}
                className="flex flex-col justify-center space-y-8"
              >
                <div className="inline-flex items-center space-x-1 rounded-full bg-white/70 backdrop-blur-sm px-4 py-1.5 max-w-max">
                  <Bookmark className="h-4 w-4 text-brand-purple" />
                  <span className="font-medium text-[#5d4037]">Featured Course</span>
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-serif tracking-tighter text-[#5d4037]">Papers to Profits</h2>
                  <p className="max-w-[600px] text-[#6d4c41] md:text-xl/relaxed font-light">
                    Learn how to create your own journals and planners, and transform your homeschooling passion into a
                    sustainable business.
                  </p>
                </div>
                <ul className="space-y-3">
                  {[
                    "Design beautiful, functional paper products",
                    "Master binding techniques and material selection",
                    "Build a business around your homeschooling expertise",
                    "Market and sell your creations to other homeschoolers",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <div className="h-3 w-3 rounded-full bg-brand-purple"></div>
                      <span className="text-[#6d4c41]">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Link href="/papers-to-profits">
                    <Button
                      className="relative overflow-hidden group"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105 transition-transform duration-500"></span>
                      <span className="absolute inset-0 w-full h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                      <span className="relative flex items-center gap-2 z-10 text-white">
                        Join Our Class
                        <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </motion.div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInFromRight}
                className="mx-auto flex items-center justify-center lg:justify-end perspective"
              >
                <div className="grid grid-cols-2 gap-4 relative">
                  {/* 3D Rotating Gallery */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 z-0"
                    animate={{
                      rotateY: [0, 10, 0],
                      rotateX: [0, -5, 0],
                    }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                      duration: 10,
                    }}
                    style={{ perspective: 1000 }}
                  >
                    {[
                      {
                        src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png",
                        alt: "Journal design",
                        delay: 0,
                      },
                      {
                        src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners2-pYMevHnwxaHaXZ3qlWUF18bMpXjxwy.png",
                        alt: "Planner layout",
                        delay: 0.1,
                      },
                      {
                        src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners3-kXAVy71MQtO5Jq7UTmny6gJeTdEGx4.png",
                        alt: "Binding technique",
                        delay: 0.2,
                      },
                      {
                        src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studentsprojects-VL4lVSnwi1RbenFVjYBDhe0i037AA5.png",
                        alt: "Finished product",
                        delay: 0.3,
                      },
                    ].map((image, i) => (
                      <motion.div
                        key={i}
                        className="relative"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: image.delay, duration: 0.5 }}
                        style={{
                          gridColumn: i % 2 === 0 ? 1 : 2,
                          gridRow: i < 2 ? 1 : 2,
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, z: 20 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="relative rounded-lg overflow-hidden shadow-2xl"
                        >
                          {/* Gradient border */}
                          <div className="absolute inset-0 p-[2px] rounded-lg bg-gradient-to-br from-white via-brand-pink/40 to-brand-purple z-10">
                            <div className="absolute inset-0 rounded-lg bg-white"></div>
                          </div>

                          <Image
                            src={image.src || "/placeholder.svg"}
                            alt={image.alt}
                            width={250}
                            height={300}
                            className="rounded-lg object-cover h-full transition-all duration-500 transform scale-[1.01]"
                          />

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#5d4037]/60 via-transparent to-transparent flex items-end p-4">
                            <p className="text-white text-sm font-medium">{image.alt}</p>
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32 bg-white relative">
          {/* Decorative elements */}
          <svg
            className="absolute top-0 left-0 right-0 w-full h-12 text-brand-blue/20 -mt-1"
            preserveAspectRatio="none"
            viewBox="0 0 1440 54"
          >
            <path
              fill="currentColor"
              d="M0 22L60 16.7C120 11 240 1 360 0C480 -1 600 9 720 16C840 23 960 27 1080 25.3C1200 23 1320 16 1380 12.7L1440 9V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z"
            ></path>
          </svg>

          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <div className="inline-flex items-center space-x-1 rounded-full bg-brand-blue/30 px-4 py-1.5 mb-4">
                <span className="font-medium text-brand-purple">Curriculum</span>
              </div>
              <div className="space-y-2 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-serif tracking-tighter text-[#5d4037]">What You'll Learn</h2>
                <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
                  Our comprehensive curriculum covers everything you need to create beautiful, functional paper
                  products.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
              className="mx-auto max-w-4xl"
            >
              <Tabs defaultValue="design" className="w-full">
                <TabsList className="w-full p-1 bg-[#f9f6f2] rounded-full grid grid-cols-4 mb-8 overflow-x-auto">
                  {["design", "materials", "binding", "business"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-full data-[state=active]:bg-brand-purple data-[state=active]:text-white transition-all duration-500 capitalize"
                    >
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {[
                  {
                    value: "design",
                    title: "Journal & Planner Design",
                    description: "Learn the principles of effective layout and design",
                    items: [
                      "Creating functional layouts for different purposes",
                      "Designing beautiful covers and page elements",
                      "Typography and color theory for paper products",
                      "Digital tools and templates for efficient design",
                    ],
                    image:
                      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png",
                  },
                  {
                    value: "materials",
                    title: "Materials Selection",
                    description: "Choose the right papers and supplies for your projects",
                    items: [
                      "Paper weights, finishes, and qualities",
                      "Cover materials and durability considerations",
                      "Sourcing supplies at the best prices",
                      "Eco-friendly and sustainable options",
                    ],
                    image:
                      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners2-pYMevHnwxaHaXZ3qlWUF18bMpXjxwy.png",
                  },
                  {
                    value: "binding",
                    title: "Binding Techniques",
                    description: "Master various methods to assemble your creations",
                    items: [
                      "Spiral, coil, and disc binding systems",
                      "Traditional bookbinding methods",
                      "Japanese stab binding and other decorative techniques",
                      "Tools and equipment for professional results",
                    ],
                    image:
                      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners3-kXAVy71MQtO5Jq7UTmny6gJeTdEGx4.png",
                  },
                  {
                    value: "business",
                    title: "Business Fundamentals",
                    description: "Transform your skills into a profitable venture",
                    items: [
                      "Pricing strategies for handmade paper products",
                      "Marketing to the homeschooling community",
                      "Setting up online shops and managing orders",
                      "Scaling production while maintaining quality",
                    ],
                    image:
                      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studentsprojects-VL4lVSnwi1RbenFVjYBDhe0i037AA5.png",
                  },
                ].map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                    <Card className="border-none shadow-lg overflow-hidden">
                      <div className="md:grid md:grid-cols-2">
                        <div className="p-6 md:p-8">
                          <CardTitle className="text-2xl font-serif text-[#5d4037] mb-2">{tab.title}</CardTitle>
                          <CardDescription className="text-[#6d4c41] text-lg mb-6">{tab.description}</CardDescription>
                          <div className="space-y-4">
                            {tab.items.map((item, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-3"
                              >
                                <div className="h-2 w-2 rounded-full bg-brand-purple"></div>
                                <span className="text-[#6d4c41]">{item}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        <div className="relative h-64 md:h-auto overflow-hidden">
                          <Image
                            src={tab.image || "/placeholder.svg"}
                            alt={tab.title}
                            fill
                            className="object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </motion.div>
          </div>
        </section>

        {/* Use Intersection Observer to load sections only when they come into view */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.5 } }
          }}
        >
          <SocialIntegration variant="full" />
        </motion.div>
      </main>
      <PublicFooter />
    </div>
  )
}

// Default export with proper Suspense boundary
export default function HomePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-brand-purple/20 rounded-full mb-4"></div>
        <div className="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
