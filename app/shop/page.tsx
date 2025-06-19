'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Mail, Bell, Package, Sparkles, Heart, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'

// Animation variants following design context timing (150-300ms)
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const fadeInScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" }
}

export default function ShopComingSoon() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubmitted(true)
      setEmail('')
      // TODO: Integrate with email service
      setTimeout(() => setIsSubmitted(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <PublicHeader />
      
      {/* Floating Background Elements - Using design context colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <main className="relative">
        <div className="container mx-auto px-6 py-20">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={staggerContainer}
            initial="initial"
            animate={isLoaded ? "animate" : "initial"}
          >
            {/* Coming Soon Badge */}
            <motion.div variants={fadeInUp} className="mb-8">
              <Badge 
                variant="outline" 
                className="mb-4 bg-white/50 backdrop-blur-sm border-primary/20 text-primary px-6 py-2 text-sm font-medium"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Coming Soon
              </Badge>
            </motion.div>

            {/* Main Heading - Using Playfair Display from design context */}
            <motion.h1 
              variants={fadeInUp}
              className="font-serif text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent leading-tight"
            >
              Graceful Homeschooling Resources
            </motion.h1>

            {/* Subtitle - Using Inter from design context */}
            <motion.p 
              variants={fadeInUp}
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              We're crafting something special for the homeschooling community. Get ready for curated resources, tools, and materials to support your graceful journey.
            </motion.p>

            {/* Feature Preview Cards */}
            <motion.div 
              variants={fadeInUp}
              className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto"
            >
              {[
                {
                  icon: Package,
                  title: "Curated Resources",
                  description: "Handpicked educational materials and tools for every homeschooling family"
                },
                {
                  icon: Heart,
                  title: "Community Favorites",
                  description: "Products recommended and loved by our Graceful Homeschooling community"
                },
                {
                  icon: Gift,
                  title: "Exclusive Bundles",
                  description: "Special collections and bundles available only to our community members"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInScale}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 group"
                >
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Notify Me Form */}
            <motion.div 
              variants={fadeInUp}
              className="bg-card/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50 max-w-md mx-auto"
            >
              <div className="text-center mb-6">
                <Bell className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Get Notified</h2>
                <p className="text-muted-foreground">Be the first to know when we launch</p>
              </div>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleNotifySubmit}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      />
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 group"
                      >
                        <Mail className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        Notify Me
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll only send you updates about the shop launch. No spam, ever.
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-center py-4"
                  >
                    <div className="bg-green-100 text-green-800 p-4 rounded-lg">
                      <Sparkles className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium">You're on the list!</p>
                      <p className="text-sm mt-1">We'll notify you as soon as the shop opens.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Call to Action */}
            <motion.div variants={fadeInUp} className="mt-12">
              <p className="text-muted-foreground mb-6">
                In the meantime, explore our current offerings
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  className="border-primary text-primary hover:bg-primary/10 group"
                  asChild
                >
                  <a href="/papers-to-profits">
                    Papers to Profits Course
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-secondary text-secondary hover:bg-secondary/10 group"
                  asChild
                >
                  <a href="/canva-ebook">
                    Free Canva Ebook
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  )
} 