"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
  Facebook,
  Youtube,
  ArrowRight,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Users,
  Video,
  Clock,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Types for API data
interface SocialData {
  youtube: {
    subscriberCount: number
    latestVideo?: {
      title: string
      views: string
      duration: string
      thumbnail: string
    }
  }
  facebook: {
    followerCount: number
  }
}

// Types for video content
interface VideoContent {
  id: number
  type: "youtube" | "facebook"
  title: string
  image: string
  link: string
  stats: { views?: string; likes: string; comments: string; shares?: string }
  date: string
}

export function SocialWall() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  const [activeTab, setActiveTab] = useState<"all" | "youtube" | "facebook">("all")
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null)
  
  // Real social data state
  const [socialData, setSocialData] = useState<SocialData>({
    youtube: {
      subscriberCount: 101000, // Fallback data
      latestVideo: {
        title: "Papers to Profits: Transform Your Homeschool Journey",
        views: "35K",
        duration: "14:22",
        thumbnail: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png"
      }
    },
    facebook: {
      followerCount: 154000 // Fallback data
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Real social content state - will be populated from API
  const [socialContent, setSocialContent] = useState<VideoContent[]>([])

  // Fetch real social data and populate content
  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch YouTube data from our server API
        const youtubeResponse = await fetch('/api/youtube-data')
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json()
          if (youtubeData.success && youtubeData.videos && youtubeData.videos.length > 0) {
            // Update social data with real channel info
            const latestVideo = youtubeData.videos[0]
            setSocialData(prev => ({
              ...prev,
              youtube: {
                subscriberCount: youtubeData.channel.subscriberCount,
                latestVideo: latestVideo ? {
                  title: latestVideo.title,
                  views: formatViews(latestVideo.viewCount),
                  duration: latestVideo.duration,
                  thumbnail: latestVideo.thumbnailUrl
                } : prev.youtube.latestVideo
              }
            }))
            
            // Create real social content from API data
            const realYouTubeContent: VideoContent[] = youtubeData.videos.map((video: any, index: number) => ({
              id: index + 1,
              type: "youtube" as const,
              title: video.title,
              image: video.thumbnailUrl,
              link: "https://www.youtube.com/@gracefulhomeschooling",
              stats: { 
                views: formatViews(video.viewCount), 
                likes: formatViews(video.likeCount), 
                comments: video.commentCount.toString() 
              },
              date: formatPublishedDate(video.publishedAt),
            }))
            
            // Add some Facebook content (keeping a few curated posts for now)
            const facebookContent: VideoContent[] = [
              {
                id: 10,
                type: "facebook",
                title: "Success Story: From YouTube Viewer to Business Owner",
                image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners2-pYMevHnwxaHaXZ3qlWUF18bMpXjxwy.png",
                link: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
                stats: { likes: "1.2K", comments: "156", shares: "89" },
                date: "2 weeks ago",
              },
              {
                id: 11,
                type: "facebook",
                title: "Student Success Story: EMJ ALFARO",
                image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials1.jpg-vdiuWnYVM7nV2SaQDk81F9HXwPJVQE.jpeg",
                link: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
                stats: { likes: "347", comments: "42", shares: "15" },
                date: "1 month ago",
              },
              {
                id: 12,
                type: "facebook",
                title: "Homeschooling Workshop Highlights",
                image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials2-pX2f6lNy6Aa6QnwvxHcosIfvJbB5xu.png",
                link: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
                stats: { likes: "289", comments: "34", shares: "8" },
                date: "2 months ago",
              },
            ]
            
            // Combine YouTube (real) + Facebook (curated) content
            setSocialContent([...realYouTubeContent, ...facebookContent])
          }
        }
        
        // Fetch Facebook data from new Facebook API
        const facebookResponse = await fetch('/api/facebook-data')
        if (facebookResponse.ok) {
          const facebookData = await facebookResponse.json()
          if (facebookData.success && facebookData.data?.page?.followers_count) {
            setSocialData(prev => ({
              ...prev,
              facebook: {
                followerCount: facebookData.data.page.followers_count
              }
            }))
          }
        }
        
      } catch (error) {
        console.log("Could not fetch real social data, using fallback:", error)
        // Create fallback content if API fails
        const fallbackContent: VideoContent[] = [
          {
            id: 1,
            type: "youtube",
            title: "Papers to Profits: Transform Your Homeschool Journey",
            image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png",
            link: "https://www.youtube.com/@gracefulhomeschooling",
            stats: { views: "35K", likes: "2.1K", comments: "287" },
            date: "1 week ago",
          },
          {
            id: 2,
            type: "facebook",
            title: "Success Story: From YouTube Viewer to Business Owner",
            image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%26planners2-pYMevHnwxaHaXZ3qlWUF18bMpXjxwy.png",
            link: "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/",
            stats: { likes: "1.2K", comments: "156", shares: "89" },
            date: "2 weeks ago",
          },
          {
            id: 3,
            type: "youtube",
            title: "Kumita Habang Nasa Bahay: Our Journey from YouTube to Business Platform",
            image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studentsprojects-VL4lVSnwi1RbenFVjYBDhe0i037AA5.png",
            link: "https://www.youtube.com/@gracefulhomeschooling",
            stats: { views: "42K", likes: "2.5K", comments: "312" },
            date: "3 weeks ago",
          }
        ]
        setSocialContent(fallbackContent)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSocialData()
  }, [])

  // Helper function to format view counts
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return Math.round(views / 100000) / 10 + 'M'
    } else if (views >= 1000) {
      return Math.round(views / 100) / 10 + 'K'
    }
    return views.toString()
  }

  // Helper function to format subscriber/follower counts
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return Math.round(count / 100000) / 10 + 'M+'
    } else if (count >= 1000) {
      return Math.round(count / 1000) + 'K+'
    }
    return count.toString()
  }
  
  // Helper function to format published date to relative time
  const formatPublishedDate = (isoDate: string): string => {
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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8])

  // Pulse animation for the live indicator
  const pulseVariants = {
    pulse: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  // Filter content based on active tab
  const filteredContent = activeTab === "all" ? socialContent : socialContent.filter((item) => item.type === activeTab)

  return (
    <section
      ref={containerRef}
      className="relative py-24 overflow-hidden bg-gradient-to-b from-[#f9f6f2] to-white"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-blue/10 blur-3xl"
          animate={{
            y: [0, 30, 0],
            x: [0, 15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-brand-pink/10 blur-3xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 25, 0],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 18,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
          }}
        />
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center space-y-4 text-center mb-16"
        >
          <div className="inline-flex items-center space-x-1 rounded-full bg-brand-purple/10 px-4 py-1.5 mb-4">
            <div className="relative flex items-center">
              <motion.span
                variants={pulseVariants}
                animate="pulse"
                className="absolute w-2 h-2 rounded-full bg-green-500 left-0"
              />
              <span className="font-medium text-brand-purple ml-3">Live Community</span>
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif tracking-tighter text-[#5d4037]">
            Connect with Our Growing Community
          </h2>
          <p className="max-w-[800px] text-[#6d4c41] md:text-xl/relaxed font-light">
            Join thousands of homeschooling families who have found their path to educational freedom and financial independence through our supportive community
          </p>
        </motion.div>

        {/* Social Platform Cards - COMPLETELY REDESIGNED */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12 md:mb-16"
        >
          {/* Facebook Card - Modern Design */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onHoverStart={() => setHoveredPlatform("facebook")}
            onHoverEnd={() => setHoveredPlatform(null)}
            className="relative h-auto min-h-[280px] sm:h-[280px] rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#9ac5d9] to-[#b08ba5] z-0" />

            {/* Animated background pattern */}
            <motion.div
              className="absolute inset-0 opacity-10 z-0"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fillRule="evenodd"%3E%3Cg fill="%23ffffff" fillOpacity="1"%3E%3Cpath d="M36 34v-4h-10v-10h-4v10h-10v4h10v10h4v-10h10zM40 0H0v40h40V0z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                backgroundSize: "60px 60px",
              }}
            />

            {/* Content */}
            <div className="relative h-full z-10 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center">
                    <Facebook className="h-5 w-5 sm:h-6 sm:w-6 text-[#9ac5d9]" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-white text-lg sm:text-xl font-medium">Facebook Community</h3>
                    <div className="flex items-center mt-1">
                      <Users className="h-4 w-4 text-white/80 mr-1" />
                      <span className="text-white/80 text-xs sm:text-sm">{formatCount(socialData.facebook.followerCount)} followers</span>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={hoveredPlatform === "facebook" ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png"
                    alt="Graceful Homeschooling Logo"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </motion.div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                  <p className="text-white text-xs sm:text-sm italic">
                    "Thanks to Grace and the Papers to Profits course, I've transformed my homeschooling passion into a thriving business. Kumita habang nasa bahay is now my reality!"
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden mr-2">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/testimonials1.jpg-vdiuWnYVM7nV2SaQDk81F9HXwPJVQE.jpeg"
                        alt="Community member"
                        width={24}
                        height={24}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="text-white/80 text-[10px] sm:text-xs">EMJ ALFARO • 2 weeks ago</span>
                  </div>
                </div>

                <Link
                  href="https://www.facebook.com/GracefulHomeschoolingbyEmigrace/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <motion.div
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full py-2 sm:py-3 px-4 sm:px-6 text-center text-white text-sm sm:text-base font-medium flex items-center justify-center"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>Join Our Facebook Community</span>
                    <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              className="absolute top-12 right-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            >
              <Heart className="h-4 w-4 text-white" />
            </motion.div>

            <motion.div
              className="absolute bottom-20 right-12 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{
                y: [0, 8, 0],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                delay: 1,
              }}
            >
              <MessageCircle className="h-3 w-3 text-white" />
            </motion.div>
          </motion.div>

          {/* YouTube Card - Modern Design */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onHoverStart={() => setHoveredPlatform("youtube")}
            onHoverEnd={() => setHoveredPlatform(null)}
            className="relative h-auto min-h-[280px] sm:h-[280px] rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#f1b5bc] to-[#b08ba5] z-0" />

            {/* Animated background pattern */}
            <motion.div
              className="absolute inset-0 opacity-10 z-0"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fillOpacity="1" fillRule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")',
                backgroundSize: "30px 30px",
              }}
            />

            {/* Content */}
            <div className="relative h-full z-10 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center">
                    <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-[#b08ba5]" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-white text-lg sm:text-xl font-medium">YouTube Channel</h3>
                    <div className="flex items-center mt-1">
                      <Users className="h-4 w-4 text-white/80 mr-1" />
                      <span className="text-white/80 text-xs sm:text-sm">{formatCount(socialData.youtube.subscriberCount)} subscribers</span>
                    </div>
                  </div>
                </div>

                <motion.div
                  animate={hoveredPlatform === "youtube" ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1Im7VvOInboRBkUWf9TSXbYMLYrtII.png"
                    alt="Graceful Homeschooling Logo"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </motion.div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 flex items-center">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 mr-2 sm:mr-3">
                    <Image
                      src={socialData.youtube.latestVideo?.thumbnail || "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journals%20and%20planners-QAz8IyztDboLcJArffAdH4EQH4qOol.png"}
                      alt="Featured video"
                      fill
                      className="object-cover"
                    />
                                          <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/80 flex items-center justify-center">
                          <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#b08ba5] ml-0.5" />
                        </div>
                      </div>
                  </div>
                  <div>
                    <p className="text-white text-xs sm:text-sm font-medium line-clamp-2">
                      {socialData.youtube.latestVideo?.title || "Papers to Profits: Transform Your Homeschool Journey"}
                    </p>
                    <div className="flex items-center mt-1">
                      <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/70 mr-1" />
                      <span className="text-white/70 text-[10px] sm:text-xs mr-2 sm:mr-3">{socialData.youtube.latestVideo?.views || "35K"} views</span>
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/70 mr-1" />
                      <span className="text-white/70 text-[10px] sm:text-xs">{socialData.youtube.latestVideo?.duration || "14:22"}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="https://www.youtube.com/@gracefulhomeschooling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <motion.div
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full py-2 sm:py-3 px-4 sm:px-6 text-center text-white text-sm sm:text-base font-medium flex items-center justify-center"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>Visit Our YouTube Channel</span>
                    <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              className="absolute top-16 right-24 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{
                y: [0, -8, 0],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            >
              <Play className="h-4 w-4 text-white" />
            </motion.div>

            <motion.div
              className="absolute bottom-24 right-16 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{
                y: [0, 10, 0],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                delay: 0.5,
              }}
            >
              <Heart className="h-3 w-3 text-white" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Content Filter Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8 md:mb-10 overflow-x-auto pb-2 px-2">
          <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md">
            {[
              { id: "all", label: "All Content" },
              { id: "youtube", label: "YouTube", icon: <Youtube className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> },
              { id: "facebook", label: "Facebook", icon: <Facebook className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-brand-purple text-white shadow-sm"
                    : "text-[#5d4037] hover:bg-brand-purple/10"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredContent.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  whileHover={{ y: -8 }}
                  onHoverStart={() => setHoveredCard(item.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                >
                  <Link href={item.link} target="_blank" rel="noopener noreferrer">
                    <div className="bg-white rounded-xl overflow-hidden shadow-lg group transition-all duration-300 h-full">
                      <div className="relative aspect-video">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                        {/* Platform badge */}
                        <div className="absolute top-4 left-4 flex items-center bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                          {item.type === "youtube" ? (
                            <>
                              <Youtube className="h-3 w-3 text-[#b08ba5] mr-1" />
                              <span className="text-[#5d4037]">YouTube</span>
                            </>
                          ) : (
                            <>
                              <Facebook className="h-3 w-3 text-[#9ac5d9] mr-1" />
                              <span className="text-[#5d4037]">Facebook</span>
                            </>
                          )}
                        </div>

                        {/* Play button for YouTube */}
                        {item.type === "youtube" && (
                          <motion.div
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={hoveredCard === item.id ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.8 }}
                          >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                <Play className="h-5 w-5 text-[#b08ba5] ml-0.5" />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Date badge */}
                        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                          {item.date}
                        </div>
                      </div>

                      <div className="p-5">
                        <h4 className="text-lg font-medium text-[#5d4037] mb-3 line-clamp-2">{item.title}</h4>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-[#6d4c41]">
                          {item.type === "youtube" ? (
                            <>
                              <div className="flex items-center">
                                <Play className="h-3 w-3 mr-1" />
                                <span>{item.stats.views} views</span>
                              </div>
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1" />
                                <span>{item.stats.likes}</span>
                              </div>
                              <div className="flex items-center">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                <span>{item.stats.comments}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1" />
                                <span>{item.stats.likes}</span>
                              </div>
                              <div className="flex items-center">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                <span>{item.stats.comments}</span>
                              </div>
                              <div className="flex items-center">
                                <Share2 className="h-3 w-3 mr-1" />
                                <span>{item.stats.shares}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* View More Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-center mt-12"
        >
          <Button
            className="bg-brand-purple hover:bg-brand-purple/90 text-white px-6 sm:px-8 py-5 sm:py-6 rounded-full text-sm sm:text-base group"
            asChild
          >
            <Link
              href={
                activeTab === "facebook"
                  ? "https://www.facebook.com/GracefulHomeschoolingbyEmigrace/"
                  : activeTab === "youtube"
                    ? "https://www.youtube.com/@gracefulhomeschooling"
                    : "https://linktr.ee/gracefulhomeschooling"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="flex items-center">
                View More Content
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

