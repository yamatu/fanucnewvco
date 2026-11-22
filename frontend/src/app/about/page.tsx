import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import AboutPageView from '@/components/pages/AboutPageView';
import { getSiteUrl } from '@/lib/url';
import { getEditablePageData } from '@/services/page-content.server';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  return {
    title: { absolute: 'About Vcocnc | FANUC Parts Supplier Since 2007' },
    description: 'Meet Vcocnc, a FANUC CNC parts supplier in Kunshan since 2007, with 100,000+ stocked items, a 3,500 sqm workshop, and worldwide shipping.',
    keywords: 'Vcocnc, about Vcocnc, FANUC supplier China, CNC parts supplier, industrial automation company, Kunshan, top FANUC supplier',
    alternates: { canonical: `${baseUrl}/about` },
    openGraph: {
      title: 'About Vcocnc | FANUC Parts Supplier Since 2007',
      description: 'Leading FANUC CNC parts supplier since 2007. 100,000+ items in stock, 37 employees, 3,500 sqm workshop. Top 3 FANUC supplier in China with worldwide shipping.',
      url: `${baseUrl}/about`,
      type: 'website',
    },
  };
}

export default async function About() {
  return (
    <PublicLayout>
      <AboutPageView data={await getEditablePageData('about')} />
    </PublicLayout>
  );
}
