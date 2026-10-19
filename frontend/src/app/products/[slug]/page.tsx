import { Metadata } from 'next';
import { ProductService } from '@/services/product.service';
import { CategoryService } from '@/services/category.service';
import { getProductBySkuCached, searchFirstProduct } from '@/services/product.server';
import { getSiteUrl } from '@/lib/url';
import { toProductPathId } from '@/lib/utils';
import { cleanTitleArtifacts, stripModelNoteArtifacts } from '@/lib/product-seo';
import { customCompatibilityInfo, resolveLeadTime, withoutGeneratedContent } from '@/lib/product-content';
import type { Category, Product, ProductImage } from '@/types';
import ProductDetailClient from './ProductDetailClient';
import { ReactQueryProvider } from '@/lib/react-query';
import { redirect, notFound } from 'next/navigation';

const DEFAULT_SITE_NAME = 'Vcocnc';
const GENERIC_BRAND_LABEL = 'industrial automation';
const GENERIC_SUPPLIER_LABEL = 'industrial automation parts supplier';

export const revalidate = 3600; // ISR: revalidate every hour

// Nothing is prerendered at build time (the Docker build has no backend);
// product pages render on first request and are then served from the ISR cache.
export async function generateStaticParams() {
  return [];
}

function slugToSku(slug: string): string {
  if (!slug) return '';
  // Remove common brand prefix and sanitize
  let s = slug.trim();
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.replace(/^fanuc[\-\s]*/i, '');
  s = s.replace(/[\\/]+/g, '-');
  s = s.replace(/\s+/g, '-');
  s = s.replace(/-+/g, '-');
  return s.toUpperCase();
}

