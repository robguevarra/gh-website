# YouTube API Integration Documentation

## Overview

This document explains how the YouTube API integration works in our application, how to manage API quota limits, and how to enable/disable the integration.

## Current Status

**The YouTube API integration is currently disabled** due to exceeding the daily quota limit. The application is using fallback data instead of making API calls.

## How the Integration Works

The application integrates with the YouTube Data API v3 to fetch:
1. Channel information (subscriber count, video count, etc.)
2. Latest videos from the channel

This data is displayed in the `YouTubeFeature` component located at `components/social-proof/youtube-feature.tsx`.

## YouTube API Quota System

The YouTube Data API uses a quota system where different operations cost different amounts of quota points:

| Operation | Cost (units) |
|-----------|--------------|
| Simple read operation | 1 unit |
| Search operation | 100 units |
| Complex operations | Varies |

The standard free quota is **10,000 units per day**, not 10,000 requests.

## Why We Exceeded the Quota

Several factors contributed to quickly depleting the quota:

1. **Multiple API Calls Per Component Render**:
   - Initial validation check (1 unit)
   - Channel lookup (1-3 units)
   - Uploads playlist lookup (1 unit)
   - Video details lookup (1 unit per video)

2. **Search Operations**:
   - The fallback logic includes a search operation which costs 100 units per call

3. **Client-Side Rendering**:
   - Each user visiting the site makes these API calls
   - Multiple page loads trigger multiple sets of calls

4. **Development Reloads**:
   - During development, every page reload triggers API calls

## Implementation Details

### Key Files

1. **`lib/youtube-api.ts`**
   - Contains the API integration logic
   - Handles fetching channel and video data
   - Includes fallback data and caching mechanisms

2. **`components/social-proof/youtube-feature.tsx`**
   - Renders the YouTube feature UI
   - Uses the API functions to fetch data

### Configuration Options

The following configuration options are available in `lib/youtube-api.ts`:

```typescript
// Set this to true to completely disable API calls and always use fallback data
const DISABLE_API_CALLS = true;

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 1000 * 60 * 60 * 24;

// Debug mode (true in development, false in production)
const DEBUG_MODE = process.env.NODE_ENV === 'development';
```

## How to Re-enable the API Integration

When you're ready to re-enable the YouTube API integration (after your quota resets):

1. Open `lib/youtube-api.ts`
2. Change `DISABLE_API_CALLS` from `true` to `false`:

```typescript
// Set this to false to enable API calls
const DISABLE_API_CALLS = false;
```

3. Optionally, restore the data fetching effect in `components/social-proof/youtube-feature.tsx` if you want dynamic data:

```typescript
useEffect(() => {
  async function fetchYouTubeData() {
    setIsLoading(true)
    setError(null)

    try {
      // Use the correct channel identifier with @ symbol
      const channelData = await getYouTubeChannel("@gracefulhomeschooling").catch(() => {
        debugWarn("Using fallback channel data due to API error")
        return fallbackChannel
      })
      setChannel(channelData)

      // Only fetch videos if we got valid channel data
      if (channelData && channelData !== fallbackChannel) {
        const videosData = await getYouTubeVideos("@gracefulhomeschooling").catch(() => {
          debugWarn("Using fallback videos data due to API error")
          return fallbackVideos
        })
        setVideos(videosData)
      } else {
        // If we got fallback channel data, use fallback videos too
        setVideos(fallbackVideos)
      }
    } catch (error) {
      debugWarn("General error fetching YouTube data, using fallbacks")
      // Fallback data is already set in state initialization
    } finally {
      setIsLoading(false)
    }
  }

  fetchYouTubeData()
}, [])
```

## Best Practices for Managing API Quota

To avoid exceeding the quota in the future:

1. **Use Server-Side Data Fetching**:
   - Move YouTube API calls to the server side
   - Fetch once and share data across all users

2. **Implement Persistent Caching**:
   - Use server-side caching with Redis or a database
   - Refresh data once per day with a cron job

3. **Reduce Search Operations**:
   - Avoid the search endpoint when possible (costs 100 units)
   - Hardcode the channel ID instead of searching for it

4. **Use Separate API Keys**:
   - Use different API keys for development and production
   - Set lower quotas on the development key

5. **Monitor Quota Usage**:
   - Set up monitoring in the Google Cloud Console
   - Create alerts when approaching quota limits

## Fallback Data

The application uses fallback data when:
- The API integration is disabled
- The quota is exceeded
- API calls fail for any reason

The fallback data is defined in both `lib/youtube-api.ts` and `components/social-proof/youtube-feature.tsx`.

To update the fallback data, edit the `fallbackChannel` and `fallbackVideos` objects in these files.

## Troubleshooting

If you encounter issues with the YouTube API integration:

1. **Check Quota Usage**:
   - Visit the [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Dashboard
   - Select the YouTube Data API v3
   - Check the Quotas tab

2. **Verify API Key**:
   - Ensure your API key is correctly set in the environment variables
   - Check that the key has access to the YouTube Data API v3

3. **Test with Postman**:
   - Use Postman to test API endpoints directly
   - Verify that your API key works outside the application

4. **Review Console Logs**:
   - Check browser console for detailed error messages
   - Look for specific error codes from the YouTube API

## Additional Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3/docs)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [API Explorer](https://developers.google.com/youtube/v3/docs/channels/list) 