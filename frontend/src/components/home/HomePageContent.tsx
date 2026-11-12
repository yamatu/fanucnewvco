import { Fragment } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import BrandCarousel from '@/components/home/BrandCarousel';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CompanyStats from '@/components/home/CompanyStats';
import WorkshopSection from '@/components/home/WorkshopSection';
import ServicesSection from '@/components/home/ServicesSection';
import SimpleContentSection from '@/components/home/SimpleContentSection';
import TemplateSection from '@/components/home/TemplateSection';
import HomepagePreviewMarker from '@/components/admin/homepage/HomepagePreviewMarker';
import PreviewBridge from '@/components/admin/homepage/PreviewBridge';
import { generateHomePageSchema, generateOrganizationSchema, generateWebsiteSchema } from '@/lib/structured-data';
import { toTemplateModel } from '@/lib/section-templates';
import { applyHomepageDrafts } from '@/lib/homepage-drafts.server';
import type { HomepageContent } from '@/types';

const PRIMARY_HOME_SECTIONS: Array<{ key: string; defaultSort: number }> = [
  { key: 'hero_section', defaultSort: 10 },
  { key: 'brand_carousel', defaultSort: 15 },
  { key: 'company_stats', defaultSort: 20 },
  { key: 'featured_products', defaultSort: 30 },
  { key: 'workshop_section', defaultSort: 40 },
  { key: 'services_section', defaultSort: 50 },
];

// The homepage is ISR-cached. If the content request fails we must throw so
// Next keeps serving the last good page; resolving to [] would render the
// hard-coded default sections and cache them as if they were real content.
// The only exception is `next build` (the Docker build has no backend): there
// the defaults are rendered, and the page is re-rendered on the first request
// because the runtime cache handler (cache-handler.js) starts empty.
async function getHomepageContentList(fresh = false): Promise<HomepageContent[]> {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  try {
    // Fetch inactive too so the public page can respect the admin "is_active" toggle (hide sections).
    const endpoint = `${backendUrl}/api/v1/public/homepage-content?include_inactive=1`;
    const res = fresh
      ? await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
      : await fetch(endpoint, { next: { revalidate: 300, tags: ['homepage-content'] }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Homepage content request failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Homepage content response is not an array');
    return data as HomepageContent[];
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') return [];
    throw error;
  }
}

export default async function HomePageContent({ isAdminPreview = false }: { isAdminPreview?: boolean }) {
  const published = await getHomepageContentList(isAdminPreview);
  const list = isAdminPreview ? await applyHomepageDrafts(published) : published;
  const byKey = Object.fromEntries(list.map((c) => [c.section_key, c]));

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
    // The admin preview keeps hidden sections so they can still be edited.
    .filter((s) => s.isActive || isAdminPreview)
    .sort((a, b) => a.sort - b.sort);

  // Enhanced structured data using the new utility functions
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const homePageSchema = generateHomePageSchema();

  const combinedStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      websiteSchema,
      homePageSchema
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
          let section;
          if (s.key === 'hero_section') section = <HeroSection content={s.content} />;
          else if (s.key === 'brand_carousel') section = <BrandCarousel content={s.content} />;
          else if (s.key === 'company_stats') section = <CompanyStats content={s.content} />;
          else if (s.key === 'featured_products') section = <FeaturedProducts content={s.content} />;
          else if (s.key === 'workshop_section') section = <WorkshopSection content={s.content} />;
          else if (s.key === 'services_section') section = <ServicesSection content={s.content} />;
          else {
            const model = s.content ? toTemplateModel(s.content) : null;
            section = model
              ? <TemplateSection model={model} sectionId={`section-${s.key}`} />
              : <SimpleContentSection content={s.content} />;
          }
          return (
            <Fragment key={s.key}>
              {isAdminPreview ? (
                <HomepagePreviewMarker sectionKey={s.key} label={s.content?.title || s.key} hidden={!s.isActive}>
                  {section}
                </HomepagePreviewMarker>
              ) : section}
            </Fragment>
          );
        })}
        {isAdminPreview ? <PreviewBridge /> : null}
      </PublicLayout>
    </>
  );
}
