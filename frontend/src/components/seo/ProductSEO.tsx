'use client';

import { Product, Category } from '@/types';
import type { MerchantShippingQuoteItem } from '@/services/shipping.server';
import { toProductPathId } from '@/lib/utils';
import { stripModelNoteArtifacts } from '@/lib/product-seo';
import { buildProductFaqs } from '@/lib/product-content';

const DEFAULT_SITE_NAME = 'Vcocnc';
const GENERIC_BRAND_LABEL = 'industrial automation';
const GENERIC_MANUFACTURER_LABEL = 'industrial automation parts manufacturer';
const DEFAULT_MERCHANT_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'];

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

interface ProductSEOProps {
  product: Product;
  category?: Category;
  categoryBreadcrumb?: Category[];
  baseUrl?: string;
  merchantShippingQuotes?: MerchantShippingQuoteItem[];
  referenceDate?: string;
}

/**
 * Parse a free-form lead time string (e.g. "3-7 days", "4-5 DAYS", "1 WEEK")
 * into a bounded upper-end day count for computing a BackOrder offer's validFrom.
 */
function parseLeadTimeDays(raw?: string, fallbackDays = 7): number {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return fallbackDays;

  const weekMatch = text.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:weeks?|wks?)\b/);
  if (weekMatch) {
    const weeks = Number(weekMatch[2] || weekMatch[1]);
    if (Number.isFinite(weeks) && weeks > 0) {
      return Math.min(Math.max(weeks * 7, 1), 90);
    }
  }

  const dayMatch = text.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:days?|d)\b/);
  if (dayMatch) {
    const days = Number(dayMatch[2] || dayMatch[1]);
    if (Number.isFinite(days) && days > 0) {
      return Math.min(Math.max(days, 1), 90);
    }
  }

  return fallbackDays;
}

/**
 * Compute an ISO 8601 UTC timestamp when a BackOrder item is expected to ship.
 * Using a server-supplied referenceDate prevents SSR/client hydration mismatches
 * across UTC midnight or ISR-cached HTML responses.
 */
function computeBackOrderValidFrom(leadTime?: string, referenceDate?: string): string {
  const days = parseLeadTimeDays(leadTime, 7);
  let baseYear: number;
  let baseMonth: number;
  let baseDay: number;

  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(referenceDate || '').trim());
  if (parsed) {
    baseYear = Number(parsed[1]);
    baseMonth = Number(parsed[2]) - 1;
    baseDay = Number(parsed[3]);
  } else {
    const now = new Date();
    baseYear = now.getUTCFullYear();
    baseMonth = now.getUTCMonth();
    baseDay = now.getUTCDate();
  }

  const target = new Date(Date.UTC(baseYear, baseMonth, baseDay + days));
  return `${target.toISOString().slice(0, 10)}T00:00:00Z`;
}

function mapConditionType(condition?: string): string {
  switch (condition) {
    case 'refurbished':
      return 'https://schema.org/RefurbishedCondition';
    case 'used':
      return 'https://schema.org/UsedCondition';
    default:
      return 'https://schema.org/NewCondition';
  }
}

function parseSpecs(raw?: string): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch { /* ignore */ }
  return null;
}

