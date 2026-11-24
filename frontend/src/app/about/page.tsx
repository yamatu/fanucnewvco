import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import AboutPageView from '@/components/pages/AboutPageView';
import { getSiteUrl } from '@/lib/url';
import { getEditablePageData } from '@/services/page-content.server';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  return {
    title: { absolute: 'About Vcocnc | CNC Drive & Automation Parts Supplier Since 2005' },
    description: 'Meet Vcocnc, a CNC drive, motor and industrial automation spare parts supplier in Kunshan since 2005, with 150,000+ stocked items, 46 specialists, a 5,000 sqm facility, and worldwide shipping.',
    keywords: 'Vcocnc, about Vcocnc, FANUC supplier China, CNC parts supplier, industrial automation company, Kunshan, top FANUC supplier',
    alternates: { canonical: `${baseUrl}/about` },
    openGraph: {
      title: 'About Vcocnc | CNC Drive & Automation Parts Supplier Since 2005',
      description: 'Kunshan CNC drive, motor and automation parts supplier since 2005. 150,000+ items in stock, 46 specialists, 5,000 sqm inspection facility, 12-month warranty and worldwide shipping.',
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
