import PublicLayout from '@/components/layout/PublicLayout';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CompanyStats from '@/components/home/CompanyStats';
import WorkshopSection from '@/components/home/WorkshopSection';
import ServicesSection from '@/components/home/ServicesSection';
import SimpleContentSection from '@/components/home/SimpleContentSection';
import { generateOrganizationSchema, generateWebsiteSchema, generateLocalBusinessSchema } from '@/lib/structured-data';
import type { HomepageContent } from '@/types';

export const dynamic = 'force-dynamic';

const PRIMARY_HOME_SECTIONS: Array<{ key: string; defaultSort: number }> = [
  { key: 'hero_section', defaultSort: 10 },
  { key: 'company_stats', defaultSort: 20 },
  { key: 'featured_products', defaultSort: 30 },
  { key: 'workshop_section', defaultSort: 40 },
  { key: 'services_section', defaultSort: 50 },
];

async function getHomepageContentList(): Promise<HomepageContent[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    // Fetch inactive too so the public page can respect the admin "is_active" toggle (hide sections).
    const res = await fetch(`${backendUrl}/api/v1/public/homepage-content?include_inactive=1`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as HomepageContent[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const list = await getHomepageContentList();
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
    .filter((s) => s.isActive)
    .sort((a, b) => a.sort - b.sort);

  // Enhanced structured data using the new utility functions
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const localBusinessSchema = generateLocalBusinessSchema();

  const combinedStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      websiteSchema,
      localBusinessSchema
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
