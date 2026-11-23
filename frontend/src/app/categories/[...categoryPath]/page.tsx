import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoryProductsClient from '@/components/categories/CategoryProductsClient';
import CategorySidebarTree from '@/components/categories/CategorySidebarTree';
import CategorySubcategoriesBar from '@/components/categories/CategorySubcategoriesBar';
import ScrollRestorer from '@/components/common/ScrollRestorer';
import { CategoryService } from '@/services/category.service';
import { ProductService } from '@/services/product.service';
import { getSiteUrl } from '@/lib/url';
import { toProductPathId } from '@/lib/utils';
import { buildSemanticProductName } from '@/lib/product-seo';
import { DEFAULT_WARRANTY_PERIOD, SALES_EMAIL } from '@/lib/product-content';
import { buildVcocncCategoryGeoGuide, type CategoryGeoFaqItem } from '@/lib/category-geo';
import {
  buildCompactSidebarTree,
  categoryFiltersFromParams,
  findCategoryNodeById,
  hasNonCanonicalCategoryQueryParams,
  isCategoryIndexable,
  isInternalCategory,
  toClientCategory,
  toSlimListingProduct,
} from '@/lib/category-listing';
import type { Category, PaginationResponse, Product } from '@/types';

// Reads searchParams (pagination/filters), so it must render per request.
export const dynamic = 'force-dynamic';

