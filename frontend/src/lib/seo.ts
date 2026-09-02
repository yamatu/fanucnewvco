import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export const SITE_NAME = 'Vibocnc';

const SITE_NAME_SUFFIX = /(?:\s*\|\s*VIBO\s*CNC)+\s*$/i;

export function withoutSiteNameSuffix(title: string): string {
  return title.replace(SITE_NAME_SUFFIX, '').trim();
}

export function withSiteName(title: string): string {
  const pageTitle = withoutSiteNameSuffix(title);
  return pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME;
}

export function buildStaticPageMetadata(
  path: string,
  title: string,
  description: string,
  keywords?: string,
): Metadata {
  const baseUrl = getSiteUrl();
  const canonicalUrl = `${baseUrl}${path}`;
  const pageTitle = withoutSiteNameSuffix(title);
  const socialTitle = withSiteName(pageTitle);

  return {
    title: pageTitle,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: socialTitle,
      description,
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
    },
  };
}
