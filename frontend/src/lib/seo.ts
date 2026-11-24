import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export const HOME_TITLE = 'Vcocnc – CNC & Industrial Automation Spare Parts Supplier';
export const HOME_DESCRIPTION =
  'Vcocnc supplies bench-tested CNC servo drives, spindle amplifiers, motors, power supplies and multi-brand automation spare parts from FANUC, Mitsubishi, Yaskawa, Siemens, ABB and 20+ brands—150,000+ stocked items, 12-month warranty and global dispatch since 2005.';
export const DEFAULT_OG_IMAGE = {
  url: '/images/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Vcocnc CNC and industrial automation spare parts supplier',
};

export function buildStaticPageMetadata(
  path: string,
  title: string,
  description: string,
  keywords?: string,
): Metadata {
  const baseUrl = getSiteUrl();
  const canonicalUrl = `${baseUrl}${path}`;
  const fullTitle = /\bvcocnc\b/i.test(title) ? title : `${title} | Vcocnc`;

  return {
    title: { absolute: fullTitle },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      type: 'website',
      url: canonicalUrl,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
