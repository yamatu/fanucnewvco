import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoryProductsClient from '@/components/categories/CategoryProductsClient';
import CategorySidebarTree from '@/components/categories/CategorySidebarTree';
import ScrollRestorer from '@/components/common/ScrollRestorer';
import { CategoryService } from '@/services';
import { getSiteUrl } from '@/lib/url';

interface CategoryPathPageProps {
  params: Promise<{ categoryPath: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CategoryPathPageProps): Promise<Metadata> {
  try {
    const { categoryPath } = await params;
    const path = (categoryPath || []).join('/');
    const { category } = await CategoryService.getCategoryByPath(path);
    const baseUrl = getSiteUrl();
    const urlPath = category.path ? `/categories/${category.path}` : `/categories/${path}`;
    return {
      title: `${category.name} - FANUC Parts | Vcocnc`,
      description:
        category.description ||
        `Browse ${category.name} products from Vcocnc. High-quality FANUC automation parts with fast shipping.`,
      openGraph: {
        title: `${category.name} - FANUC Parts | Vcocnc`,
        description: category.description || `Browse ${category.name} products from Vcocnc`,
        type: 'website',
        url: `${baseUrl}${urlPath}`,
      },
      alternates: {
        canonical: `${baseUrl}${urlPath}`,
      },
    };
  } catch {
    return {
      title: 'Category | Vcocnc',
      description: 'Browse FANUC automation parts by category.',
    };
  }
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

  const tree = await CategoryService.getCategories();
  const breadcrumbIds = (resolved.breadcrumb || [])
    .map((c: any) => Number(c.id))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  return (
    <PublicLayout>
      <ScrollRestorer storageKey="category-scroll-y" />
      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{resolved.category.name}</h1>
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
                <CategoryProductsClient category={resolved.category} initialSearchParams={searchParamsResolved} />
              </Suspense>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
