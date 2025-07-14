import { NextRequest } from 'next/server'

const baseUrl = 'https://gracefulhomeschooling.com'

export async function GET(request: NextRequest) {
  const robots = `User-Agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
