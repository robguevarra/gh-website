"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Play, FastForward, User, Youtube, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getYouTubeChannel, getYouTubeVideos, formatPublishedDate } from "@/lib/youtube-api"
import { formatNumber } from "@/lib/api-utils"
import type { YouTubeChannel, YouTubeVideo } from "@/lib/youtube-api"

// Debug mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Helper function for logging
function debugLog(...args: any[]): void {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Helper function for warning
function debugWarn(...args: any[]): void {
  if (DEBUG_MODE) {
    console.warn(...args);
  } else {
    // In production, only log the first argument without details
    if (args.length > 0 && typeof args[0] === 'string') {
      console.warn(args[0]);
    }
  }
}

// Fallback data when API is unavailable
const fallbackChannel: YouTubeChannel = {
  id: "gracefulhomeschooling",
  title: "Graceful Homeschooling",
  description: "Empowering homeschooling parents with tools, resources, and insights.",
  subscriberCount: 91000,
  videoCount: 156,
  viewCount: 2450000,
  thumbnailUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png",
}

const fallbackVideos: YouTubeVideo[] = [
  {
    id: "video1",
    title: "How to Create a Simple Homeschool Planner | Graceful Homeschooling",
    description:
      "Learn how to create a beautiful and functional homeschool planner that will help you stay organized throughout the year.",
    publishedAt: "2023-11-15T14:30:00Z",
    thumbnailUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png",
    viewCount: 16420,
    likeCount: 982,
    commentCount: 103,
    duration: "14:22",
  },
  {
    id: "video2",
    title: "5 Essential Homeschooling Tips for Beginners | Start Your Journey",
    description:
      "New to homeschooling? These 5 essential tips will help you get started on the right foot and avoid common beginner mistakes.",
    publishedAt: "2023-10-22T10:15:00Z",
    thumbnailUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studentsprojects-VL4lVSnwi1RbenFVjYBDhe0i037AA5.png",
    viewCount: 28532,
    likeCount: 1742,
    commentCount: 215,
    duration: "18:35",
  },
  {
    id: "video3",
    title: "DIY Journal Binding: A Step-by-Step Tutorial for Homeschoolers",
    description:
      "Learn how to bind your own journals and notebooks with this easy-to-follow tutorial perfect for homeschooling families.",
    publishedAt: "2023-09-05T09:45:00Z",
    thumbnailUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners3-kXAVy71MQtO5Jq7UTmny6gJeTdEGx4.png",
    viewCount: 19724,
    likeCount: 1435,
    commentCount: 87,
    duration: "22:14",
  },
]

export function YouTubeFeature() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  const [activeVideo, setActiveVideo] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  // Always use fallback data directly
  const [channel] = useState<YouTubeChannel>(fallbackChannel)
  const [videos] = useState<YouTubeVideo[]>(fallbackVideos)
  const [isLoading, setIsLoading] = useState(false)
  const [error] = useState<string | null>(null)

  useEffect(() => {
    // Auto-rotate videos every 5 seconds if not hovering
    if (isHovering || videos.length === 0) return

    const interval = setInterval(() => {
      setActiveVideo((prev) => (prev + 1) % videos.length)
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [videos.length, isHovering])

  return (
    <motion.div ref={containerRef} className="w-full py-20 md:py-28 bg-[#f9f6f2] overflow-hidden">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center space-y-4 text-center mb-16"
        >
          <div className="inline-flex items-center space-x-1 rounded-full bg-red-500/10 px-4 py-1.5 mb-4">
            <div className="relative flex items-center">
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="absolute w-2 h-2 rounded-full bg-red-500 left-0"
              />
              <span className="font-medium text-red-500 ml-3">
                {formatNumber(channel.subscriberCount)}+ Subscribers
              </span>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif tracking-tighter text-[#5d4037]">
            Watch Our Most Popular Videos
          </h2>
          <p className="max-w-[700px] text-[#6d4c41] md:text-lg font-light">
            Explore our YouTube channel with practical homeschooling tips, tutorials, and creative ideas
          </p>

          <></>
        </motion.div>

        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Main video feature */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl"
          >
            <Link
              href={`https://www.youtube.com/watch?v=${videos[activeVideo].id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="group relative aspect-video overflow-hidden">
                <Image
                  src={videos[activeVideo].thumbnailUrl || "/placeholder.svg"}
                  alt={videos[activeVideo].title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* Play button */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                      <Play className="h-8 w-8 text-red-500 ml-1" />
                    </div>
                  </motion.div>
                </div>

                {/* Duration badge */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {videos[activeVideo].duration}
                </div>
              </div>

              <div className="p-6 bg-white">
                <h3 className="text-xl font-medium text-[#5d4037] mb-2">{videos[activeVideo].title}</h3>
                <div className="flex items-center justify-between text-sm text-[#6d4c41]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>@{channel.id}</span>
                    </div>
                    <div className="flex items-center">
                      <Play className="h-4 w-4 mr-1" />
                      <span>{formatNumber(videos[activeVideo].viewCount)} views</span>
                    </div>
                  </div>
                  <span>{formatPublishedDate(videos[activeVideo].publishedAt)}</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Video playlist */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[#5d4037]">More Videos</h3>
              <Link
                href={`https://www.youtube.com/@${channel.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-purple text-sm flex items-center hover:underline"
              >
                View Channel
                <FastForward className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-4">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "cursor-pointer rounded-lg overflow-hidden bg-white shadow-md transition-all duration-300",
                    activeVideo === index ? "ring-2 ring-brand-purple" : "",
                  )}
                  onClick={() => setActiveVideo(index)}
                >
                  <div className="flex h-24">
                    <div className="relative w-32 flex-shrink-0">
                      <Image
                        src={video.thumbnailUrl || "/placeholder.svg"}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {activeVideo === index ? (
                          <div className="w-8 h-8 rounded-full bg-brand-purple/90 flex items-center justify-center">
                            <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                            <Play className="h-4 w-4 text-white ml-0.5" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-sm font-medium text-[#5d4037] line-clamp-2">{video.title}</h4>
                      <div className="flex items-center justify-between text-xs text-[#6d4c41]">
                        <div className="flex items-center">
                          <Play className="h-3 w-3 mr-1" />
                          <span>{formatNumber(video.viewCount)}</span>
                        </div>
                        <span>{formatPublishedDate(video.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href={`https://www.youtube.com/@${channel.id}?sub_confirmation=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg mt-6 transition-colors duration-300"
            >
              Subscribe to Our Channel
            </Link>
          </motion.div>
        </div>

        {/* Direct link as fallback */}
        <div className="mt-8 text-center">
          <Link
            href="https://www.youtube.com/@gracefulhomeschooling"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-red-500 hover:text-red-600"
          >
            <Youtube className="h-5 w-5 mr-2" />
            <span>Can't see our videos? Visit our YouTube channel directly</span>
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

