"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { BookOpen, Heart, Calendar, PenTool, Bookmark, ChevronRight, ArrowRight, Star } from "lucide-react"
import { motion, useScroll, AnimatePresence, useInView, useTransform, useMotionValue, useSpring } from "framer-motion"
import dynamic from 'next/dynamic'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Logo } from "@/components/ui/logo"
// Import SocialIntegration component dynamically
const SocialIntegration = dynamic(() => import('@/components/social-proof/social-integration').then(mod => mod.SocialIntegration), {
  loading: () => <div className="w-full py-20 md:py-32 bg-brand-blue/10 flex items-center justify-center">
    <div className="animate-pulse bg-gray-200 h-40 w-full max-w-4xl rounded-lg"></div>
  </div>,
  ssr: false
})
import { useMobile } from "@/hooks/use-mobile"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const isHeroInView = useInView(heroRef, { once: true })
  const isMobile = useMobile()

  // Mouse trail effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 400 })
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 400 })

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

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY })
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [mouseX, mouseY])

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
  const heroTextLines = ["Create Your Own", "Journals & Planners"]

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
        <div className="grid gap-6 lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_800px]">
          <motion.div
            initial="hidden"
            animate={isHeroInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className="flex flex-col justify-center space-y-8"
            style={{ y: heroTextY }}
          >
            {/* Badge */}
            <motion.div
              variants={fadeIn}
              className="inline-flex items-center rounded-full bg-white/80 backdrop-blur-sm px-3 py-1.5 text-sm max-w-max shadow-sm"
            >
              <Star className="h-4 w-4 mr-2 text-brand-purple" />
              <span className="text-[#5d4037] font-medium">Homeschooling with Grace</span>
            </motion.div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif tracking-tighter text-[#5d4037] overflow-hidden">
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

              <motion.p variants={fadeIn} className="max-w-[600px] text-[#6d4c41] md:text-xl font-light">
                Empowering homeschooling parents with tools, resources, and insights to enhance their educational
                journey.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div variants={fadeIn} className="flex flex-col gap-3 min-[400px]:flex-row">
              <Button
                size="lg"
                className="h-14 px-8 overflow-hidden relative group"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-purple to-brand-pink group-hover:scale-105 transition-transform duration-500"></span>
                <span className="absolute inset-0 w-full h-full bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md"></span>
                <span className="relative flex items-center gap-2 z-10 text-white">
                  Join Our Class
                  <ArrowRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-brand-purple text-brand-purple relative overflow-hidden group"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span className="absolute inset-0 w-0 bg-brand-blue/30 transition-all duration-500 ease-out group-hover:w-full"></span>
                <span className="relative z-10">Learn More</span>
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
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white bg-brand-blue/20 flex items-center justify-center text-xs font-medium text-brand-purple"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm text-[#6d4c41]">
                <span className="font-medium">1,000+ students</span> already enrolled
              </div>
            </motion.div>
          </motion.div>

          {/* Right side with Grace's portrait and workspace */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ perspective: 1000 }}
            className="mx-auto flex items-center justify-center lg:justify-end relative"
          >
            {/* Decorative elements */}
            <motion.div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full border-4 border-brand-pink/20 z-10"
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
              className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full border-2 border-brand-purple/30 z-10"
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
              className="absolute -left-12 bottom-0 w-[300px] md:w-[400px] z-20"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{ y: graceImageY }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/grace-tv60B3oEq1pzd4eXo8LEPPqGVA4WFd.png"
                alt="Grace from Graceful Homeschooling"
                width={400}
                height={500}
                quality={90}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
                className="h-auto"
                priority
              />

              {/* Floating badge */}
              <motion.div
                className="absolute top-10 right-0 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg"
                initial={{ opacity: 0, y: 20, rotate: -5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <div className="text-sm font-medium text-brand-purple">Meet Grace</div>
                <div className="text-xs text-[#6d4c41]">Your Homeschooling Guide</div>
              </motion.div>
            </motion.div>

            {/* Featured Content Card */}
            <motion.div
              className="relative w-full max-w-[600px] aspect-video rounded-xl overflow-hidden ml-auto"
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
                      Turn your passion for homeschooling into a sustainable business
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
      {/* Custom cursor */}
      <AnimatePresence>
        {isHovering && !isMobile && (
          <motion.div
            className="fixed w-24 h-24 rounded-full bg-brand-purple/20 backdrop-blur-sm pointer-events-none z-50 mix-blend-difference"
            style={{
              left: cursorPosition.x - 48,
              top: cursorPosition.y - 48,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        )}
      </AnimatePresence>

      {/* Mouse trail effect */}
      {!isMobile && (
        <motion.div
          className="fixed w-8 h-8 rounded-full bg-brand-pink/10 pointer-events-none z-40 mix-blend-screen"
          style={{
            left: smoothMouseX,
            top: smoothMouseY,
            translateX: "-50%",
            translateY: "-50%",
          }}
        />
      )}

      <header className="sticky top-0 z-50 w-full backdrop-blur-md supports-[backdrop-filter]:bg-[#f9f6f2]/60">
        <div className="container flex h-16 items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Logo size={isMobile ? "small" : "medium"} />
          </motion.div>
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex gap-6"
          >
            <Link
              href="#"
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/papers-to-profits"
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Papers to Profits
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Shop
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </motion.nav>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <Link
              href="#"
              className="text-sm font-medium text-[#5d4037] transition-colors hover:text-brand-purple hidden md:block relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Login
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-purple transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Button
              className="relative overflow-hidden bg-transparent border border-brand-purple text-brand-purple hover:text-white group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <span className="absolute inset-0 w-full h-full bg-brand-purple translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0"></span>
              <span className="relative flex items-center gap-1 z-10 group-hover:text-white transition-colors duration-300">
                Get Started
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            </Button>
          </motion.div>
        </div>
      </header>
      <main ref={pageRef} className="relative min-h-screen overflow-x-hidden">
        {renderHeroSection()}
        
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
                <span className="font-medium text-brand-purple">Our Vision</span>
              </div>
              <div className="space-y-8 max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-serif tracking-tighter text-[#5d4037]">Our Mission</h2>
                <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
                  Graceful Homeschooling is dedicated to empowering homeschooling parents with tools, resources, and
                  insights to enhance their educational journey.
                </p>
                <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
                  At its core, Graceful Homeschooling is about combining the passion for education with practical
                  solutions that foster a nurturing learning environment at home.
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
                  icon: <BookOpen className="h-6 w-6" />,
                  title: "Educational Resources",
                  description:
                    "Discover curated resources to enhance your homeschooling curriculum and create a rich learning environment.",
                },
                {
                  icon: <PenTool className="h-6 w-6" />,
                  title: "Paper Crafting",
                  description:
                    "Learn to create beautiful journals, planners, and educational materials that inspire learning and organization.",
                },
                {
                  icon: <Calendar className="h-6 w-6" />,
                  title: "Planning Tools",
                  description:
                    "Gain access to planning systems and tools designed specifically for the unique needs of homeschooling families.",
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
      </main>
      <footer className="w-full border-t border-[#e7d9ce] bg-[#f9f6f2]">
        <div className="container flex flex-col gap-8 px-4 py-10 md:px-6 lg:flex-row lg:gap-12">
          <div className="flex flex-col gap-4 lg:w-1/3">
            <div className="flex items-center gap-2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png"
                alt="Graceful Homeschooling Logo"
                width={40}
                height={40}
                className="rounded-md"
              />
              <span className="text-xl font-serif tracking-tight text-[#5d4037]">Graceful Homeschooling</span>
            </div>
            <p className="text-[#6d4c41] font-light">
              Empowering homeschooling parents with tools, resources, and insights to enhance their educational journey.
            </p>
            <div className="flex gap-4">
              {["Instagram", "Facebook", "Pinterest", "YouTube"].map((social, i) => (
                <Link
                  key={i}
                  href="#"
                  className="text-brand-purple hover:text-[#8d6e63] transition-colors"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {social}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#5d4037]">Quick Links</h4>
              <ul className="space-y-2">
                {["Home", "Papers to Profits", "Shop", "About", "Login"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#5d4037]">Resources</h4>
              <ul className="space-y-2">
                {["Free Guides", "Blog", "Tutorials", "Success Stories", "Materials Guide"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-[#5d4037]">Legal</h4>
              <ul className="space-y-2">
                {["Terms", "Privacy", "Cookies", "Contact"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-sm text-[#6d4c41] hover:text-brand-purple transition-colors"
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-[#e7d9ce]">
          <div className="container flex flex-col gap-2 px-4 py-6 text-center md:flex-row md:justify-between md:px-6 md:text-left">
            <p className="text-xs text-[#6d4c41]">
              &copy; {new Date().getFullYear()} Graceful Homeschooling by Graceful Publications. All rights reserved.
            </p>
            <p className="text-xs text-[#6d4c41]">Designed with grace for homeschooling families.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

