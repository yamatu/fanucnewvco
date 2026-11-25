import { getSiteUrl } from '@/lib/url';
import { DEFAULT_OG_IMAGE, HOME_DESCRIPTION, HOME_TITLE } from '@/lib/seo';
import { SITE_FAQ_ENTRIES } from '@/lib/faq-content';
import { DEFAULT_CONTACT_INFO, type SiteContactInfo } from '@/lib/contact-info';

export function generateOrganizationSchema(
  sameAs: string[] = [],
  contact: SiteContactInfo = DEFAULT_CONTACT_INFO,
) {
  const baseUrl = getSiteUrl().replace(/\/+$/, '');
  const validProfiles = [...new Set(sameAs.filter((url) => /^https?:\/\//i.test(url)))];
  // sameAs must point at pages that describe the organisation itself. A
  // personal LinkedIn profile describes a person, so it is attached to
  // `employee` below instead of being silently discarded (which left the
  // Organization node with no external anchor at all).
  const isPersonalProfile = (url: string) => /^https?:\/\/(?:www\.)?linkedin\.com\/in\//i.test(url);
  const socialProfiles = validProfiles.filter((url) => !isPersonalProfile(url));
  const personalProfiles = validProfiles.filter(isPersonalProfile);

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
    "foundingDate": "2005",
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "value": 46
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
        "telephone": contact.telephone,
        "email": contact.email,
        "availableLanguage": ["en", "zh"],
        "areaServed": "Worldwide"
      },
      {
        "@type": "ContactPoint",
        "contactType": "technical support",
        "telephone": contact.telephone,
        "email": contact.email,
        "availableLanguage": ["en", "zh"],
        "areaServed": "Worldwide"
      }
    ],
    "slogan": "CNC Drive, Motor & Industrial Replacement Parts Specialist Since 2005",
    "foundingLocation": {
      "@type": "Place",
      "name": "Kunshan, Jiangsu, China"
    },
    // Opening hours come from the Contact page record, the same source the
    // visible page renders; unparseable copy is omitted, never guessed.
    ...(contact.openingHours.length > 0
      ? {
          "openingHoursSpecification": contact.openingHours.map((spec) => ({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": spec.dayOfWeek,
            "opens": spec.opens,
            "closes": spec.closes
          }))
        }
      : {}),
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
    ...(socialProfiles.length > 0 ? { "sameAs": socialProfiles } : {}),
    // A staff LinkedIn profile is not a sameAs anchor for the company itself,
    // but it still links that person to this organisation. `employee` is used
    // rather than `founder` because the role is not stated anywhere on the site.
    ...(personalProfiles.length > 0
      ? { "employee": { "@type": "Person", "sameAs": personalProfiles } }
      : {})
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
