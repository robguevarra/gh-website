import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { SupabaseCacheService, CACHE_CONFIG } from '@/lib/supabase/cache-service'

interface FacebookAttachment {
  type: string
  url?: string
  media?: {
    image?: {
      src: string
      width: number
      height: number
    }
  }
  target?: {
    url: string
  }
  title?: string
  description?: string
}

interface FacebookPost {
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url?: string
  attachments?: {
    data: FacebookAttachment[]
  }
  likes?: {
    summary: {
      total_count: number
    }
  }
  comments?: {
    summary: {
      total_count: number
    }
  }
  shares?: {
    count: number
  }
}

interface FacebookPageData {
  id: string
  name: string
  followers_count: number
  posts: {
    data: FacebookPost[]
  }
}

// Format time ago helper function
function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const postDate = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}

// Format number helper function
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

async function fetchFacebookData(): Promise<any> {
  console.log('🚀 Starting Facebook API call...')
  
  try {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
    if (!pageAccessToken) {
      throw new Error('Facebook page access token not configured')
    }

    // Fetch page data and posts with media in a single request
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token: pageAccessToken,
        fields: 'id,name,followers_count,posts.limit(15){id,message,created_time,full_picture,permalink_url,attachments{media,type,url,target},likes.summary(true),comments.summary(true),shares}'
      },
      timeout: 10000
    })

    console.log('📡 API Response: Success')
    const pageData = response.data

    // Format the posts data
    const formattedPosts = pageData.posts?.data?.map((post: FacebookPost) => {
      // Format attachments for easier access
      const attachments = post.attachments?.data?.map(attachment => ({
        type: attachment.type || 'unknown',
        media_url: attachment.media?.image?.src || attachment.url,
        media_width: attachment.media?.image?.width,
        media_height: attachment.media?.image?.height,
        target_url: attachment.target?.url,
        title: attachment.title,
        description: attachment.description
      })) || []

      return {
        id: post.id,
        message: post.message || '',
        created_time: post.created_time,
        full_picture: post.full_picture,
        permalink_url: post.permalink_url,
        attachments: attachments,
        likes_count: post.likes?.summary?.total_count || 0,
        comments_count: post.comments?.summary?.total_count || 0,
        shares_count: post.shares?.count || 0,
        time_ago: formatTimeAgo(post.created_time)
      }
    }) || []

    const formattedData = {
      page: {
        id: pageData.id,
        name: pageData.name,
        followers_count: pageData.followers_count
      },
      posts: formattedPosts
    }

    console.log(`📊 Data source: API (${formattedPosts.length} posts)`)
    console.log('🏁 Facebook API call completed')
    
    return {
      success: true,
      data: formattedData,
      cached: false
    }

  } catch (error: any) {
    console.log('📡 API Response: Failed')
    console.log(`❌ Error: ${error.message}`)
    
    // Return fallback data on error
    const fallbackData = {
      page: {
        id: '110211184011832',
        name: 'Graceful Homeschooling',
        followers_count: 154842
      },
      posts: [
        {
          id: 'fallback_1',
          message: '🎯 Papers to Profits Launch Day! Join thousands of entrepreneurs who are turning their knowledge into profitable digital products. Limited spots available!',
          created_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          full_picture: 'https://scontent.fmnl4-6.fna.fbcdn.net/v/t39.30808-6/462025135_122107072722241344_7940046288071106500_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeGKX9zlV2GUYBINdlG50kpf0rHs0PuPOBnSsezQ-484GdKx7ND7jzgZ0rHs0PuPOBnSsezQ-484GQ&_nc_ohc=1SWYPqVTj_oQ7kNvgEU-9xB&_nc_zt=23&_nc_ht=scontent.fmnl4-6.fna&_nc_gid=AeDfQE7lf1WpORAP4LVZd5T&oh=00_AYCkXXSY6rRKz5J9YQ4D0CJ2_5X1fPHVXNnCVGlYxaQ5pA&oe=676A7D44',
          permalink_url: 'https://www.facebook.com/gracefulhomeschooling/posts/122107072722241344',
          attachments: [],
          likes_count: 47,
          comments_count: 12,
          shares_count: 8,
          time_ago: '2 hours ago'
        },
        {
          id: 'fallback_2',
          message: '💫 "Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill\n\nEvery entrepreneur faces setbacks. What matters is how we bounce back stronger! 💪',
          created_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          full_picture: null,
          permalink_url: 'https://www.facebook.com/gracefulhomeschooling/posts/motivational',
          attachments: [],
          likes_count: 134,
          comments_count: 28,
          shares_count: 15,
          time_ago: '1 day ago'
        }
      ]
    }

    console.log('📋 Using fallback data')
    console.log('🏁 Facebook API call completed')
    
    return {
      success: false,
      data: fallbackData,
      cached: false,
      error: error.message
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting Facebook API call...')

    // Check cache first
    const cachedData = await SupabaseCacheService.get(CACHE_CONFIG.FACEBOOK.key, 'facebook')
    
    if (cachedData) {
      console.log('🎯 Cache HIT - Using cached Facebook data')
      console.log('📊 Data source: cache')
      console.log('🏁 Facebook API call completed')
      return NextResponse.json({
        ...cachedData,
        cached: true,
        data_source: 'cache'
      })
    }

    // Cache miss - fetch fresh data
    console.log('🗃️ Cache MISS - Fetching fresh Facebook data')
    const freshData = await fetchFacebookData()
    
    // Store in cache
    await SupabaseCacheService.set(
      CACHE_CONFIG.FACEBOOK.key, 
      'facebook', 
      freshData, 
      CACHE_CONFIG.FACEBOOK.ttl
    )

    console.log('💾 Data cached for future requests')
    console.log('🏁 Facebook API call completed')
    return NextResponse.json({
      ...freshData,
      cached: false,
      data_source: 'api'
    })
  } catch (error: any) {
    console.error('❌ Facebook API endpoint error:', error)
    
    // Return fallback as last resort
    return NextResponse.json({
      success: false,
      data: {
        page: {
          id: '110211184011832',
          name: 'Graceful Homeschooling',
          followers_count: 154842
        },
        posts: []
      },
      cached: false,
      error: error.message
    }, { status: 500 })
  }
} 