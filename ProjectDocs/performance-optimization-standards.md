# Graceful Homeschooling Performance & Optimization Standards

This document outlines the standards and best practices for performance optimization in the Graceful Homeschooling platform to ensure an optimal user experience across various devices and network conditions.

## Table of Contents

1. [Performance Goals](#performance-goals)
2. [Bundle Optimization](#bundle-optimization)
3. [Image Optimization](#image-optimization)
4. [Caching Strategy](#caching-strategy)
5. [Rendering Optimization](#rendering-optimization)
6. [API and Database Optimization](#api-and-database-optimization)
7. [Measurement and Monitoring](#measurement-and-monitoring)

## Performance Goals

The Graceful Homeschooling platform targets the following performance metrics:

- **Lighthouse Score**: ≥90 for Performance, Accessibility, Best Practices, and SEO
- **Core Web Vitals**:
  - Largest Contentful Paint (LCP): ≤2.5 seconds
  - First Input Delay (FID): ≤100 milliseconds
  - Cumulative Layout Shift (CLS): ≤0.1
- **Time to Interactive (TTI)**: ≤3.8 seconds
- **Total Blocking Time (TBT)**: ≤300 milliseconds
- **First Contentful Paint (FCP)**: ≤1.8 seconds
- **Speed Index**: ≤3.4 seconds

These targets apply to the 75th percentile of user experiences across mobile and desktop devices.

## Bundle Optimization

### Code Splitting Strategy

1. **Route-Based Splitting**:
   - Next.js app directory automatically code-splits by route
   - Keep route-specific code within route directories
   - Avoid heavy imports in shared layouts where possible

2. **Component-Level Splitting**:
   - Use dynamic imports for large components that are conditionally rendered:

```tsx
// Dynamic import for a complex component
import dynamic from 'next/dynamic';

// With loading state
const ComplexDataTable = dynamic(
  () => import('@/components/complex-data-table'),
  {
    loading: () => <DataTableSkeleton />,
    ssr: false // For components that only work on client-side
  }
);

// For components that need to be loaded only when needed
const VideoPlayer = dynamic(() => import('@/components/video-player'));
```

3. **Third-Party Library Optimization**:
   - Import only what you need from larger libraries:

```tsx
// ❌ Bad - imports entire library
import lodash from 'lodash';

// ✅ Good - imports only what you need
import debounce from 'lodash/debounce';
```

### Lazy Loading Patterns

1. **Below-the-Fold Content**:
   - Lazy load all below-the-fold components and resources

2. **Media Content**:
   - Always lazy load images, videos, and iframes using:
     - `<Image />` from Next.js with loading="lazy"
     - `<iframe loading="lazy">`
     - `<video loading="lazy">`

3. **Complex UI Elements**:
   - Lazy load complex UI elements that aren't immediately visible:

```tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load a complex component
const ComplexChart = dynamic(() => import('@/components/complex-chart'));

export default function DashboardPage() {
  const [showChart, setShowChart] = useState(false);
  
  useEffect(() => {
    // Load chart only when component is mounted
    setShowChart(true);
  }, []);
  
  return (
    <div>
      <h1>Dashboard</h1>
      {showChart ? <ComplexChart /> : <ChartSkeleton />}
    </div>
  );
}
```

### Bundle Analysis

Regularly analyze bundle size using built-in tooling:

```bash
# Analyze client bundles
ANALYZE=true npm run build
```

- Keep main bundle under 100KB (compressed)
- Identify and remove unused dependencies
- Monitor bundle growth between releases

## Image Optimization

### Format Selection Guidelines

Use appropriate image formats based on content type:

1. **Photos and Complex Images**:
   - AVIF: Preferred format for best compression and quality
   - WebP: Fallback for browsers without AVIF support
   - JPEG: Final fallback for older browsers

2. **Graphics, Icons, and UI Elements**:
   - SVG: Preferred for vector graphics and icons
   - WebP: Alternative for complex graphics
   - PNG: Only when transparency is needed and SVG is not viable

3. **Animations**:
   - AVIF sequences or WebP (if animation support is available)
   - Compressed MP4 (converted from GIF) for video-like animations
   - Avoid GIF for animations (use video formats instead)

### Responsive Image Implementation

Use Next.js Image component with proper configurations:

```tsx
import Image from 'next/image';

export function ResponsiveImage() {
  return (
    <Image
      src="/images/course-header.jpg"
      alt="Course Header"
      width={1200}
      height={630}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false} // Set to true for above-the-fold images
      quality={80} // Adjust based on image complexity
      placeholder="blur" // For important images
      blurDataURL="data:image/..." // Generate using tools or base64
    />
  );
}
```

Provide multiple sizes based on viewport:

```html
<picture>
  <source
    media="(max-width: 640px)"
    srcSet="/images/hero-small.webp"
    type="image/webp"
  />
  <source
    media="(min-width: 641px)"
    srcSet="/images/hero-large.webp"
    type="image/webp"
  />
  <Image
    src="/images/hero.jpg"
    alt="Hero Image"
    width={1200}
    height={600}
    priority
  />
</picture>
```

### Image Optimization Workflow

Follow this workflow for all images used in the platform:

1. **Source Preparation**:
   - Use high-quality source images (avoid pre-compressed images)
   - Crop images to appropriate dimensions before adding to the project
   - Remove unnecessary metadata

2. **Compression Process**:
   - Use Next.js Image component for automatic optimization
   - For static images in public directory, use tools like Squoosh or ImageOptim
   - Compress to achieve balance between quality and file size

3. **Delivery Optimization**:
   - Implement CDN caching of optimized images
   - Use appropriate `Cache-Control` headers
   - Configure proper priority loading (above-the-fold vs below-the-fold)

## Caching Strategy

### Browser Caching Approach

Set appropriate HTTP cache headers for different resource types:

```typescript
// In next.config.js for static assets
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};
```

**Cache Duration Guidelines**:

- **Static Assets** (CSS, JS, images): Long cache (1 year) with versioning/hashing
- **API Responses**: Vary based on content:
  - Static/reference data: Long cache (1 day to 1 week)
  - User-specific data: Short cache (5 minutes) or no cache
  - Real-time data: No cache

### Server Caching Patterns

Implement server-side cache for expensive operations:

1. **React Server Components Caching**:
   - Use Next.js fetch cache for data fetching

```tsx
// In a server component
async function getCourses() {
  // This will be cached according to the cache configuration
  const response = await fetch('https://api.example.com/courses', {
    next: {
      revalidate: 3600 // Revalidate every hour
    }
  });
  
  return response.json();
}
```

2. **API Route Caching**:
   - Implement caching for consistent data in API routes

```tsx
// app/api/courses/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await fetchCourses();
  
  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
```

3. **Database Result Caching**:
   - Use Redis or similar for database query caching

```tsx
import { redis } from '@/lib/redis';

export async function getCourseById(id: string) {
  // Check cache first
  const cachedCourse = await redis.get(`course:${id}`);
  if (cachedCourse) {
    return JSON.parse(cachedCourse);
  }
  
  // Query database if not in cache
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
  
  // Cache result for 10 minutes
  if (data) {
    await redis.set(`course:${id}`, JSON.stringify(data), 'EX', 600);
  }
  
  return data;
}
```

### Data Revalidation Standards

Implement strategic revalidation approaches:

1. **Time-Based Revalidation**:
   - Use for content that changes predictably:

```tsx
// Revalidate every hour
fetch('https://api.example.com/courses', { next: { revalidate: 3600 } });
```

2. **On-Demand Revalidation**:
   - Use for content that changes based on events:

```tsx
// Route handler to trigger revalidation
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { path, tag } = await request.json();
  
  // Validate the secret token
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
    });
  }
  
  if (path) {
    revalidatePath(path);
  }
  
  if (tag) {
    revalidateTag(tag);
  }
  
  return Response.json({ revalidated: true, now: Date.now() });
}
```

3. **User-Triggered Revalidation**:
   - Allow users to refresh specific content:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function RefreshButton() {
  const router = useRouter();
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => router.refresh()}
    >
      Refresh Data
    </Button>
  );
}
```

## Rendering Optimization

### Rendering Strategy Selection

Choose the appropriate rendering strategy based on content type:

1. **Static Content** (ISR - Incremental Static Regeneration):
   - Marketing pages
   - Documentation
   - Course catalogs
   - Blog posts

2. **Dynamic Content** (SSR - Server-Side Rendering):
   - User dashboards
   - Course enrollment interfaces
   - Personalized content

3. **Interactive Elements** (CSR - Client-Side Rendering):
   - Interactive forms
   - Real-time components
   - Complex UI interactions

### Component Optimization Techniques

1. **Memoization**:
   - Use React.memo for expensive components:

```tsx
'use client';

import { memo } from 'react';

interface ComplexComponentProps {
  data: any[];
  onItemClick: (id: string) => void;
}

function ComplexComponent({ data, onItemClick }: ComplexComponentProps) {
  // Complex rendering logic...
  return (
    <div>
      {data.map(item => (
        <div key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}

// Only re-render if props change
export default memo(ComplexComponent);
```

2. **Callback Optimization**:
   - Use useCallback for functions passed as props:

```tsx
'use client';

import { useCallback, useState } from 'react';
import ComplexList from '@/components/complex-list';

export default function ParentComponent() {
  const [items, setItems] = useState([/* ... */]);
  
  // Create stable callback reference
  const handleItemClick = useCallback((id: string) => {
    console.log(`Item clicked: ${id}`);
    // Handle the item click...
  }, []);
  
  return <ComplexList items={items} onItemClick={handleItemClick} />;
}
```

3. **Virtualization for Long Lists**:
   - Use virtualization for large data sets:

```tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualizedList({ items }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div
      ref={parentRef}
      style={{ height: '500px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API and Database Optimization

### API Optimization

1. **Request Batching**:
   - Combine multiple API requests into a single call:

```tsx
// ❌ Bad: Multiple separate requests
const user = await fetch('/api/user/1');
const courses = await fetch('/api/user/1/courses');
const settings = await fetch('/api/user/1/settings');

// ✅ Good: Single batched request
const userData = await fetch('/api/user/1?include=courses,settings');
```

2. **Response Shaping**:
   - Return only the data that's needed:

```tsx
// Specify fields to include
const minimalData = await fetch('/api/courses?fields=id,title,thumbnail');

// Implement in API routes
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fields = searchParams.get('fields')?.split(',') || [];
  
  // Query database
  const data = await fetchCourses();
  
  // Shape response if fields are specified
  if (fields.length > 0) {
    const shapedData = data.map(item => {
      const result: Record<string, any> = {};
      fields.forEach(field => {
        if (field in item) {
          result[field] = item[field];
        }
      });
      return result;
    });
    
    return NextResponse.json({ data: shapedData });
  }
  
  return NextResponse.json({ data });
}
```

### Database Query Optimization

1. **Efficient Queries**:
   - Select only required columns
   - Use appropriate indexes
   - Limit result sets

```tsx
// ❌ Bad: Selecting all columns, no limit
const { data } = await supabase.from('courses').select('*');

// ✅ Good: Selecting specific columns, with limit
const { data } = await supabase
  .from('courses')
  .select('id, title, thumbnail_url, published_at')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(10);
```

2. **Pagination**:
   - Implement cursor-based pagination for large datasets:

```tsx
// First page
const { data, error } = await supabase
  .from('courses')
  .select('id, title, created_at')
  .order('created_at', { ascending: false })
  .limit(20);

// Next page using the last ID
const lastId = data[data.length - 1]?.id;
const lastCreatedAt = data[data.length - 1]?.created_at;

const { data: nextPage } = await supabase
  .from('courses')
  .select('id, title, created_at')
  .order('created_at', { ascending: false })
  .lt('created_at', lastCreatedAt)
  .limit(20);
```

## Measurement and Monitoring

### Performance Monitoring Tools

Implement continuous performance monitoring with:

1. **Front-End Monitoring**:
   - Core Web Vitals
   - Page load metrics
   - Client-side errors
   - User interactions

2. **Back-End Monitoring**:
   - API response times
   - Database query performance
   - Server resource utilization
   - Error rates

### Performance Testing Process

Implement a consistent performance testing workflow:

1. **Local Development**:
   - Use Lighthouse in development tools
   - Check bundle sizes with built-in analyzers
   - Test with throttled connections and devices

2. **Continuous Integration**:
   - Automated Lighthouse tests on PR builds
   - Bundle size limits and warnings
   - Compare performance metrics against baseline

3. **Production Monitoring**:
   - Real User Monitoring (RUM)
   - Synthetic testing from multiple regions
   - Alerting on performance regressions

### Performance Budget

Establish and maintain a performance budget:

| Metric              | Target    | Budget    | Critical |
|---------------------|-----------|-----------|----------|
| Total Bundle Size   | 200 KB    | 250 KB    | 300 KB   |
| LCP                 | < 2.5s    | < 3.0s    | < 4.0s   |
| FID                 | < 100ms   | < 200ms   | < 300ms  |
| CLS                 | < 0.1     | < 0.15    | < 0.25   |
| TTI                 | < 3.8s    | < 4.5s    | < 5.5s   |
| API Response Time   | < 200ms   | < 500ms   | < 1000ms |
| Image Size (KB)     | < 200 KB  | < 300 KB  | < 500 KB |
| Font Loading Time   | < 1s      | < 2s      | < 3s     |

Monitor these metrics continuously and investigate when approaching budget limits.

---

*Last updated: March 24, 2024* 