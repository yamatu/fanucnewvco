import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { getAllPublishedArticles } from '@/lib/article-sitemap'
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  try {
    const articles = await getAllPublishedArticles('news')

    const urls = [
      // News listing page
      {
        pathname: '/news',
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily',
        priority: '0.8',
      },
      // Individual article pages
      ...articles.map((article) => ({
        pathname: article.public_path || `/news/${article.slug}`,
        lastModified: article.updated_at
          ? new Date(article.updated_at).toISOString()
          : article.published_at
            ? new Date(article.published_at).toISOString()
            : new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: article.is_featured ? '0.8' : '0.7',
      })),
    ]

    const sitemap = renderLocalizedSitemap(baseUrl, urls)

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error generating news sitemap:', error)
    // Fallback: at least include the news listing page
    const sitemap = renderLocalizedSitemap(baseUrl, [{
      pathname: '/news',
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.8',
    }])

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }
}
