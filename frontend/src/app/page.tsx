import PublicLayout from '@/components/layout/PublicLayout';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CompanyStats from '@/components/home/CompanyStats';
import WorkshopSection from '@/components/home/WorkshopSection';
import ServicesSection from '@/components/home/ServicesSection';
import SimpleContentSection from '@/components/home/SimpleContentSection';
import { generateOrganizationSchema, generateWebsiteSchema } from '@/lib/structured-data';
import type { HomepageContent } from '@/types';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { DEFAULT_HERO_DATA } from '@/lib/homepage-defaults';
import { SITE_NAME, withSiteName } from '@/lib/seo';
import { getSocialMediaURLs } from '@/lib/social-media';
import { getPublicSocialMediaSettings } from '@/services/social-media.server';
import { getLocalizedMetadataPaths } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getLocaleConfig } from '@/lib/i18n/config';

export const revalidate = 300;

const HOME_TITLE = withSiteName('FANUC Spare Parts & CNC Machine Parts');
const HOME_DESCRIPTION =
  'Source FANUC spare parts, FANUC robot spare parts and CNC machine parts from VIBO CNC. 100,000+ automation components in stock with worldwide shipping.';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/');
  const ogImageUrl = new URL('/images/og-image.jpg', baseUrl).toString();
  const title = locale === 'en' ? HOME_TITLE : withSiteName(translatePublicMessage(locale, 'home.hero.title'));
  const description = locale === 'en' ? HOME_DESCRIPTION : translatePublicMessage(locale, 'home.hero.description');

  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      locale: getLocaleConfig(locale).hreflang.replace('-', '_'),
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'VIBO CNC industrial automation components',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

const PRIMARY_HOME_SECTIONS: Array<{ key: string; defaultSort: number }> = [
  { key: 'hero_section', defaultSort: 10 },
  { key: 'company_stats', defaultSort: 20 },
  { key: 'featured_products', defaultSort: 30 },
  { key: 'workshop_section', defaultSort: 40 },
  { key: 'services_section', defaultSort: 50 },
];

function parseStructuredContent(data: unknown): Record<string, any> | null {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, any>) : null;
}

function isUploadedImage(image: unknown): image is string {
  return typeof image === 'string' && image.startsWith('/uploads/');
}

async function uploadedImageExists(image: string): Promise<boolean> {
  const backendUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  try {
    const response = await fetch(`${backendUrl}${image}`, {
      method: 'HEAD',
      next: { revalidate: 300 },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sanitizeHeroContent(content?: HomepageContent): Promise<HomepageContent | undefined> {
  if (!content) return content;

  const parsed = parseStructuredContent(content.data);
  const sourceSlides = Array.isArray(parsed?.slides) ? parsed.slides : [];
  const imageCandidates = [
    content.image_url,
    ...sourceSlides.map((slide: any) => slide?.image),
  ].filter(isUploadedImage);
  const availability = new Map<string, boolean>();

  await Promise.all(
    [...new Set(imageCandidates)].map(async (image) => {
      availability.set(image, await uploadedImageExists(image));
    }),
  );

  const replaceMissingImage = (image: unknown, index: number): string => {
    if (isUploadedImage(image) && availability.get(image) === false) {
      return DEFAULT_HERO_DATA.slides[index % DEFAULT_HERO_DATA.slides.length].image;
    }
    return typeof image === 'string' && image ? image : DEFAULT_HERO_DATA.slides[index % DEFAULT_HERO_DATA.slides.length].image;
  };

  return {
    ...content,
    image_url:
      isUploadedImage(content.image_url) && availability.get(content.image_url) === false
        ? DEFAULT_HERO_DATA.slides[0].image
        : content.image_url,
    ...(parsed && sourceSlides.length > 0
      ? {
          data: {
            ...parsed,
            slides: sourceSlides.map((slide: any, index: number) => ({
              ...slide,
              image: replaceMissingImage(slide?.image, index),
            })),
          },
        }
      : {}),
  };
}

async function getHomepageContentList(): Promise<HomepageContent[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    // Fetch inactive too so the public page can respect the admin "is_active" toggle (hide sections).
    const res = await fetch(`${backendUrl}/api/v1/public/homepage-content?include_inactive=1`, {
      next: { revalidate: 300, tags: ['homepage-content'] },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as HomepageContent[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [list, socialMediaSettings] = await Promise.all([
    getHomepageContentList(),
    getPublicSocialMediaSettings(),
  ]);
  const byKey: Record<string, HomepageContent | undefined> = Object.fromEntries(
    list.map((c) => [c.section_key, c]),
  );
  byKey.hero_section = await sanitizeHeroContent(byKey.hero_section);

  const renderQueue = [
    ...PRIMARY_HOME_SECTIONS.map((s) => {
      const content = byKey[s.key] as HomepageContent | undefined;
      return {
        key: s.key,
        sort: Number(content?.sort_order ?? s.defaultSort),
        isActive: content ? content.is_active !== false : true,
        content: content ?? null,
      };
    }),
    ...list
      .filter((c) => !PRIMARY_HOME_SECTIONS.some((s) => s.key === c.section_key))
      .map((c) => ({
        key: c.section_key,
        sort: Number(c.sort_order ?? 999),
        isActive: c.is_active !== false,
        content: c,
      })),
  ]
    .filter((s) => s.isActive)
    .sort((a, b) => a.sort - b.sort);

  // Enhanced structured data using the new utility functions
  const organizationSchema = generateOrganizationSchema(getSocialMediaURLs(socialMediaSettings));
  const websiteSchema = generateWebsiteSchema();

  const combinedStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      websiteSchema
    ]
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedStructuredData)
        }}
      />
      <PublicLayout>
        {renderQueue.map((s) => {
          if (s.key === 'hero_section') return <HeroSection key={s.key} content={s.content} />;
          if (s.key === 'company_stats') return <CompanyStats key={s.key} content={s.content} />;
          if (s.key === 'featured_products') return <FeaturedProducts key={s.key} content={s.content} />;
          if (s.key === 'workshop_section') return <WorkshopSection key={s.key} content={s.content} />;
          if (s.key === 'services_section') return <ServicesSection key={s.key} content={s.content} />;
          return <SimpleContentSection key={s.key} content={s.content} />;
        })}
      </PublicLayout>
    </>
  );
}
