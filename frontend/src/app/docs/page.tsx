import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import { buildStaticPageMetadata } from '@/lib/seo';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/docs');
  const title = translatePublicMessage(locale, 'docs.title');
  const metadata = buildStaticPageMetadata('/docs', title, 'Documentation and technical resources for VIBO CNC products.', 'documentation, FANUC manuals, CNC technical resources, product documents, VIBO CNC docs');
  return { ...metadata, alternates: { canonical, languages }, openGraph: metadata.openGraph ? { ...metadata.openGraph, url: canonical } : undefined };
}

export default async function DocsPage() {
  const locale = await getRequestPublicLocale();
  return (
    <PublicLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-6">{translatePublicMessage(locale, 'docs.title')}</h1>
        <p className="text-gray-600">{translatePublicMessage(locale, 'docs.comingSoon')}</p>
      </main>
    </PublicLayout>
  );
}
