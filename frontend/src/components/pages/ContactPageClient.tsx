'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ContactService from '@/services/contact.service';
import type { ContactCreateRequest } from '@/services/contact.service';
import PublicLayout from '@/components/layout/PublicLayout';
import { getSiteUrl } from '@/lib/url';
import { createPageText, type PageData } from '@/lib/page-content';
import { CONTACT_PAGE_SCHEMA } from '@/lib/page-content-schema';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  BuildingOfficeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface QueryPrefillPayload {
  email: string;
  sku: string;
  productName: string;
  inquiryType?: ContactCreateRequest['inquiry_type'];
}

const ALLOWED_INQUIRY_TYPES = new Set(['general', 'parts', 'repair', 'support', 'quote']);

function ContactQueryPrefill({ onPrefill }: { onPrefill: (payload: QueryPrefillPayload) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = (searchParams?.get('email') || '').trim();
    const sku = (searchParams?.get('sku') || '').trim();
    const productName = (searchParams?.get('product') || '').trim();
    const rawType = (searchParams?.get('type') || searchParams?.get('inquiry_type') || '').trim().toLowerCase();
    const inquiryType = ALLOWED_INQUIRY_TYPES.has(rawType)
      ? (rawType as ContactCreateRequest['inquiry_type'])
      : undefined;

    if (!email && !sku && !productName && !inquiryType) return;
    onPrefill({ email, sku, productName, inquiryType });
  }, [searchParams, onPrefill]);

  return null;
}

export default function ContactPageClient({ data }: { data: PageData }) {
  const siteUrl = getSiteUrl().replace(/\/+$/, '');
  const text = createPageText(CONTACT_PAGE_SCHEMA, data);
  const heroImage = text('heroImage');
  const heroStyle = heroImage
    ? { backgroundImage: `linear-gradient(rgba(234, 179, 8, 0.85), rgba(202, 138, 4, 0.85)), url(${JSON.stringify(heroImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  const [prefillBanner, setPrefillBanner] = useState<{ sku: string; productName: string } | null>(null);
  const [formData, setFormData] = useState<ContactCreateRequest>({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
    inquiry_type: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQueryPrefill = useCallback(({ email, sku, productName, inquiryType }: QueryPrefillPayload) => {
    if (sku || productName) {
      setPrefillBanner({ sku, productName });
    }
    setFormData((prev) => {
      const next = { ...prev };
      if (email) next.email = email;
      if (inquiryType) {
        next.inquiry_type = inquiryType;
      }
      if (sku || productName) {
        next.inquiry_type = 'quote';
        if (!prev.subject) {
          next.subject = sku
            ? `Quote Request: ${sku}`
            : `Quote Request: ${productName}`;
        }
        if (!prev.message) {
          const lines = [
            'Hello,',
            '',
            'I would like to request a quote for the following part:',
            ...(sku ? [`SKU: ${sku}`] : []),
            ...(productName ? [`Product: ${productName}`] : []),
            'Quantity: 1',
            '',
            'Please provide pricing, availability, and lead time. Thank you!',
          ];
          next.message = lines.join('\n');
        }
      }
      return next;
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await ContactService.submitContact(formData);

      toast.success('Thank you for your message! We will get back to you soon.');
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        subject: '',
        message: '',
        inquiry_type: 'general'
      });
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error && error.message ? error.message : 'Failed to send message. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactPageSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${siteUrl}/contact#webpage`,
    "name": "Contact Vcocnc",
    "description": "Get in touch with Vcocnc for CNC and industrial automation spare parts inquiries, model verification, technical support, and quotes.",
    "url": `${siteUrl}/contact`,
    // Reference the organisation node declared once in the root layout
    // instead of redefining the same @id (with conflicting hours) here.
    "mainEntity": { "@id": `${siteUrl}/#organization` }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Contact", "item": `${siteUrl}/contact` }
    ]
  };

  return (
    <PublicLayout>
      {/* Keep useSearchParams isolated in a zero-UI Suspense child so the entire Contact page & JSON-LD SSR cleanly */}
      <Suspense fallback={null}>
        <ContactQueryPrefill onPrefill={handleQueryPrefill} />
      </Suspense>

      {/* Contact Page Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [contactPageSchema, breadcrumbSchema] }).replace(/</g, '\\u003c')
        }}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-24" style={heroStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{text('heroTitle')}</h1>
            <p className="whitespace-pre-line text-xl md:text-2xl text-yellow-900 max-w-3xl mx-auto">{text('heroText')}</p>
          </div>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Contact Information */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">{text('infoTitle')}</h2>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPinIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Address</h3>
                    <p className="whitespace-pre-line text-gray-600">{text('address')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <PhoneIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Phone</h3>
                    <p className="text-gray-600"><a href={`tel:${text('phone').replace(/[^+\d]/g, '')}`} className="hover:text-yellow-700">{text('phone')}</a></p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <EnvelopeIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600"><a href={`mailto:${text('email')}`} className="break-all hover:text-yellow-700">{text('email')}</a></p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <ClockIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Business Hours</h3>
                    <p className="whitespace-pre-line text-gray-600">{text('hours')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <BuildingOfficeIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Facility</h3>
                    <p className="text-gray-600">{text('facility')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <GlobeAltIcon className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Service Area</h3>
                    <p className="text-gray-600">{text('serviceArea')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{text('formTitle')}</h2>
                {prefillBanner && (prefillBanner.sku || prefillBanner.productName) && (
                  <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Quote inquiry prefilled:</span>{' '}
                    {prefillBanner.sku && (
                      <span className="font-mono font-medium">{prefillBanner.sku}</span>
                    )}
                    {prefillBanner.sku && prefillBanner.productName && ' — '}
                    {prefillBanner.productName}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="your.email@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="inquiry_type" className="block text-sm font-medium text-gray-700 mb-2">
                        Inquiry Type
                      </label>
                      <select
                        id="inquiry_type"
                        name="inquiry_type"
                        value={formData.inquiry_type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="parts">Parts Request</option>
                        <option value="repair">Repair Service</option>
                        <option value="support">Technical Support</option>
                        <option value="quote">Request Quote</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Brief subject of your inquiry"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Please provide details about your requirements, including part numbers if available..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-yellow-500 text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {text('whyTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{text('why1Title')}</h3>
              <p className="whitespace-pre-line text-gray-600">{text('why1Text')}</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{text('why2Title')}</h3>
              <p className="whitespace-pre-line text-gray-600">{text('why2Text')}</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <GlobeAltIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{text('why3Title')}</h3>
              <p className="whitespace-pre-line text-gray-600">{text('why3Text')}</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