function stripHtml(text?: string): string {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getProductBrand(product: Product): string {
  return normalizeWhitespace(product.brand);
}

function getProductBrandLabel(product: Product): string {
  return getProductBrand(product) || GENERIC_BRAND_LABEL;
}

function getSupplierLabel(product: Product): string {
  return getProductBrand(product)
    ? `${getProductBrand(product)} parts supplier`
    : GENERIC_SUPPLIER_LABEL;
}

function getCanonicalProductSlug(product: Product, fallback = ''): string {
  return toProductPathId(product.sku || fallback);
}

function normalizeWhitespace(text?: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimMetaTitle(text: string, maxLength: number): string {
  const value = cleanTitleArtifacts(text);
  if (!value) return '';
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const idx = cut.lastIndexOf(' ');
  return cleanTitleArtifacts(idx >= 24 ? cut.slice(0, idx) : cut);
}

function trimMetaDescription(text: string, maxLength: number): string {
  const value = normalizeWhitespace(stripModelNoteArtifacts(text));
  if (!value) return '';
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const idx = cut.lastIndexOf(' ');
  const trimmed = normalizeWhitespace(idx >= 60 ? cut.slice(0, idx) : cut);
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function toAbsoluteUrl(url: string | undefined, baseUrl: string): string {
  const value = String(url || '').trim();
  if (!value) return `${baseUrl}/images/default-product.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

function getProductImageFallback(product: Product, baseUrl: string): string {
  const sku = normalizeWhitespace(product.sku);
  if (!sku) return `${baseUrl}/images/default-product.svg`;
  const safeSku = sku.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return `${baseUrl}/api/v1/public/products/default-image/${encodeURIComponent(safeSku)}?sku=${encodeURIComponent(sku)}`;
}

function buildMetadataTitle(product: Product): string {
  const explicit = trimMetaTitle(product.meta_title || '', 58);
  if (explicit) return explicit;

  const brand = getProductBrand(product);
  const parts = [
    brand,
    product.sku,
    product.category?.name || '',
  ].filter(Boolean);
  let title = parts.join(' ');
  if (!title) title = product.name || 'Product';
  if (title.length > 58) {
    title = [brand, product.sku].filter(Boolean).join(' ');
  }
  if (!title) {
    title = [product.sku, product.category?.name || 'industrial automation part'].filter(Boolean).join(' ');
  }
  return trimMetaTitle(title, 58);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const sku = slugToSku(slug);

    const product: Product | null =
      (sku ? await getProductBySkuCached(sku) : null) || await searchFirstProduct(slug);

    if (!product) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const baseUrl = getSiteUrl();
    const canonicalUrl = `${baseUrl}/products/${getCanonicalProductSlug(product, slug)}`;

    const productImages: Array<string | ProductImage> =
      product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : (product.images || []);
    const imageSources = productImages.length > 0 ? productImages : [getProductImageFallback(product, baseUrl)];
    const images = imageSources.map((img) => ({
      url: toAbsoluteUrl(typeof img === 'string' ? img : img?.url || '/images/default-product.svg', baseUrl),
      width: 800,
      height: 600,
      alt: `${product.name} - ${product.sku} Part Image`,
    }));

    const brandLabel = getProductBrandLabel(product);
    const supplierLabel = getSupplierLabel(product);
    const baseDescription = stripHtml(product.meta_description || product.short_description || product.description)
      || `${product.name} (${product.sku}) ${brandLabel} spare part.`;
    const availabilityText = product.stock_quantity > 0
      ? 'In stock and ready for worldwide shipping.'
      : `Available to order with ${resolveLeadTime(product)} lead time.`;
    const supportingText = [
      product.part_number && product.part_number !== product.sku ? `Part number ${product.part_number}.` : '',
      product.category?.name ? `${product.category.name} for CNC and industrial automation systems.` : 'Industrial automation component.',
      // Generated template text is not rendered, so only operator-written guidance counts.
      customCompatibilityInfo(product) ? 'Compatibility guidance available on the product page.' : '',
      `Source from Vcocnc, professional ${supplierLabel} since 2005.`,
    ].filter(Boolean).join(' ');
    const enhancedDescription = trimMetaDescription(`${baseDescription} ${availabilityText} ${supportingText}`, 160);

    const metaDescription = trimMetaDescription(product.meta_description || '', 160);
    const metaKeywords = (product.meta_keywords || '').trim();
    const title = buildMetadataTitle(product);

    return {
      title: { absolute: title },
      description: metaDescription || enhancedDescription,
      keywords: metaKeywords || [product.name, product.sku, product.brand, product.category?.name].filter(Boolean).join(', '),
      category: product.category?.name || 'Industrial Automation',
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title,
        description: metaDescription || enhancedDescription,
        type: 'website',
        url: canonicalUrl,
        siteName: DEFAULT_SITE_NAME,
        images,
      },
      alternates: { canonical: canonicalUrl },
      twitter: {
        card: 'summary_large_image',
        title,
        description: metaDescription || enhancedDescription,
        images: images.map(i => i.url),
        creator: '@vcocnc',
      },
      other: {
        'product:price:amount': product.price?.toString() || '',
        'product:price:currency': 'USD',
        'product:availability': product.stock_quantity > 0 ? 'in stock' : 'available',
        'product:brand': product.brand || '',
        'product:category': product.category?.name || 'Industrial Automation',
        'product:retailer_item_id': product.sku || '',
        'product:condition': product.condition_type || 'new',
        'product:part_number': product.part_number || product.sku || '',
      },
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'Product | Vcocnc',
      description: 'Professional industrial automation parts and components.',
    };
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sku = slugToSku(slug);

  // Backend errors propagate so ISR keeps serving the last good page instead
  // of caching a 404.
  const initialProduct: Product | null =
    (sku ? await getProductBySkuCached(sku) : null) || await searchFirstProduct(slug);

  if (!initialProduct) {
    notFound();
  }

  // Canonical redirect to the normalized product slug shared with sitemap and links.
  const canonicalId = getCanonicalProductSlug(initialProduct, sku || '');
  if (canonicalId && canonicalId !== slug) {
    redirect(`/products/${canonicalId}`);
  }

  // Template compatibility/installation/maintenance/FAQ copy is hidden on the
  // page; drop it from the serialized payload too.
  const pageProduct = withoutGeneratedContent(initialProduct);

  const context = await loadProductPageContext(initialProduct);

  return (
    <>
      <ReactQueryProvider>
        <ProductDetailClient
          productSku={pageProduct.sku || sku}
          initialProduct={pageProduct}
          siteUrl={getSiteUrl()}
          initialCategory={context.category}
          initialCategoryBreadcrumb={context.breadcrumb}
          initialRelatedProducts={context.related}
          initialCategoryPath={context.categoryPath}
        />
      </ReactQueryProvider>
    </>
  );
}

// Only what the breadcrumb, category link and structured data render. Backend
// category payloads can be large (children, translations), and every byte here
// is serialized into each cached product page.
function compactCategory(category: Category): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    parent_id: category.parent_id,
  } as Category;
}

// Related-product cards only need identity, name and images; dropping the
// long descriptions keeps four products from bloating every product page.
function compactRelatedProduct(product: Product): Product {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    image_urls: product.image_urls,
    images: product.images,
  } as Product;
}

// Category trail and related products are cached server reads (small, bounded
// payloads); on failure the client fetches them after hydration.
async function loadProductPageContext(product: Product) {
  const categoryId = product.category_id;
  if (!categoryId) return {};
  const [trail, related] = await Promise.all([
    CategoryService.getCategoryTrail(categoryId).catch(() => undefined),
    ProductService.getProducts({ category_id: String(categoryId), page_size: 4 }).catch(() => undefined),
  ]);
  return {
    category: trail ? compactCategory(trail.category) : undefined,
    breadcrumb: trail ? trail.breadcrumb.map(compactCategory) : undefined,
    related: related ? { ...related, data: (related.data || []).map(compactRelatedProduct) } : undefined,
    categoryPath: trail ? trail.category.path || null : undefined,
  };
}
