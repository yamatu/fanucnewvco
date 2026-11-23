'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { HomepageContent, Product } from '@/types';
import {
  ShoppingCartIcon,
  EyeIcon,
  StarIcon,
  ArrowRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '@/store/cart.store';
import { buildQuoteProductContext, useQuoteModalStore } from '@/store/quote-modal.store';
import {
  formatCurrency,
  getDefaultProductImageWithSku,
  getProductImageUrl, isDefaultProductImageUrl, withDefaultImageWidth,
  hasProductPrice,
  toProductPathId,
} from '@/lib/utils';
import { DEFAULT_FEATURED_PRODUCTS_SECTION_DATA } from '@/lib/homepage-defaults';
import { buildSemanticProductName } from '@/lib/product-seo';

type FeaturedProduct = Pick<Product, 'id' | 'name' | 'sku' | 'price' | 'stock_quantity' | 'image_urls'>
  & Partial<Pick<Product, 'compare_price' | 'description' | 'images' | 'reviews'>>
  & { features?: string[]; category?: { name: string } };

// Fallback products with test images for development (using image_urls format)
const featuredProductsFallback: FeaturedProduct[] = [
  {
    id: 1,
    name: 'FANUC A06B-6220-H006',
    sku: 'A06B-6220-H006',
    price: 1299.00,
    compare_price: 1499.00,
    stock_quantity: 15,
    image_urls: [
      'https://s2.loli.net/2025/09/01/ZxuFKAvIM3zUHj4.jpg',
      'https://s2.loli.net/2025/09/01/pxWRrVkNlO8Ugm4.jpg'
    ],
    features: ['High Performance', 'Reliable'],
    category: { name: 'PCB Boards' }
  },
  {
    id: 2,
    name: 'FANUC A20B-3300-0040',
    sku: 'A20B-3300-0040',
    price: 899.00,
    stock_quantity: 8,
    image_urls: [
      'https://s2.loli.net/2025/09/01/wMHu93Fv5egJ6pn.jpg'
    ],
    features: ['Industrial Grade', 'Long Life'],
    category: { name: 'Control Units' }
  },
  {
    id: 3,
    name: 'FANUC A06B-6240-H210',
    sku: 'A06B-6240-H210',
    price: 2199.00,
    stock_quantity: 0,
    image_urls: [
      'https://s2.loli.net/2025/09/01/3Rli1zNOEm5sA4T.jpg'
    ],
    features: ['Advanced Technology', 'High Precision'],
    category: { name: 'Servo Motors' }
  }
];

export function FeaturedProducts({ content }: { content?: HomepageContent | null }) {
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const [shouldLoadProducts, setShouldLoadProducts] = useState(false);
  const [products, setProducts] = useState<FeaturedProduct[]>(featuredProductsFallback);
  const [productsPending, setProductsPending] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const { addItem } = useCart();
  const openQuoteModal = useQuoteModalStore((state) => state.openQuoteModal);

  const headerTitle = content?.title || DEFAULT_FEATURED_PRODUCTS_SECTION_DATA.headerTitle;
  const headerDescription = content?.description || DEFAULT_FEATURED_PRODUCTS_SECTION_DATA.headerDescription;
  const ctaText = content?.button_text || DEFAULT_FEATURED_PRODUCTS_SECTION_DATA.ctaText;
  const ctaHref = content?.button_url || DEFAULT_FEATURED_PRODUCTS_SECTION_DATA.ctaHref;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadProducts(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadProducts) return;

    let cancelled = false;
    const loadProducts = async () => {
      try {
        const { ProductService } = await import('@/services/product.service');
        const featured = await ProductService.getFeaturedProducts(6);
        let nextProducts: FeaturedProduct[] = Array.isArray(featured) ? featured : [];

        if (nextProducts.length === 0) {
          const latest = await ProductService.getProducts({ page_size: 6, is_active: 'true' });
          nextProducts = Array.isArray(latest.data) ? latest.data : [];
        }

        if (!cancelled) {
          setProducts(nextProducts.length > 0 ? nextProducts : featuredProductsFallback);
        }
      } catch {
        if (!cancelled) setProducts(featuredProductsFallback);
      } finally {
        if (!cancelled) setProductsPending(false);
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [shouldLoadProducts]);

  const handleAddToCart = (product: FeaturedProduct) => {
    if (!hasProductPrice(product)) return;
    addItem(product as Product, 1);
  };

  const handleOpenQuote = (product: FeaturedProduct, semanticName: string) => {
    openQuoteModal(
      buildQuoteProductContext(product, {
        name: semanticName,
      })
    );
  };

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {headerTitle}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {headerDescription}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid min-h-[28rem] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {productsPending ? Array.from({ length: 3 }, (_, index) => (
            <div
              key={`featured-product-placeholder-${index}`}
              className="overflow-hidden rounded-xl bg-white shadow-lg"
              aria-hidden="true"
            >
              <div className="h-64 bg-gray-200" />
              <div className="space-y-4 p-6">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-6 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-10 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          )) : products.map((product) => {
            const priced = hasProductPrice(product);
            const productHref = `/products/${toProductPathId(product.sku)}`;
            const semanticName = buildSemanticProductName(product);

            return (
              <div
                key={product.id}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {/* Product Image */}
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  {(() => {
                    const src = withDefaultImageWidth(
                      getProductImageUrl(
                        (product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []),
                        getDefaultProductImageWithSku(product.sku, '/images/placeholder.svg', 400)
                      ),
                      400
                    );
                    return (
                      <Image
                        src={src}
                        alt={product.name}
                        unoptimized={isDefaultProductImageUrl(src)}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    );
                  })()}

                  {/* Overlay Actions */}
                  <div
                    className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-4 transition-opacity duration-300 ${
                      hoveredProduct === product.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Link prefetch={false}
                      href={productHref}
                      className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 transition-colors"
                      title="View details"
                      aria-label={`View ${semanticName} details`}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>

                    {priced && (product.stock_quantity ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="bg-yellow-500 text-black p-3 rounded-full hover:bg-yellow-600 transition-colors"
                        title="Add to cart"
                        aria-label={`Add ${semanticName} to cart`}
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenQuote(product, semanticName)}
                      className="bg-gray-900 text-yellow-400 p-3 rounded-full hover:bg-yellow-500 hover:text-black transition-colors"
                      title={priced ? 'Request quote' : 'Contact for quote'}
                      aria-label={`Request quote for ${product.sku}`}
                    >
                      <EnvelopeIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col space-y-2">
                    {priced && product.compare_price && product.compare_price > product.price && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold" suppressHydrationWarning>
                        Save {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%
                      </span>
                    )}

                    {priced && (product.stock_quantity ?? 0) <= 0 && (
                      <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-600 font-medium">{product.category?.name || 'FANUC'}</span>
                    {(() => {
                      const approved = (product.reviews || []).filter((r) => r.is_approved);
                      const count = approved.length;
                      if (count === 0) return null;
                      const average = approved.reduce((sum, r) => sum + r.rating, 0) / count;
                      return (
                        <div className="flex items-center space-x-1">
                          <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{average.toFixed(1)} ({count})</span>
                        </div>
                      );
                    })()}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    <Link prefetch={false} href={productHref} className="hover:text-yellow-700 transition-colors">
                      {semanticName}
                    </Link>
                  </h3>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Features */}
                  {Array.isArray(product.features) && product.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.features.slice(0, 2).map((feature) => (
                        <span
                          key={String(feature)}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer: Price (when priced) + Aligned Actions */}
                  <div className="mt-auto border-t border-gray-100 pt-4">
                    {priced && (
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold tracking-tight text-gray-900">
                            {formatCurrency(product.price)}
                          </span>
                          {product.compare_price && product.compare_price > product.price && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatCurrency(product.compare_price)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {(product.stock_quantity ?? 0) > 0 ? `In Stock: ${product.stock_quantity}` : 'Out of Stock'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {priced ? (
                          (product.stock_quantity ?? 0) > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-yellow-600"
                            >
                              <ShoppingCartIcon className="h-4 w-4 shrink-0" />
                              <span>Add to Cart</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-gray-200 px-4 text-sm font-medium text-gray-500 cursor-not-allowed"
                            >
                              Out of Stock
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenQuote(product, semanticName)}
                            className="group/quote inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-yellow-500 hover:text-black"
                          >
                            <EnvelopeIcon className="h-4 w-4 shrink-0 text-yellow-400 transition-colors group-hover/quote:text-black" />
                            <span>Contact for quote</span>
                          </button>
                        )}

                        <Link prefetch={false}
                          href={productHref}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                          title="View details"
                          aria-label={`View ${semanticName} details`}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </div>

                      {priced && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuote(product, semanticName)}
                          className="inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                          title={`Request quote for ${product.sku}`}
                        >
                          <EnvelopeIcon className="h-4 w-4 shrink-0" />
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

        {/* View All Products CTA */}
        <div className="text-center">
          <Link prefetch={false}
            href={ctaHref}
            className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            <span>{ctaText}</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProducts;
