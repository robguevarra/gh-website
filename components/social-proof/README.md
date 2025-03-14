# Social Proof Components

This directory contains components used for social proof in the application.

## YouTube Feature

The `youtube-feature.tsx` component displays YouTube channel information and videos from the Graceful Homeschooling YouTube channel.

### Current Status

**The YouTube API integration is currently disabled** due to exceeding the daily quota limit. The component is using fallback data instead of making API calls.

### Usage

```tsx
import { YouTubeFeature } from "@/components/social-proof/youtube-feature";

export default function Page() {
  return (
    <div>
      <YouTubeFeature />
    </div>
  );
}
```

### Features

- Displays channel subscriber count
- Shows featured videos with thumbnails
- Auto-rotates videos every 5 seconds
- Provides links to the YouTube channel
- Responsive design for all screen sizes

### Fallback Data

The component uses fallback data when:
- The API integration is disabled
- The quota is exceeded
- API calls fail for any reason

To update the fallback data, edit the `fallbackChannel` and `fallbackVideos` objects in the component file.

### Re-enabling API Integration

See the detailed documentation in `docs/youtube-api-integration.md` for instructions on re-enabling the YouTube API integration.

## Other Components

Add documentation for other social proof components here as they are developed. 