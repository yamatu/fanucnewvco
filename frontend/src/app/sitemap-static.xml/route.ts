import { getRequestBaseUrl } from '@/lib/request-url'
import { NextResponse } from 'next/server'
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24 hours

// Use a stable deployment/content baseline for pages without a database-backed
// modification timestamp. A request timestamp falsely tells crawlers that every
// static page changed each time they fetch the sitemap.
const STATIC_CONTENT_LAST_MODIFIED = process.env.SITEMAP_STATIC_LAST_MODIFIED || '2026-07-30T00:00:00.000Z'

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  const lastModified = new Date(STATIC_CONTENT_LAST_MODIFIED).toISOString()

  const staticPages = [
    {
      pathname: '/',
      lastModified,
      changeFrequency: 'daily',
      priority: '1.0',
    },
    {
      pathname: '/products',
      lastModified,
      changeFrequency: 'hourly',
      priority: '0.9',
    },
    {
      pathname: '/categories',
      lastModified,
      changeFrequency: 'daily',
      priority: '0.85',
    },
    {
      pathname: '/about',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.8',
    },
    {
      pathname: '/contact',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.8',
    },
    {
      pathname: '/faq',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.6',
    },
    {
      pathname: '/privacy',
      lastModified,
      changeFrequency: 'yearly',
      priority: '0.4',
    },
    {
      pathname: '/terms',
      lastModified,
      changeFrequency: 'yearly',
      priority: '0.4',
    },
    {
      pathname: '/warranty',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      pathname: '/warranty-policy',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      pathname: '/shipping-policy',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      pathname: '/technical-support',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      pathname: '/returns',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      pathname: '/docs',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.4',
    },
  ]

  const sitemap = renderLocalizedSitemap(baseUrl, staticPages)

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
