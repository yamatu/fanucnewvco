import type { Product, ProductFAQ } from '@/types';

// Supply terms the storefront already publishes (product page panels, the
// shipping policy and the warranty policy pages). They are hard-coded on this
// site, so they live in one place for the visible FAQ and its JSON-LD.
export const DEFAULT_WARRANTY_PERIOD = '12 months';
export const DEFAULT_LEAD_TIME = '3-7 days';
export const IN_STOCK_HANDLING_TEXT = '1-2 business days';
export const SALES_EMAIL = 'sales@vcocncspare.com';

// Bulk/auto optimisation and catalogue seeds fill compatibility, installation,
// maintenance and FAQ fields with the same template text on every product.
// Rendering that boilerplate on every page adds no unique content and repeats
// facts that already have their own section, so it is hidden at render time.
// Detection is by signature only: operator-written text never matches these
// patterns and is always shown.
const GENERATED_COMPATIBILITY = [
  /must be checked against the original part label/i,
  /confirm compatibility for .+ against your original part label/i,
  /confirm compatibility for .+ against your original part number, controller model/i,
  /should be checked against the original part number, CNC series/i,
  /compatibility against your original part number and machine configuration before ordering/i,
  /^confirm compatibility for \S+ against the original (?:model )?label, /i,
];
const GENERATED_INSTALLATION = [
  /confirm the exact part number on the original unit/i,
  /according to your machine maintenance procedure after isolating power/i,
  /only after isolating power and following the .+ manual and machine builder maintenance procedure/i,
];
const GENERATED_MAINTENANCE = [
  /from conductive dust, oil mist,? and unstable (?:supply )?voltage/i,
  /clean, dry, and properly stored to support reliable industrial operation/i,
  /^keep \S+ clean, dry, and (?:properly|correctly) (?:aligned|stored)\. Check /i,
];
const GENERATED_FAQ_ANSWERS = [
  ...GENERATED_COMPATIBILITY,
  /buyers usually match it by original part number/i,
  /is used (?:for|in) CNC (?:repair|and industrial automation)/i,
  /is currently in stock and ready for .*shipment\.?$/i,
  /is available to order with .+ lead time\.?$/i,
];

const matchesAny = (text: string | undefined, patterns: RegExp[]) =>
  Boolean(text && patterns.some((pattern) => pattern.test(text)));

function ownText(text: string | undefined, generated: RegExp[]): string | null {
  const value = String(text || '').trim();
  return value && !matchesAny(value, generated) ? value : null;
}

export const customCompatibilityInfo = (product: Product) => ownText(product.compatibility_info, GENERATED_COMPATIBILITY);
export const customInstallationGuide = (product: Product) => ownText(product.installation_guide, GENERATED_INSTALLATION);
export const customMaintenanceTips = (product: Product) => ownText(product.maintenance_tips, GENERATED_MAINTENANCE);

const isGeneratedFaq = (faq: ProductFAQ) => matchesAny(faq.answer, GENERATED_FAQ_ANSWERS);

// Drops template fields before the product is serialized into the page, so the
// hidden boilerplate is not shipped in the hydration payload either.
export function withoutGeneratedContent(product: Product): Product {
  return {
    ...product,
    compatibility_info: customCompatibilityInfo(product) || '',
    installation_guide: customInstallationGuide(product) || '',
    maintenance_tips: customMaintenanceTips(product) || '',
    faqs: product.faqs?.filter((faq) => !isGeneratedFaq(faq)),
  };
}

export interface ProductFaqItem {
  id?: number;
  question: string;
  answer: string;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const resolveWarrantyPeriod = (product: Product) =>
  String(product.warranty_period || '').trim() || DEFAULT_WARRANTY_PERIOD;
export const resolveLeadTime = (product: Product) =>
  String(product.lead_time || '').trim() || DEFAULT_LEAD_TIME;

// One FAQ set for both the visible accordion and the FAQPage JSON-LD (Google
// requires them to match). Each answer states a fact once instead of
// restating the compatibility block or the summary panel, and only uses terms
// the site already publishes (no return window is published, so none is cited).
export function buildProductFaqs(product: Product): ProductFaqItem[] {
  const custom = (product.faqs || [])
    .filter((faq: ProductFAQ) => faq.is_active && faq.question?.trim() && faq.answer?.trim())
    .filter((faq) => !isGeneratedFaq(faq))
    .map((faq) => ({ id: faq.id, question: faq.question.trim(), answer: faq.answer.trim() }));
  if (custom.length > 0) return custom;

  const sku = product.sku;
  const compatibility = customCompatibilityInfo(product);

  return [
    {
      question: `Is ${sku} in stock and when does it ship?`,
      answer: product.stock_quantity > 0
        ? `Yes. ${sku} is in stock and ships within ${IN_STOCK_HANDLING_TEXT}, with a tracking number for every shipment.`
        : `${sku} is available to order with ${resolveLeadTime(product)} lead time.`,
    },
    {
      question: `What warranty applies to ${sku}?`,
      answer: `${sku} is supplied with a warranty of ${resolveWarrantyPeriod(product)}, covering manufacturing defects and functional failures under normal use.`,
    },
    {
      question: `How do I confirm ${sku} fits my machine?`,
      answer: compatibility
        ? stripHtml(compatibility)
        : `Send a photo of the original part label or your machine model to ${SALES_EMAIL} and we will confirm compatibility before shipment.`,
    },
  ];
}

// Spec rows that repeat a fact the details table already shows (generated
// spec tables copy brand, SKU, warranty, condition, origin, etc.).
const DETAIL_SPEC_KEYS = new Set([
  'sku', 'brand', 'manufacturer', 'warranty', 'condition', 'lead time', 'country of origin', 'origin',
  'component type', 'category', 'certifications', 'part number', 'manufacturer part number',
]);

export function extraSpecRows(
  specs: Record<string, string> | null,
  product: Product,
): Array<[string, string]> {
  if (!specs) return [];
  const known = [product.sku, product.part_number].map((value) => String(value || '').trim().toLowerCase());
  return Object.entries(specs)
    .map(([key, value]) => [key.trim(), String(value ?? '').trim()] as [string, string])
    .filter(([key, value]) => {
      if (!key || !value) return false;
      const normalizedKey = key.toLowerCase();
      if (DETAIL_SPEC_KEYS.has(normalizedKey)) return false;
      if (normalizedKey === 'minimum order quantity' && value === '1') return false;
      // "Model / part number" is only useful when it adds something (series, revision).
      if (normalizedKey.startsWith('model') && known.includes(value.toLowerCase())) return false;
      return true;
    });
}
