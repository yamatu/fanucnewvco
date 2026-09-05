'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { HomepageContent, Product } from '@/types';
import {
  ShoppingCartIcon,
  EyeIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useCart } from '@/store/cart.store';
import { formatCurrency, getDefaultProductImageWithSku, getProductImageUrl, hasProductPrice, toProductPathId } from '@/lib/utils';
import { DEFAULT_FEATURED_PRODUCTS_SECTION_DATA } from '@/lib/homepage-defaults';

type FeaturedProduct = Pick<Product, 'id' | 'name' | 'sku' | 'price' | 'stock_quantity' | 'image_urls'>
  & Partial<Pick<Product, 'compare_price' | 'description' | 'images'>>
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
    addItem(product as Product, 1);
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
          )) : products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group"
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Product Image */}
              <div className="relative h-64 overflow-hidden">
                {(() => {
                  const src = getProductImageUrl((product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku));
                  const unoptimized = typeof src === 'string' && src.startsWith('/uploads/');
                  return (
                <Image
                  src={src}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  unoptimized={unoptimized}
                />
                  );
                })()}
                
                {/* Overlay Actions */}
                <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-4 transition-opacity duration-300 ${
                  hoveredProduct === product.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  <Link
                    href={`/products/${toProductPathId(product.sku)}`}
                    className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  
                  {(product.stock_quantity ?? 0) > 0 && hasProductPrice(product) && (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-yellow-500 text-black p-3 rounded-full hover:bg-yellow-600 transition-colors"
                    >
                      <ShoppingCartIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col space-y-2">
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold" suppressHydrationWarning>
                      Save {Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%
                    </span>
                  )}

                  {(product.stock_quantity ?? 0) <= 0 && (
                    <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-yellow-600 font-medium">{product.category?.name || 'FANUC'}</span>
                  <div className="flex items-center space-x-1">
                    <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">4.9 (18)</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {Array.isArray(product.features) && product.features.slice(0, 2).map((feature) => (
                    <span
                      key={String(feature)}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Price and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {hasProductPrice(product) ? formatCurrency(product.price) : 'Contact for B2B quote'}
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-lg text-gray-500 line-through">
                        {formatCurrency(product.compare_price)}
                      </span>
                    )}
                  </div>

                  <div className="ml-1 text-sm text-gray-600">
                    {(product.stock_quantity ?? 0) > 0 ? `In Stock: ${product.stock_quantity}` : 'Out of Stock'}
                  </div>

                  {(product.stock_quantity ?? 0) > 0 && hasProductPrice(product) ? (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium transition-colors duration-300"
                    >
                      Add to Cart
                    </button>
                  ) : hasProductPrice(product) ? (
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <a href={`/contact?sku=${encodeURIComponent(product.sku)}`} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800">B2B Contact</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Products CTA */}
        <div className="text-center">
          <Link
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

