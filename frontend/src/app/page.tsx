import HomePageContent from '@/components/home/HomePageContent';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { DEFAULT_OG_IMAGE, HOME_DESCRIPTION, HOME_TITLE } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    alternates: { canonical: baseUrl },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'Vcocnc',
      url: baseUrl,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

export default function Home() {
  return <HomePageContent />;
}
