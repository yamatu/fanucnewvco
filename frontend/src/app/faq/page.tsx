import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import { generateFAQSchema, generateBreadcrumbSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { buildStaticPageMetadata } from '@/lib/seo';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';
import { translatePublicMessage } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/faq');
  const title = translatePublicMessage(locale, 'faq.title');
  const description = translatePublicMessage(locale, 'faq.description');
  return {
    ...buildStaticPageMetadata(
    '/faq',
    title,
    description,
    'FANUC parts FAQ, industrial automation support, CNC parts questions, technical support, warranty information, FANUC shipping, FANUC compatibility',
  ),
    alternates: { canonical, languages },
    openGraph: { title, description, type: 'website', url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function FAQPage() {
  const baseUrl = getSiteUrl();
  const locale = await getRequestPublicLocale();

  const faqSchema = generateFAQSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: translatePublicMessage(locale, 'common.home'), url: `${baseUrl}${localizePublicPath('/', locale)}` },
    { name: translatePublicMessage(locale, 'faq.title'), url: `${baseUrl}${localizePublicPath('/faq', locale)}` }
  ]);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [faqSchema, breadcrumbSchema]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedSchema)
        }}
      />
      <PublicLayout>
        <div className="site-page-shell min-h-screen">
          <section className="site-page-hero">
            <div className="site-hero-inner mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
              <span className="site-hero-kicker">{translatePublicMessage(locale, 'faq.kicker')}</span>
              <h1 className="mt-5 text-4xl font-bold text-white sm:text-5xl">
                {translatePublicMessage(locale, 'faq.title')}
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-blue-100">
                {translatePublicMessage(locale, 'faq.description')}
              </p>
            </div>
          </section>

          <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            {/* Header */}
            {/* FAQ Items */}
            <div className="space-y-8">
              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  What FANUC parts do you stock?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  We stock over 100,000 FANUC parts including PCB boards, I/O modules, servo motors, control units, power supplies, and other automation components. All parts are genuine FANUC or compatible alternatives clearly marked for your convenience.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Do you ship worldwide?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Yes, we ship FANUC parts worldwide. We offer express shipping options and can deliver to most countries within 3-10 business days. We use DHL, FedEx, and UPS for international shipping.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Are your FANUC parts genuine?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  We supply both genuine FANUC parts and high-quality compatible alternatives. All parts are clearly marked and come with our quality guarantee. Genuine parts include manufacturer documentation and certificates.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  What is your warranty policy?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  We offer a comprehensive warranty on all FANUC parts. Genuine parts come with manufacturer warranty (typically 12-24 months), while compatible parts include our 12-month guarantee covering defects and performance issues.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  How can I get technical support?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Our technical support team is available via email at sales@vibocnc.com or phone. We provide installation guidance, troubleshooting, compatibility assistance, and replacement recommendations.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  How do I place an order?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  You can place orders directly on our website, via email, or by phone. We accept PayPal, bank transfers, and major credit cards. For large orders, we offer flexible payment terms for established customers.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Do you offer quantity discounts?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Yes, we offer competitive quantity discounts for bulk orders. Contact our sales team for custom pricing on large quantities or long-term supply agreements.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  How do I know if a part is compatible with my system?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Our technical team can help verify compatibility. Provide your system model, current part number, and application details. We maintain extensive compatibility databases and can suggest alternatives if needed.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  What payment methods do you accept?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  We accept PayPal, wire transfers, major credit cards (Visa, MasterCard, American Express), and for established customers, we offer terms payments and purchase orders.
                </p>
              </div>

              <div className="site-panel p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  How do I track my order?
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Once your order ships, you&apos;ll receive tracking information via email. You can also log into your account on our website to view order status and tracking details in real-time.
                </p>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="site-status-panel-strong mt-16 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {translatePublicMessage(locale, 'faq.more')}
              </h2>
              <p className="text-gray-600 mb-6">
                {translatePublicMessage(locale, 'faq.moreDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={localizePublicPath('/contact', locale)}
                  className="site-primary-action px-6 py-3"
                >
                  {translatePublicMessage(locale, 'common.contactUs')}
                </a>
                <a
                  href="mailto:sales@vibocnc.com"
                  className="site-secondary-action px-6 py-3"
                >
                  {translatePublicMessage(locale, 'faq.email')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
