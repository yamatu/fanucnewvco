import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoryProductsClient from '@/components/categories/CategoryProductsClient';
import CategorySidebarTree from '@/components/categories/CategorySidebarTree';
import ScrollRestorer from '@/components/common/ScrollRestorer';
import { CategoryService } from '@/services/category.service';
import { ProductService } from '@/services/product.service';
import { getSiteUrl } from '@/lib/url';
import { toProductPathId } from '@/lib/utils';
import { categoryFiltersFromParams } from '@/lib/category-listing';
import type { Category, CategoryNavigationNode, PaginationResponse, Product } from '@/types';

// Reads searchParams (pagination/filters), so it must render per request.
export const dynamic = 'force-dynamic';

interface CategoryPathPageProps {
  params: Promise<{ categoryPath: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const brandDisplayNames: Record<string, string> = {
  fanuc: 'FANUC',
};

type CategoryLike = { name?: string; slug?: string; parent_id?: number | null };

// Root categories are brands. Copy used to say "FANUC" for every category,
// including 3M, B&R or Allen-Bradley ones, so the brand now comes from the
// category's own root.
function getCategoryBrandName(category: CategoryLike, breadcrumb?: CategoryLike[]): string {
  const root = breadcrumb?.[0] || category;
  const key = String(root?.slug || root?.name || '').toLowerCase();
  return brandDisplayNames[key] || String(root?.name || '').trim() || 'Industrial Automation';
}

// Root brand pages read "FANUC Parts"; child names get the brand prefix unless
// they already carry it, so the H1 names the full product family.
function getCategoryDisplayName(category: CategoryLike, brandName: string): string {
  const name = String(category?.name || '').trim();
  if (!category?.parent_id) return `${brandName} Parts`;
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return compact(name).includes(compact(brandName)) ? name : `${brandName} ${name}`;
}

function trimMetaText(value: string, maxLength: number): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const cut = normalized.slice(0, maxLength);
  const boundary = cut.lastIndexOf(' ');
  // Never leave a dangling separator ("... Parts |") after the cut.
  return (boundary >= 24 ? cut.slice(0, boundary) : cut).replace(/[\s|,:;–—-]+$/, '').trim();
}

// Descriptions end on a full sentence or a complete list item instead of
// stopping mid-phrase at the character limit.
function trimMetaDescription(value: string, maxLength = 158): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  let out = '';
  for (const sentence of normalized.split(/(?<=[.!?])\s+/)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > maxLength) break;
    out = next;
  }
  if (out.length >= 80) return out;
  const cut = normalized.slice(0, maxLength - 10);
  const comma = cut.lastIndexOf(', ');
  if (comma > 80) return `${cut.slice(0, comma)} and more.`;
  return `${trimMetaText(normalized, maxLength - 1).replace(/[.,;:]+$/, '')}.`;
}

function buildCategoryTitle(displayName: string, brandName: string, isRoot: boolean): string {
  const candidates = isRoot
    ? [`${displayName} – ${brandName === 'FANUC' ? 'CNC & Robot Spares' : 'Automation Spares'} | Buy Online | Vcocnc`, `${displayName} – Buy Online | Vcocnc`, `${displayName} | Vcocnc`]
    : [`${displayName} – Buy Online | Vcocnc`, `${displayName} | Vcocnc`];
  return candidates.find((candidate) => candidate.length <= 65) || trimMetaText(`${displayName} | Vcocnc`, 65);
}

// Category-specific meta description templates
function getCategoryMetaDescription(displayName: string, baseDescription?: string): string {
  const name = displayName.toLowerCase();
  const templates: Record<string, string> = {
    'servo': `Shop ${displayName} for precise CNC motion control. Tested, 12-month warranty, fast worldwide shipping. In-stock parts ready to ship from Vcocnc.`,
    'motor': `Buy ${displayName} for high-torque CNC performance. Quality tested with 12-month warranty. Fast DHL/FedEx shipping worldwide from Vcocnc.`,
    'pcb': `Find ${displayName} for reliable CNC signal processing. All boards tested before shipping. 12-month warranty, worldwide delivery from Vcocnc.`,
    'board': `Browse ${displayName} for CNC control systems. Quality-tested circuit boards with 12-month warranty. Fast global shipping from Vcocnc.`,
    'power': `Shop ${displayName} for stable industrial power delivery. Units tested and ready to ship. 12-month warranty at Vcocnc.`,
    'i/o': `Buy ${displayName} for robust automation I/O control. Tested modules with 12-month warranty. Worldwide express shipping from Vcocnc.`,
    'interface': `Find ${displayName} for reliable industrial communication. All parts quality tested. 12-month warranty, DHL/FedEx shipping from Vcocnc.`,
    'encoder': `Shop ${displayName} for accurate position feedback. Tested encoders with 12-month warranty. Fast worldwide delivery from Vcocnc.`,
    'cable': `Buy ${displayName} for reliable industrial connections. Quality cables with 12-month warranty. Fast express shipping worldwide at Vcocnc.`,
    'display': `Find ${displayName} for clear operator interfaces. Tested displays with 12-month warranty. Worldwide shipping from Vcocnc.`,
    'spindle': `Shop ${displayName} for high-speed CNC spindle control. Tested drives with 12-month warranty. Express global shipping from Vcocnc.`,
    'controller': `Buy ${displayName} for advanced machine control. All controllers tested. 12-month warranty, fast worldwide delivery at Vcocnc.`,
    'robot': `Find ${displayName} for industrial robot automation. Tested parts with 12-month warranty. Fast DHL/FedEx shipping worldwide from Vcocnc.`,
  };

  for (const [key, template] of Object.entries(templates)) {
    if (name.includes(key)) return trimMetaDescription(template);
  }

  if (baseDescription && baseDescription.length > 50) return trimMetaDescription(baseDescription);

  return trimMetaDescription(`Browse ${displayName} from Vcocnc. Quality-tested industrial automation spare parts with 12-month warranty. Fast worldwide shipping via DHL & FedEx.`);
}

