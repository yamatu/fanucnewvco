'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ContactService from '@/services/contact.service';
import { useQuoteModalStore } from '@/store/quote-modal.store';
import { useCustomerStore } from '@/store/customer.store';
import { formatCurrency } from '@/lib/utils';

const SESSION_PREFILL_KEY = 'vcocnc_quote_contact_prefill';

interface SavedContactPrefill {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
}

function readSavedPrefill(): SavedContactPrefill {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFILL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as SavedContactPrefill) : {};
  } catch {
    return {};
  }
}

function savePrefill(data: SavedContactPrefill) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_PREFILL_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export default function QuickQuoteModal() {
  const { isOpen, product, closeQuoteModal } = useQuoteModalStore();
  const customer = useCustomerStore((state) => state.customer);

  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // Reset product fields & hydrate saved customer details whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    const saved = readSavedPrefill();
    setPartNumber(product?.sku || '');
    setQuantity(String(product?.quantity && product.quantity > 0 ? product.quantity : 1));
    setName(saved.name || customer?.full_name || '');
    setEmail(saved.email || customer?.email || '');
    setCompany(saved.company || customer?.company || '');
    setPhone(saved.phone || customer?.phone || '');
    setNotes('');
    setErrorMessage('');
    setSubmittedId(null);

    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, product, customer]);

  // Body scroll lock & Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        closeQuoteModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, isSubmitting, closeQuoteModal]);

  if (!isOpen) return null;

  const trimmedPart = partNumber.trim() || product?.sku || '';
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!trimmedName || !trimmedEmail) {
      setErrorMessage('Please enter your name and email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const resolvedUrl = product?.productUrl
        ? product.productUrl.startsWith('http')
          ? product.productUrl
          : `${origin}${product.productUrl}`
        : typeof window !== 'undefined'
          ? window.location.href
          : '';

      const subjectTarget = trimmedPart || product?.name || 'Industrial Automation Part';
      const subject = `Quote Request: ${subjectTarget}`.slice(0, 190);

      const messageLines = [
        'Quick Quote Inquiry (Submitted from Product Page)',
        '----------------------------------------',
        ...(trimmedPart ? [`SKU / Part Number: ${trimmedPart}`] : []),
        ...(product?.name ? [`Product: ${product.name}`] : []),
        ...(product?.brand ? [`Brand: ${product.brand}`] : []),
        ...(product?.price && product.price > 0 ? [`Listed Price: ${formatCurrency(product.price)}`] : []),
        `Quantity: ${parsedQty}`,
        ...(resolvedUrl ? [`Page URL: ${resolvedUrl}`] : []),
        '',
        notes.trim()
          ? `Customer Notes:\n${notes.trim()}`
          : 'Customer Notes:\nPlease provide your best quote, current stock availability, and lead time.',
      ];

      const result = await ContactService.submitContact({
        name: trimmedName,
        email: trimmedEmail,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        subject,
        message: messageLines.join('\n'),
        inquiry_type: 'quote',
      });

      savePrefill({
        name: trimmedName,
        email: trimmedEmail,
        company: company.trim(),
        phone: phone.trim(),
      });

      setSubmittedId(result?.id ?? 0);
      toast.success('Quote request submitted! Our team will reply shortly.');
    } catch (error: unknown) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to submit quote request. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppFallback = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = [
      `Hi, I'd like to request a quote:`,
      ...(trimmedPart ? [`SKU / Model: ${trimmedPart}`] : []),
      ...(product?.name ? [`Product: ${product.name}`] : []),
      `Quantity: ${parsedQty}`,
      ...(notes.trim() ? [`Notes: ${notes.trim()}`] : []),
      ...(url ? [`Link: ${url}`] : []),
    ].join('\n');
    window.open(`https://wa.me/8613348028050?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={() => !isSubmitting && closeQuoteModal()}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 bg-gray-900 px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
              <EnvelopeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold leading-snug text-white">
                Request a Quick Quote
              </h2>
              <p className="mt-0.5 text-xs text-gray-300">
                Fast pricing, live stock check, bulk discounts &amp; lead time — reply within 2 hours during business hours.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSubmitting && closeQuoteModal()}
            aria-label="Close quote modal"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {/* Auto-filled Product Context Banner */}
          {product && (product.sku || product.name) && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50/80 p-3">
              {product.imageUrl && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-yellow-200 bg-white">
                  <Image
                    src={product.imageUrl}
                    alt={product.name || product.sku}
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-contain p-1"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {product.sku && (
                    <span className="inline-flex items-center rounded bg-gray-900 px-2 py-0.5 font-mono text-xs font-semibold text-yellow-400">
                      {product.sku}
                    </span>
                  )}
                  {product.price && product.price > 0 && (
                    <span className="text-xs font-semibold text-yellow-800">
                      Listed: {formatCurrency(product.price)}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                  {product.name}
                </p>
              </div>
            </div>
          )}

          {submittedId !== null ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircleIcon className="h-9 w-9" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Quote Request Received!</h3>
              <p className="mt-1.5 text-sm text-gray-600">
                We have received your inquiry
                {trimmedPart ? (
                  <>
                    {' '}for <span className="font-mono font-semibold text-gray-900">{trimmedPart}</span>
                  </>
                ) : null}
                {submittedId > 0 ? ` (Ref #${submittedId})` : ''}. Our sales specialist will send your quotation to{' '}
                <span className="font-medium text-gray-900">{trimmedEmail}</span> shortly.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeQuoteModal}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-yellow-500 px-5 text-sm font-semibold text-black transition-colors hover:bg-yellow-600"
                >
                  Continue Browsing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedId(null);
                    setNotes('');
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Send Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Row 1: Auto-filled Part Number / Model + Quantity */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="quote-part-number" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Part Number / Model *
                  </label>
                  <input
                    id="quote-part-number"
                    type="text"
                    required
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="e.g. A06B-6114-H205"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm font-medium text-gray-900 focus:border-yellow-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="quote-quantity" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Quantity *
                  </label>
                  <input
                    id="quote-quantity"
                    type="number"
                    min={1}
                    max={99999}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
              </div>

              {/* Row 2: Full Name + Email */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="quote-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Full Name *
                  </label>
                  <input
                    ref={firstInputRef}
                    id="quote-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="quote-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Email Address *
                  </label>
                  <input
                    id="quote-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
              </div>

              {/* Row 3: Company + Phone / WhatsApp */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="quote-company" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Company (Optional)
                  </label>
                  <input
                    id="quote-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="quote-phone" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    id="quote-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 / +86 ..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />
                </div>
              </div>

              {/* Row 4: Notes */}
              <div>
                <label htmlFor="quote-notes" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Additional Requirements (Optional)
                </label>
                <textarea
                  id="quote-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condition preference (new / refurbished), target delivery country, bulk pricing, or other part numbers..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleWhatsAppFallback}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 transition-colors hover:text-green-800 sm:justify-start"
                >
                  <span>Need urgent help? Chat via WhatsApp &rarr;</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeQuoteModal}
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 shrink-0" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Quote Request'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
