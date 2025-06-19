"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Users, MessageCircle, ThumbsUp, Share2, Loader2, Play, Image as ImageIcon, ExternalLink, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FacebookAttachment {
  type: string
  url?: string
  media_url?: string
  media_width?: number
  media_height?: number
  target_url?: string
  title?: string
  description?: string
}

interface FacebookPost {
  id: string
  message: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  attachments?: FacebookAttachment[]
  likes_count: number
  comments_count: number
  shares_count: number
  time_ago: string
}

interface FacebookPageData {
  page: {
    id: string
    name: string
    followers_count: number
  }
  posts: FacebookPost[]
}

export function FacebookHighlights() {
  const [data, setData] = useState<FacebookPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(true) // Controls whether section shows

  useEffect(() => {
    fetchFacebookData()
  }, [])

  const fetchFacebookData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/facebook-data')
      const result = await response.json()
      
      // Show content if we have data, regardless of API success/failure
      // Only hide if there's absolutely no data
      if (result.data && result.data.posts && result.data.posts.length > 0) {
        setData(result.data)
        setIsVisible(true)
        console.log('📊 Facebook data loaded:', {
          source: result.cached ? 'cache' : 'api',
          success: result.success,
          postsCount: result.data.posts.length
        })
      } else {
        // Only hide section if there's no data at all
        console.log('❌ Facebook API failed with no fallback data')
        setIsVisible(false)
      }
    } catch (error) {
      console.error('❌ Error fetching Facebook data:', error)
      // Don't hide section immediately - API might have returned fallback data
      // Only hide if we truly have no data to show
      setIsVisible(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle post click - open Facebook URL or play video
  const handlePostClick = (post: FacebookPost, event: React.MouseEvent) => {
    event.preventDefault()
    
    // Check if it's a video post
    const isVideo = post.attachments?.some(att => att.type?.includes('video'))
    
    if (isVideo) {
      // For videos, try to open the target URL or permalink
      const videoUrl = post.attachments?.[0]?.target_url || post.permalink_url
      if (videoUrl) {
        window.open(videoUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      // For other posts, open the permalink
      if (post.permalink_url) {
        window.open(post.permalink_url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const MediaDisplay = ({ post }: { post: FacebookPost }) => {
    const imageUrl = post.full_picture || post.attachments?.[0]?.media_url
    const isVideo = post.attachments?.some(att => att.type?.includes('video'))
    
    if (!imageUrl) return null

    return (
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 mb-3">
        <motion.img
          src={imageUrl}
          alt={post.message.substring(0, 50)}
          className="w-full h-full object-cover"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          whileHover={{ scale: 1.02 }}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        
        {/* Video Play Button Overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <motion.div
              className="bg-card/90 backdrop-blur-sm rounded-full p-4 shadow-lg border border-border/20"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
            </motion.div>
          </div>
        )}
        
        {/* Content Type Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-xs border border-border/20">
            {isVideo ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Video
              </>
            ) : (
              <>
                <ImageIcon className="h-3 w-3 mr-1" />
                Photo
              </>
            )}
          </Badge>
        </div>
      </div>
    )
  }

  // Don't render anything if section should be hidden
  if (!isVisible) {
    return null
  }

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground font-medium">Loading Facebook community...</p>
            </motion.div>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return null // Hide section if no data
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Floating Background Elements - Using design context colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Section Header - Typography alignment with design context */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ 
            animationDuration: 'var(--duration-300, 300ms)',
            animationTimingFunction: 'var(--ease-out, ease-out)'
          }}
        >
          <Badge variant="outline" className="mb-4 bg-white/50 backdrop-blur-sm border-primary/20">
            Facebook Community
          </Badge>
          
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
            Join Our Growing Community
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect with {formatNumber(data.page.followers_count)}+ homeschooling parents, mompreneurs and dadpreneuers sharing their journey toward spending time with family and financial independence habang nasa bahay.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Page Info Sidebar */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
          >
            <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/50 sticky top-8">
              {/* Page Avatar */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Users className="h-10 w-10 text-primary-foreground" />
                </div>
                
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                  {data.page.name}
                </h3>
                
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatNumber(data.page.followers_count)}
                </div>
                <div className="text-sm text-muted-foreground mb-4">Followers</div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 min-h-[44px]"
                  onClick={() => window.open('https://facebook.com/gracefulhomeschooling', '_blank')}
                  aria-label="Follow Graceful Homeschooling on Facebook"
                >
                  <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                  Follow Page
                </Button>
              </div>

              {/* Community Stats */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Community
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  Growing Daily
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 mr-2 text-secondary" />
                  {data.posts.length} Recent Posts
                </div>
              </div>
            </div>
          </motion.div>

          {/* Posts Feed with Scrolling */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          >
            <div className="h-[600px] overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <AnimatePresence>
                {data.posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                    className="bg-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer group motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={(e) => handlePostClick(post, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handlePostClick(post, e as any)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View Facebook post: ${post.message.substring(0, 100)}${post.message.length > 100 ? '...' : ''}`}
                  >
                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-foreground font-medium leading-relaxed group-hover:text-primary transition-colors duration-200">
                        {post.message}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 flex items-center">
                        <span>{post.time_ago}</span>
                        <ExternalLink className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </p>
                    </div>

                    {/* Media */}
                    <MediaDisplay post={post} />

                    {/* Engagement Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1 hover:text-primary transition-colors duration-200">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{formatNumber(post.likes_count)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 hover:text-accent transition-colors duration-200">
                          <MessageCircle className="h-4 w-4" />
                          <span>{formatNumber(post.comments_count)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 hover:text-secondary transition-colors duration-200">
                          <Share2 className="h-4 w-4" />
                          <span>{formatNumber(post.shares_count)}</span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 motion-reduce:transition-none min-h-[44px] sm:min-h-[36px]"
                        aria-label="View this post on Facebook"
                      >
                        View Post
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Extend Window interface for Facebook SDK
declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: () => void;
      }
    }
  }
}


