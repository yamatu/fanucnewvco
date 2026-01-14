'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductService, CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import ProductCard from '@/components/products/ProductCard';
import ProductFilters from '@/components/products/ProductFilters';
import ProductSort from '@/components/products/ProductSort';
import Pagination from '@/components/common/Pagination';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface CategoryProductsClientProps {
  category: any;
  initialSearchParams: { [key: string]: string | string[] | undefined };
}

export default function CategoryProductsClient({ 
  category, 
  initialSearchParams 
}: CategoryProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 12,
    category_id: category.id,
    sort_by: 'created_at',
    sort_order: 'desc',
    min_price: '',
    max_price: '',
    search: '',
    is_active: 'true'
  });

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters = {
      page: parseInt(searchParams.get('page') || '1'),
      page_size: parseInt(searchParams.get('page_size') || '12'),
      category_id: category.id,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc',
      min_price: searchParams.get('min_price') || '',
      max_price: searchParams.get('max_price') || '',
      search: searchParams.get('search') || '',
      is_active: 'true'
    };
    setFilters(urlFilters);
  }, [searchParams, category.id]);

  // Fetch products
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => ProductService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all categories for filters
  const { data: categoriesResponse } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => CategoryService.getCategories(),
  });

  const products = productsResponse?.data || [];
  const pagination = productsResponse ? {
    page: productsResponse.page,
    page_size: productsResponse.page_size,
    total: productsResponse.total,
    total_pages: productsResponse.total_pages
  } : null;
  const categories = categoriesResponse || [];



  // Update URL when filters change
  const updateURL = (newFilters: typeof filters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'category_id' && key !== 'is_active') {
        if (key === 'page' && value === 1) return; // Don't include page=1 in URL
        params.set(key, value.toString());
      }
    });

    const newURL = `/categories/${category.slug}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newURL, { scroll: false });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    const updatedFilters = { 
      ...filters, 
      ...newFilters, 
      page: 1 // Reset to first page when filters change
    };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  };

  // Handle sort change
  const handleSortChange = (sortBy: string, sortOrder: string) => {
    handleFilterChange({ sort_by: sortBy, sort_order: sortOrder });
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      page: 1,
      page_size: 12,
      category_id: category.id,
      sort_by: 'created_at',
      sort_order: 'desc',
      min_price: '',
      max_price: '',
      search: '',
      is_active: 'true'
    };
    setFilters(clearedFilters);
    router.push(`/categories/${category.slug}`, { scroll: false });
  };

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
      {/* Filters and Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Filters
            {(filters.min_price || filters.max_price || filters.search) && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Active
              </span>
            )}
          </button>
          
          {(filters.min_price || filters.max_price || filters.search) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ProductSort
            sortBy={filters.sort_by}
            sortOrder={filters.sort_order}
            onSortChange={handleSortChange}
          />
          
          {pagination && (
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.page_size) + 1}-{Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} products
            </div>
          )}
        </div>
      </div>



      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <ProductFilters
            filters={filters}
            categories={categories}
            onFilterChange={handleFilterChange}
            showCategoryFilter={false} // Hide category filter since we're already in a category
          />
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.total_pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FunnelIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or search terms.
          </p>
          {(filters.min_price || filters.max_price || filters.search) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
