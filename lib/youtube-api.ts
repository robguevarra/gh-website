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

import { getEnv } from "./env"

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  thumbnailUrl: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
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

// Format YouTube duration from ISO 8601 format
export function formatDuration(isoDuration: string): string {
  // Simple formatter for PT1H2M3S format
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "00:00"

  const hours = match[1] ? Number.parseInt(match[1]) : 0
  const minutes = match[2] ? Number.parseInt(match[2]) : 0
  const seconds = match[3] ? Number.parseInt(match[3]) : 0

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

// Format published date to relative time (e.g., "3 weeks ago")
export function formatPublishedDate(isoDate: string): string {
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

// Configuration
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
// Set this to true to completely disable API calls and always use fallback data
const DISABLE_API_CALLS = true;
const cache = {
  channel: {
    data: null as YouTubeChannel | null,
    timestamp: 0,
  },
  videos: {
    data: null as YouTubeVideo[] | null,
    timestamp: 0,
  },
  quotaExceeded: false,
  quotaExceededTimestamp: 0,
};

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

// Helper function for errors
function debugError(...args: any[]): void {
  if (DEBUG_MODE) {
    console.error(...args);
  } else {
    // In production, only log the first argument without details
    if (args.length > 0 && typeof args[0] === 'string') {
      console.error(args[0]);
    }
  }
}

// Check if cache is valid
function isCacheValid(type: 'channel' | 'videos'): boolean {
  const now = Date.now();
  return cache[type].data !== null && (now - cache[type].timestamp) < CACHE_DURATION;
}

// Check if quota exceeded state should be reset (after 24 hours)
function shouldResetQuotaExceeded(): boolean {
  const now = Date.now();
  const resetDuration = 1000 * 60 * 60 * 24; // 24 hours
  return cache.quotaExceeded && (now - cache.quotaExceededTimestamp) > resetDuration;
}

// Normalize channel identifier (remove @ if present)
function normalizeChannelIdentifier(identifier: string): string {
  return identifier.startsWith('@') ? identifier.substring(1) : identifier;
}

// Get YouTube channel info by username or channel ID - simplified with direct fallback
export async function getYouTubeChannel(channelIdentifier = "gracefulhomeschooling"): Promise<YouTubeChannel> {
  // If API calls are disabled, immediately return fallback data
  if (DISABLE_API_CALLS) {
    debugLog("YouTube API calls are disabled, using fallback data");
    return fallbackChannel;
  }
  
  // Normalize the channel identifier
  const normalizedIdentifier = normalizeChannelIdentifier(channelIdentifier);
  
  const apiKey = getEnv("YOUTUBE_API_KEY")

  // Check cache first
  if (isCacheValid('channel')) {
    debugLog("Using cached channel data");
    return cache.channel.data!;
  }

  // Check if we should reset quota exceeded state
  if (shouldResetQuotaExceeded()) {
    debugLog("Resetting quota exceeded state");
    cache.quotaExceeded = false;
  }

  // If quota was exceeded, use fallback data
  if (cache.quotaExceeded) {
    debugLog("Quota still exceeded, using fallback data");
    return fallbackChannel;
  }

  if (!apiKey) {
    debugWarn("YouTube API Key not found, using fallback data");
    return fallbackChannel
  }

  try {
    // Try with username first
    debugLog(`Attempting to fetch YouTube channel with username: ${normalizedIdentifier}`);
    
    // Check if API key is valid by making a simple test request
    const testResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${apiKey}`
    );
    
    if (!testResponse.ok) {
      // If we hit quota limits, mark it and use fallback data
      if (testResponse.status === 403) {
        cache.quotaExceeded = true;
        cache.quotaExceededTimestamp = Date.now();
        debugWarn("YouTube API quota exceeded, using fallback data until quota resets");
        return fallbackChannel;
      }
      
      const errorData = await testResponse.json();
      debugError("YouTube API key validation failed:", 
                 errorData?.error?.message || "Unknown error",
                 "Status:", testResponse.status, testResponse.statusText);
      debugWarn("Using fallback data due to API key validation failure");
      return fallbackChannel;
    }
    
    // If API key is valid, proceed with the actual request
    // First try with the handle format (without @)
    let channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${normalizedIdentifier}&key=${apiKey}`,
    )

    if (!channelResponse.ok) {
      debugWarn(`YouTube API error: ${channelResponse.status} ${channelResponse.statusText}`);
      
      // Try to get more detailed error information
      try {
        const errorData = await channelResponse.json();
        debugError("YouTube API detailed error:", errorData?.error?.message || "No detailed error message");
      } catch (e) {
        debugError("Could not parse YouTube API error response");
      }
      
      return fallbackChannel;
    }

    let channelData = await channelResponse.json()
    debugLog("YouTube API response:", channelData.items ? "Data received" : "No items found");

    // If no items found with username, try with channel ID
    if (!channelData.items || channelData.items.length === 0) {
      debugLog("No channel found with username, trying with channel ID...");
      channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${normalizedIdentifier}&key=${apiKey}`,
      )

      if (!channelResponse.ok) {
        debugWarn(`YouTube API error (channel ID): ${channelResponse.status} ${channelResponse.statusText}`);
        return fallbackChannel
      }

      channelData = await channelResponse.json()
      debugLog("YouTube API response (channel ID):", channelData.items ? "Data received" : "No items found");

      // If still no items found, try searching for the channel
      if (!channelData.items || channelData.items.length === 0) {
        debugLog("No channel found with ID, trying search...");
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${normalizedIdentifier}&type=channel&key=${apiKey}`,
        )

        if (!searchResponse.ok) {
          debugWarn(`YouTube API search error: ${searchResponse.status} ${searchResponse.statusText}`);
          return fallbackChannel
        }

        const searchData = await searchResponse.json()
        debugLog("YouTube search response:", searchData.items ? `Found ${searchData.items.length} results` : "No search results");

        if (!searchData.items || searchData.items.length === 0) {
          debugWarn("No channels found in search results");
          return fallbackChannel
        }

        // Use the first search result's channel ID
        const foundChannelId = searchData.items[0].id.channelId
        debugLog(`Found channel via search with ID: ${foundChannelId}`);

        // Now get the full channel details
        channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${foundChannelId}&key=${apiKey}`,
        )

        if (!channelResponse.ok) {
          debugWarn(`YouTube API error (found channel ID): ${channelResponse.status} ${channelResponse.statusText}`);
          return fallbackChannel
        }

        channelData = await channelResponse.json()
        debugLog("YouTube API response (found channel):", channelData.items ? "Data received" : "No items found");

        if (!channelData.items || channelData.items.length === 0) {
          debugWarn("No channel details found for search result");
          return fallbackChannel
        }
      }
    }

    if (!channelData.items || channelData.items.length === 0) {
      debugWarn("No channel data found after all attempts");
      return fallbackChannel
    }

    // Extract the channel data
    const channel = {
      id: channelData.items[0].id,
      title: channelData.items[0].snippet.title,
      description: channelData.items[0].snippet.description || "",
      subscriberCount: Number.parseInt(channelData.items[0].statistics.subscriberCount || "0"),
      videoCount: Number.parseInt(channelData.items[0].statistics.videoCount || "0"),
      viewCount: Number.parseInt(channelData.items[0].statistics.viewCount || "0"),
      thumbnailUrl:
        channelData.items[0].snippet.thumbnails?.high?.url ||
        channelData.items[0].snippet.thumbnails?.default?.url ||
        fallbackChannel.thumbnailUrl,
    }

    debugLog("Successfully extracted channel data:", channel.title);

    // Cache the successful response
    cache.channel = {
      data: channel,
      timestamp: Date.now()
    };

    return channel
  } catch (error) {
    debugError("Error fetching YouTube channel:", error)
    return fallbackChannel
  }
}

// Get YouTube videos for a channel - simplified with direct fallback
export async function getYouTubeVideos(
  channelIdentifier = "gracefulhomeschooling",
  maxResults = 3,
): Promise<YouTubeVideo[]> {
  // If API calls are disabled, immediately return fallback data
  if (DISABLE_API_CALLS) {
    debugLog("YouTube API calls are disabled, using fallback data");
    return fallbackVideos;
  }
  
  // Normalize the channel identifier
  const normalizedIdentifier = normalizeChannelIdentifier(channelIdentifier);
  
  const apiKey = getEnv("YOUTUBE_API_KEY")

  // Check cache first
  if (isCacheValid('videos')) {
    return cache.videos.data!;
  }

  // If quota was exceeded, use fallback data
  if (cache.quotaExceeded) {
    return fallbackVideos;
  }

  if (!apiKey) {
    debugWarn("YouTube API Key not found, using fallback data")
    return fallbackVideos
  }

  try {
    // Check for quota limits first with a simple request
    const testResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${apiKey}`
    );
    
    if (!testResponse.ok) {
      // If we hit quota limits, mark it and use fallback data
      if (testResponse.status === 403) {
        cache.quotaExceeded = true;
        return fallbackVideos;
      }
      
      debugWarn(`YouTube API error: ${testResponse.status} ${testResponse.statusText}`)
      return fallbackVideos
    }

    // Get the channel first
    const channel = await getYouTubeChannel(normalizedIdentifier)

    if (!channel || channel === fallbackChannel) {
      return fallbackVideos
    }

    // Get the uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channel.id}&key=${apiKey}`,
    )

    if (!channelResponse.ok) {
      return fallbackVideos
    }

    const channelData = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      return fallbackVideos
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from the uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${apiKey}`,
    )

    if (!videosResponse.ok) {
      return fallbackVideos
    }

    const videosData = await videosResponse.json()

    if (!videosData.items || videosData.items.length === 0) {
      return fallbackVideos
    }

    // Get video IDs for additional details
    const videoIds = videosData.items.map((item: any) => item.snippet.resourceId.videoId).join(",")

    // Get video details including statistics and duration
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`,
    )

    if (!videoDetailsResponse.ok) {
      return fallbackVideos
    }

    const videoDetailsData = await videoDetailsResponse.json()

    if (!videoDetailsData.items) {
      return fallbackVideos
    }

    // Combine the data
    const videos = videosData.items.map((item: any, index: number) => {
      const details = videoDetailsData.items.find((detail: any) => detail.id === item.snippet.resourceId.videoId) || {}

      return {
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description || "",
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.default?.url ||
          fallbackVideos[index % fallbackVideos.length].thumbnailUrl,
        viewCount: Number.parseInt(details?.statistics?.viewCount || "0"),
        likeCount: Number.parseInt(details?.statistics?.likeCount || "0"),
        commentCount: Number.parseInt(details?.statistics?.commentCount || "0"),
        duration: formatDuration(details?.contentDetails?.duration || "PT0S"),
      }
    })

    // Cache the successful response
    cache.videos = {
      data: videos,
      timestamp: Date.now()
    };

    return videos
  } catch (error) {
    return fallbackVideos
  }
}