function stripHtml(text?: string): string {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// JSON-LD is inlined in a <script> element: escape "<" so product text such as
// "</script>" can never terminate the block. The output is still valid JSON.
function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function toAbsoluteUrl(url: string | undefined, baseUrl: string): string {
  const value = String(url || '').trim();
  if (!value) return `${baseUrl}/images/default-product.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

// Use the backend-generated SKU image when a product has no uploaded media.
// The legacy /images/default-product.jpg file is not deployed and returns 404.
function getProductImageFallback(product: Product, baseUrl: string): string {
  const sku = normalizeText(product.sku);
  if (!sku) return `${baseUrl}/images/default-product.svg`;
  const safeSku = sku.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return `${baseUrl}/api/v1/public/products/default-image/${encodeURIComponent(safeSku)}?sku=${encodeURIComponent(sku)}`;
}

function normalizeText(value?: string): string {
  return String(value || '').trim();
}

function getBrandName(product: Product): string {
  return normalizeText(product.brand);
}

function getBrandLabel(product: Product): string {
  return getBrandName(product) || GENERIC_BRAND_LABEL;
}

function getManufacturerName(product: Product): string {
  return normalizeText(product.manufacturer) || getBrandName(product) || GENERIC_MANUFACTURER_LABEL;
}

function buildAnswerFirstSummary(product: Product, category?: Category): string {
  const brandLabel = getBrandLabel(product);
  const categoryName = category?.name || product.category?.name || 'industrial automation part';
  const stockText = product.stock_quantity > 0
    ? 'The item is in stock and ready for shipment.'
    : `The item is available to order with ${product.lead_time || '3-7 days'} lead time.`;
  const warrantyText = product.warranty_period
    ? `Standard supply includes a ${product.warranty_period} warranty.`
    : 'Standard supply includes a 12-month warranty.';

  return `${brandLabel} ${product.sku} is a ${categoryName.toLowerCase()} used for CNC repair, replacement, and industrial automation maintenance. ${stockText} ${warrantyText}`;
}

export function ProductSEO({ product, category, categoryBreadcrumb, baseUrl = 'https://www.vcocncspare.com', merchantShippingQuotes = [], referenceDate }: ProductSEOProps) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const productUrl = `${normalizedBaseUrl}/products/${toProductPathId(product.sku)}`;
  const productId = `${productUrl}#product`;
  const brandLabel = getBrandLabel(product);
  const manufacturerName = getManufacturerName(product);
  const description = stripModelNoteArtifacts(stripHtml(product.meta_description || product.short_description || product.description))
    || `${product.name} industrial automation spare part from ${brandLabel}.`;
  const answerFirstSummary = buildAnswerFirstSummary(product, category);
  const validShippingQuotes = merchantShippingQuotes.filter((q) => Boolean(q?.country_code));

  // Build image array
  const imageSources = product.images?.map(img => typeof img === 'string' ? img : img.url) ||
    product.image_urls ||
    [];
  const imageUrls = (imageSources.length > 0 ? imageSources : [getProductImageFallback(product, normalizedBaseUrl)])
    .map((url) => toAbsoluteUrl(url, normalizedBaseUrl));

  // Reviews & aggregate rating
  // Reviews transcribed from other channels without an order are shown on the
  // page but kept out of rich results, which require first-party reviews.
  const approvedReviews = product.reviews?.filter(r => r.is_approved && (r.is_verified || !r.source)) || [];
  const hasReviews = approvedReviews.length > 0;
  const avgRating = hasReviews
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : undefined;

  // Technical specs as additionalProperty
  const specs = parseSpecs(product.technical_specs);
  const specProperties = specs
    ? Object.entries(specs).map(([name, value]) => ({
        "@type": "PropertyValue",
        "name": name,
        "value": String(value),
      }))
    : [];
  const attributeProperties = product.attributes?.map((attribute) => ({
    "@type": "PropertyValue",
    "name": attribute.attribute_name,
    "value": String(attribute.attribute_value),
  })) || [];
  const additionalProperties = [...specProperties, ...attributeProperties];

  // A zero-price quote-only record cannot satisfy Google's Product rich-result
  // requirements (Google flags Product nodes lacking offers, review, or
  // aggregateRating as critical errors). Keep full entity metadata inside
  // ItemPage.mainEntity as a rich Thing with additionalType=schema.org/Product
  // so AI/GEO engines can extract SKU, MPN, brand, specs and documents cleanly.
  const hasProductRichResultData = product.price > 0 || hasReviews;

  const subjectOf = [
    product.datasheet_url ? {
      "@type": "DigitalDocument",
      "name": `${product.sku} datasheet`,
      "url": product.datasheet_url,
    } : null,
    product.manual_url ? {
      "@type": "DigitalDocument",
      "name": `${product.sku} manual`,
      "url": product.manual_url,
    } : null,
  ].filter(Boolean);

  // Generate rich structured data for the product
  const structuredData: { [key: string]: JsonLdValue } = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productId,
    "name": product.name,
    "sku": product.sku,
    "mpn": product.part_number || product.sku,
    "productID": product.sku,
    "description": description,
    "disambiguatingDescription": answerFirstSummary,
    "brand": {
      "@type": "Brand",
      "name": brandLabel
    },
    "manufacturer": {
      "@type": "Organization",
      "name": manufacturerName
    },
    "category": category?.name || "Industrial Automation",
    "image": imageUrls,
    "url": productUrl,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": productUrl
    },
    "itemCondition": mapConditionType(product.condition_type),
    "countryOfOrigin": product.origin_country || undefined,
    "datePublished": product.created_at || undefined,
    "dateModified": product.updated_at || undefined,
    "keywords": [product.sku, product.part_number, product.brand, category?.name].filter(Boolean).join(', '),
    "offers": product.price > 0 ? {
      "@type": "Offer",
      "url": productUrl,
      "price": product.price,
      "priceCurrency": "USD",
      "itemCondition": mapConditionType(product.condition_type),
      // Out-of-stock parts are still orderable with a lead time (the page says
      // "Available to Order"), which is BackOrder rather than OutOfStock.
      "availability": product.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/BackOrder",
      ...(product.stock_quantity <= 0
        ? { "validFrom": computeBackOrderValidFrom(product.lead_time, referenceDate) }
        : {}),
      "seller": {
        "@type": "Organization",
        "@id": `${normalizedBaseUrl}/#organization`,
        "name": "Vcocnc",
        "url": normalizedBaseUrl
      },
      "priceValidUntil": "2027-12-31",
      ...(validShippingQuotes.length > 0 ? {
        "shippingDetails": validShippingQuotes.map((q) => ({
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": Number(q.shipping_fee || 0).toFixed(2),
            "currency": q.currency || "USD"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": q.country_code
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": q.handling_days_min || 1,
              "maxValue": q.handling_days_max || 2,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": q.transit_days_min || 4,
              "maxValue": q.transit_days_max || 5,
              "unitCode": "DAY"
            }
          }
        }))
      } : {}),
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": validShippingQuotes.length > 0
          ? validShippingQuotes.map((q) => q.country_code)
          : DEFAULT_MERCHANT_COUNTRIES,
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
        "merchantReturnLink": `${normalizedBaseUrl}/returns`
      }
    } : undefined
  };

  // Add aggregate rating if reviews exist
  if (hasReviews && avgRating !== undefined) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": Math.round(avgRating * 10) / 10,
      "bestRating": 5,
      "worstRating": 1,
      "reviewCount": approvedReviews.length
    };

    structuredData.review = approvedReviews.slice(0, 5).map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.customer_name
      },
      "datePublished": r.created_at?.split('T')[0],
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": 5
      },
      "name": r.review_title || `Review of ${product.sku}`,
      "reviewBody": r.review_content
    }));
  }

  // Add technical specs as additional properties
  if (additionalProperties && additionalProperties.length > 0) {
    structuredData.additionalProperty = additionalProperties;
  }

  if (subjectOf.length > 0) {
    structuredData.subjectOf = subjectOf as JsonLdValue[];
  }

  // Speakable for AI search engines
  structuredData.speakable = {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", ".product-description", ".product-specs"]
  };

  // Generate breadcrumb structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": normalizedBaseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": `${normalizedBaseUrl}/products`
      },
      ...(categoryBreadcrumb?.map((cat, index) => ({
        "@type": "ListItem",
        "position": index + 3,
        "name": cat.name,
        "item": `${normalizedBaseUrl}/categories/${cat.path || cat.slug}`
      })) || []),
      {
        "@type": "ListItem",
        "position": (categoryBreadcrumb?.length || 0) + 3,
        "name": product.name,
        "item": productUrl
      }
    ]
  };

  // Same FAQ set as the visible accordion (structured data must match the page).
  const faqEntities = buildProductFaqs(product).map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }));

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqEntities
  };

  const quoteOnlyEntity: { [key: string]: JsonLdValue } = {
    "@type": "Thing",
    "@id": productId,
    "additionalType": "https://schema.org/Product",
    "name": product.name,
    "alternateName": product.part_number && product.part_number !== product.sku ? product.part_number : undefined,
    "identifier": [
      { "@type": "PropertyValue", "propertyID": "SKU", "value": product.sku },
      { "@type": "PropertyValue", "propertyID": "MPN", "value": product.part_number || product.sku },
      ...(getBrandName(product)
        ? [{ "@type": "PropertyValue", "propertyID": "Brand", "value": getBrandName(product) }]
        : []),
      { "@type": "PropertyValue", "propertyID": "Category", "value": category?.name || "Industrial Automation" },
      { "@type": "PropertyValue", "propertyID": "Condition", "value": product.condition_type || "new" },
      { "@type": "PropertyValue", "propertyID": "Warranty", "value": product.warranty_period || "12 months" },
      { "@type": "PropertyValue", "propertyID": "Pricing", "value": "Request for Quote (RFQ)" },
    ],
    "description": description,
    "disambiguatingDescription": answerFirstSummary,
    "image": imageUrls,
    "url": productUrl,
    ...(subjectOf.length > 0 ? { "subjectOf": subjectOf as JsonLdValue[] } : {}),
  };

  const webPageData = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    "@id": `${productUrl}#webpage`,
    "url": productUrl,
    "name": product.name,
    "description": description,
    "datePublished": product.created_at || undefined,
    "dateModified": product.updated_at || undefined,
    "inLanguage": "en",
    // Same @id as the homepage WebSite node so the graphs merge into one entity.
    "isPartOf": {
      "@type": "WebSite",
      "@id": `${normalizedBaseUrl}/#website`,
      "name": DEFAULT_SITE_NAME,
      "url": normalizedBaseUrl,
    },
    "publisher": {
      "@id": `${normalizedBaseUrl}/#organization`,
    },
    "mainEntity": hasProductRichResultData
      ? { "@id": productId }
      : quoteOnlyEntity,
    "about": hasProductRichResultData
      ? { "@id": productId }
      : { "@id": productId },
    "potentialAction": !hasProductRichResultData
      ? {
          "@type": "CommunicateAction",
          "name": `Request quote for ${product.sku}`,
          "target": `${normalizedBaseUrl}/contact?sku=${encodeURIComponent(product.sku)}&type=quote`,
        }
      : undefined,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".product-description", ".product-specs"]
    }
  };

  return (
    <>
      {hasProductRichResultData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: toJsonLd(structuredData)
          }}
        />
      )}

      {/* Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(breadcrumbData)
        }}
      />

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(faqData)
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(webPageData)
        }}
      />
    </>
  );
}

export default ProductSEO;
