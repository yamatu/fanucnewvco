'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCartIcon,
  HeartIcon,
  EyeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import {
  formatCurrency,
  getDefaultProductImageWithSku,
  getProductImageUrl, isDefaultProductImageUrl, withDefaultImageWidth,
  hasProductPrice,
  toProductPathId,
} from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { buildQuoteProductContext, useQuoteModalStore } from '@/store/quote-modal.store';
import type { Product } from '@/types';

/* Product shape is shared with cart and API services. */

interface ProductCardProps {
  product: Product;
  showFavorite?: boolean;
  className?: string;
}

export default function ProductCard({
  product,
  showFavorite = true,
  className = '',
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCartStore();
  const openQuoteModal = useQuoteModalStore((state) => state.openQuoteModal);

  const priced = hasProductPrice(product);
  const productHref = `/products/${toProductPathId(product.sku)}`;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!priced) return;

    setIsLoading(true);
    try {
      addItem(product, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuoteModal(buildQuoteProductContext(product));
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const imageUrl = withDefaultImageWidth(getProductImageUrl(product.image_urls || [], getDefaultProductImageWithSku(product.sku, '/images/placeholder.svg', 400)), 400);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      <div className="relative">
        {/* Product Image */}
        <Link prefetch={false} href={productHref} className="block">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
            {imageUrl && imageUrl !== '/images/placeholder.svg' ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                unoptimized={isDefaultProductImageUrl(imageUrl)}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <span className="text-sm text-gray-400">No Image</span>
              </div>
            )}
          </div>
        </Link>

        {/* Favorite Button */}
        {showFavorite && (
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/95 p-2 shadow-sm transition-shadow hover:shadow-md"
          >
            {isFavorite ? (
              <HeartIconSolid className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
            )}
          </button>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {product.is_featured && (
            <span className="rounded-md bg-yellow-500 px-2 py-0.5 text-xs font-semibold text-black">
              Featured
            </span>
          )}
          {priced && product.compare_price && product.compare_price > product.price && (
            <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              Sale
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-4">
        <Link prefetch={false} href={productHref}>
          <h3 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-gray-900 transition-colors hover:text-yellow-700">
            {product.name}
          </h3>
        </Link>

        <p className="mb-1.5 truncate font-mono text-xs text-gray-500">
          SKU: {product.sku}
        </p>

        {product.brand && (
          <p className="mb-2 text-xs text-gray-500">
            Brand: {product.brand}
          </p>
        )}

        {product.short_description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {product.short_description}
          </p>
        )}

        {/* Footer: Price (when priced) + Aligned Actions */}
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
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                  <span>{isLoading ? 'Adding...' : 'Add to Cart'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenQuote}
                  className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black"
                >
                  <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                  <span>Contact for quote</span>
                </button>
              )}

              <Link prefetch={false}
                href={productHref}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                title="View details"
                aria-label={`View ${product.name} details`}
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
            </div>

            {priced && (
              <button
                type="button"
                onClick={handleOpenQuote}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
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
}
