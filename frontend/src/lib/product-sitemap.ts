// 1000 URLs per shard keeps a 130k catalogue inside ~130 shards. The previous
// 100-per-shard layout hit the 1000-shard cap at 100,000 products and silently
// left every product after that out of the sitemaps.
export const PRODUCT_SITEMAP_PAGE_SIZE = 1000;
export const MAX_PRODUCT_SITEMAPS = 1000;

export interface ProductSitemapEntry {
  sku: string;
  updated_at?: string;
  stock_quantity: number;
  is_featured: boolean;
}

interface ProductSitemapPage {
  data: ProductSitemapEntry[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export async function fetchProductSitemapPage(page: number, pageSize = PRODUCT_SITEMAP_PAGE_SIZE): Promise<ProductSitemapPage> {
  const backend = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  // No Next data cache: a malformed answer would otherwise be replayed for the
  // whole revalidate window after the backend recovers. The endpoint is light
  // and cached in Redis on the backend.
  const response = await fetch(`${backend}/api/v1/public/products/sitemap?page=${page}&page_size=${pageSize}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Product sitemap request failed: ${response.status}`);
  const payload = (await response.json()) as { success?: boolean; data?: ProductSitemapPage };
  const data = payload.data;
  if (!payload.success || !data || !Array.isArray(data.data)) throw new Error('Product sitemap response is malformed');
  // A backend serving a different page size than requested would shift every
  // shard and silently drop products from the sitemaps. Fail loudly instead.
  if (data.page_size !== pageSize) {
    throw new Error(`Product sitemap page_size mismatch: requested ${pageSize}, got ${data.page_size}`);
  }
  return data;
}

export function getProductSitemapPaths(totalProducts: number, pageSize = PRODUCT_SITEMAP_PAGE_SIZE): string[] {
  const normalizedTotal = Number.isFinite(totalProducts) ? Math.max(0, Math.floor(totalProducts)) : 0;
  const totalPages = Math.min(MAX_PRODUCT_SITEMAPS, Math.ceil(normalizedTotal / pageSize));
  return Array.from({ length: totalPages }, (_, index) => `/sitemap-products/${index + 1}.xml`);
}

export async function getActiveProductSitemapPaths(): Promise<string[]> {
  const { total } = await fetchProductSitemapPage(1, 1);
  return getProductSitemapPaths(total || 0);
}

export function sitemapUnavailable(): Response {
  // 503 + no-store: crawlers retry later instead of a CDN caching the error or
  // an index that silently lost the product shards.
  return new Response('Sitemap temporarily unavailable', {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
  });
}
