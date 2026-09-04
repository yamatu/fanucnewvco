import type { Metadata } from 'next';
import { getLocalizedMetadataPaths } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { withSiteName } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/contact');
  const title = translatePublicMessage(locale, 'contact.title');
  const description = locale === 'en'
    ? 'Contact Vcocnc for industrial automation parts, repair evaluation, technical support and quotations across major brands.'
    : translatePublicMessage(locale, 'contact.description');
  return {
    title,
    description,
    keywords: 'contact Vcocnc, automation parts quote, CNC parts inquiry, repair evaluation, industrial technical support',
    alternates: { canonical, languages },
    openGraph: { title: withSiteName(title), description, type: 'website', url: canonical },
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
