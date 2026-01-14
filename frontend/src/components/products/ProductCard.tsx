'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCartIcon,
  HeartIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { formatCurrency, getProductImageUrl } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';

interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  price: number;
  compare_price?: number;
  brand?: string;
  model?: string;
  part_number?: string;
  category_id: number;
  is_active: boolean;
  is_featured: boolean;
  images?: any[];
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

interface ProductCardProps {
  product: Product;
  showFavorite?: boolean;
  className?: string;
}

export default function ProductCard({ 
  product, 
  showFavorite = true, 
  className = '' 
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCartStore();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    try {
      addItem(product, 1);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // You could add favorite functionality here
  };

  // Use image_urls array directly from API response
  const imageUrl = getProductImageUrl(product.image_urls || []);

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <div className="relative">
        {/* Product Image */}
        <Link href={`/products/${encodeURIComponent(product.sku)}`} className="block">
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
            {imageUrl && imageUrl !== '/images/placeholder.svg' ? (
              <Image
                src={imageUrl}
                alt={product.name}
                width={300}
                height={300}
                className="h-48 w-full object-cover object-center group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
            )}
          </div>
        </Link>

        {/* Favorite Button */}
        {showFavorite && (
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow z-10"
          >
            {isFavorite ? (
              <HeartIconSolid className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
            )}
          </button>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium z-10">
            Featured
          </div>
        )}

        {/* Compare Price Badge */}
        {product.compare_price && product.compare_price > product.price && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium z-10">
            Sale
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${encodeURIComponent(product.sku)}`}>
          <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2 hover:text-yellow-600 transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-gray-500 mb-2">
          SKU: {product.sku}
        </p>

        {product.brand && (
          <p className="text-sm text-gray-500 mb-2">
            Brand: {product.brand}
          </p>
        )}

        {product.short_description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {product.short_description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-yellow-600">
              {formatCurrency(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.compare_price)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/products/${encodeURIComponent(product.sku)}`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View Details
          </Link>

          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ShoppingCartIcon className="h-4 w-4 mr-1" />
            {isLoading ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

