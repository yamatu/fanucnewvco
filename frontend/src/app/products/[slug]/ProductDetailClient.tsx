'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  TagIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Layout from '@/components/layout/Layout';
import ProductImageViewer from '@/components/product/ProductImageViewer';
import ProductSEO from '@/components/seo/ProductSEO';
import { ProductService, CategoryService, ShippingRateService } from '@/services';
import type { ShippingRatePublic, ShippingQuote } from '@/services/shipping-rate.service';
import { queryKeys } from '@/lib/react-query';
import { formatCurrency, getDefaultProductImageWithSku, getProductImageUrl, getProductImageUrlByIndex, toProductPathId } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';

interface ProductDetailClientProps {
  productSku: string;
  initialProduct?: any;
}

export default function ProductDetailClient({ productSku, initialProduct }: ProductDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const [shippingCountry, setShippingCountry] = useState('');
  const [shippingCountries, setShippingCountries] = useState<ShippingRatePublic[]>([]);
  const [freeShippingCodes, setFreeShippingCodes] = useState<Set<string>>(new Set());
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  const { addItem } = useCartStore();

  // Fetch product details by SKU
  const { data: product, isLoading, error } = useQuery({
    queryKey: queryKeys.products.detailBySku(productSku),
    queryFn: () => ProductService.getProductBySku(productSku),
    enabled: !!productSku && !initialProduct,
    initialData: initialProduct,
    staleTime: 120000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });

  // Fetch product category details
  const { data: category } = useQuery({
    queryKey: ['category', product?.category_id],
    queryFn: () => CategoryService.getCategory(product!.category_id),
    enabled: !!product?.category_id,
    staleTime: 300000,
  });

  // Fetch category breadcrumb
  const { data: categoryBreadcrumb } = useQuery({
    queryKey: ['categoryBreadcrumb', product?.category_id],
    queryFn: () => CategoryService.getCategoryBreadcrumb(product!.category_id),
    enabled: !!product?.category_id,
    staleTime: 300000,
  });

  // Fetch related products
  const { data: relatedProducts = { data: [] } as any } = useQuery({
    queryKey: queryKeys.products.list({ category: product?.category_id }),
    queryFn: () => ProductService.getProducts({
      category_id: product?.category_id,
      page_size: 4
    }),
    enabled: !!product?.category_id,
  });

  // Fetch all categories for internal linking
  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => CategoryService.getCategories(),
    staleTime: 600000,
  });

  const resolveCategoryHref = () => {
    const tree: any[] = Array.isArray(allCategories) ? (allCategories as any) : [];
    const targetId = product?.category_id;
    if (!targetId) return null;
    const findById = (nodes: any[]): any => {
      for (const n of nodes) {
        if (Number(n.id) === Number(targetId)) return n;
        if (Array.isArray(n.children) && n.children.length > 0) {
          const hit = findById(n.children);
          if (hit) return hit;
        }
      }
      return null;
    };
    const node = findById(tree);
    if (node?.path) return `/${node.path}`;
    if (product?.category?.slug) return `/${product.category.slug}`;
    return null;
  };

  // Fetch shipping countries + free shipping list on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [countries, freeCountries] = await Promise.all([
          ShippingRateService.publicCountries(),
          ShippingRateService.publicFreeShippingCountries(),
        ]);
        if (cancelled) return;
        setShippingCountries(countries);
        setFreeShippingCodes(new Set(freeCountries.map(c => c.country_code)));
      } catch {
        // silently fail — calculator just won't show countries
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-calculate shipping when country changes
  useEffect(() => {
    if (!shippingCountry || !product) return;
    if (freeShippingCodes.has(shippingCountry)) {
      setShippingQuote(null);
      setShippingError('');
      return;
    }
    let cancelled = false;
    setShippingLoading(true);
    setShippingError('');
    (async () => {
      try {
        const weight = product.weight || 0.5;
        const quote = await ShippingRateService.quote(shippingCountry, weight);
        if (!cancelled) setShippingQuote(quote);
      } catch {
        if (!cancelled) setShippingError('Unable to calculate shipping for this destination');
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shippingCountry, product, freeShippingCodes]);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
    }
  };

  const handleImageIndexChange = (index: number) => {
    setSelectedImageIndex(index);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </Layout>
    );
  }

  // Show Not Found when we have no product
  if (!product) {
    if (error || !isLoading) {
      return (
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
              <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
              <Link
                href="/products"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Products
              </Link>
            </div>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </Layout>
    );
  }

  // Below is identical rendering from original client component
  // ... to keep patch minimal, we re-use exactly the same JSX

  // Normalize image arrays
  const rawImages: any = (product as any).image_urls && (product as any).image_urls.length > 0
    ? (product as any).image_urls
    : (product as any).images || [];

  const images: any[] = Array.isArray(rawImages)
    ? rawImages
    : (typeof rawImages === 'string'
        ? ((): any[] => {
            try {
              const parsed = JSON.parse(rawImages);
              if (Array.isArray(parsed)) return parsed;
            } catch {}
            return rawImages ? [rawImages] : [];
          })()
        : (rawImages && typeof rawImages === 'object'
            ? [rawImages]
            : []));
  const currentImage = images.length > 0
    ? getProductImageUrlByIndex(images, selectedImageIndex)
    : getDefaultProductImageWithSku(product.sku, '/images/default-product.jpg');

  const categoryName = product.category?.name || 'Part';
  const brandName = product.brand || '';
  const computedHeading = product.name || `${brandName} ${product.sku || ''} ${categoryName}`.trim();

  const getFallbackDescription = () => {
    const sku = product.sku || '';
    const price = product.price ? formatCurrency(product.price) : '';
    const stockText = product.stock_quantity && product.stock_quantity > 0 ? 'In stock and ready to ship.' : 'Available for order with fast handling.';
    const templates: Record<string, string> = {
      'Power Supply': `${brandName ? brandName + ' ' : ''}${sku} Power Supply Unit delivers reliable power for CNC systems. Industrial-grade design with short-circuit protection and status indicators. ${stockText} ${price ? `Priced at ${price}.` : ''}`,
      'Servo': `${brandName ? brandName + ' ' : ''}${sku} Servo component provides precise motion control with advanced feedback and fault diagnostics. Ideal for high-precision CNC applications. ${stockText} ${price ? `Current price: ${price}.` : ''}`,
      'Motor': `${brandName ? brandName + ' ' : ''}${sku} Motor ensures high-efficiency performance and stable torque for continuous operation in demanding environments. ${stockText}`,
      'Interface': `${brandName ? brandName + ' ' : ''}${sku} Interface Board ensures robust signal processing and EMI protection, enabling reliable communication in automation systems. ${stockText}`,
      'PCB': `${brandName ? brandName + ' ' : ''}${sku} Control PCB for CNC systems, engineered for reliability and long service life. ${stockText}`,
    };
    const key = Object.keys(templates).find(k => categoryName.toLowerCase().includes(k.toLowerCase()));
    return key ? templates[key] : `${brandName ? brandName + ' ' : ''}${sku} ${categoryName} for CNC and industrial automation. ${stockText}`;
  };

  const descriptionToShow = product.description && product.description.trim().length > 0
    ? product.description
    : getFallbackDescription();

  return (
    <Layout>
      {/* Enhanced SEO with structured data */}
      <ProductSEO
        product={product}
        category={category}
        categoryBreadcrumb={categoryBreadcrumb}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-yellow-600">Home</Link>
              <span>/</span>
              <Link href="/products" className="hover:text-yellow-600">Products</Link>
              <span>/</span>
              {product.category && (
                <>
                  {(() => {
                    const href = resolveCategoryHref();
                    if (!href) return <span>{product.category.name}</span>;
                    return (
                      <Link href={href} className="hover:text-yellow-600">
                        {product.category.name}
                      </Link>
                    );
                  })()}
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900 font-medium">{product.name}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Product Images */}
            <ProductImageViewer
              images={images}
              productName={product.name}
              selectedImageIndex={selectedImageIndex}
              onImageChange={handleImageIndexChange}
				  fallbackImage={getDefaultProductImageWithSku(product.sku, '/images/default-product.jpg')}
            />

            {/* Product Info */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{computedHeading}</h1>
              
              <div className="mt-3">
                <h2 className="sr-only">Product information</h2>
                <p className="text-3xl tracking-tight text-gray-900">{formatCurrency(product.price)}</p>
              </div>

              {/* SKU */}
              <div className="mt-4 space-y-1">
                <p className="text-sm text-gray-500">SKU: <span className="font-medium text-gray-900">{product.sku}</span></p>
                {product.sku && (
                  <p className="text-xs text-gray-500">Alternate: <span className="font-mono">{String(product.sku).replace(/-/g, '')}</span></p>
                )}
              </div>

              {/* Actions — moved above specs */}
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleAddToCart}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-black bg-yellow-500 hover:bg-yellow-600"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Add to Cart
                </button>
                <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <HeartIcon className="h-5 w-5 mr-2" />
                  Add to Favorites
                </button>
              </div>

              {/* Key specs */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Brand</div>
                  <div className="font-medium text-gray-900">{product.brand || brandName || '-'}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Part No.</div>
                  <div className="font-mono text-gray-900">{product.part_number || product.model || product.sku}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Warranty</div>
                  <div className="font-medium text-gray-900">{product.warranty_period || '12 months'}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-gray-500">Lead time</div>
                  <div className="font-medium text-gray-900">{product.lead_time || '3-7 days'}</div>
                </div>
              </div>

              {/* Shipping Calculator */}
              {shippingCountries.length > 0 && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center mb-3">
                    <TruckIcon className="h-4 w-4 mr-2 text-yellow-600" />
                    Shipping Estimate
                  </h3>
                  <select
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm text-gray-900 focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="">Select your country</option>
                    {shippingCountries.map((c) => (
                      <option key={c.country_code} value={c.country_code}>
                        {c.country_name}
                      </option>
                    ))}
                  </select>
                  {shippingCountry && (
                    <div className="mt-3">
                      {shippingLoading ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2" />
                          Calculating...
                        </div>
                      ) : shippingError ? (
                        <p className="text-sm text-red-600">{shippingError}</p>
                      ) : freeShippingCodes.has(shippingCountry) ? (
                        <div className="flex items-center text-sm font-medium text-green-700">
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Free Shipping
                        </div>
                      ) : shippingQuote ? (
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">
                            {shippingQuote.currency === 'USD' ? '$' : shippingQuote.currency + ' '}
                            {shippingQuote.shipping_fee.toFixed(2)}
                          </span>
                          <span className="text-gray-500 ml-1">
                            (weight: {shippingQuote.weight_kg}kg)
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Stock & Availability */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center text-sm">
                  {product.stock_quantity && product.stock_quantity > 0 ? (
                    <>
                      <CheckIcon className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-green-700 font-medium">In Stock</span>
                      <span className="text-gray-500 ml-1">— Ready to ship</span>
                    </>
                  ) : (
                    <>
                      <ClockIcon className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                      <span className="text-yellow-700 font-medium">Available to Order</span>
                      <span className="text-gray-500 ml-1">— {product.lead_time || '3-7 days'} lead time</span>
                    </>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <TruckIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  Worldwide shipping available
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50">
                  <ShieldCheckIcon className="h-6 w-6 text-yellow-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">{product.warranty_period || '12 Month'} Warranty</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50">
                  <GlobeAltIcon className="h-6 w-6 text-yellow-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">Worldwide Shipping</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50">
                  <CheckIcon className="h-6 w-6 text-yellow-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">Quality Tested</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description — full width below the grid */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Description</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-base text-gray-700 whitespace-pre-line leading-relaxed max-w-none">
                {descriptionToShow}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts?.data?.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.data.map((relatedProduct: any) => (
                  <div key={relatedProduct.id} className="bg-white rounded-lg shadow p-4">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                      <Image
                        src={getProductImageUrl(
                          (relatedProduct.image_urls && relatedProduct.image_urls.length > 0) ? relatedProduct.image_urls : (relatedProduct.images || []),
                          getDefaultProductImageWithSku(relatedProduct.sku)
                        )}
                        alt={relatedProduct.name}
                        width={200}
                        height={200}
                        className="h-40 w-full object-cover object-center"
                        unoptimized
                      />
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/products/${toProductPathId(relatedProduct.sku)}`}
                        className="text-sm font-medium text-gray-900 hover:text-yellow-600"
                      >
                        {relatedProduct.name}
                      </Link>
                      <p className="text-sm text-gray-500">SKU: {relatedProduct.sku}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
