'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ShoppingCartIcon,
  HeartIcon,
  EyeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Layout from '@/components/layout/Layout';
import SmartPagination from '@/components/ui/SmartPagination';
import CategoryFilterTree from '@/components/categories/CategoryFilterTree';
import {
  formatCurrency,
  getDefaultProductImageWithSku,
  getProductImageUrl, isDefaultProductImageUrl, withDefaultImageWidth,
  hasProductPrice,
  toProductPathId,
} from '@/lib/utils';
import { buildSemanticProductName } from '@/lib/product-seo';
import { useCartStore } from '@/store/cart.store';
import { buildQuoteProductContext, useQuoteModalStore } from '@/store/quote-modal.store';

interface ProductsPageClientProps {
  initialData: {
    products: any[];
    totalPages: number;
    total: number;
    categories: any[];
    totalCategoryRoots?: number;
    currentPage: number;
    selectedCategory: string;
    searchQuery: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ProductsPageClient({ initialData, searchParams }: ProductsPageClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState(initialData.searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialData.selectedCategory);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [currentPage, setCurrentPage] = useState(initialData.currentPage);
  const [favorites, setFavorites] = useState<number[]>([]);

  const { addItem } = useCartStore();
  const openQuoteModal = useQuoteModalStore((state) => state.openQuoteModal);

  useEffect(() => {
    setCurrentPage(initialData.currentPage);
  }, [initialData.currentPage]);

  // Client-side sorting only (filtering is done server-side)
  const sortedProducts = [...initialData.products].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'price_asc': {
        const aPriced = hasProductPrice(a);
        const bPriced = hasProductPrice(b);
        if (aPriced && !bPriced) return -1;
        if (!aPriced && bPriced) return 1;
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }
      case 'price_desc': {
        const aPriced = hasProductPrice(a);
        const bPriced = hasProductPrice(b);
        if (aPriced && !bPriced) return -1;
        if (!aPriced && bPriced) return 1;
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      case 'created_at':
        return new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime();
      case 'stock_desc':
        return (b.stock_quantity || 0) - (a.stock_quantity || 0);
      case 'featured':
        // Featured products first, then by name
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return a.name.localeCompare(b.name);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Use server-side pagination data
  const totalPages = initialData.totalPages;
  const totalProducts = initialData.total;

  const handleAddToCart = (product: any) => {
    if (!hasProductPrice(product)) return;
    addItem(product, 1);
  };

  const handleOpenQuote = (product: any, semanticName: string) => {
    openQuoteModal(
      buildQuoteProductContext(product, {
        name: semanticName,
      })
    );
  };

  const toggleFavorite = (productId: number) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('name');
    setCurrentPage(1);

    // Update URL
    router.push('/products');
  };

  // Handle search with debounce and URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) {
        params.set('category_id', selectedCategory);
        params.set('include_descendants', 'true');
      }
      if (currentPage > 1) {
        params.set('page', String(currentPage));
      }

      const newUrl = `/products${params.toString() ? '?' + params.toString() : ''}`;
      if (newUrl !== window.location.pathname + window.location.search) {
        router.push(newUrl, { scroll: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, currentPage, router]);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    try {
      window.sessionStorage.setItem('products-scroll-y', String(window.scrollY || 0));
    } catch {
      // ignore
    }
    setSelectedCategory(categoryId);
  };

  // Build crawlable href for pagination links
  const getPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) {
      params.set('category_id', selectedCategory);
      params.set('include_descendants', 'true');
    }
    if (page > 1) params.set('page', page.toString());
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

