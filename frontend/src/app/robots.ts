import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: [
      `${site}/sitemap.xml`,
      `${site}/sitemap-index.xml`,
      `${site}/sitemap-static.xml`,
      `${site}/sitemap-categories.xml`,
      `${site}/sitemap-products-index.xml`,
      `${site}/xmlsitemap.php`, // Primary sitemap for enhanced SEO compatibility
    ],
  };
}

