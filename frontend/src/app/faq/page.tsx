import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import { generateFAQSchema, generateBreadcrumbSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { SITE_FAQ_ENTRIES } from '@/lib/faq-content';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | Vcocnc FANUC Parts',
  description: 'Find answers to common questions about FANUC parts, shipping, warranty, technical support, and more. Professional industrial automation support from Vcocnc.',
  keywords: 'FANUC parts FAQ, industrial automation support, CNC parts questions, technical support, warranty information, FANUC shipping, FANUC compatibility',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${getSiteUrl()}/faq`,
  },
};

export default function FAQPage() {
  const baseUrl = getSiteUrl();

  const faqSchema = generateFAQSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: baseUrl },
    { name: 'FAQ', url: `${baseUrl}/faq` }
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
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Find answers to common questions about FANUC parts, shipping, warranty, and technical support.
              </p>
            </div>

            {/* FAQ Items (same list as the FAQPage structured data) */}
            <div className="space-y-8">
              {SITE_FAQ_ENTRIES.map((entry) => (
                <div key={entry.question} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {entry.question}
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {entry.answer}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact CTA */}
            <div className="mt-16 bg-amber-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Still Have Questions?
              </h2>
              <p className="text-gray-600 mb-6">
                Our expert team is here to help with any questions about FANUC parts or technical support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Contact Us
                </a>
                <a
                  href="mailto:sales@vcocncspare.com"
                  className="bg-white text-amber-600 border border-amber-600 px-6 py-3 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
