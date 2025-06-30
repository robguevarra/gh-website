"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Home } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"

export default function NotFound() {
  const [isLoaded, setIsLoaded] = useState(false)
  
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5]">
      <PublicHeader />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24">
        <motion.div 
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          variants={fadeIn}
          className="w-full max-w-3xl mx-auto text-center space-y-6"
        >
          {/* Error Image */}
          <div className="relative h-40 sm:h-56 md:h-64 mx-auto mb-8">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners3-kXAVy71MQtO5Jq7UTmny6gJeTdEGx4.png"
              alt="Page not found illustration"
              fill
              className="object-contain"
            />
          </div>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#5d4037] mb-4">
            Page Not Found
          </h1>
          
          <p className="text-[#6d4c41] text-lg md:text-xl max-w-xl mx-auto mb-8">
            We couldn't find the page you're looking for. The page might have been moved, 
            deleted, or never existed in the first place.
          </p>

          <Card className="bg-white/70 backdrop-blur-sm border border-brand-purple/20 shadow-lg p-6 mb-8">
            <div className="text-[#6d4c41] mb-4">
              Here are some helpful links to get you back on track:
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                className="bg-brand-purple hover:bg-brand-purple/90 text-white"
              >
                <Link href="/" className="flex items-center gap-2">
                  <Home size={18} />
                  <span>Back to Home</span>
                </Link>
              </Button>
              
            </div>
          </Card>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <p className="text-[#6d4c41]/80 text-sm">
              If you believe this is an error, please{" "}
              <Link href="/contact" className="text-brand-purple hover:underline">
                contact support
              </Link>
              .
            </p>
          </motion.div>
        </motion.div>
      </main>
      
      <PublicFooter />
    </div>
  )
}
