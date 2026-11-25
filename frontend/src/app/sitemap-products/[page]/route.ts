import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { toProductPathId } from '@/lib/utils'
import { fetchProductSitemapPage, sitemapUnavailable, type ProductSitemapEntry } from '@/lib/product-sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutes

export async function GET(
  _req: Request,
  context: { params: Promise<{ page: string }> }
) {
  try {
    const baseUrl = await getRequestBaseUrl()
    const { page } = await context.params
    const pageNumber = Number(page)
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
      return new NextResponse('Invalid product sitemap page', { status: 404 })
    }

    const { data: products } = await fetchProductSitemapPage(pageNumber)
    if (products.length === 0) {
      return new NextResponse(`No products found for sitemap page ${pageNumber}`, { status: 404 })
    }

    // changefreq/priority are deprecated and ignored by Google; lastmod is the
    // only hint the crawler still uses, so it is all we emit.
    const urls = products.map((product: ProductSitemapEntry) => ({
      url: `${baseUrl}/products/${toProductPathId(product.sku)}`,
      lastModified: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString(),
    }))

    const sitemap =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url>\n    <loc>${u.url}</loc>\n    <lastmod>${u.lastModified}</lastmod>\n  </url>`
        )
        .join('\n') +
      `\n</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    })
  } catch (error) {
    console.error('Error generating dynamic product sitemap:', error)
    return sitemapUnavailable()
  }
}
