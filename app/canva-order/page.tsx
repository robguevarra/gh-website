import { type Metadata } from "next"
import CanvaEbookClient from "./canva-ebook-client"

/**
 * Server wrapper for Canva Business e-book checkout page.
 */
export const metadata: Metadata = {
  title: {
    absolute: "Canva Business Ebook – Graceful Homeschooling",
  },
  description:
    "Learn proven strategies to design, market and sell physical & digital products using Canva. Instantly download Grace's step-by-step e-book and start earning today.",
  alternates: {
    canonical: "https://gracefulhomeschooling.com/canva-order",
  },
  openGraph: {
    title: "Canva Business Ebook – Graceful Homeschooling",
    description:
      "Turn your creative skills into income with our comprehensive Canva business guide. Download now!",
    url: "https://gracefulhomeschooling.com/canva-order",
    type: "website",
    images: [
      {
        url: "/seo/canva-order.png",
        width: 1200,
        height: 630,
        alt: "Canva Business Ebook cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default function Page() {
  return <CanvaEbookClient />
}
