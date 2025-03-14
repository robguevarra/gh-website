import { NextResponse } from "next/server"
import { getEnv } from "@/lib/env"

export async function GET() {
  try {
    // Check if API keys are available
    const youtubeApiKey = getEnv("YOUTUBE_API_KEY")
    const facebookAccessToken = getEnv("FACEBOOK_ACCESS_TOKEN")

    // Test YouTube API
    let youtubeStatus = "Not tested"
    if (youtubeApiKey) {
      try {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=gracefulhomeschooling&key=${youtubeApiKey}`
        )
        
        if (youtubeResponse.ok) {
          const data = await youtubeResponse.json()
          youtubeStatus = data.items && data.items.length > 0 ? "Working" : "No data found"
        } else {
          youtubeStatus = `Error: ${youtubeResponse.status} ${youtubeResponse.statusText}`
        }
      } catch (error) {
        youtubeStatus = `Error: ${error instanceof Error ? error.message : String(error)}`
      }
    } else {
      youtubeStatus = "API key not found"
    }

    // Test Facebook API
    let facebookStatus = "Not tested"
    if (facebookAccessToken) {
      try {
        const facebookResponse = await fetch(
          `https://graph.facebook.com/v18.0/GracefulHomeschoolingbyEmigrace?fields=name&access_token=${facebookAccessToken}`
        )
        
        if (facebookResponse.ok) {
          const data = await facebookResponse.json()
          facebookStatus = data.name ? "Working" : "No data found"
        } else {
          facebookStatus = `Error: ${facebookResponse.status} ${facebookResponse.statusText}`
        }
      } catch (error) {
        facebookStatus = `Error: ${error instanceof Error ? error.message : String(error)}`
      }
    } else {
      facebookStatus = "API token not found"
    }

    // Return the results
    return NextResponse.json({
      youtube: {
        apiKeyAvailable: !!youtubeApiKey,
        status: youtubeStatus
      },
      facebook: {
        accessTokenAvailable: !!facebookAccessToken,
        status: facebookStatus
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Test failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 