# Graceful Homeschooling Website

This is the codebase for the Graceful Homeschooling website, featuring social media integrations with YouTube and Facebook.

## Environment Variables

The following environment variable is required for the YouTube integration:

### Required
- `YOUTUBE_API_KEY`: Your YouTube API key for fetching channel and video data

## Setting Up YouTube API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable the "YouTube Data API v3"
5. Go to "APIs & Services" > "Credentials"
6. Click "Create Credentials" > "API Key"
7. Copy the generated API key
8. Add it to your environment variables as `YOUTUBE_API_KEY`

## Facebook Integration

The Facebook integration uses Facebook's official Page Plugin, which doesn't require any API keys or app creation. It's a simple embed that shows your Facebook page's timeline directly on your website.

If the Facebook embed doesn't appear, users will see a fallback message with a link to visit the Facebook page directly.

## Troubleshooting

If you're experiencing issues with the social features:

1. For YouTube: Check that your YouTube API key is correctly set in the environment variables
2. For Facebook: Make sure your site allows third-party cookies and scripts
3. Both integrations include fallback content if the primary content fails to load

