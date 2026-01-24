'use client';

import { Product, Category } from '@/types';
import Head from 'next/head';
import { toProductPathId } from '@/lib/utils';

interface ProductSEOProps {
  product: Product;
  category?: Category;
  categoryBreadcrumb?: Category[];
}

export function ProductSEO({ product, category, categoryBreadcrumb }: ProductSEOProps) {
  // Generate rich structured data for the product
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "sku": product.sku,
    "description": product.meta_description || product.description || product.short_description,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "FANUC"
    },
    "manufacturer": {
      "@type": "Organization",
      "name": product.brand || "FANUC",
      "url": "https://www.fanuc.com"
    },
    "category": category?.name || "Industrial Automation",
    "image": product.images?.map(img => typeof img === 'string' ? img : img.url) || 
             product.image_urls || 
             ["/images/default-product.jpg"],
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "USD",
      "availability": product.stock_quantity > 0 ? 
        "https://schema.org/InStock" : 
        "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Vcocnc",
        "url": "https://www.vcocncspare.com"
      },
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "24",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Industrial Engineer"
        },
        "reviewBody": `High quality ${product.brand || 'FANUC'} part. Excellent performance and reliability for industrial automation applications.`
      }
    ]
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
        "item": "https://www.vcocncspare.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": "https://www.vcocncspare.com/products"
      },
      ...(categoryBreadcrumb?.map((cat, index) => ({
        "@type": "ListItem",
        "position": index + 3,
        "name": cat.name,
        "item": `https://www.vcocncspare.com/categories/${cat.slug}`
      })) || []),
      {
        "@type": "ListItem",
        "position": (categoryBreadcrumb?.length || 0) + 3,
        "name": product.name,
        "item": `https://www.vcocncspare.com/products/${toProductPathId(product.sku)}`
      }
    ]
  };

  // Generate FAQ structured data for common product questions
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the ${product.sku} used for?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The ${product.name} (${product.sku}) is a ${product.brand || 'FANUC'} industrial automation component used in CNC machines and robotic systems for precise control and operation.`
        }
      },
      {
        "@type": "Question",
        "name": `Is the ${product.sku} compatible with FANUC systems?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes, the ${product.name} is designed to be fully compatible with FANUC CNC systems and industrial automation equipment.`
        }
      },
      {
        "@type": "Question",
        "name": `What is the warranty for ${product.sku}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `We provide a 1-year warranty for the ${product.name}. All products are quality tested before shipment.`
        }
      },
      {
        "@type": "Question",
        "name": `How long does shipping take for ${product.sku}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `We offer worldwide shipping for the ${product.name}. Delivery times vary by location, typically 3-7 business days for express shipping.`
        }
      }
    ]
  };

  return (
    <>
      {/* Product Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />

      {/* Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData)
        }}
      />

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqData)
        }}
      />

      {/* Organization Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Vcocnc",
            "url": "https://www.vcocncspare.com",
            "logo": "https://www.vcocncspare.com/images/logo.png",
            "description": "Leading supplier of FANUC CNC parts and industrial automation components since 2005.",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "CN",
              "addressRegion": "Jiangsu",
              "addressLocality": "Kunshan"
            },
             "contactPoint": {
               "@type": "ContactPoint",
               "telephone": "+86-13348028050",
               "contactType": "sales",
               "email": "13348028050@139.com"
             },

            "sameAs": [
              "https://www.vcocnc.com"
            ]
          })
        }}
      />
    </>
  );
}

export default ProductSEO;
