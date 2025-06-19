"use client"

import { motion } from "framer-motion"
import dynamic from 'next/dynamic'

// Dynamically import the social components
const SocialWall = dynamic(() => import("./social-wall").then(mod => mod.SocialWall), {
  loading: () => <div className="w-full py-16 bg-white animate-pulse h-40"></div>,
  ssr: false
})

const YouTubeFeature = dynamic(() => import("./youtube-feature").then(mod => mod.YouTubeFeature), {
  loading: () => <div className="w-full py-16 bg-brand-blue/10 animate-pulse h-40"></div>,
  ssr: false
})

const FacebookHighlights = dynamic(() => import("./facebook-highlights").then(mod => mod.FacebookHighlights), {
  loading: () => <div className="w-full py-16 bg-white animate-pulse h-40"></div>,
  ssr: false
})

interface SocialIntegrationProps {
  variant?: "full" | "compact" | "youtube-focus" | "facebook-focus"
}

export function SocialIntegration({ variant = "full" }: SocialIntegrationProps) {
  // Determine which components to render based on the variant
  const renderSocialWall = variant === "full" || variant === "compact"
  const renderYouTubeFeature = variant === "full" || variant === "youtube-focus"
  const renderFacebookHighlights = variant === "full" || variant === "facebook-focus"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative">
      {/* Decorative floating elements that persist across sections */}
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

      {/* Social components */}
      {renderSocialWall && <SocialWall />}
      {renderYouTubeFeature && <YouTubeFeature />}
      {renderFacebookHighlights && <FacebookHighlights />}
    </motion.div>
  )
}

// Add default export for better compatibility with dynamic imports
export default SocialIntegration;