// One FAQ list for the visible section and the FAQPage markup: Google only
// accepts FAQ structured data whose answers are shown on the page.
function buildCategoryFaqEntries(displayName: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Where can I buy ${displayName} online?`,
      answer: `You can buy ${displayName} online at Vcocnc (vcocncspare.com). We offer quality-tested parts with 12-month warranty and worldwide express shipping via DHL and FedEx.`,
    },
    {
      question: `Do you offer warranty on ${displayName}?`,
      answer: `Yes, ${displayName} from Vcocnc come with a 12-month warranty. Every part is quality tested before shipment to ensure reliability.`,
    },
    {
      question: `How fast is shipping for ${displayName}?`,
      answer: `We offer worldwide express shipping via DHL, FedEx, and UPS. Most in-stock items ship within 1-3 business days with delivery in 3-7 business days.`,
    },
  ];
}

function toNavigationCategory(category: Category): CategoryNavigationNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    description: category.description,
    image_url: category.image_url,
    sort_order: category.sort_order,
    product_count: category.product_count,
    children: category.children?.map(toNavigationCategory),
  };
}

// Listing cards only need summary fields; trimming the description keeps the
// server-rendered page payload small.
function toListingProduct(product: Product): Product {
  const description = String(product.short_description || product.description || '');
  return {
    ...product,
    description: description.length > 240 ? `${description.slice(0, 237)}...` : description,
    faqs: undefined,
    reviews: undefined,
    translations: undefined,
  } as Product;
}

function absoluteImageUrl(baseUrl: string, url?: string): string {
  if (!url) return `${baseUrl}/images/og-image.jpg`;
  return /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({ params }: CategoryPathPageProps): Promise<Metadata> {
  try {
    const { categoryPath } = await params;
    const path = (categoryPath || []).join('/');
    const { category, breadcrumb } = await CategoryService.getCategoryByPath(path);
    const baseUrl = getSiteUrl();
    const urlPath = category.path ? `/categories/${category.path}` : `/categories/${path}`;
    const brandName = getCategoryBrandName(category, breadcrumb);
    const displayName = getCategoryDisplayName(category, brandName);
    const title = buildCategoryTitle(displayName, brandName, !category.parent_id);
    const metaDescription = getCategoryMetaDescription(displayName, category.description);
    const image = absoluteImageUrl(baseUrl, category.image_url);
    return {
      title: { absolute: title },
      description: metaDescription,
      openGraph: {
        title,
        description: metaDescription,
        type: 'website',
        url: `${baseUrl}${urlPath}`,
        images: [{ url: image, alt: displayName }],
      },
      twitter: { card: 'summary_large_image', title, description: metaDescription, images: [image] },
      alternates: {
        canonical: `${baseUrl}${urlPath}`,
      },
    };
  } catch {
    return {
      title: 'Category | Vcocnc',
      description: 'Browse industrial automation parts by category.',
    };
  }
}

// CollectionPage + ItemList + FAQ JSON-LD for category pages
function CategoryStructuredData({
  category,
  breadcrumb,
  baseUrl,
  displayName,
  faqEntries,
  products,
  total,
}: {
  category: any;
  breadcrumb: any[];
  baseUrl: string;
  displayName: string;
  faqEntries: Array<{ question: string; answer: string }>;
  products: Product[];
  total: number;
}) {
  const urlPath = category.path ? `/categories/${category.path}` : `/categories/${category.slug}`;
  const categoryUrl = `${baseUrl}${urlPath}`;

  const collectionData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": displayName,
    "description": getCategoryMetaDescription(displayName, category.description),
    "url": categoryUrl,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Vcocnc",
      "url": baseUrl
    },
    ...(products.length > 0 ? {
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": total,
        "itemListElement": products.map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": product.name || product.sku,
          "url": `${baseUrl}/products/${toProductPathId(product.sku)}`
        }))
      }
    } : {}),
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        ...breadcrumb.map((bc: any, idx: number) => ({
          "@type": "ListItem",
          "position": idx + 2,
          "name": bc.name,
          "item": `${baseUrl}/categories/${bc.path || bc.slug}`
        }))
      ]
    }
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqEntries.map((entry) => ({
      "@type": "Question",
      "name": entry.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": entry.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
    </>
  );
}

export default async function CategoryPathPage({ params, searchParams }: CategoryPathPageProps) {
  const { categoryPath } = await params;
  const searchParamsResolved = await searchParams;
  const path = (categoryPath || []).join('/');

  let resolved: { category: any; breadcrumb: any[] } | null = null;
  try {
    resolved = await CategoryService.getCategoryByPath(path);
  } catch {
    resolved = null;
  }

  if (!resolved?.category) {
    notFound();
  }

  // Canonical redirect to computed path if the request path differs.
  if (resolved.category.path && resolved.category.path !== path) {
    permanentRedirect(`/categories/${resolved.category.path}`);
  }

  const tree = (await CategoryService.getCategories()).map(toNavigationCategory);
  const breadcrumbIds = (resolved.breadcrumb || [])
    .map((c: any) => Number(c.id))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const baseUrl = getSiteUrl();
  const brandName = getCategoryBrandName(resolved.category, resolved.breadcrumb || []);
  const displayName = getCategoryDisplayName(resolved.category, brandName);
  const faqEntries = buildCategoryFaqEntries(displayName);

  // The first page of products is rendered on the server so crawlers that do
  // not execute JavaScript still see the catalogue; the client takes over for
  // filtering and pagination using the same filters.
  let initialPage: PaginationResponse<Product> | undefined;
  try {
    const listed = await ProductService.getProducts(categoryFiltersFromParams(resolved.category.id, searchParamsResolved));
    initialPage = { ...listed, data: (listed.data || []).map(toListingProduct) };
  } catch {
    initialPage = undefined;
  }

  return (
    <PublicLayout>
      <CategoryStructuredData
        category={resolved.category}
        breadcrumb={resolved.breadcrumb || []}
        baseUrl={baseUrl}
        displayName={displayName}
        faqEntries={faqEntries}
        products={initialPage?.data || []}
        total={initialPage?.total || 0}
      />
      <ScrollRestorer storageKey="category-scroll-y" />
      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{displayName}</h1>
              {resolved.category.description && (
                <p className="text-lg md:text-xl text-yellow-100 max-w-3xl mx-auto">{resolved.category.description}</p>
              )}
              <div className="mt-5">
                <nav className="flex justify-center" aria-label="Breadcrumb">
                  <ol className="flex items-center flex-wrap gap-x-2 gap-y-1 text-yellow-100">
                    <li>
                      <a href="/" className="hover:text-white transition-colors">
                        Home
                      </a>
                    </li>
                    {(resolved.breadcrumb || []).map((bc: any) => (
                      <li key={bc.id} className="flex items-center">
                        <span className="mx-2">/</span>
                        <a
                          href={bc.path ? `/categories/${bc.path}` : `/categories/${bc.slug}`}
                          className={
                            bc.id === resolved!.category.id
                              ? 'text-white font-medium'
                              : 'hover:text-white transition-colors'
                          }
                        >
                          {bc.name}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar */}
            <aside className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">Categories</div>
                <CategorySidebarTree
                  tree={tree}
                  activeCategoryId={resolved.category.id}
                  defaultOpenIds={breadcrumbIds}
                  storageKey="category-sidebar-open-ids"
                />
              </div>
            </aside>

            {/* Products */}
            <section className="lg:col-span-9">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600" />
                  </div>
                }
              >
                <CategoryProductsClient category={resolved.category} initialSearchParams={searchParamsResolved} initialPage={initialPage} />
              </Suspense>

              {/* Visible FAQ: the same entries as the FAQPage markup above. */}
              <section className="mt-8 rounded-lg bg-white p-6 shadow" aria-labelledby="category-faq-heading">
                <h2 id="category-faq-heading" className="text-xl font-semibold text-gray-900">
                  {displayName}: frequently asked questions
                </h2>
                <div className="mt-4 divide-y divide-gray-200">
                  {faqEntries.map((entry) => (
                    <details key={entry.question} className="py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-900">{entry.question}</summary>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">{entry.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
