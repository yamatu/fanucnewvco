import type { MetadataRoute } from 'next';
import { getRequestBaseUrl } from '@/lib/request-url';
import { PRIVATE_ROBOTS_PATHS } from '@/lib/robots';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getRequestBaseUrl();

  // Shared with the middleware, which sends a Content-Signal header only on
  // paths outside this list.
  const privatePaths = [...PRIVATE_ROBOTS_PATHS];

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
