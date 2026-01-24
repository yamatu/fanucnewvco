import type { MetadataRoute } from 'next';
import { getRequestBaseUrl } from '@/lib/request-url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getRequestBaseUrl();
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
    ],
  };
}

