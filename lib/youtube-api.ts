/**
 * YouTube API Integration
 * 
 * IMPORTANT: The YouTube API integration is currently DISABLED due to exceeding the daily quota limit.
 * The application is using fallback data instead of making API calls.
 * 
 * To re-enable the API integration:
 * 1. Set DISABLE_API_CALLS to false (after your quota resets)
 * 2. See docs/youtube-api-integration.md for detailed documentation
 * 
 * Quota Information:
 * - Standard free quota: 10,000 units per day
 * - Search operations cost 100 units each
 * - Simple read operations cost 1 unit each
 */

import axios from 'axios'

interface YouTubeChannelData {
  id: string
  snippet: {
  title: string
  description: string
    customUrl: string
  publishedAt: string
    thumbnails: {
      default: { url: string }
      medium: { url: string }
      high: { url: string }
    }
    country: string
  }
  statistics: {
    viewCount: string
    subscriberCount: string
    hiddenSubscriberCount: boolean
    videoCount: string
  }
  brandingSettings: {
    channel: {
      title: string
      description: string
      keywords: string
      defaultTab: string
      trackingAnalyticsAccountId: string
      moderateComments: boolean
      unsubscribedTrailer: string
      defaultLanguage: string
      country: string
    }
    image: {
      bannerExternalUrl: string
    }
  }
}

interface YouTubeVideoData {
  id: { videoId: string }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
    }
    channelTitle: string
    tags?: string[]
    categoryId: string
    liveBroadcastContent: string
    localized: {
      title: string
      description: string
    }
    defaultAudioLanguage: string
  }
}

interface YouTubeResponse {
  channelData: YouTubeChannelData
  latestVideos: YouTubeVideoData[]
  totalResults: number
  success: boolean
  cached?: boolean
  error?: string
}

// Cache status for debugging
export let cacheStatus = {
  lastFetch: null as Date | null,
  cacheExpiry: null as Date | null,
  isValid: false,
  quotaExceeded: false,
  quotaResetTime: null as Date | null
}

async function fetchYouTubeData(): Promise<YouTubeResponse> {
  const API_KEY = process.env.YOUTUBE_API_KEY
  const CHANNEL_ID = 'UC-yMXCe2DoWPSFRb0L02_fw' // Master Rob's channel

  console.log('🚀 Starting fresh YouTube API fetch...')

  if (!API_KEY) {
    throw new Error('YouTube API key not configured')
  }

  try {
    // Fetch channel data
    console.log('📺 Fetching YouTube channel data...')
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics,brandingSettings',
        id: CHANNEL_ID,
        key: API_KEY
      },
      timeout: 10000
    })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('No channel data found')
    }

    const channelData = channelResponse.data.items[0]

    // Fetch latest videos  
    console.log('🎬 Fetching latest videos...')
    const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: CHANNEL_ID,
        maxResults: 12,
        order: 'date',
        type: 'video',
        key: API_KEY
      },
      timeout: 10000
    })

    console.log('✅ YouTube API calls successful')
    
    // Update cache status
    cacheStatus = {
      lastFetch: new Date(),
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isValid: true,
      quotaExceeded: false,
      quotaResetTime: null
    }

    return {
      channelData,
      latestVideos: videosResponse.data.items || [],
      totalResults: videosResponse.data.pageInfo?.totalResults || 0,
      success: true,
      cached: false
    }

  } catch (error: any) {
    console.error('❌ YouTube API error:', error)
    
    // Check if it's a quota exceeded error
    if (error.response?.status === 403 && error.response?.data?.error?.code === 403) {
      console.log('🚫 YouTube API quota exceeded')
      cacheStatus.quotaExceeded = true
      cacheStatus.quotaResetTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Reset in 24 hours
    }

    // Return fallback data
    return {
      channelData: {
        id: CHANNEL_ID,
        snippet: {
          title: 'Graceful Homeschooling',
          description: 'Empowering families through education and entrepreneurship',
          customUrl: '@gracefulhomeschooling',
          publishedAt: '2020-04-11T00:00:00Z',
          thumbnails: {
            default: { url: '/grace-youtube-avatar.jpg' },
            medium: { url: '/grace-youtube-avatar.jpg' },
            high: { url: '/grace-youtube-avatar.jpg' }
          },
          country: 'PH'
        },
        statistics: {
          viewCount: '5503974',
          subscriberCount: '101000',
          hiddenSubscriberCount: false,
          videoCount: '763'
        },
        brandingSettings: {
          channel: {
            title: 'Graceful Homeschooling',
            description: 'Empowering families through education and entrepreneurship',
            keywords: 'homeschooling, education, entrepreneurship',
            defaultTab: 'home',
            trackingAnalyticsAccountId: '',
            moderateComments: true,
            unsubscribedTrailer: '',
            defaultLanguage: 'en',
            country: 'PH'
          },
          image: {
            bannerExternalUrl: '/grace-youtube-banner.jpg'
          }
        }
      } as YouTubeChannelData,
      latestVideos: [
        {
          id: { videoId: 'fallback_video_1' },
          snippet: {
            publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            channelId: CHANNEL_ID,
            title: 'Capturing my hustles at my 40\'s for my future self!🤗❤🥰 #gracefulhomeschooling #smallbusiness',
            description: 'Join me as I document my entrepreneurial journey...',
            thumbnails: {
              default: { url: '/grace-youtube-thumb.jpg', width: 120, height: 90 },
              medium: { url: '/grace-youtube-thumb.jpg', width: 320, height: 180 },
              high: { url: '/grace-youtube-thumb.jpg', width: 480, height: 360 }
            },
            channelTitle: 'Graceful Homeschooling',
            categoryId: '22',
            liveBroadcastContent: 'none',
            localized: {
              title: 'Capturing my hustles at my 40\'s for my future self!',
              description: 'Join me as I document my entrepreneurial journey...'
            },
            defaultAudioLanguage: 'en'
          }
        }
      ] as YouTubeVideoData[],
      totalResults: 763,
      success: false,
      cached: false,
      error: error.message
    }
  }
}

export async function getYouTubeData(forceRefresh: boolean = false): Promise<YouTubeResponse> {
  // Simply call the fetch function directly (caching is now handled in API routes)
  return fetchYouTubeData()
}

export function getCacheStatus() {
  return cacheStatus
}

