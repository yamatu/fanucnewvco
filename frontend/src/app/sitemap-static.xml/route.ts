import { getRequestBaseUrl } from '@/lib/request-url'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24 hours

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  const lastModified = new Date().toISOString()

  const staticPages = [
    {
      url: baseUrl,
      lastModified,
    },
    {
      url: `${baseUrl}/products`,
      lastModified,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified,
    },
    {
      url: `${baseUrl}/news`,
      lastModified,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
    },
    {
      url: `${baseUrl}/warranty-policy`,
      lastModified,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified,
    },
    {
      url: `${baseUrl}/technical-support`,
      lastModified,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified,
    },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified}</lastmod>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
