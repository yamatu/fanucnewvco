import type { Metadata } from 'next';
import { getLocalizedMetadataPaths } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { withSiteName } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/contact');
  const title = translatePublicMessage(locale, 'contact.title');
  const description = locale === 'en'
    ? 'Contact VIBO CNC for FANUC CNC parts inquiries, technical support, and quotes. Located in Kunshan, China. Fast response within 24 hours.'
    : translatePublicMessage(locale, 'contact.description');
  return {
    title,
    description,
    keywords: 'contact VIBO CNC, FANUC parts quote, CNC parts inquiry, technical support, FANUC supplier contact',
    alternates: { canonical, languages },
    openGraph: { title: withSiteName(title), description, type: 'website', url: canonical },
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
