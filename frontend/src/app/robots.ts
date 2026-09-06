import type { MetadataRoute } from 'next';
import { getRequestBaseUrl } from '@/lib/request-url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getRequestBaseUrl();

  const privatePaths = [
    '/admin/',
    '/api/',
    '/account/',
    '/checkout/',
    '/orders/',
    '/login',
    '/register',
    '/forgot-password',
    '/track-order',
  ];

  return {
    // One wildcard group applies to all crawlers and avoids duplicate or
    // conflicting user-agent blocks in the generated robots.txt.
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: privatePaths,
    },
    host: site,
    sitemap: `${site}/sitemap.xml`,
  };
}
