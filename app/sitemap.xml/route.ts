import { NextRequest } from 'next/server'

// Quick sitemap route generator. Expands easily as you add pages.
const baseUrl = 'https://gracefulhomeschooling.com'

const staticPages = [
  '/',
  '/p2p-order-form',
  '/canva-order',
]

export async function GET(request: NextRequest) {
  const urls = staticPages
    .map((path) => {
      return `    <url><loc>${baseUrl}${path}</loc></url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