interface CategoryPathPageProps {
  params: Promise<{ categoryPath: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const brandDisplayNames: Record<string, string> = {
  fanuc: 'FANUC',
  mitsubishi: 'Mitsubishi',
  siemens: 'Siemens',
  ab: 'AB',
  abb: 'ABB',
  omron: 'OMRON',
  yaskawa: 'Yaskawa',
  huawei: 'Huawei',
  sick: 'SICK',
  tamagawa: 'Tamagawa',
  keyence: 'KEYENCE',
  'schneider-electric': 'Schneider Electric',
  'bosch-rexroth': 'Bosch Rexroth',
};

function getCategoryBrandName(category: Category, breadcrumb?: Category[]): string {
  const rootCategory = breadcrumb?.[0] || category;
  const key = String(rootCategory?.slug || rootCategory?.name || '').toLowerCase();
  return brandDisplayNames[key] || rootCategory?.name || 'Industrial Automation';
}

function getCategoryTitleSuffix(brandName: string): string {
  return brandName === 'FANUC' ? 'FANUC CNC parts' : `${brandName} industrial automation parts`;
}

function trimMetaText(value: string, maxLength: number): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const cut = normalized.slice(0, maxLength);
  const boundary = cut.lastIndexOf(' ');
  return (boundary >= 24 ? cut.slice(0, boundary) : cut).replace(/[\s|,:;–—-]+$/, '').trim();
}

// End descriptions on a full sentence (or a clean word boundary + period)
// instead of cutting mid-phrase at the character ceiling.
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

// Root categories represent brands ("Siemens Parts", "FANUC Parts"); child
// categories get the brand prefix unless they already include it so titles and
// H1s are distinct across brands.
function getCategoryDisplayName(category: Category, brandName: string): string {
  const name = String(category?.name || '').trim();
  if (!category?.parent_id) {
    if (isInternalCategory(category)) return name || 'Category';
    return /\bparts\b/i.test(name) ? name : `${brandName} Parts`;
  }
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const compactBrand = compact(brandName);
  return compactBrand && compact(name).includes(compactBrand) ? name : `${brandName} ${name}`;
}

function buildCategoryTitle(displayName: string, brandName: string, isRoot: boolean): string {
  const candidates = isRoot
    ? [
        `${displayName} – ${brandName === 'FANUC' ? 'CNC & Robot Spares' : 'Automation Spares'} | Vcocnc`,
        `${displayName} | Buy Online | Vcocnc`,
        `${displayName} | Vcocnc`,
      ]
    : [
        `${displayName} | Buy Online | Vcocnc`,
        `${displayName} | Vcocnc`,
      ];
  return candidates.find((candidate) => candidate.length <= 60) || `${trimMetaText(displayName, 50)} | Vcocnc`;
}

function hasRichCategoryDescription(
  description: string | undefined,
  displayName: string,
  brandName: string,
): boolean {
  const cleaned = String(description || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 70) return false;
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const compactDesc = compact(cleaned);
  if (compactDesc === compact(displayName)) return false;
  if (compactDesc === compact(`${brandName} industrial automation parts`)) return false;
  return true;
}

// Prefer rich category descriptions from the database; only fall back to
// brand-aware templates when the stored description is empty or boilerplate.
function getCategoryMetaDescription(
  displayName: string,
  baseDescription: string | undefined,
  brandName: string,
): string {
  if (hasRichCategoryDescription(baseDescription, displayName, brandName)) {
    return trimMetaDescription(baseDescription!);
  }

  const name = displayName.toLowerCase();
  const titleSuffix = getCategoryTitleSuffix(brandName);
  const templates: Record<string, string> = {
    'servo': `Shop ${displayName} for CNC and industrial motion control. Quality tested, ${DEFAULT_WARRANTY_PERIOD} warranty, worldwide shipping from Vcocnc.`,
    'motor': `Buy ${displayName} for CNC and industrial automation maintenance. Tested units with ${DEFAULT_WARRANTY_PERIOD} warranty and worldwide shipping from Vcocnc.`,
    'pcb': `Find ${displayName} for industrial control and signal processing. Quality-tested boards with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'board': `Browse ${displayName} for CNC and automation control systems. Quality-tested circuit boards with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'power': `Shop ${displayName} for stable industrial power delivery. Tested units with ${DEFAULT_WARRANTY_PERIOD} warranty and fast global shipping from Vcocnc.`,
    'i/o': `Buy ${displayName} for industrial automation I/O control. Tested modules with ${DEFAULT_WARRANTY_PERIOD} warranty and global shipping from Vcocnc.`,
    'interface': `Find ${displayName} for industrial communication and control. Quality-tested parts with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'encoder': `Shop ${displayName} for accurate position and speed feedback. Tested encoders with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'cable': `Buy ${displayName} for industrial automation connections. Quality-checked cables with ${DEFAULT_WARRANTY_PERIOD} warranty and worldwide delivery at Vcocnc.`,
    'display': `Find ${displayName} for machine operator interfaces and HMI panels. Tested displays with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'spindle': `Shop ${displayName} for high-speed CNC spindle control. Tested drives and parts with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'controller': `Buy ${displayName} for CNC and industrial machine control. Tested controllers with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
    'robot': `Find ${displayName} for industrial robot maintenance and automation. Tested spare parts with ${DEFAULT_WARRANTY_PERIOD} warranty from Vcocnc.`,
  };

  for (const [key, template] of Object.entries(templates)) {
    if (name.includes(key)) return trimMetaDescription(template);
  }

  return trimMetaDescription(
    `Browse ${displayName} at Vcocnc. Tested ${titleSuffix} with ${DEFAULT_WARRANTY_PERIOD} warranty and worldwide shipping.`,
  );
}

function isOtherBucketSubcategory(category: Pick<Category, 'slug' | 'name'>): boolean {
  const slug = String(category.slug || '').toLowerCase();
  const name = String(category.name || '').toLowerCase();
  return slug.endsWith('-other-parts') || slug === 'other-parts' || /\bother parts\b/.test(name);
}

async function resolveCategoryProductCount(categoryId: number): Promise<number> {
  try {
    const tree = await CategoryService.getCategories();
    const matched = findCategoryNodeById(tree, categoryId);
    if (matched && typeof matched.product_count === 'number') {
      return matched.product_count;
    }
  } catch {
    // Fall through to product count lookup
  }
  try {
    const page = await ProductService.getProducts({
      category_id: String(categoryId),
      include_descendants: 'true',
      is_active: 'true',
      page: 1,
      page_size: 1,
    });
    return Number(page.total || 0);
  } catch {
    return 0;
  }
}

export async function generateMetadata({ params, searchParams }: CategoryPathPageProps): Promise<Metadata> {
  try {
    const { categoryPath } = await params;
    const resolvedSearchParams = (await searchParams) || {};
    const path = (categoryPath || []).join('/');
    const resolved = await CategoryService.getCategoryByPath(path);
    const category = resolved.category;
    const breadcrumb = resolved.breadcrumb || [];
    const baseUrl = getSiteUrl();
    const urlPath = category.path ? `/categories/${category.path}` : `/categories/${path}`;
    const brandName = getCategoryBrandName(category, breadcrumb);
    const displayName = getCategoryDisplayName(category, brandName);
    const title = buildCategoryTitle(displayName, brandName, !category.parent_id);
    const metaDescription = getCategoryMetaDescription(displayName, category.description, brandName);

    const productCount = await resolveCategoryProductCount(category.id);
    const shouldIndex =
      isCategoryIndexable(category, productCount) &&
      !hasNonCanonicalCategoryQueryParams(resolvedSearchParams);

    return {
      title: { absolute: title },
      description: metaDescription,
      robots: {
        index: shouldIndex,
        follow: true,
      },
      openGraph: {
        title,
        description: metaDescription,
        type: 'website',
        url: `${baseUrl}${urlPath}`,
      },
      alternates: {
        canonical: `${baseUrl}${urlPath}`,
      },
    };
  } catch {
    return {
      title: { absolute: 'Category | Vcocnc' },
      description: 'Browse industrial automation and CNC spare parts by category.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

// CollectionPage + visible FAQPage + ItemList JSON-LD for category pages
function CategoryStructuredData({
  category,
  breadcrumb,
  baseUrl,
  displayName,
  brandName,
  faqEntries,
  items,
}: {
  category: Category;
  breadcrumb: Category[];
  baseUrl: string;
  displayName: string;
  brandName: string;
  faqEntries: CategoryGeoFaqItem[];
  items: Array<{ name: string; url: string }>;
}) {
  const urlPath = category.path ? `/categories/${category.path}` : `/categories/${category.slug}`;
  const categoryUrl = `${baseUrl}${urlPath}`;

  const collectionData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: displayName,
    description: getCategoryMetaDescription(displayName, category.description, brandName),
    url: categoryUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Vcocnc',
      url: baseUrl,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl,
        },
        ...breadcrumb.map((bc, idx) => ({
          '@type': 'ListItem',
          position: idx + 2,
          name: bc.name,
          item: `${baseUrl}/categories/${bc.path || bc.slug}`,
        })),
      ],
    },
  };

  const faqData =
    faqEntries.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqEntries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: entry.answer,
            },
          })),
        }
      : null;

  const itemListData =
    items.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: displayName,
          url: categoryUrl,
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: item.url,
          })),
        }
      : null;

  const serialize = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(collectionData) }} />
      {faqData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(faqData) }} />
      )}
      {itemListData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(itemListData) }} />
      )}
    </>
  );
}

export default async function CategoryPathPage({ params, searchParams }: CategoryPathPageProps) {
  const { categoryPath } = await params;
  const searchParamsResolved = await searchParams;
  const path = (categoryPath || []).join('/');

  let resolved: { category: Category; breadcrumb: Category[] } | null = null;
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

  const rawTree = await CategoryService.getCategories();
  const matchedTreeNode = findCategoryNodeById(rawTree, resolved.category.id);
  const { tree, totalRootCount } = buildCompactSidebarTree(rawTree, resolved.category.id, {
    topRootLimit: 24,
  });
  const breadcrumb = resolved.breadcrumb || [];
  const breadcrumbIds = breadcrumb
    .map((c) => Number(c.id))
    .filter((n) => Number.isFinite(n) && n > 0);
  const baseUrl = getSiteUrl();

  const brandName = getCategoryBrandName(resolved.category, breadcrumb);
  const displayName = getCategoryDisplayName(resolved.category, brandName);

  // Server-render the first page of products so crawlers without JS execution
  // receive real product links and ItemList structured data.
  let initialPage: PaginationResponse<Product> | undefined;
  try {
    const listingFilters = categoryFiltersFromParams(resolved.category.id, searchParamsResolved);
    const listed = await ProductService.getProducts(listingFilters);
    initialPage = {
      ...listed,
      data: (listed.data || []).map(toSlimListingProduct),
    };
  } catch {
    initialPage = undefined;
  }

  const productCount =
    typeof matchedTreeNode?.product_count === 'number'
      ? matchedTreeNode.product_count
      : Number(initialPage?.total || 0);

  const visibleSubcategories = (matchedTreeNode?.children || [])
    .filter((child) => !isInternalCategory(child) && Number(child.product_count || 0) > 0)
    .sort((a, b) => {
      const aOther = isOtherBucketSubcategory(a);
      const bOther = isOtherBucketSubcategory(b);
      const aCount = Number(a.product_count || 0);
      const bCount = Number(b.product_count || 0);
      // Keep specific product families ahead of catch-all "Other Parts" buckets
      // in the compact top bar so engineers immediately see real categories.
      if (aOther !== bOther) {
        if (aOther && bCount >= 10) return 1;
        if (bOther && aCount >= 10) return -1;
      }
      return bCount - aCount;
    });

  const subcategoryBarItems = visibleSubcategories.map((child) => ({
    id: child.id,
    name: child.name,
    href: `/categories/${child.path || child.slug}`,
    count: Number(child.product_count || 0),
  }));

  const categoryItemList = (initialPage?.data || []).map((item) => ({
    name: buildSemanticProductName(item) || item.name || item.sku,
    url: `${baseUrl}/products/${toProductPathId(item.sku)}`,
  }));

  const isCanonicalPage = !hasNonCanonicalCategoryQueryParams(searchParamsResolved);
  const geoGuide =
    !isInternalCategory(resolved.category) && productCount > 0 && isCanonicalPage
      ? buildVcocncCategoryGeoGuide({
          category: resolved.category,
          displayName,
          brandName,
          productCount,
          subcategories: visibleSubcategories,
          sampleProducts: initialPage?.data || [],
        })
      : null;

  const faqEntries = geoGuide?.faqEntries || [];

  return (
    <PublicLayout>
      <CategoryStructuredData
        category={resolved.category}
        breadcrumb={breadcrumb}
        baseUrl={baseUrl}
        displayName={displayName}
        brandName={brandName}
        faqEntries={faqEntries}
        items={categoryItemList}
      />
      <ScrollRestorer storageKey="category-scroll-y" />
      <div className="min-h-screen bg-gray-50">
        {/* Compact Hero */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <nav className="flex justify-center mb-2" aria-label="Breadcrumb">
                <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs sm:text-sm text-yellow-100">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  {breadcrumb.map((bc) => (
                    <li key={bc.id} className="flex items-center">
                      <span className="mx-1.5">/</span>
                      <Link
                        href={bc.path ? `/categories/${bc.path}` : `/categories/${bc.slug}`}
                        className={
                          bc.id === resolved!.category.id
                            ? 'text-white font-medium'
                            : 'hover:text-white transition-colors'
                        }
                      >
                        {bc.name}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">{displayName}</h1>
              {resolved.category.description && (
                <p className="text-sm md:text-base text-yellow-50 max-w-4xl mx-auto leading-relaxed">
                  {resolved.category.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar (rendered after products on mobile so items appear above the fold) */}
            <aside className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow p-4 lg:sticky lg:top-28">
                <div className="text-sm font-semibold text-gray-900 mb-2.5">Categories</div>
                <CategorySidebarTree
                  tree={tree}
                  activeCategoryId={resolved.category.id}
                  defaultOpenIds={breadcrumbIds}
                  totalRootCount={totalRootCount}
                  storageKey="category-sidebar-open-ids"
                />
              </div>
            </aside>

            {/* Products & structured guides */}
            <section className="lg:col-span-9 order-1 lg:order-2 min-w-0">
              {subcategoryBarItems.length > 0 && (
                <CategorySubcategoriesBar
                  displayName={displayName}
                  subcategories={subcategoryBarItems}
                  initialLimit={8}
                />
              )}

              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600" />
                  </div>
                }
              >
                <CategoryProductsClient
                  category={toClientCategory(resolved.category)}
                  initialSearchParams={searchParamsResolved}
                  initialPage={initialPage}
                />
              </Suspense>

              {/* Structured Selection & Replacement Guide (SEO + GEO) */}
              {geoGuide && (
                <section
                  id="category-selection-guide"
                  className="bg-white rounded-lg shadow mt-8 p-6 space-y-6"
                  aria-labelledby="category-selection-heading"
                >
                  <div>
                    <h2 id="category-selection-heading" className="text-xl font-semibold text-gray-900">
                      {displayName}: Selection &amp; Replacement Guide
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                      {geoGuide.catalogSummary}
                    </p>
                  </div>

                  {/* Quick facts bar */}
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    {geoGuide.serviceFacts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {fact.label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-gray-900">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Pre-order technical verification checks */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Key Compatibility Checks Before Replacing {displayName}
                    </h3>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {geoGuide.selectionChecks.map((check) => (
                        <div
                          key={check.title}
                          className="rounded-lg border border-gray-200 p-4 bg-white"
                        >
                          <h4 className="text-sm font-semibold text-gray-900">{check.title}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">{check.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Representative part numbers / prefixes */}
                  {geoGuide.featuredParts.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Representative {displayName} Part Numbers
                      </h3>
                      {geoGuide.seriesPrefixes.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Active series prefixes: {geoGuide.seriesPrefixes.join(' · ')}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {geoGuide.featuredParts.map((part) => (
                          <Link
                            key={part.sku}
                            href={part.href}
                            className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-800 hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-900 transition-colors"
                          >
                            {part.sku}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-gray-800">
                    Need part-number verification or urgent downtime dispatch? Send your nameplate photo or CNC alarm details to{' '}
                    <a href={`mailto:${SALES_EMAIL}`} className="font-semibold text-yellow-800 underline">
                      {SALES_EMAIL}
                    </a>{' '}
                    or visit our{' '}
                    <Link href="/contact" className="font-semibold text-yellow-800 underline">
                      technical support desk
                    </Link>
                    .
                  </div>
                </section>
              )}

              {/* Visible FAQ matching FAQPage JSON-LD above */}
              {faqEntries.length > 0 && (
                <section
                  className="bg-white rounded-lg shadow mt-8 p-6"
                  aria-labelledby="category-faq-heading"
                >
                  <h2 id="category-faq-heading" className="text-xl font-semibold text-gray-900">
                    {displayName}: Technical &amp; Ordering FAQ
                  </h2>
                  <div className="mt-4 divide-y divide-gray-200">
                    {faqEntries.map((entry) => (
                      <details key={entry.question} className="group py-4" open>
                        <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:hidden">
                          {entry.question}
                        </summary>
                        <p className="mt-2 text-sm leading-relaxed text-gray-700">{entry.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
