"use client"

import { useState, useEffect } from "react"
import { Play, FastForward, User, Youtube, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/api-utils"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

// Types for YouTube data from API
interface YouTubeChannel {
  id: string
  title: string
  description: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  thumbnailUrl: string
}

interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  publishedDate?: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
}

// Format published date helper function
function formatPublishedDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function YouTubeFeature() {
  const [activeVideo, setActiveVideo] = useState(0)
  const [channel, setChannel] = useState<YouTubeChannel | null>(null)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real YouTube data when component mounts
  useEffect(() => {
    const fetchYouTubeData = async () => {
      try {
        setIsLoading(true)
        
        // Call our server-side API endpoint instead of direct YouTube API
        const response = await fetch('/api/youtube-data')
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || "Failed to fetch YouTube data")
        }
        
        console.log('✅ YouTube data loaded:', {
          channel: data.channel?.title,
          videosCount: data.videos?.length,
          cached: data.cached
        })
        
        setChannel(data.channel)
        setVideos(data.videos)
        setError(null)
      } catch (err) {
        console.warn("Failed to fetch YouTube data:", err)
        setError(err instanceof Error ? err.message : "Failed to load YouTube data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchYouTubeData()
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full py-20 md:py-28 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Loading YouTube content...</p>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state for debugging
  if (error || !channel || videos.length === 0) {
    return (
      <div className="w-full py-20 md:py-28 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-md mx-auto">
            <div className="text-accent mb-4">
              <Youtube className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">YouTube Content Unavailable</p>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {error || "No YouTube data available"}
            </p>
            <Link
              href="https://www.youtube.com/@gracefulhomeschooling"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors duration-200"
            >
              <Youtube className="h-4 w-4 mr-2" />
              Visit YouTube Channel
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-20 md:py-28 bg-gradient-to-br from-background via-background to-accent/5 relative overflow-hidden">
      {/* Floating Background Elements - Using design context colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-secondary/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container px-4 md:px-6 relative">
        {/* Header Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Badge variant="outline" className="mb-4 bg-white/50 backdrop-blur-sm border-accent/20">
            YouTube Community
          </Badge>
          
          <div className="inline-flex items-center rounded-full bg-accent/10 px-6 py-2 mb-6 border border-accent/20">
            <div className="w-2 h-2 rounded-full bg-accent mr-3 animate-pulse"></div>
            <span className="font-semibold text-accent">
              {formatNumber(channel.subscriberCount)}+ Subscribers
            </span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Watch Our Recent Videos
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Explore our YouTube channel with practical homeschooling tips, tutorials, business side-hustles and creative ideas
          </p>
        </motion.div>

        {/* Video Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main video feature */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <h3 className="font-serif text-2xl font-semibold text-foreground mb-4">Featured Video</h3>
            <Link
              href={`https://www.youtube.com/watch?v=${videos[activeVideo].id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg border border-border transition-all duration-200">
                <div className="relative aspect-video">
                  <Image
                    src={videos[activeVideo].thumbnailUrl || "/placeholder.svg"}
                    alt={videos[activeVideo].title}
                    fill
                    className="object-cover"
                  />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Play className="h-8 w-8 text-accent-foreground ml-1" fill="currentColor" />
                    </motion.div>
                  </div>
                  {/* Duration */}
                  <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm px-2 py-1 rounded">
                    {videos[activeVideo].duration}
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-semibold text-foreground mb-2 leading-tight">
                    {videos[activeVideo].title}
                  </h4>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>@gracefulhomeschooling</span>
                      </div>
                      <div className="flex items-center">
                        <Play className="h-4 w-4 mr-1" />
                        <span>{formatNumber(videos[activeVideo].viewCount)} views</span>
                      </div>
                    </div>
                    <span>{formatPublishedDate(videos[activeVideo].publishedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Video list */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl font-semibold text-foreground">More Videos</h3>
              <Link
                href="https://www.youtube.com/@gracefulhomeschooling"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 font-medium flex items-center transition-colors duration-200"
              >
                View Channel
                <FastForward className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {videos.slice(0, 5).map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                  className={cn(
                    "cursor-pointer bg-card rounded-lg border hover:shadow-md transition-all duration-200 p-3 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]",
                    activeVideo === index ? "border-accent/30 bg-accent/5 shadow-sm" : "border-border hover:border-primary/30"
                  )}
                  onClick={() => setActiveVideo(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActiveVideo(index)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select video: ${video.title}`}
                >
                  <div className="flex gap-3">
                    <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
                      <Image
                        src={video.thumbnailUrl || "/placeholder.svg"}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                          activeVideo === index ? "bg-accent shadow-sm" : "bg-black/60"
                        )}>
                          <Play className="h-3 w-3 text-white" fill="white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                        {video.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatNumber(video.viewCount)} views</span>
                        <span>{video.publishedDate}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href="https://www.youtube.com/@gracefulhomeschooling?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-lg font-medium transition-colors duration-200 shadow-md motion-reduce:transition-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Subscribe to Graceful Homeschooling YouTube channel"
            >
              Subscribe to Our Channel
            </Link>
          </motion.div>
        </div>

        {/* Fallback link */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
                      <Link
              href="https://www.youtube.com/@gracefulhomeschooling"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-accent hover:text-accent/80 transition-colors duration-200"
            >
              <Youtube className="h-5 w-5 mr-2" />
              <span>Can't see our videos? Visit our YouTube channel directly</span>
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
        </motion.div>
      </div>
    </div>
  )
}

