"use client"

import { useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Facebook } from "lucide-react"
import Script from "next/script"

export function FacebookHighlights() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })

  // Initialize Facebook SDK
  useEffect(() => {
    // This will re-parse embedded FB content when the component mounts
    if (window.FB) {
      window.FB.XFBML.parse()
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full py-20 md:py-28 bg-white overflow-hidden">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"
        strategy="lazyOnload"
        onLoad={() => {
          if (window.FB) window.FB.XFBML.parse()
        }}
      />

      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center space-y-4 text-center mb-16"
        >
          <div className="inline-flex items-center space-x-1 rounded-full bg-[#1877F2]/10 px-4 py-1.5 mb-4">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            <span className="font-medium text-[#1877F2]">Join Our Community</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif tracking-tighter text-[#5d4037]">What Our Community Says</h2>
          <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
            Connect with our Facebook community of homeschooling parents
          </p>
        </motion.div>

        <div className="flex flex-col items-center">
          {/* Facebook Page Plugin */}
          <div
            className="fb-page"
            data-href="https://www.facebook.com/GracefulHomeschoolingbyEmigrace"
            data-tabs="timeline"
            data-width="500"
            data-height="700"
            data-small-header="false"
            data-adapt-container-width="true"
            data-hide-cover="false"
            data-show-facepile="true"
          >
            <blockquote
              cite="https://www.facebook.com/GracefulHomeschoolingbyEmigrace"
              className="fb-xfbml-parse-ignore"
            >
              <a href="https://www.facebook.com/GracefulHomeschoolingbyEmigrace">Graceful Homeschooling</a>
            </blockquote>
          </div>

          {/* Fallback message in case Facebook embed fails */}
          <div className="mt-8 text-center">
            <p className="text-[#6d4c41]">
              Can't see our Facebook feed?{" "}
              <a
                href="https://www.facebook.com/GracefulHomeschoolingbyEmigrace"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1877F2] underline"
              >
                Visit our page directly
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

