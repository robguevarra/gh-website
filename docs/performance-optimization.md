# Performance Optimization Guide

This guide explains how to use the performance optimization components and utilities in the Graceful Homeschooling website.

## Table of Contents
1. [Optimized Image Component](#optimized-image-component)
2. [Dynamic Import Component](#dynamic-import-component)
3. [Dynamic Component Utility](#dynamic-component-utility)
4. [Script Optimization](#script-optimization)
5. [Best Practices](#best-practices)

## Optimized Image Component

The `OptimizedImage` component enhances the Next.js Image component with lazy loading, blur-up technique, and intersection observer.

### Usage

```tsx
import { OptimizedImage } from '@/components/ui/optimized-image'

// Basic usage
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description of image"
  width={800}
  height={600}
/>

// With low quality placeholder for blur-up effect
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description of image"
  width={800}
  height={600}
  lowQualitySrc="/path/to/low-quality-image.jpg"
/>

// With priority loading for above-the-fold images
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description of image"
  width={800}
  height={600}
  priority
/>
```

### Props

- All props from Next.js Image component
- `lowQualitySrc`: URL to a low-quality version of the image for blur-up effect
- `containerClassName`: Class name for the container div
- `priority`: Boolean to indicate if the image should load with priority (for above-the-fold content)

## Dynamic Import Component

The `DynamicImport` component allows you to lazy load components when they enter the viewport.

### Usage

```tsx
import { DynamicImport } from '@/components/ui/dynamic-import'

// Basic usage
<DynamicImport>
  <HeavyComponent />
</DynamicImport>

// With custom loading state
<DynamicImport
  fallback={<div>Loading...</div>}
  threshold={0.5}
  rootMargin="100px"
>
  <HeavyComponent />
</DynamicImport>

// Load immediately (useful for above-the-fold content)
<DynamicImport loadImmediately>
  <HeavyComponent />
</DynamicImport>
```

### Props

- `children`: The component to lazy load
- `fallback`: React node to show while loading (default: animated placeholder)
- `threshold`: Intersection observer threshold (0-1)
- `rootMargin`: Intersection observer root margin
- `className`: Class name for the container
- `loadImmediately`: Boolean to load immediately without waiting for intersection

## Dynamic Component Utility

The `createDynamicComponent` utility creates dynamically imported components with customizable loading states.

### Usage

```tsx
import { createDynamicComponent } from '@/lib/dynamic-component'

// Create a dynamic component
const DynamicChart = createDynamicComponent(
  () => import('@/components/charts/complex-chart'),
  {
    ssr: false,
    loading: <div>Loading chart...</div>,
    displayName: 'DynamicChart'
  }
)

// Use it like a regular component
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DynamicChart data={chartData} />
    </div>
  )
}
```

### Parameters

- `importFunc`: Function that imports the component
- `options`: Configuration object with:
  - `ssr`: Boolean to enable/disable server-side rendering
  - `loading`: React node to show while loading
  - `displayName`: Display name for the component in React DevTools

## Script Optimization

Use the Next.js Script component to optimize script loading.

### Usage

```tsx
import Script from 'next/script'

// In your component or layout
<Script
  src="/scripts/analytics.js"
  strategy="lazyOnload"
  id="analytics-script"
/>

// For third-party scripts
<Script
  src="https://example.com/script.js"
  strategy="afterInteractive"
  id="third-party-script"
/>
```

### Strategies

- `beforeInteractive`: Load before page becomes interactive
- `afterInteractive`: Load after page becomes interactive (default)
- `lazyOnload`: Load during idle time
- `worker`: Load in a web worker (experimental)

## Best Practices

1. **Above-the-fold content**:
   - Use `priority` for images above the fold
   - Use `loadImmediately` for dynamic imports above the fold

2. **Image optimization**:
   - Always provide `width` and `height` to prevent layout shifts
   - Use `lowQualitySrc` for important images
   - Consider using WebP format for better compression

3. **Component optimization**:
   - Use dynamic imports for heavy components not needed immediately
   - Split large components into smaller, more focused ones
   - Use React.memo for pure components

4. **Script optimization**:
   - Place non-critical scripts in `/public/scripts/`
   - Use appropriate loading strategy based on script importance
   - Consider using `defer` or `async` for traditional scripts

5. **CSS optimization**:
   - Keep critical CSS minimal
   - Use CSS modules for component-specific styles
   - Consider using CSS-in-JS for dynamic styles

6. **Performance monitoring**:
   - Regularly run Lighthouse audits
   - Monitor Core Web Vitals in production
   - Use the Chrome DevTools Performance tab for detailed analysis 