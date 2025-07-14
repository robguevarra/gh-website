// Server component that injects JSON-LD structured data into the <head>.
// NOTE: Keep this file under 150 lines as per project guidelines.

import React from "react"

// Generic helper that renders a <script type="application/ld+json"> tag.
// Accepts any JSON-serialisable object.
export function JsonLd({ json }: { json: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      // Use dangerouslySetInnerHTML because React escapes all strings by default.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}

// Convenience wrapper that outputs base Organization, WebSite and Course data.
// Add new entities (FAQPage, Article, etc.) here as needed.
export function BaseJsonLd() {
  const baseUrl = "https://gracefulhomeschooling.com"

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Graceful Homeschooling",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      "https://facebook.com/gracefulhomeschoolingbyemigrace",
    ],
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: baseUrl,
    name: "Graceful Homeschooling",
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/?s={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Papers to Profits",
    description:
      "Learn how to design, craft and sell printable planners, journals and other paper products from home.",
    provider: {
      "@type": "Organization",
      name: "Graceful Homeschooling",
      sameAs: baseUrl,
    },
    url: `${baseUrl}/p2p-order-form`,
  }

  return (
    <>
      <JsonLd json={organization} />
      <JsonLd json={website} />
      <JsonLd json={course} />
    </>
  )
}
