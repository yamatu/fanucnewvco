import { getSiteUrl } from '@/lib/url';
import { DEFAULT_OG_IMAGE, HOME_DESCRIPTION, HOME_TITLE } from '@/lib/seo';
import { SITE_FAQ_ENTRIES } from '@/lib/faq-content';

export function generateOrganizationSchema(sameAs: string[] = []) {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const socialProfiles = [...new Set(sameAs.filter((url) => {
    if (!/^https?:\/\//i.test(url)) return false;
    // Exclude personal LinkedIn profiles from Organization sameAs.
    return !/^https?:\/\/(?:www\.)?linkedin\.com\/in\//i.test(url);
  }))];

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    "name": "Vcocnc",
    "alternateName": ["VCOCNC Industrial Automation", "vcocncspare.com"],
    "description": HOME_DESCRIPTION,
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/android-chrome-512x512.png`,
      "width": 512,
      "height": 512
    },
    "image": [
      {
        "@type": "ImageObject",
        "url": `${baseUrl}${DEFAULT_OG_IMAGE.url}`,
        "width": 1200,
        "height": 630
      }
    ],
    "foundingDate": "2007",
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "value": 37
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": process.env.NEXT_PUBLIC_COMPANY_STREET || "Industrial Park Road",
      "addressLocality": process.env.NEXT_PUBLIC_COMPANY_CITY || "Kunshan",
      "addressRegion": process.env.NEXT_PUBLIC_COMPANY_REGION || "Jiangsu",
      "postalCode": process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || "215300",
      "addressCountry": process.env.NEXT_PUBLIC_COMPANY_COUNTRY_CODE || "CN"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "contactType": "sales",
        "telephone": "+86-13348028050",
        "email": "janice@vcocncspare.com",
        "availableLanguage": ["en", "zh"],
        "areaServed": "Worldwide"
      },
      {
        "@type": "ContactPoint",
        "contactType": "technical support",
        "telephone": "+86-13348028050",
        "email": "janice@vcocncspare.com",
        "availableLanguage": ["en", "zh"],
        "areaServed": "Worldwide"
      }
    ],
    "slogan": "Your Trusted CNC & Industrial Automation Parts Partner Since 2007",
    "knowsAbout": [
      "FANUC CNC parts",
      "Siemens SIMATIC and SINAMICS parts",
      "Mitsubishi MELSERVO and MELSEC parts",
      "Schneider Electric and ABB automation spares",
      "Industrial automation",
      "Servo motors and servo amplifiers",
      "PCB boards and control units",
      "PLC and I/O modules",
      "Power supplies and encoders",
      "CNC machine maintenance and repair"
    ],
    "makesOffer": {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "CNC & Industrial Automation Spare Parts Supply and Technical Support",
        "description": "Multi-brand CNC and industrial automation replacement parts supply with 12-month warranty, compatibility verification and worldwide express shipping"
      },
      "areaServed": "Worldwide",
      "eligibleCustomerType": [
        "Business",
        "Industrial"
      ]
    },
    ...(socialProfiles.length > 0 ? { "sameAs": socialProfiles } : {})
  };
}

export function generateWebsiteSchema() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "name": "Vcocnc",
    "alternateName": ["Vcocnc Spare Parts", "vcocncspare.com"],
    "url": baseUrl,
    "description": HOME_DESCRIPTION,
    "publisher": {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": "Vcocnc",
      "url": baseUrl
    },
    // Sitelinks search box: lets search and answer engines query the catalogue
    // directly (the products page reads ?search=).
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/products?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    // Hub pages that always exist; category slugs change with the catalogue.
    "mainEntity": {
      "@type": "ItemList",
      "name": "Vcocnc Catalogue and Support Pages",
      "description": "Main product, news and support pages available at Vcocnc",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "CNC & Industrial Automation Parts",
          "url": `${baseUrl}/products`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Product Categories",
          "url": `${baseUrl}/categories`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Company News",
          "url": `${baseUrl}/news`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Technical Support",
          "url": `${baseUrl}/technical-support`
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "FAQ",
          "url": `${baseUrl}/faq`
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Contact Vcocnc",
          "url": `${baseUrl}/contact`
        }
      ]
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".product-name", ".category-title"]
    }
  };
}

export function generateHomePageSchema() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${baseUrl}/#webpage`,
    "url": baseUrl,
    "name": HOME_TITLE,
    "description": HOME_DESCRIPTION,
    "inLanguage": "en",
    "isPartOf": {
      "@id": `${baseUrl}/#website`
    },
    "about": {
      "@id": `${baseUrl}/#organization`
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": `${baseUrl}${DEFAULT_OG_IMAGE.url}`,
      "width": DEFAULT_OG_IMAGE.width,
      "height": DEFAULT_OG_IMAGE.height
    }
  };
}

export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateFAQSchema() {
  // Delegates to the same list the FAQ page renders, so the markup can never
  // claim an answer that is not visible on the page.
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": SITE_FAQ_ENTRIES.map((entry) => ({
      "@type": "Question",
      "name": entry.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": entry.answer,
      },
    })),
  };
}

export function generateLocalBusinessSchema() {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#organization`,
    "name": "Vcocnc",
    "image": [
      `${baseUrl}${DEFAULT_OG_IMAGE.url}`,
      `${baseUrl}/android-chrome-512x512.png`
    ],
    "telephone": "+86-13348028050",
    "email": "janice@vcocncspare.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": process.env.NEXT_PUBLIC_COMPANY_STREET || "Industrial Park Road",
      "addressLocality": process.env.NEXT_PUBLIC_COMPANY_CITY || "Kunshan",
      "addressRegion": process.env.NEXT_PUBLIC_COMPANY_REGION || "Jiangsu",
      "postalCode": process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || "215300",
      "addressCountry": process.env.NEXT_PUBLIC_COMPANY_COUNTRY_CODE || "CN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 31.3888,
      "longitude": 120.9625
    },
    "url": baseUrl,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday"
        ],
        "opens": "08:00",
        "closes": "18:00"
      }
    ],
    "priceRange": "$$",
    "currenciesAccepted": "USD,EUR,CNY",
    "paymentAccepted": "PayPal,Bank Transfer,Credit Card",
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide"
    },
    "serviceArea": {
      "@type": "Place",
      "name": "Worldwide"
    }
  };
}
