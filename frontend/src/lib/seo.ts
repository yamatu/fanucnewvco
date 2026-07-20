import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export const HOME_TITLE = 'FANUC Parts & Industrial Automation Components | Vcocnc';
export const HOME_DESCRIPTION =
  'Vcocnc supplies FANUC CNC parts and industrial automation components, with 100,000+ items in stock, technical support and worldwide shipping since 2005.';
export const DEFAULT_OG_IMAGE = {
  url: '/images/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Vcocnc FANUC parts and industrial automation components',
};

export function buildStaticPageMetadata(
  path: string,
  title: string,
  description: string,
  keywords?: string,
): Metadata {
  const baseUrl = getSiteUrl();
  const canonicalUrl = `${baseUrl}${path}`;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
