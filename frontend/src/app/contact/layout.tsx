import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  return {
    title: { absolute: 'Contact Vcocnc | FANUC Parts Quotes & Support' },
    description: 'Contact Vcocnc for FANUC CNC parts quotes and technical support. Reach our Kunshan team by phone or email and receive a response within 24 hours.',
    keywords: 'contact Vcocnc, FANUC parts quote, CNC parts inquiry, technical support, FANUC supplier contact',
    alternates: { canonical: `${baseUrl}/contact` },
    openGraph: {
      title: 'Contact Vcocnc | FANUC Parts Quotes & Support',
      description: 'Contact us for FANUC CNC parts, quotes, and technical support. Fast response within 24 hours. Phone: +86-13348028050.',
      url: `${baseUrl}/contact`,
      type: 'website',
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
