import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoryProductsClient from '@/components/categories/CategoryProductsClient';
import { CategoryService } from '@/services';
import { getSiteUrl } from '@/lib/url';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const category = await CategoryService.getCategoryBySlug(slug);

    if (!category) {
      return {
        title: 'Category Not Found | Vcocnc',
        description: 'The requested category could not be found.',
      };
    }

    const baseUrl = getSiteUrl();
    return {
      title: `${category.name} - FANUC Parts | Vcocnc`,
      description: category.description || `Browse ${category.name} products from Vcocnc. High-quality FANUC automation parts with fast shipping.`,
      keywords: `${category.name}, FANUC, automation parts, ${category.slug}`,
      openGraph: {
        title: `${category.name} - FANUC Parts | Vcocnc`,
        description: category.description || `Browse ${category.name} products from Vcocnc`,
        type: 'website',
        url: `${baseUrl}/categories/${category.slug}`,
      },
      alternates: {
        canonical: `${baseUrl}/categories/${category.slug}`,
      },
    };
  } catch (error) {
    return {
      title: 'Category | Vcocnc',
      description: 'Browse FANUC automation parts by category.',
    };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  
  let category = null;
  
  try {
    category = await CategoryService.getCategoryBySlug(slug);
  } catch (error: any) {
    // Only log non-404 errors to avoid noisy logs when a category slug truly doesn't exist
    if (!(error && error.response && error.response.status === 404)) {
      console.error('Failed to fetch category:', error);
    }
  }

  if (!category) {
    notFound();
  }

  return (
    <PublicLayout>
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": category.name,
            "description": category.description,
            "url": `${getSiteUrl()}/categories/${category.slug}`,
            "mainEntity": {
              "@type": "ItemList",
              "name": `${category.name} Products`,
              "description": `FANUC ${category.name} products and parts`
            }
          })
        }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xl md:text-2xl text-yellow-100 max-w-3xl mx-auto">
                  {category.description}
                </p>
              )}
              <div className="mt-6">
                <nav className="flex justify-center" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-yellow-100">
                    <li>
                      <a href="/" className="hover:text-white transition-colors">
                        Home
                      </a>
                    </li>
                    <li>
                      <span className="mx-2">/</span>
                    </li>
                    <li>
                      <a href="/categories" className="hover:text-white transition-colors">
                        Categories
                      </a>
                    </li>
                    <li>
                      <span className="mx-2">/</span>
                    </li>
                    <li className="text-white font-medium">
                      {category.name}
                    </li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
          }>
            <CategoryProductsClient
              category={category}
              initialSearchParams={searchParamsResolved}
            />
          </Suspense>
        </div>
      </div>
    </PublicLayout>
  );
}
