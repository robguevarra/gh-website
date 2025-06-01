# Affiliate Click Tracking System

This document outlines how to use the Graceful Homeschooling affiliate click tracking system to track affiliate referrals and attribute conversions.

## Overview

The affiliate tracking system consists of several components:

1. **API Endpoint**: `/api/affiliate/click` processes tracking requests and stores data
2. **JavaScript Tracking Pixel**: A lightweight script that sends tracking data to the API
3. **React Component**: An easy-to-use component to embed the tracking pixel in React applications
4. **Visitor ID**: A persistent identifier for tracking return visitors
5. **Cookie Management**: Maintains affiliate attribution for 30 days

## Implementation Methods

There are three ways to implement affiliate tracking on a website:

### 1. Direct Pixel Embedding (Basic HTML)

For static HTML pages or non-React applications, add this image tag to your pages:

```html
<img src="https://gracefulhomeschooling.com/api/affiliate/click?a=[AFFILIATE_SLUG]" 
     alt="" width="1" height="1" style="display:none;" />
```

Replace `[AFFILIATE_SLUG]` with the affiliate's unique slug.

### 2. JavaScript Pixel (Recommended)

For more comprehensive tracking and better browser compatibility, add the following script near the closing `</body>` tag:

```html
<script src="https://gracefulhomeschooling.com/js/affiliate-pixel.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', function() {
    if (window.GHAffiliate) {
      window.GHAffiliate.init({
        // Optional: Enable debug mode to see tracking messages in console
        debug: false
      });
    }
  });
</script>
```

The script will automatically detect affiliate parameters in the URL in the format `?a=affiliate-slug`.

### 3. React Component (Next.js Applications)

For React and Next.js applications, use the provided `AffiliateTracker` component:

```tsx
import AffiliateTracker from '@/components/affiliate/affiliate-tracker';

export default function Layout({ children }) {
  return (
    <div>
      {/* Affiliate tracking pixel loads only when needed */}
      <AffiliateTracker 
        debug={process.env.NODE_ENV === 'development'} 
        onLoad={() => console.log('Affiliate tracking loaded')} 
      />
      {children}
    </div>
  );
}
```

## How It Works

1. When a visitor clicks an affiliate link (e.g., `https://gracefulhomeschooling.com?a=affiliate-slug`), the tracking pixel is loaded
2. The pixel sends the affiliate slug and additional data to the tracking API
3. The API verifies the affiliate, records the click, and sets tracking cookies
4. The affiliate gets credit for the referral for 30 days (via cookies)

## URL Parameters

The following URL parameters are supported and tracked:

| Parameter | Description |
|-----------|-------------|
| `a` | **Required.** The affiliate's unique slug |
| `utm_source` | Optional. Source of the traffic |
| `utm_medium` | Optional. Marketing medium |
| `utm_campaign` | Optional. Specific campaign name |
| `utm_content` | Optional. Content identifier |
| `utm_term` | Optional. Search terms used |

Example URL with UTM parameters:
```
https://gracefulhomeschooling.com?a=affiliate-slug&utm_source=newsletter&utm_medium=email&utm_campaign=summer2025
```

## Cookies

The system sets two cookies:

1. `gh_aff`: Stores the affiliate slug (expires after 30 days)
2. `gh_vid`: Stores the visitor ID (expires after 1 year)

These cookies are HttpOnly and secure in production environments to prevent JavaScript access and ensure secure transmission.

## Technical Considerations

### Privacy

The tracking system:
- Does not use third-party cookies
- Does not track personally identifiable information (PII)
- Does not use fingerprinting techniques
- Honors Do Not Track (DNT) headers

### Performance

- The JavaScript pixel is under 5KB (minified)
- Loads asynchronously to avoid blocking page rendering
- Uses fetch API with image fallback for maximum compatibility
- Sets appropriate cache headers to minimize bandwidth usage

## Testing

To test affiliate tracking:

1. Add `?a=test-affiliate` to any URL on your website
2. Open browser developer tools and check the Network tab
3. Look for a request to `/api/affiliate/click`
4. Verify that the response is a 1x1 transparent GIF
5. Check browser cookies for `gh_aff` and `gh_vid`

## Troubleshooting

If tracking is not working:

1. Ensure the affiliate slug is valid and the affiliate account is active
2. Check browser console for JavaScript errors
3. Verify that cookies are not being blocked by browser settings
4. Check server logs for API errors

## Implementation Checklist

- [ ] Add tracking pixel to all landing pages
- [ ] Test tracking with multiple affiliates
- [ ] Verify data is being recorded in the database
- [ ] Test with various browsers and devices
- [ ] Implement conversion tracking (separate system)
