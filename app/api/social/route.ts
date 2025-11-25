import { NextResponse } from "next/server"
import { getYouTubeData } from "@/lib/youtube-api"
import { getFacebookPage, getFacebookPosts } from "@/lib/facebook-api"

export async function GET(request: Request) {
  try {
    // Get the requested platform from the URL
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform")

    // Fetch data based on the requested platform
    if (platform === "youtube") {
      const youtubeData = await getYouTubeData()

      return NextResponse.json({
        channel: youtubeData.channelData,
        videos: youtubeData.latestVideos,
      })
    } else if (platform === "facebook") {
      // Use Promise.allSettled to handle partial failures
      const [pageResult, postsResult] = await Promise.allSettled([getFacebookPage(), getFacebookPosts()])

      return NextResponse.json({
        page: pageResult.status === "fulfilled" ? pageResult.value : null,
        posts: postsResult.status === "fulfilled" ? postsResult.value : [],
      })
    } else if (platform === "all" || !platform) {
      // Use Promise.allSettled to handle partial failures
      const [youtubeData, fbPageResult, fbPostsResult] = await Promise.allSettled([
        getYouTubeData(),
        getFacebookPage(),
        getFacebookPosts(),
      ])

      const ytData = youtubeData.status === "fulfilled" ? youtubeData.value : { channelData: null, latestVideos: [] }

      const response = {
        youtube: {
          channel: ytData.channelData,
          videos: ytData.latestVideos,
        },
        facebook: {
          page: fbPageResult.status === "fulfilled" ? fbPageResult.value : null,
          posts: fbPostsResult.status === "fulfilled" ? fbPostsResult.value : [],
        },
      }

      return NextResponse.json(response)
    }

    // Invalid platform requested
    return NextResponse.json({
      error: 'Invalid platform. Use "youtube", "facebook", or "all".',
      // Always include fallback data
      youtube: {
        channel: null,
        videos: [],
      },
      facebook: {
        page: null,
        posts: [],
      },
    })
  } catch (error) {
    console.error("API error:", error)
    // Always return a 200 status with fallback data
    return NextResponse.json({
      error: "Failed to fetch social data",
      message: "Using fallback data instead",
      youtube: {
        channel: null,
        videos: [],
      },
      facebook: {
        page: null,
        posts: [],
      },
    })
  }
}