  // Handle pagination with URL update
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    router.push(getPageHref(page), { scroll: false });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">FANUC & Industrial Automation Parts</h1>
              <p className="text-xl md:text-2xl text-yellow-900 max-w-4xl mx-auto mb-8">
                With more than 15 years of experience, our sales and technical teams coordinate
                part-number checks, sourcing, testing, repair evaluation and international
                shipping as one service.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-yellow-700 bg-opacity-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">100K+</div>
                  <div className="text-yellow-900">Items in Stock</div>
                </div>
                <div className="bg-yellow-700 bg-opacity-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">50-100</div>
                  <div className="text-yellow-900">Daily Parcels</div>
                </div>
                <div className="bg-yellow-700 bg-opacity-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">Top 3</div>
                  <div className="text-yellow-900">FANUC Supplier in China</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <div className="lg:w-64 space-y-6">
              {/* Search */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Search</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Search by name, SKU, model, description..."
                  />
                </div>
                {searchQuery && (
                  <div className="mt-2 text-sm text-gray-500">
                    Searching for &ldquo;{searchQuery}&rdquo;...
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
                <CategoryFilterTree
                  tree={initialData.categories as any}
                  selectedCategoryId={selectedCategory ? Number(selectedCategory) : null}
                  onSelectCategory={(id) => handleCategoryChange(id ? String(id) : '')}
                  totalRootCount={initialData.totalCategoryRoots}
                  storageKey="products-category-open-ids"
                  allLabel="All Products"
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Enhanced Toolbar */}
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col space-y-4">
                  {/* Top row - Results info and view controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-700">
                        Showing {sortedProducts.length} of {totalProducts} products
                        {(searchQuery || selectedCategory) && (
                          <span className="text-gray-500"> (filtered)</span>
                        )}
                      </span>
                      {searchQuery && (
                        <span className="text-sm text-gray-500">
                          for &ldquo;{searchQuery}&rdquo;
                        </span>
                      )}
                    </div>

                    {/* View Mode */}
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-2 ${viewMode === 'grid' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400'}`}
                        title="Grid view"
                        aria-label="Grid view"
                      >
                        <Squares2X2Icon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-2 ${viewMode === 'list' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400'}`}
                        title="List view"
                        aria-label="List view"
                      >
                        <ListBulletIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom row - Sort and page info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      {/* Sort */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                      >
                        <option value="name">Sort by Name (A-Z)</option>
                        <option value="name_desc">Sort by Name (Z-A)</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="created_at">Newest First</option>
                        <option value="stock_desc">Stock: High to Low</option>
                        <option value="featured">Featured First</option>
                      </select>
                    </div>

                    {/* Clear filters and page info */}
                    <div className="flex items-center space-x-4">
                      {(searchQuery || selectedCategory) && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-sm text-yellow-600 hover:text-yellow-500 font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sortedProducts.map((product: any) => {
                    const priced = hasProductPrice(product);
                    const productHref = `/products/${toProductPathId(product.sku)}`;
                    const semanticName = buildSemanticProductName(product);

                    return (
                      <div
                        key={product.id}
                        className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="relative">
                          <Link prefetch={false} href={productHref} className="block w-full overflow-hidden bg-gray-100">
                            <Image
                              src={withDefaultImageWidth(getProductImageUrl((product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku, '/images/placeholder.svg', 400)), 400)}
                        unoptimized={isDefaultProductImageUrl(getProductImageUrl((product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku)))}
                              alt={`${product.name} - ${product.sku} | Professional ${product.category?.name || 'Industrial'} Part | In Stock at Vcocnc`}
                              width={300}
                              height={300}
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="h-48 w-full object-cover object-center"
                              priority={false}
                              loading="lazy"
                            />
                          </Link>

                          <button
                            type="button"
                            onClick={() => toggleFavorite(product.id)}
                            aria-label={favorites.includes(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                            className="absolute top-2 right-2 rounded-full bg-white/95 p-2 shadow-sm transition-shadow hover:shadow-md"
                          >
                            {favorites.includes(product.id) ? (
                              <HeartIconSolid className="h-5 w-5 text-red-500" />
                            ) : (
                              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
                            )}
                          </button>
                        </div>

                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-gray-900">
                            <Link prefetch={false} href={productHref} className="transition-colors hover:text-yellow-700">
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

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {priced ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(product)}
                                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-600"
                                    title={`Add ${product.name} to cart`}
                                  >
                                    <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                                    <span>Add to Cart</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuote(product, semanticName)}
                                    className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black"
                                    title={`Contact for quote on ${product.sku}`}
                                  >
                                    <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                                    <span>Contact for quote</span>
                                  </button>
                                )}

                                <Link prefetch={false}
                                  href={productHref}
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                                  title={`View ${product.name} details`}
                                  aria-label={`View ${semanticName} details`}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </div>

                              {priced && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuote(product, semanticName)}
                                  className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                                  title={`Request quote for ${product.sku}`}
                                >
                                  <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span>Request Quote</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedProducts.map((product: any) => {
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
                            <Link prefetch={false} href={productHref} className="shrink-0">
                              <Image
                                src={withDefaultImageWidth(getProductImageUrl((product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku, '/images/placeholder.svg', 400)), 400)}
                        unoptimized={isDefaultProductImageUrl(getProductImageUrl((product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku)))}
                                alt={`${product.name} - ${product.sku} | Professional ${product.category?.name || 'Industrial'} Part | In Stock at Vcocnc`}
                                width={120}
                                height={120}
                                sizes="120px"
                                className="h-20 w-20 rounded-lg object-cover bg-gray-100"
                                loading="lazy"
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <h3 className="mb-1 text-base sm:text-lg font-semibold text-gray-900">
                                <Link prefetch={false} href={productHref} className="transition-colors hover:text-yellow-700">
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

                          <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-3 sm:w-64 sm:items-end sm:border-t-0 sm:pt-0">
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
                              <button
                                type="button"
                                onClick={() => toggleFavorite(product.id)}
                                aria-label={favorites.includes(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-300 hover:text-red-500"
                              >
                                {favorites.includes(product.id) ? (
                                  <HeartIconSolid className="h-4 w-4 text-red-500" />
                                ) : (
                                  <HeartIcon className="h-4 w-4" />
                                )}
                              </button>

                              <Link prefetch={false}
                                href={productHref}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                                title={`View ${product.name} details`}
                                aria-label={`View ${semanticName} details`}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Link>

                              {priced ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(product)}
                                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-3.5 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 sm:flex-initial"
                                    title={`Add ${product.name} to cart`}
                                  >
                                    <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                                    <span>Add to Cart</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuote(product, semanticName)}
                                    className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                                    title={`Request quote for ${product.sku}`}
                                  >
                                    <EnvelopeIcon className="h-4 w-4 shrink-0" />
                                    <span>Quote</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuote(product, semanticName)}
                                  className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black sm:flex-initial"
                                  title={`Contact for quote on ${product.sku}`}
                                >
                                  <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                                  <span>Contact for quote</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Smart Pagination */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <SmartPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    getPageHref={getPageHref}
                  />
                </div>
              )}

              {/* No Products Found */}
              {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <MagnifyingGlassIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    Try adjusting your search criteria or browse all categories.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
