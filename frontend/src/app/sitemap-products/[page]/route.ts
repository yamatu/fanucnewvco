import { NextResponse } from 'next/server'
import { getRequestBaseUrl } from '@/lib/request-url'
import { ProductService } from '@/services/product.service'
import { toProductPathId } from '@/lib/utils'
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap'
import type { Product } from '@/types'
import { getAvailableTranslationLocales } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutes

export async function GET(
  _req: Request,
  context: { params: Promise<{ page: string }> }
) {
  try {
    const baseUrl = await getRequestBaseUrl()
    const { page } = await context.params
    const pageNumber = Math.max(1, parseInt(page || '1', 10) || 1)

    const response = await ProductService.getProducts({
      page: pageNumber,
      page_size: 100,
      is_active: 'true',
    })

    const products = response.data || []
    if (!Array.isArray(products) || products.length === 0) {
      return new NextResponse(`No products found for sitemap page ${pageNumber}`, { status: 404 })
    }

    const urls = products.map((product: Product) => ({
      pathname: `/products/${toProductPathId(product.sku)}`,
      lastModified: product.updated_at ? new Date(product.updated_at).toISOString() : undefined,
      changeFrequency: product.stock_quantity === 0 ? 'monthly' : product.stock_quantity < 10 ? 'daily' : 'weekly',
      priority: product.is_featured
        ? '0.9'
        : product.stock_quantity > 100
          ? '0.85'
          : product.stock_quantity === 0
            ? '0.6'
            : '0.8',
      availableLocales: getAvailableTranslationLocales(product.translations),
    }))

    const sitemap = renderLocalizedSitemap(baseUrl, urls)

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    })
  } catch (error) {
    console.error('Error generating dynamic product sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
