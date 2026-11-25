import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { getSiteContactInfo } from '@/lib/contact-info.server';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteUrl();
  const contact = await getSiteContactInfo();
  return {
    title: { absolute: 'Contact Vcocnc | CNC & Automation Parts Quotes & Support' },
    description: 'Contact Vcocnc for CNC and industrial automation spare parts quotes, model verification and technical support. Reach our Kunshan team by phone or email for a 24-hour response.',
    keywords: 'contact Vcocnc, CNC parts quote, industrial automation inquiry, FANUC Siemens parts quote, technical support',
    alternates: { canonical: `${baseUrl}/contact` },
    openGraph: {
      title: 'Contact Vcocnc | CNC & Automation Parts Quotes & Support',
      description: `Contact Vcocnc for CNC and industrial automation parts quotes and technical support. Fast response within 24 hours. Phone: ${contact.phone}.`,
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
