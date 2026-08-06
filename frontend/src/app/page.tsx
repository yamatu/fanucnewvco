import { Fragment, Suspense, type ReactNode } from 'react';
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
import { localizeArticleOrDefault, localizeProductContent } from '@/lib/i18n/content';
import { getHomepageFeaturedArticles, getHomepageFeaturedProducts } from '@/services/homepage.server';
import HomepagePreviewMarker from '@/components/admin/homepage/HomepagePreviewMarker';

export const revalidate = 300;

const HOME_TITLE = withSiteName('Industrial Automation Parts Supplier & CNC Spares');
const HOME_DESCRIPTION =
  'Vibocnc supplies current, legacy and obsolete CNC and industrial automation parts across 20+ brands, with inspection, repair support and worldwide shipping.';

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

function compactText(value: string | undefined, max: number): string {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}

function compactHomepageProduct(product: Product): Product {
  const summary = compactText(product.short_description || product.meta_description || product.description, 240);
  const category = product.category ? {
    ...product.category,
    children: undefined,
    products: undefined,
    translations: undefined,
  } : product.category;
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    short_description: summary,
    description: summary,
    price: product.price,
    compare_price: product.compare_price,
    stock_quantity: product.stock_quantity,
    min_stock_level: product.min_stock_level,
    dimensions: product.dimensions,
    brand: product.brand,
    model: product.model,
    part_number: product.part_number,
    category_id: product.category_id,
    category,
    is_active: product.is_active,
    is_featured: product.is_featured,
    meta_title: product.meta_title,
    meta_description: compactText(product.meta_description, 180),
    meta_keywords: '',
    image_urls: product.image_urls || [],
    created_at: product.created_at,
    updated_at: product.updated_at,
    images: product.images?.slice(0, 1),
    attributes: product.attributes?.slice(0, 2),
  };
}

function compactHomepageArticle(article: Article): Article {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: compactText(article.summary || article.meta_description, 240),
    content: '',
    content_type: article.content_type,
    custom_path: article.custom_path,
    public_path: article.public_path,
    featured_image: article.featured_image,
    image_urls: [],
    is_published: article.is_published,
    is_featured: article.is_featured,
    meta_title: article.meta_title,
    meta_description: compactText(article.meta_description, 180),
    meta_keywords: '',
    author_id: article.author_id,
    view_count: article.view_count,
    sort_order: article.sort_order,
    published_at: article.published_at,
    created_at: article.created_at,
    updated_at: article.updated_at,
  };
}

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    // Fetch inactive too so the public page can respect the admin "is_active" toggle (hide sections).
    const res = await fetch(`${backendUrl}/api/v1/public/homepage-content?include_inactive=1`, {
      next: { revalidate: 300, tags: ['homepage-content'] },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as HomepageContent[];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function DeferredFeaturedProducts({ content, locale }: { content?: HomepageContent | null; locale: Parameters<typeof localizeProductContent>[1] }) {
  const products = (await getHomepageFeaturedProducts())
    .map((product) => compactHomepageProduct(localizeProductContent(product, locale)));
  return <FeaturedProducts content={content} initialProducts={products} />;
}

async function DeferredHomeBlog({ content, locale }: { content?: HomepageContent | null; locale: Parameters<typeof localizeArticleOrDefault>[1] }) {
  const articles = (await getHomepageFeaturedArticles())
    .map((article) => compactHomepageArticle(localizeArticleOrDefault(article, locale)));
  return <HomeBlogSection content={content} articles={articles} />;
}

function DeferredSectionFallback({ minHeight = 720 }: { minHeight?: number }) {
  return <div className="home-deferred-section" style={{ minHeight }} aria-hidden="true" />;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ admin_preview?: string }>;
}) {
  const locale = await getRequestPublicLocale();
  const previewParams = searchParams ? await searchParams : undefined;
  const isAdminPreview = previewParams?.admin_preview === '1';
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
      <PublicLayout socialMediaSettings={socialMediaSettings}>
        {renderQueue.map((s) => {
          let section: ReactNode;
          if (s.key === 'hero_section') section = <HeroSection content={s.content} />;
          else if (s.key === 'company_stats') section = <CompanyStats content={s.content} />;
          else if (s.key === 'featured_products') {
            section = (
              <Suspense fallback={<DeferredSectionFallback minHeight={860} />}>
                <DeferredFeaturedProducts content={s.content} locale={locale} />
              </Suspense>
            );
          } else if (s.key === 'brands_section') section = <BrandsSection content={s.content} />;
          else if (s.key === 'repair_capabilities') section = <RepairCapabilitiesSection content={s.content} />;
          else if (s.key === 'workshop_section') section = <WorkshopSection content={s.content} />;
          else if (s.key === 'services_section') section = <ServicesSection content={s.content} />;
          else if (s.key === 'home_blog') {
            section = (
              <Suspense fallback={<DeferredSectionFallback minHeight={620} />}>
                <DeferredHomeBlog content={s.content} locale={locale} />
              </Suspense>
            );
          } else section = <SimpleContentSection content={s.content} />;

          return isAdminPreview ? (
            <HomepagePreviewMarker key={s.key} sectionKey={s.key} label={`Edit ${s.key}`}>
              {section}
            </HomepagePreviewMarker>
          ) : (
            <Fragment key={s.key}>{section}</Fragment>
          );
        })}
      </PublicLayout>
    </>
  );
}
