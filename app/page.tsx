import { type Metadata } from "next"
import HomeClient from "./home-client"
import { BaseJsonLd } from "@/components/seo/jsonld"

/**
 * Server entry for the Graceful Homeschooling marketing homepage.
 * Supplies static metadata for SEO while delegating rich interactivity to the client.
 */
export const metadata: Metadata = {
  title: {
    absolute: "Graceful Homeschooling – Homeschool Resources, Business Courses, Printables & Community",
  },
  description:
    "Inspire your homeschooling journey with engaging curriculum advice, printable planners, and small-business courses that help parents earn from home.",
  alternates: {
    canonical: "https://gracefulhomeschooling.com/",
  },
  keywords: [
    "homeschooling", "Filipino homeschooling", "homeschool resources", "printable planners", "paper crafts business", "work from home", "Emigrace Guevarra", "online courses", "kumita habang nasa bahay"
  ],
  authors: [{ name: "Emigrace Guevarra" }],
  openGraph: {
    title: "Graceful Homeschooling – Homeschool Resources, Business Courses, Printables & Community",
    description:
      "Business Courses, printables and community support to help Filipino parents start their home-based printing business.",
    url: "https://gracefulhomeschooling.com/",
    type: "website",
    siteName: "Graceful Homeschooling",
    locale: "en_PH",
    images: [
      {
        url: "/seo/site.png",
        width: 1200,
        height: 630,
        alt: "Graceful Homeschooling hero screenshot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default function Page() {
  return (
    <>
      {/* Structured data for richer search snippets */}
      <BaseJsonLd />
      <HomeClient />
    </>
  )
}
