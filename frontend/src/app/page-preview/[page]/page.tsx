import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import PreviewBridge from '@/components/admin/homepage/PreviewBridge';
import AboutPageView from '@/components/pages/AboutPageView';
import ContactPageClient from '@/components/pages/ContactPageClient';
import { getEditablePageData } from '@/services/page-content.server';
import { isEditablePage } from '@/lib/page-content';

// Admin visual-editor canvas for the About/Contact pages: always fresh and
// includes the signed-in admin's unsaved drafts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Page preview',
  robots: { index: false, follow: false },
};

export default async function EditablePagePreview({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!isEditablePage(page)) notFound();
  const data = await getEditablePageData(page, { preview: true });

  if (page === 'contact') {
    return (
      <>
        <ContactPageClient data={data} />
        <PreviewBridge />
      </>
    );
  }
  return (
    <PublicLayout>
      <AboutPageView data={data} />
      <PreviewBridge />
    </PublicLayout>
  );
}
