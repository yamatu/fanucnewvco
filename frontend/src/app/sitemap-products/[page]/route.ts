import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { toProductPathId } from '@/lib/utils'
import { fetchProductSitemapPage, sitemapUnavailable, type ProductSitemapEntry } from '@/lib/product-sitemap'

export const dynamic = 'force-dynamic'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function absoluteUrl(baseUrl: string, url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}
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

    const urls = products.map((product: ProductSitemapEntry) => ({
      url: `${baseUrl}/products/${toProductPathId(product.sku)}`,
      lastModified: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString(),
      changeFrequency: product.stock_quantity === 0 ? 'monthly' : product.stock_quantity < 10 ? 'daily' : 'weekly',
      priority: product.is_featured
        ? '0.9'
        : product.stock_quantity > 100
          ? '0.85'
          : product.stock_quantity === 0
            ? '0.6'
            : '0.8',
      images: (product.images || []).map((image) => absoluteUrl(baseUrl, image)),
      title: product.name || product.sku,
    }))

    const sitemap =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      urls
        .map(
          (u) =>
            `  <url>\n    <loc>${escapeXml(u.url)}</loc>\n    <lastmod>${u.lastModified}</lastmod>\n    <changefreq>${u.changeFrequency}</changefreq>\n    <priority>${u.priority}</priority>\n` +
            u.images.map((image) => `    <image:image>\n      <image:loc>${escapeXml(image)}</image:loc>\n      <image:title>${escapeXml(u.title)}</image:title>\n    </image:image>\n`).join('') +
            `  </url>`
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
