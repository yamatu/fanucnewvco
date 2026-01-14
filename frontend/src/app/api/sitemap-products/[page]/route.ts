import { NextRequest, NextResponse } from 'next/server'
import { getSiteUrl } from '@/lib/url'
import { ProductService } from '@/services/product.service'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutes

interface RouteParams {
  params: Promise<{
    page: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { page } = await params
    const pageNumber = parseInt(page, 10)

    console.log(`Generating sitemap-products-${pageNumber}.xml`)

    if (isNaN(pageNumber) || pageNumber < 1) {
      return new NextResponse('Invalid page number', { status: 400 })
    }

    const baseUrl = getSiteUrl()

    // 简化逻辑：每个sitemap包含100个产品（对应后端API的一页）
    const response = await ProductService.getProducts({
      page: pageNumber,
      page_size: 100,
      is_active: 'true'
    })

    const products = response.data || []

    console.log(`Fetched ${products.length} products for sitemap-products-${pageNumber}.xml`)

    if (products.length === 0) {
      console.log(`No products found for sitemap page ${pageNumber}`)
      return new NextResponse(`No products found for sitemap page ${pageNumber}`, { status: 404 })
    }

    const productPages = products.map((product) => ({
      url: `${baseUrl}/products/${encodeURIComponent(product.sku)}`,
      lastModified: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString(),
      changeFrequency: product.stock_quantity === 0 ? 'monthly' : product.stock_quantity < 10 ? 'daily' : 'weekly',
      priority: product.is_featured ? '0.9' : product.stock_quantity > 100 ? '0.85' : product.stock_quantity === 0 ? '0.6' : '0.8',
    }))

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${productPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse(`Error: ${error}`, { status: 500 })
  }
}
