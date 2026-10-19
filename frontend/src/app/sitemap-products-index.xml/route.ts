import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { getActiveProductSitemapPaths, sitemapUnavailable } from '@/lib/product-sitemap'

export const dynamic = 'force-dynamic'

// Kept as a standalone index for anyone who submitted it directly in Search
// Console. /sitemap.xml lists the same shards itself (indexes must not nest).
export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  let paths: string[]
  try {
    paths = await getActiveProductSitemapPaths()
  } catch (error) {
    console.error('Error generating product sitemap index:', error)
    return sitemapUnavailable()
  }

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <sitemap>
    <loc>${baseUrl}${path}</loc>
  </sitemap>`).join('\n')}
</sitemapindex>`

  return new NextResponse(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  })
}
