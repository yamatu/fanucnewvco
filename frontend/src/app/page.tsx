import PublicLayout from '@/components/layout/PublicLayout';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CompanyStats from '@/components/home/CompanyStats';
import WorkshopSection from '@/components/home/WorkshopSection';
import ServicesSection from '@/components/home/ServicesSection';
import SimpleContentSection from '@/components/home/SimpleContentSection';
import BrandsSection from '@/components/home/BrandsSection';
import RepairCapabilitiesSection from '@/components/home/RepairCapabilitiesSection';
import HomeBlogSection from '@/components/home/HomeBlogSection';
import { generateOrganizationSchema, generateWebsiteSchema } from '@/lib/structured-data';
import type { Article, HomepageContent, Product } from '@/types';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { DEFAULT_HERO_DATA } from '@/lib/homepage-defaults';
import { SITE_NAME, withSiteName } from '@/lib/seo';
import { getSocialMediaURLs } from '@/lib/social-media';
import { getPublicSocialMediaSettings } from '@/services/social-media.server';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getLocaleConfig } from '@/lib/i18n/config';
import { NewsService } from '@/services/news.service';
import { filterToIndexableProductLocales, localizeArticleOrDefault } from '@/lib/i18n/content';
import { ProductService } from '@/services/product.service';

export const revalidate = 300;

const HOME_TITLE = withSiteName('Industrial Automation Parts & Repair Services');
const HOME_DESCRIPTION =
  'Source multi-brand industrial automation parts, CNC components and repair support from Vibocnc. Current, legacy and obsolete parts with worldwide shipping.';

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
          alt: 'Vibocnc industrial automation components',
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
  { key: 'brands_section', defaultSort: 40 },
  { key: 'repair_capabilities', defaultSort: 50 },
  { key: 'services_section', defaultSort: 60 },
  { key: 'home_blog', defaultSort: 70 },
  { key: 'workshop_section', defaultSort: 80 },
];

type StructuredContent = Record<string, unknown>;
type HeroSlideRecord = Record<string, unknown> & { image?: unknown };

function parseStructuredContent(data: unknown): StructuredContent | null {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' ? (data as StructuredContent) : null;
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
  const sourceSlides: HeroSlideRecord[] = Array.isArray(parsed?.slides)
    ? parsed.slides.filter((slide): slide is HeroSlideRecord => Boolean(slide && typeof slide === 'object'))
    : [];
  const imageCandidates = [
    content.image_url,
    ...sourceSlides.map((slide) => slide.image),
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
            slides: sourceSlides.map((slide, index) => ({
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
  const locale = await getRequestPublicLocale();
  const [list, socialMediaSettings, featuredBlogArticles, featuredProducts] = await Promise.all([
    getHomepageContentList(),
    getPublicSocialMediaSettings(),
    NewsService.getArticles({ page: 1, page_size: 3, content_type: 'blog', is_featured: 'true' })
      .then((result) => (result.data || []).map((article) => localizeArticleOrDefault(article, locale)))
      .catch(() => [] as Article[]),
    ProductService.getFeaturedProducts(6)
      .then((products) => products
        .map((product) => filterToIndexableProductLocales(product, locale))
        .filter((product): product is Product => product !== null))
      .catch(() => [] as Product[]),
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
          if (s.key === 'featured_products') return <FeaturedProducts key={s.key} content={s.content} initialProducts={featuredProducts} />;
          if (s.key === 'brands_section') return <BrandsSection key={s.key} content={s.content} />;
          if (s.key === 'repair_capabilities') return <RepairCapabilitiesSection key={s.key} content={s.content} />;
          if (s.key === 'workshop_section') return <WorkshopSection key={s.key} content={s.content} />;
          if (s.key === 'services_section') return <ServicesSection key={s.key} content={s.content} />;
          if (s.key === 'home_blog') return <HomeBlogSection key={s.key} content={s.content} articles={featuredBlogArticles} />;
          return <SimpleContentSection key={s.key} content={s.content} />;
        })}
      </PublicLayout>
    </>
  );
}
