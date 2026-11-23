'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { ProductService } from '@/services/product.service';
import { CategoryService } from '@/services/category.service';
import { queryKeys } from '@/lib/react-query';
import ProductFilters from '@/components/products/ProductFilters';
import Pagination from '@/components/common/Pagination';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  buildProductQuoteHref,
  formatCurrency,
  getDefaultProductImageWithSku,
  getProductImageUrl,
  hasProductPrice,
  toProductPathId,
} from '@/lib/utils';
import { buildSemanticProductName } from '@/lib/product-seo';
import { useCartStore } from '@/store/cart.store';
import type { Category, PaginationResponse, Product } from '@/types';
import {
  DEFAULT_CATEGORY_PAGE_SIZE,
  categoryFiltersFromParams,
  sameCategoryFilters,
  type CategoryProductFilters,
} from '@/lib/category-listing';
import {
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ShoppingCartIcon,
  EyeIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface CategoryProductsClientProps {
  category: Category;
  initialSearchParams: { [key: string]: string | string[] | undefined };
  initialPage?: PaginationResponse<Product>;
}

export default function CategoryProductsClient({
  category,
  initialSearchParams,
  initialPage,
}: CategoryProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCartStore();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [serverFilters] = useState<CategoryProductFilters>(() =>
    categoryFiltersFromParams(category.id, initialSearchParams)
  );
  const [filters, setFilters] = useState<CategoryProductFilters>(serverFilters);

  // Sync filters when URL query changes on the client
  useEffect(() => {
    setFilters(categoryFiltersFromParams(category.id, searchParams));
  }, [searchParams, category.id]);

  // The server renders the first page so crawlers see real product links; later
  // filter/sort/page changes fetch on the client.
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => ProductService.getProducts(filters),
    initialData: initialPage && sameCategoryFilters(filters, serverFilters) ? initialPage : undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all categories for filters only when the filter panel is opened
  const { data: categoriesResponse } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => CategoryService.getCategories(),
    enabled: showFilters,
  });

  const products = productsResponse?.data || [];
  const pagination = productsResponse ? {
    page: productsResponse.page,
    page_size: productsResponse.page_size,
    total: productsResponse.total,
    total_pages: productsResponse.total_pages
  } : null;
  const categories = categoriesResponse || [];

  const buildCategoryUrl = (targetFilters: CategoryProductFilters): string => {
    const params = new URLSearchParams();

    Object.entries(targetFilters).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'category_id' && key !== 'is_active' && key !== 'include_descendants') {
        if (key === 'page' && Number(value) <= 1) return;
        if (key === 'page_size' && Number(value) === DEFAULT_CATEGORY_PAGE_SIZE) return;
        if (key === 'sort_by' && value === 'created_at' && targetFilters.sort_dir === 'desc') return;
        if (key === 'sort_dir' && value === 'desc' && targetFilters.sort_by === 'created_at') return;
        params.set(key, value.toString());
      }
    });

    const base = `/categories/${category.path || category.slug}`;
    return `${base}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Update URL when filters change
  const updateURL = (newFilters: typeof filters) => {
    router.push(buildCategoryUrl(newFilters), { scroll: false });
  };

  const getPageHref = (page: number) => buildCategoryUrl({ ...filters, page });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      page: 1
    };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  };

  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    let sort_by: CategoryProductFilters['sort_by'] = 'created_at';
    let sort_dir: CategoryProductFilters['sort_dir'] = 'desc';
    switch (val) {
      case 'name': sort_by = 'name'; sort_dir = 'asc'; break;
      case 'name_desc': sort_by = 'name'; sort_dir = 'desc'; break;
      case 'price_asc': sort_by = 'price'; sort_dir = 'asc'; break;
      case 'price_desc': sort_by = 'price'; sort_dir = 'desc'; break;
      case 'created_at': sort_by = 'created_at'; sort_dir = 'desc'; break;
    }
    handleFilterChange({ sort_by, sort_dir });
  };

  const sortValue = (() => {
    if (filters.sort_by === 'name' && filters.sort_dir === 'asc') return 'name';
    if (filters.sort_by === 'name' && filters.sort_dir === 'desc') return 'name_desc';
    if (filters.sort_by === 'price' && filters.sort_dir === 'asc') return 'price_asc';
    if (filters.sort_by === 'price' && filters.sort_dir === 'desc') return 'price_desc';
    return 'created_at';
  })();

  const clearFilters = () => {
    const clearedFilters: CategoryProductFilters = {
      page: 1,
      page_size: DEFAULT_CATEGORY_PAGE_SIZE,
      category_id: String(category.id),
      include_descendants: 'true',
      sort_by: 'created_at',
      sort_dir: 'desc',
      min_price: '',
      max_price: '',
      search: '',
      is_active: 'true'
    };
    setFilters(clearedFilters);
    const base = `/categories/${category.path || category.slug}`;
    router.push(base, { scroll: false });
  };

  const handleAddToCart = (product: Product) => {
    if (!hasProductPrice(product)) return;
    addItem(product, 1);
  };

  const hasActiveFilters = !!(filters.min_price || filters.max_price || filters.search);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FunnelIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load products</h3>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Compact Single-Row Toolbar */}
      <div className="bg-white rounded-lg shadow px-3.5 py-2.5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
            <span>
              {pagination ? (
                pagination.total > 0 ? (
                  <>
                    Showing {((pagination.page - 1) * pagination.page_size) + 1}-
                    {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                    <span className="font-medium text-gray-900">{pagination.total.toLocaleString()}</span> products
                  </>
                ) : (
                  <>0 products</>
                )
              ) : (
                <>Loading...</>
              )}
              {hasActiveFilters && <span className="text-gray-500"> (filtered)</span>}
            </span>
            {pagination && pagination.total_pages > 1 && (
              <span className="text-xs text-gray-500">
                Page {pagination.page} / {pagination.total_pages}
              </span>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-yellow-700 hover:text-yellow-800 font-semibold underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortValue}
              onChange={handleSortChange}
              aria-label="Sort products"
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="name">Sort by Name (A-Z)</option>
              <option value="name_desc">Sort by Name (Z-A)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="created_at">Newest First</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-800">
                  Active
                </span>
              )}
            </button>

            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 ${viewMode === 'grid' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid view"
                aria-label="Grid view"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 ${viewMode === 'list' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="List view"
                aria-label="List view"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <ProductFilters
            filters={filters}
            categories={categories}
            onFilterChange={handleFilterChange}
            showCategoryFilter={false}
          />
        </div>
      )}

      {/* Products */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : products.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {products.map((product: Product) => {
                const priced = hasProductPrice(product);
                const productHref = `/products/${toProductPathId(product.sku)}`;
                const semanticName = buildSemanticProductName(product);

                return (
                  <div
                    key={product.id}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative">
                      <Link href={productHref} className="block w-full overflow-hidden bg-gray-100">
                        <Image
                          src={getProductImageUrl(
                            (product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []),
                            getDefaultProductImageWithSku(product.sku)
                          )}
                          alt={`${product.name} - ${product.sku}`}
                          width={300}
                          height={300}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-48 w-full object-cover object-center"
                          loading="lazy"
                        />
                      </Link>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-gray-900">
                        <Link href={productHref} className="transition-colors hover:text-yellow-700">
                          {semanticName}
                        </Link>
                      </h3>
                      <p className="mb-2 truncate font-mono text-xs text-gray-500">SKU: {product.sku}</p>
                      {product.description && (
                        <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-auto border-t border-gray-100 pt-3">
                        {priced && (
                          <div className="mb-2.5 flex items-baseline gap-2">
                            <span className="text-lg font-bold tracking-tight text-yellow-700">
                              {formatCurrency(product.price)}
                            </span>
                            {product.compare_price && product.compare_price > product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.compare_price)}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {priced ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-600"
                              title="Add to cart"
                            >
                              <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                              <span>Add to Cart</span>
                            </button>
                          ) : (
                            <Link
                              href={buildProductQuoteHref(product)}
                              className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black"
                              title={`Contact for quote on ${product.sku}`}
                            >
                              <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                              <span>Contact for quote</span>
                            </Link>
                          )}

                          <Link
                            href={productHref}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                            title="View details"
                            aria-label={`View ${semanticName} details`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {products.map((product: Product) => {
                const priced = hasProductPrice(product);
                const productHref = `/products/${toProductPathId(product.sku)}`;
                const semanticName = buildSemanticProductName(product);

                return (
                  <div
                    key={product.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <Link href={productHref} className="shrink-0">
                          <Image
                            src={getProductImageUrl(
                              (product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []),
                              getDefaultProductImageWithSku(product.sku)
                            )}
                            alt={`${product.name} - ${product.sku}`}
                            width={120}
                            height={120}
                            sizes="120px"
                            className="h-20 w-20 rounded-lg object-cover bg-gray-100"
                            loading="lazy"
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 text-base sm:text-lg font-semibold text-gray-900">
                            <Link href={productHref} className="transition-colors hover:text-yellow-700">
                              {semanticName}
                            </Link>
                          </h3>
                          <p className="mb-1.5 font-mono text-xs text-gray-500">SKU: {product.sku}</p>
                          {product.description && (
                            <p className="line-clamp-2 text-sm text-gray-600">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-3 sm:w-56 sm:items-end sm:border-t-0 sm:pt-0">
                        {priced && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold tracking-tight text-yellow-700">
                              {formatCurrency(product.price)}
                            </span>
                            {product.compare_price && product.compare_price > product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.compare_price)}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Link
                            href={productHref}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                            title="View details"
                            aria-label={`View ${semanticName} details`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>

                          {priced ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 sm:flex-initial"
                              title="Add to cart"
                            >
                              <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                              <span>Add to Cart</span>
                            </button>
                          ) : (
                            <Link
                              href={buildProductQuoteHref(product)}
                              className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black sm:flex-initial"
                              title={`Contact for quote on ${product.sku}`}
                            >
                              <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                              <span>Contact for quote</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.total_pages}
                onPageChange={handlePageChange}
                getPageHref={getPageHref}
                showJump
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search terms.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
