import { getRequestBaseUrl } from '@/lib/request-url'
import { getActiveProductSitemapPaths, sitemapUnavailable } from '@/lib/product-sitemap'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

const CONTENT_SITEMAP_PATHS = [
  '/sitemap-static.xml',
  '/sitemap-categories.xml',
  '/sitemap-news.xml',
] as const

// Product shards are listed here directly. Google does not support a sitemap
// index that points at another sitemap index (the old /sitemap-products-index.xml
// entry), so nesting hid the product shards from crawlers.
function buildSitemapIndex(baseUrl: string, productSitemapPaths: readonly string[]) {
  const now = new Date().toISOString()
  const sitemapPaths = [
    // Only the static shard has a trustworthy baseline (it is rebuilt daily).
    // Categories, news and the product shards change independently, so no
    // lastmod is claimed for them rather than inventing one.
    ...CONTENT_SITEMAP_PATHS.map((path) => ({
      path,
      lastModified: path === '/sitemap-static.xml' ? now : undefined,
    })),
    ...productSitemapPaths.map((path) => ({ path, lastModified: undefined })),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map(({ path, lastModified }) => `  <sitemap>
    <loc>${baseUrl}${path}</loc>${lastModified ? `\n    <lastmod>${lastModified}</lastmod>` : ''}
  </sitemap>`).join('\n')}
</sitemapindex>`
}

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  let productSitemapPaths: string[]
  try {
    productSitemapPaths = await getActiveProductSitemapPaths()
  } catch (error) {
    console.error('Error resolving product sitemaps for the primary index:', error)
    return sitemapUnavailable()
  }

  return new NextResponse(buildSitemapIndex(baseUrl, productSitemapPaths), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
