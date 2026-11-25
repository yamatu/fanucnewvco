import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { buildStaticPageMetadata } from '@/lib/seo';
import { BUSINESS_TIMEZONE_LABEL } from '@/lib/business-hours';
import { getSiteContactInfo } from '@/lib/contact-info.server';

export const metadata: Metadata = buildStaticPageMetadata(
  '/returns',
  'Returns & Refunds Policy | Vcocnc',
  '30-day return window, RMA authorization process, return shipping terms, and refund timelines for Vcocnc CNC and automation spare parts.',
  'returns policy, refund policy, RMA process, CNC parts returns, automation parts refund, Vcocnc returns'
);

// Contact details follow the Contact page record, so this page cannot
// drift from /contact again.
export const revalidate = 300;

export default async function ReturnsPage() {
  const contact = await getSiteContactInfo();
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-4">
          <Link prefetch={false} href="/" className="hover:text-gray-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Returns &amp; Refunds Policy</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Returns &amp; Refunds Policy</h1>
        <p className="text-gray-600 mb-8">
          Vcocnc provides a transparent 30-day return and refund process for CNC and industrial automation replacement parts purchased online. For functional defects beyond 30 days, please also review our{' '}
          <Link prefetch={false} href="/warranty-policy" className="text-amber-700 underline hover:text-amber-800">
            12-Month Warranty Policy
          </Link>.
        </p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Return Window</dt>
                <dd className="font-semibold text-gray-900">30 days from delivery date</dd>
              </div>
              <div>
                <dt className="text-gray-500">Return Method</dt>
                <dd className="font-semibold text-gray-900">By mail with issued RMA number</dd>
              </div>
              <div>
                <dt className="text-gray-500">Refund Processing Time</dt>
                <dd className="font-semibold text-gray-900">5–7 business days after inspection</dd>
              </div>
              <div>
                <dt className="text-gray-500">Refund Method</dt>
                <dd className="font-semibold text-gray-900">Original payment method (PayPal)</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Return Eligibility (30-Day Window)</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Standard Returns:</strong> Unused, uninstalled parts in original packaging with all manuals, connectors, and accessories may be returned within <strong>30 calendar days</strong> of delivery.
              </li>
              <li>
                <strong>Defective or Incorrect Items:</strong> Parts that arrive damaged in transit, fail initial functional testing, or do not match the ordered SKU/part number are eligible for a full refund or free replacement within 30 days of delivery.
              </li>
              <li>
                <strong>Non-Returnable Exceptions:</strong> Items damaged through improper wiring, power surges, unauthorized modification, or missing serial/warranty seals cannot be accepted for standard discretionary return.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How to Start a Return (RMA Process)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Email <a href={`mailto:${contact.email}`} className="text-amber-700 underline">{contact.email}</a> or call <strong>{contact.phone}</strong> within 30 days of receiving your order.
              </li>
              <li>
                Include your <strong>Order Number</strong>, <strong>SKU / Part Number</strong>, reason for return, and photos or short video if the item is defective or damaged.
              </li>
              <li>
                Our support engineers issue a Return Merchandise Authorization (RMA) number and return warehouse instructions within <strong>1–2 business days</strong>. Please do not ship packages back before receiving an RMA number.
              </li>
              <li>
                Pack the component securely in anti-static protective packaging with the RMA number clearly labeled on the outside of the parcel.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Return Shipping Costs &amp; Restocking Fees</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Defective, Damaged, or Wrong Item Sent:</strong> Vcocnc covers or reimburses return shipping fees and charges <strong>no restocking fee</strong>.
              </li>
              <li>
                <strong>Buyer-Initiated / Ordering-Error Returns:</strong> The buyer is responsible for return freight to our inspection warehouse. No hidden fees apply for unopened standard-stock items; original outbound shipping charges and local import duties are non-refundable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Inspection &amp; Refund Timeline</h2>
            <p>
              Once your return arrives at our Kunshan service warehouse, our technicians inspect the part within <strong>2–3 business days</strong>. Upon approval, your refund is issued directly back to your <strong>original PayPal payment method</strong> within <strong>5–7 business days</strong>. You will receive an email confirmation with refund details as soon as the transaction is processed.
            </p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Return Service Center &amp; Support Contact</h2>
            <ul className="space-y-1.5 text-sm">
              <li><strong>Company:</strong> Vcocnc CNC Solutions</li>
              <li><strong>Return Warehouse Location:</strong> Kunshan, Jiangsu Province, China (full street dispatch label provided upon RMA approval)</li>
              <li><strong>Email:</strong> <a href={`mailto:${contact.email}`} className="text-amber-700 underline">{contact.email}</a></li>
              <li><strong>Phone / WhatsApp:</strong> {contact.phone}</li>
              <li><strong>Business Hours:</strong> {contact.hoursSummary} ({BUSINESS_TIMEZONE_LABEL})</li>
            </ul>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
