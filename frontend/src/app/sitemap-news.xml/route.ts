import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { NewsService } from '@/services/news.service'
import type { Article } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  try {
    // The news API caps page_size at 100 (larger values fall back to 20), so
    // walk every page instead of asking for one oversized page.
    const articles: Article[] = []
    for (let page = 1; page <= 200; page++) {
      const response = await NewsService.getArticles({ page, page_size: 100, is_published: 'true' })
      const batch = response.data || []
      articles.push(...batch)
      if (batch.length < 100 || page >= (response.total_pages || 0)) break
    }

    const urls = [
      // News listing page
      {
        url: `${baseUrl}/news`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: '0.8',
      },
      // Individual article pages
      ...articles.map((article) => ({
        url: `${baseUrl}/news/${article.slug}`,
        lastModified: article.updated_at
          ? new Date(article.updated_at).toISOString()
          : article.published_at
            ? new Date(article.published_at).toISOString()
            : new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: article.is_featured ? '0.8' : '0.7',
      })),
    ]

    const sitemap =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url>\n    <loc>${u.url}</loc>\n    <lastmod>${u.lastModified}</lastmod>\n    <changefreq>${u.changeFrequency}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
        )
        .join('\n') +
      `\n</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error generating news sitemap:', error)
    // Fallback: at least include the news listing page
    const sitemap =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n    <loc>${baseUrl}/news</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n` +
      `</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }
}
