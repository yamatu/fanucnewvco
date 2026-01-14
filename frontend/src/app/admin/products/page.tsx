'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import Pagination from '@/components/common/Pagination';
import { ProductService, CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { formatCurrency, getProductImageUrl } from '@/lib/utils';

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Dynamic page size
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllResults, setSelectAllResults] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Scroll position management
  const saveScrollPosition = () => {
    const scrollY = window.scrollY;
    sessionStorage.setItem('adminProductsScrollY', scrollY.toString());
  };

  const restoreScrollPosition = () => {
    const savedScrollY = sessionStorage.getItem('adminProductsScrollY');
    if (savedScrollY) {
      // Use setTimeout to ensure DOM is rendered before scrolling
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScrollY, 10),
          behavior: 'auto' // Use 'auto' for immediate scroll without animation
        });
        // Clear the saved position after restoring
        sessionStorage.removeItem('adminProductsScrollY');
      }, 100);
    }
  };

  // Save scroll position when navigating to edit page
  const handleEditClick = (productId: number) => {
    saveScrollPosition();
    // The actual navigation will be handled by the Link component
  };

  // Function to update URL with current state
  const updateURL = (updates: Partial<{
    search: string;
    category: string;
    status: string;
    page: number;
    pageSize: number;
  }>) => {
    const params = new URLSearchParams();

    const finalSearch = updates.search !== undefined ? updates.search : searchQuery;
    const finalCategory = updates.category !== undefined ? updates.category : selectedCategory;
    const finalStatus = updates.status !== undefined ? updates.status : statusFilter;
    const finalPage = updates.page !== undefined ? updates.page : currentPage;
    const finalPageSize = updates.pageSize !== undefined ? updates.pageSize : pageSize;

    if (finalSearch) params.set('search', finalSearch);
    if (finalCategory) params.set('category', finalCategory);
    if (finalStatus && finalStatus !== 'all') params.set('status', finalStatus);
    if (finalPage && finalPage > 1) params.set('page', String(finalPage));
    if (finalPageSize !== 20) params.set('pageSize', String(finalPageSize));

    const qs = params.toString();
    const newUrl = `/admin/products${qs ? `?${qs}` : ''}`;

    // Use replace to avoid adding to browser history for every filter change
    router.replace(newUrl, { scroll: false });
  };

  // Build a return URL preserving current list position and filters
  const buildListUrl = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (currentPage && currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 20) params.set('pageSize', String(pageSize));
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ''}`;
  };

  // Initialize state from URL query (so returning from edit preserves position)
  useEffect(() => {
    if (!searchParams) return;
    const s = searchParams.get('search') || '';
    const c = searchParams.get('category') || '';
    const st = (searchParams.get('status') as 'all' | 'active' | 'inactive' | 'featured') || 'all';
    const p = parseInt(searchParams.get('page') || '1', 10);
    const ps = parseInt(searchParams.get('pageSize') || '20', 10);

    setSearchQuery(s);
    setSelectedCategory(c);
    setStatusFilter(st);
    setCurrentPage(Number.isFinite(p) && p > 0 ? p : 1);
    setPageSize([20, 50, 100, 200, 500].includes(ps) ? ps : 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch products from API with pagination
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list({
      search: searchQuery,
      category: selectedCategory,
      status: statusFilter,
      page: currentPage,
      pageSize
    }),
    queryFn: () => ProductService.getAdminProducts({
      search: searchQuery,
      category_id: selectedCategory || undefined,
      is_active: statusFilter === 'active' ? 'true' : statusFilter === 'inactive' ? 'false' : undefined,
      is_featured: statusFilter === 'featured' ? 'true' : undefined,
      page: currentPage,
      page_size: pageSize
    }),
  });

  const products = productsData?.data || []; // Use empty array if no data
  const totalPages = productsData?.total_pages || 1;
  const totalProducts = productsData?.total || 0;

  // Restore scroll position after data is loaded and page is rendered
  useEffect(() => {
    if (!isLoading && productsData) {
      restoreScrollPosition();
    }
  }, [isLoading, productsData]);

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => CategoryService.getCategories(),
  });

  const categories = categoriesData?.data || [];

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (payload: { ids?: number[]; skus?: string[]; is_active?: boolean; is_featured?: boolean }) =>
      ProductService.bulkUpdateProducts(payload),
    onSuccess: () => {
      toast.success('Products updated successfully');
      setSelectedIds([]);
      setSelectAllResults(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Bulk update failed');
    },
  });

  // Auto SEO + Category for selected products
  const autoSeoCategoryMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results: Array<{ id: number; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
          await ProductService.autoImportSEO(id, {
            source_base_url: 'https://fanucworld.com',
            apply: true,
            auto_category: true,
          });
          results.push({ id, ok: true });
        } catch (e: any) {
          results.push({ id, ok: false, error: e?.message || 'failed' });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const okCount = (results || []).filter((r) => r.ok).length;
      const total = results?.length || 0;
      if (total > 0) {
        toast.success(`Auto SEO + Category finished: ${okCount}/${total} updated`);
      } else {
        toast.success('Auto SEO + Category finished');
      }
      setSelectedIds([]);
      setSelectAllResults(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Auto SEO + Category failed');
    },
  });

  const handleAutoCategorizeSelected = () => {
    if (selectAllResults) {
      toast.error('For now, auto-categorize supports only selected items on this page.');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least one product');
      return;
    }
    const proceed = window.confirm(
      `Auto SEO + Category will fetch external data and update categories for ${selectedIds.length} product(s). Continue?`
    );
    if (!proceed) return;
    toast.loading('Running auto SEO + category...', { id: 'auto-seo-cat' });
    autoSeoCategoryMutation.mutate(selectedIds, {
      onSettled: () => toast.dismiss('auto-seo-cat'),
    });
  };

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => ProductService.deleteProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const handleDelete = (product: any) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  // Reset page to 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    updateURL({ search: value, page: 1 });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
    updateURL({ category: value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    updateURL({ status: value, page: 1 });
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
    setSelectedIds([]);
    setSelectAllResults(false);
    updateURL({ pageSize: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setStatusFilter('all');
    setCurrentPage(1);
    updateURL({ search: '', category: '', status: 'all', page: 1 });
  };

  const toggleSelectAllOnPage = (checked: boolean, current: any[]) => {
    setSelectAllResults(false);
    if (checked) setSelectedIds(current.map((p: any) => p.id));
    else setSelectedIds([]);
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const bulkSetActive = (value: boolean) => {
    if (!selectAllResults && selectedIds.length === 0) { toast.error('Select at least one product'); return; }
    if (selectAllResults) {
      bulkUpdateMutation.mutate({
        is_active: value,
        batch_size: 500,
        search: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        status: (statusFilter === 'all' || statusFilter === 'featured') ? 'all' : (statusFilter as 'active' | 'inactive'),
        featured: (statusFilter === 'featured') ? 'true' : undefined,
      });
    } else {
      bulkUpdateMutation.mutate({ ids: selectedIds, is_active: value });
    }
  };

  const bulkSetFeatured = (value: boolean) => {
    if (!selectAllResults && selectedIds.length === 0) { toast.error('Select at least one product'); return; }
    if (selectAllResults) {
      bulkUpdateMutation.mutate({
        is_featured: value,
        batch_size: 500,
        search: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        status: (statusFilter === 'all' || statusFilter === 'featured') ? 'all' : (statusFilter as 'active' | 'inactive'),
        featured: (statusFilter === 'featured') ? 'true' : undefined,
      });
    } else {
      bulkUpdateMutation.mutate({ ids: selectedIds, is_featured: value });
    }
  };

  // Use products directly from API (already filtered and paginated)
  const filteredProducts = products;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your FANUC product inventory
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>

        {/* Bulk actions and Page Size Selector */}
        <div className="bg-white shadow rounded-lg border border-gray-200">
          {/* Top Row - Page Size and Bulk Actions Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 font-medium">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={200}>200 per page</option>
                  <option value={500}>500 per page</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Total: {totalProducts} products
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {!selectAllResults ? (
                <>
                  <span className="text-gray-600 font-medium">
                    Selected on page: <span className="text-blue-600">{selectedIds.length}</span>
                  </span>
                  {filteredProducts.length > 0 && totalProducts > filteredProducts.length && (
                    <button
                      onClick={() => { setSelectAllResults(true); }}
                      className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors font-medium"
                    >
                      Select all {totalProducts} results
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-md">
                    All {totalProducts} results selected
                  </span>
                  <button
                    onClick={() => { setSelectAllResults(false); setSelectedIds([]); }}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-medium"
                  >
                    Clear selection
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row - Bulk Action Buttons */}
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 font-medium mr-2">Bulk actions:</span>

              <button
                onClick={() => bulkSetActive(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bulkUpdateMutation.isPending || (!selectAllResults && selectedIds.length === 0)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Set Active
              </button>

              <button
                onClick={() => bulkSetActive(false)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bulkUpdateMutation.isPending || (!selectAllResults && selectedIds.length === 0)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Set Inactive
              </button>

              <button
                onClick={() => bulkSetFeatured(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bulkUpdateMutation.isPending || (!selectAllResults && selectedIds.length === 0)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Mark Featured
              </button>

              <button
                onClick={() => bulkSetFeatured(false)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bulkUpdateMutation.isPending || (!selectAllResults && selectedIds.length === 0)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                Unmark Featured
              </button>

              <button
                onClick={handleAutoCategorizeSelected}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={autoSeoCategoryMutation.isPending || (!selectAllResults && selectedIds.length === 0)}
                title="Fetch SEO from external source and auto-assign category"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                Auto SEO + Category
              </button>

              {(selectedIds.length > 0 || selectAllResults) && (
                <div className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  {selectAllResults ? `${totalProducts} products selected` : `${selectedIds.length} products selected`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search products..."
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id.toString()}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Products ({isLoading ? '...' : filteredProducts.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-600">Failed to load products. Please try again.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" onChange={(e)=>toggleSelectAllOnPage(e.target.checked, filteredProducts)} checked={!selectAllResults && selectedIds.length>0 && selectedIds.length===filteredProducts.length} />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedIds.includes(product.id)}
                        onChange={(e)=>toggleSelectOne(product.id, e.target.checked)}
                        disabled={selectAllResults}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0 ? (
                            <Image
                              src={getProductImageUrl(product.image_urls)}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.stock_quantity > 10 ? 'text-green-600' :
                        product.stock_quantity > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.stock_quantity} units
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {product.is_featured && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}/edit?returnTo=${encodeURIComponent(buildListUrl())}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleEditClick(product.id)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deleteProductMutation.isPending}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new product.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                showFirstLast={true}
                showPageNumbers={true}
                maxVisiblePages={5}
              />
            </div>
          )}

          {/* Products count info */}
          {!isLoading && !error && totalProducts > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} products
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-10">Loading...</div>}>
      <AdminProductsContent />
    </Suspense>
  );
}
