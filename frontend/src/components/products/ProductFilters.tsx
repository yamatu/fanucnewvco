'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FilterProps {
  filters: {
    search: string;
    min_price: string;
    max_price: string;
    category_id?: number;
    [key: string]: any;
  };
  categories?: any[];
  onFilterChange: (filters: Partial<FilterProps['filters']>) => void;
  showCategoryFilter?: boolean;
}

export default function ProductFilters({
  filters,
  categories = [],
  onFilterChange,
  showCategoryFilter = true
}: FilterProps) {
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    min_price: filters.min_price || '',
    max_price: filters.max_price || '',
    category_id: filters.category_id || ''
  });

  const handleInputChange = (field: string, value: string) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    
    // Debounce search input
    if (field === 'search') {
      const timeoutId = setTimeout(() => {
        onFilterChange({ [field]: value });
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      onFilterChange({ [field]: value });
    }
  };

  const handlePriceChange = (field: 'min_price' | 'max_price', value: string) => {
    // Only allow numbers and decimal points
    const numericValue = value.replace(/[^0-9.]/g, '');
    handleInputChange(field, numericValue);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      min_price: '',
      max_price: '',
      category_id: showCategoryFilter ? '' : filters.category_id
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear All
        </button>
      </div>

      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Search Products
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="search"
            value={localFilters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Search by name, SKU, or description..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>

      {/* Category Filter */}
      {showCategoryFilter && categories.length > 0 && (
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={localFilters.category_id}
            onChange={(e) => handleInputChange('category_id', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min_price" className="block text-xs text-gray-500 mb-1">
              Min Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                $
              </span>
              <input
                type="text"
                id="min_price"
                value={localFilters.min_price}
                onChange={(e) => handlePriceChange('min_price', e.target.value)}
                placeholder="0"
                className="block w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="max_price" className="block text-xs text-gray-500 mb-1">
              Max Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                $
              </span>
              <input
                type="text"
                id="max_price"
                value={localFilters.max_price}
                onChange={(e) => handlePriceChange('max_price', e.target.value)}
                placeholder="10000"
                className="block w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter price range to filter products
        </p>
      </div>

      {/* Active Filters Summary */}
      {(localFilters.search || localFilters.min_price || localFilters.max_price || (showCategoryFilter && localFilters.category_id)) && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {localFilters.search && (
              <div>Search: "{localFilters.search}"</div>
            )}
            {showCategoryFilter && localFilters.category_id && (
              <div>
                Category: {categories.find(c => c.id.toString() === localFilters.category_id.toString())?.name || 'Unknown'}
              </div>
            )}
            {(localFilters.min_price || localFilters.max_price) && (
              <div>
                Price: ${localFilters.min_price || '0'} - ${localFilters.max_price || '∞'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
