import type { Metadata } from 'next';
import HomePageContent from '@/components/home/HomePageContent';

// Admin visual-editor canvas: always fresh, includes the signed-in admin's drafts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Homepage preview',
  robots: { index: false, follow: false },
};

export default function HomepagePreviewPage() {
  return <HomePageContent isAdminPreview />;
}
