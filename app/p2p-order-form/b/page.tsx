import { type Metadata } from "next"
import PapersToProfitVariantB from "../p2p-order-client-b"

/**
 * Server wrapper for Papers-to-Profits order form (Variant B)
 * Allows export of static metadata for SEO & OG cards while delegating all
 * interactive behaviour to the client component.
 */
export const metadata: Metadata = {
    title: {
        absolute: "Papers to Profits | Paper Crafts Business Course – Graceful Homeschooling",
    },
    description:
        "Join Papers to Profits and learn to design, craft & sell printable planners, journals and other paper products from home.",
    alternates: {
        canonical: "https://gracefulhomeschooling.com/p2p-order-form",
    },
    openGraph: {
        title: "Papers to Profits | Paper Crafts Business Course – Graceful Homeschooling",
        description:
            "Turn your passion for paper crafts into profit. Enroll now and start earning from printable products today!",
        url: "https://gracefulhomeschooling.com/p2p-order-form",
        type: "website",
        images: [
            {
                url: "/seo/p2p-order-form.png",
                width: 1200,
                height: 630,
                alt: "Papers to Profits course banner",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
    },
    robots: {
        index: false, // Prevent indexing of variant B URL directly to avoid duplicate content penalties
        follow: true,
    }
}

import { Suspense } from "react"

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen" />}>
            <PapersToProfitVariantB variant="B" />
        </Suspense>
    )
}
