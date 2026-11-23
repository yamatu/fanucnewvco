'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCartIcon, EyeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import {
  formatCurrency,
  getDefaultProductImageWithSku,
  getProductImageUrl, isDefaultProductImageUrl, withDefaultImageWidth,
  hasProductPrice,
  toProductPathId,
} from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { buildQuoteProductContext, useQuoteModalStore } from '@/store/quote-modal.store';

type Product = {
  id: number;
  sku: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  price: number;
  compare_price?: number;
  brand?: string;
  category_id: number;
  is_active: boolean;
  is_featured: boolean;
  image_urls?: string[];
  images?: any[];
};

export default function ProductCardHorizontal({ product }: { product: Product }) {
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCartStore();
  const openQuoteModal = useQuoteModalStore((state) => state.openQuoteModal);

  const priced = hasProductPrice(product);
  const imageUrl = withDefaultImageWidth(getProductImageUrl(product.image_urls || product.images || [], getDefaultProductImageWithSku(product.sku, '/images/placeholder.svg', 400)), 400);
  const href = `/products/${toProductPathId(product.sku)}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!priced) return;
    setIsLoading(true);
    try {
      addItem(product as any, 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuoteModal(buildQuoteProductContext(product));
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-row">
      <Link prefetch={false} href={href} className="relative w-full shrink-0 bg-gray-100 sm:w-48">
        <div className="relative aspect-[4/3] w-full sm:h-full">
          {imageUrl && imageUrl !== '/images/placeholder.svg' ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              unoptimized={isDefaultProductImageUrl(imageUrl)}
              sizes="(max-width: 640px) 100vw, 240px"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">No Image</div>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <Link prefetch={false} href={href} className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold text-gray-900 transition-colors hover:text-yellow-700 sm:text-lg">
                {product.name}
              </h3>
            </Link>
            {product.is_featured ? (
              <span className="shrink-0 rounded-md bg-yellow-500 px-2 py-0.5 text-xs font-semibold text-black">Featured</span>
            ) : null}
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">SKU: {product.sku}</div>
          {product.short_description || product.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {product.short_description || product.description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          {priced ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-yellow-700">{formatCurrency(product.price)}</span>
              {product.compare_price && product.compare_price > product.price ? (
                <span className="text-xs text-gray-400 line-through">{formatCurrency(product.compare_price)}</span>
              ) : null}
            </div>
          ) : (
            <div />
          )}

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Link prefetch={false}
              href={href}
              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
            >
              <EyeIcon className="h-4 w-4" />
              <span>View</span>
            </Link>
            {priced ? (
              <>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-3.5 text-sm font-semibold text-black transition-colors hover:bg-yellow-600 disabled:opacity-60 sm:flex-initial"
                >
                  <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                  <span>{isLoading ? 'Adding...' : 'Add to Cart'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenQuote}
                  className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  <EnvelopeIcon className="h-4 w-4 shrink-0" />
                  <span>Quote</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenQuote}
                className="group/quote inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black sm:flex-initial"
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
}
