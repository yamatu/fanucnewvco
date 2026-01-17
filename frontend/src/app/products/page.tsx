import { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductService, CategoryService } from '@/services';
import { getSiteUrl } from '@/lib/url';
import { toProductPathId } from '@/lib/utils';
import ProductsPageClient from './ProductsPageClient';

// Generate dynamic metadata for products page
export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const params = await searchParams;
  const categoryId = params.category_id || params.category;
  const search = params.search;

  let title = 'FANUC Parts & Industrial Automation Components';
  let description = 'Professional FANUC CNC parts supplier since 2005. 100,000+ items in stock, worldwide shipping. Servo motors, PCB boards, I/O modules, control units.';

  // Try to get category info for better SEO
  if (categoryId) {
    try {
      const categories = await CategoryService.getCategories();
      const category = categories.find(c => c.id.toString() === categoryId);
      if (category) {
        title = `${category.name} - FANUC Parts | Vcocnc`;
        description = `Professional ${category.name} for FANUC CNC systems. High-quality industrial automation components with worldwide shipping.`;
        // Prefer canonical to dedicated category page
        return {
          title,
          description,
          keywords: [
            'FANUC parts', 'CNC parts', 'industrial automation', 'servo motors', 'PCB boards',
            'I/O modules', 'control units', category.name
          ].filter(Boolean).join(', '),
          openGraph: {
            title,
            description,
            type: 'website',
            url: `${getSiteUrl()}/categories/${category.slug}`,
          },
          alternates: {
            canonical: `${getSiteUrl()}/categories/${category.slug}`,
          },
        };
      }
    } catch (error) {
      // Fallback to default
    }
  }

  if (search) {
    title = `Search: ${search} - FANUC Parts | Vcocnc`;
    description = `Search results for "${search}" in FANUC parts and industrial automation components. Professional supplier since 2005.`;
  }

  // For search result pages, avoid indexing but allow following links
  const hasSearch = typeof search === 'string' && search.trim().length > 0;
  const robots = hasSearch ? { index: false, follow: true } : { index: true, follow: true };

  const baseUrl = getSiteUrl();
  return {
    title,
    description,
    robots,
    keywords: [
      'FANUC parts', 'CNC parts', 'industrial automation', 'servo motors', 'PCB boards',
      'I/O modules', 'control units', search
    ].filter(Boolean).join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/products`,
    },
    alternates: {
      canonical: `${baseUrl}/products`,
    },
  };
}

// Server-side data fetching for SEO
async function getServerSideData(searchParams: { [key: string]: string | string[] | undefined }) {
  const categoryId = searchParams.category_id || searchParams.category;
  const search = searchParams.search;
  const page = parseInt((searchParams.page as string) || '1', 10);

  // Safely convert parameters to strings
  const searchStr = typeof search === 'string' && search.trim() ? search.trim() : undefined;
  const categoryIdStr = typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : undefined;

  console.log('🔍 getServerSideData params:', { searchStr, categoryIdStr, page });

  try {
    // Fetch products and categories in parallel to reduce TTFB
    const [productsData, categories] = await Promise.all([
      ProductService.getProducts({
        search: searchStr,
        category_id: categoryIdStr,
        is_active: 'true',
        page,
        page_size: 12,
      }),
      CategoryService.getCategories(),
    ]);

    return {
      products: productsData.data || [],
      totalPages: Math.ceil((productsData.total || 0) / 12),
      total: productsData.total || 0,
      categories: categories || [],
      currentPage: page,
      selectedCategory: categoryId as string || '',
      searchQuery: search as string || '',
    };
  } catch (error) {
    console.error('Failed to fetch server-side data:', error);
    // Return mock data as fallback
    return {
      products: [],
      totalPages: 1,
      total: 0,
      categories: [],
      currentPage: 1,
      selectedCategory: '',
      searchQuery: '',
    };
  }
}

// Force no cache for this page to ensure fresh data for crawlers
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Main server component
export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const serverData = await getServerSideData(params);

  // Generate structured data for product listing page
  const generateListingStructuredData = (data: any) => {
    const baseUrl = getSiteUrl();

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "FANUC Parts & Industrial Automation Components",
      "description": "Professional FANUC CNC parts supplier since 2005. Browse our extensive catalog of servo motors, PCB boards, I/O modules, and control units.",
      "url": `${baseUrl}/products`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": data.total,
        "itemListElement": data.products.slice(0, 10).map((product: any, index: number) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.name,
            "description": product.description || `${product.name} - Professional FANUC part`,
            "sku": product.sku,
            "brand": {
              "@type": "Brand",
              "name": product.brand || "FANUC"
            },
            "image": product.image_urls && product.image_urls.length > 0
              ? product.image_urls[0]
              : `${baseUrl}/images/default-product.svg`,
            "url": product.slug ? `${baseUrl}/products/${product.slug}` : `${baseUrl}/products/${toProductPathId(product.sku)}`,
            "offers": {
              "@type": "Offer",
              "price": product.price || 0,
              "priceCurrency": "USD",
              "availability": product.stock_quantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
              "seller": {
                "@type": "Organization",
                "name": "Vcocnc"
              }
            }
          }
        }))
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Products",
            "item": `${baseUrl}/products`
          }
        ]
      }
    };
  };

  const structuredData = generateListingStructuredData(serverData);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      }>
        <ProductsPageClient
          initialData={serverData}
          searchParams={params}
        />
      </Suspense>
    </>
  );
}
