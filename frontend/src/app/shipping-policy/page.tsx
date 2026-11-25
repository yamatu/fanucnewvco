import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { buildStaticPageMetadata } from '@/lib/seo';
import { BUSINESS_TIMEZONE_LABEL } from '@/lib/business-hours';
import { getSiteContactInfo } from '@/lib/contact-info.server';

export const metadata: Metadata = buildStaticPageMetadata(
  '/shipping-policy',
  'Shipping Policy | Vcocnc',
  'Handling times, international express carriers (DHL, FedEx, UPS), transparent USD shipping calculation, transit times, and customs terms for Vcocnc orders.',
  'shipping policy, CNC parts shipping, industrial automation delivery, DHL FedEx UPS shipping, Vcocnc shipping'
);

// Contact details follow the Contact page record, so this page cannot
// drift from /contact again.
export const revalidate = 300;

export default async function ShippingPolicyPage() {
  const contact = await getSiteContactInfo();
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-4">
          <Link prefetch={false} href="/" className="hover:text-gray-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Shipping Policy</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipping Policy</h1>
        <p className="text-gray-600 mb-8">
          Vcocnc ships stocked CNC and industrial automation replacement parts worldwide from our warehouse in Kunshan, Jiangsu, China using trackable express carriers.
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Delivery Timelines at a Glance</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Order Handling (In Stock)</dt>
                <dd className="font-semibold text-gray-900">1–2 business days</dd>
              </div>
              <div>
                <dt className="text-gray-500">Express Transit Time</dt>
                <dd className="font-semibold text-gray-900">4–5 business days</dd>
              </div>
              <div>
                <dt className="text-gray-500">Primary Carriers</dt>
                <dd className="font-semibold text-gray-900">DHL, FedEx, UPS</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Processing &amp; Dispatch Times</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>In-Stock Items:</strong> Tested, packed, and dispatched within <strong>1–2 business days</strong> after payment verification (Monday–Friday, excluding public holidays).
              </li>
              <li>
                <strong>Backorder / Special-Order Items:</strong> Typical dispatch lead time is <strong>3–7 business days</strong>; exact scheduling is confirmed on the product page or quotation before payment.
              </li>
              <li>
                <strong>Shipment Tracking:</strong> Every parcel ships with a carrier tracking number emailed automatically upon dispatch. You can also check status anytime via our{' '}
                <Link prefetch={false} href="/track-order" className="text-amber-700 underline hover:text-amber-800">
                  Order Tracking
                </Link> page.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Shipping Destinations &amp; Transit Times</h2>
            <p className="mb-3">
              We deliver worldwide across North America (United States, Canada), Europe (United Kingdom, Germany, France, Italy, Spain, and EU member states), Asia-Pacific (Australia, Japan, Singapore), and other supported destinations via <strong>DHL Express, FedEx International Priority, and UPS Worldwide</strong>.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>United States, Canada, UK, EU, Australia &amp; Japan:</strong> typically <strong>4–5 business days</strong> in transit after dispatch.</li>
              <li><strong>Remote or Extended Areas:</strong> may require an additional 1–3 business days depending on local carrier routing and customs inspection.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Shipping Rates &amp; Cost Transparency</h2>
            <p>
              All shipping costs are calculated in <strong>USD</strong> based on destination country and parcel billable weight. Exact shipping charges are displayed upfront on each priced product page (using the built-in country rate estimator) and finalized transparently at checkout before you authorize payment. Where free-shipping promotions apply to a destination country, checkout automatically shows <strong>$0.00 / Free Shipping</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Export Packaging &amp; Transit Damage</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Sensitive PCBs, drives, amplifiers, and servo components are sealed in ESD-safe anti-static bags with high-density cushioning and rigid outer cartons.</li>
              <li>Please inspect the shipment on delivery. If external damage is visible, note it with the courier and contact <a href={`mailto:${contact.email}`} className="text-amber-700 underline">{contact.email}</a> within <strong>48 hours</strong> with photos so we can assist immediately.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Customs Duties &amp; Import Taxes</h2>
            <p>
              International orders are shipped under standard commercial export documentation. Unless explicitly arranged otherwise on a B2B proforma invoice, import duties, VAT/GST, and local customs brokerage fees are the responsibility of the recipient.
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Shipping Questions?</h2>
            <p>
              Contact our logistics team at <a href={`mailto:${contact.email}`} className="text-amber-700 underline">{contact.email}</a> or <strong>{contact.phone}</strong> ({contact.hoursSummary} {BUSINESS_TIMEZONE_LABEL}).
            </p>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
