import type { Product } from '@/types';

const GENERIC_PART_TYPE = 'Industrial Automation Part';

function normalizeWhitespace(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripLeadingBrand(value: string, brand: string): string {
  if (!brand) return normalizeWhitespace(value);
  return normalizeWhitespace(value).replace(new RegExp(`^${escapeRegExp(brand)}(?:[\\s/_-]+|$)`, 'i'), '').trim();
}

export function stripProductMarkup(value?: string): string {
  return normalizeWhitespace(String(value || '').replace(/<[^>]*>/g, ' '));
}

/**
 * Infer a customer-facing product family while legacy catalogue records still
 * carry a broad category. These rules only affect rendered SEO copy.
 */
export function inferProductTypeLabel(product: Product): string {
  const sku = normalizeWhitespace(product.sku).toUpperCase();
  const brand = normalizeWhitespace(product.brand).toLowerCase();
  const content = stripProductMarkup([
    product.name,
    product.short_description,
    product.description,
    product.meta_title,
  ].filter(Boolean).join(' '));

  if (brand === 'fanuc' && /^A06B-6092-/i.test(sku)) return 'Spindle Amplifier Module';

  if (brand === 'fanuc') {
    const explicitType = content.match(
      /(?:^|[.\n]\s*|\bType:\s*)(?:ALPHA\s+)?(Spindle Amplifier(?:\s+(?:Module|\/\s*Drive))?(?:\s*\([^)]*\))?)/i,
    );
    if (explicitType?.[1]) return normalizeWhitespace(explicitType[1]);
  }

  return normalizeWhitespace(product.category?.name) || GENERIC_PART_TYPE;
}

export function buildSemanticProductName(product: Product): string {
  const brand = normalizeWhitespace(product.brand);
  const sku = normalizeWhitespace(product.sku);
  const storedName = normalizeWhitespace(product.name);
  const rawType = inferProductTypeLabel(product);
  const type = stripLeadingBrand(rawType, brand) || rawType;
  const normalizedStored = storedName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalizedSku = sku.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const storedIsSkuOnly = !storedName || normalizedStored === normalizedSku;
  const hasBrand = Boolean(brand && new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(brand)}(?:[^a-z0-9]|$)`, 'i').test(storedName));

  return [
    hasBrand ? '' : brand,
    storedName || sku,
    storedIsSkuOnly ? type : '',
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function buildProductSeoDescription(product: Product, maxLength = 160): string {
  const explicit = stripProductMarkup(product.meta_description);
  const brand = normalizeWhitespace(product.brand);
  const brandPattern = brand ? escapeRegExp(brand) : '';
  const brokenEnding = /(?:\band\s+(?:fast|global|worldwide)|[,;:]|\bwith)[.!?]?$/i.test(explicit);
  const repeatedBrand = brand
    ? new RegExp(`(?:^|[^a-z0-9])${brandPattern}(?:[^a-z0-9]|$)[^.]{0,90}(?:^|[^a-z0-9])${brandPattern}(?:[^a-z0-9]|$)`, 'i').test(explicit)
    : false;
  if (explicit && explicit.length <= maxLength && !brokenEnding && !repeatedBrand) return explicit;

  const subject = [brand || 'Industrial automation', normalizeWhitespace(product.sku)].filter(Boolean).join(' ');
  const type = stripLeadingBrand(inferProductTypeLabel(product), brand) || inferProductTypeLabel(product);
  const availability = product.stock_quantity > 0 ? 'in stock' : 'available to order';
  const rawWarranty = normalizeWhitespace(product.warranty_period) || '12 months';
  const warranty = rawWarranty
    .replace(/\bmonths?\b/i, 'month')
    .replace(/\s+/g, '-');
  const candidates = [
    `${subject} ${type}, ${availability} for CNC repair and replacement. ${warranty} warranty and worldwide shipping.`,
    `${subject} ${type}, ${availability}. Compatibility support, ${warranty} warranty and worldwide shipping.`,
    `${subject} ${type} for CNC repair and replacement, with compatibility support and worldwide shipping.`,
  ];
  const chosen = candidates.find((candidate) => candidate.length <= maxLength) || candidates[candidates.length - 1];
  if (chosen.length <= maxLength) return chosen;
  const cut = chosen.slice(0, maxLength);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > 80 ? boundary : maxLength).replace(/[,.\s]+$/, '')}.`;
}

export function buildProductSeoKeywords(product: Product): string {
  const brand = normalizeWhitespace(product.brand);
  const sku = normalizeWhitespace(product.sku);
  const rawType = inferProductTypeLabel(product);
  const type = stripLeadingBrand(rawType, brand) || rawType;
  const candidates = [
    [brand, sku].filter(Boolean).join(' '),
    sku,
    [brand, type].filter(Boolean).join(' '),
    type,
    [type, 'replacement'].filter(Boolean).join(' '),
    'industrial automation parts',
    'VIBO CNC',
  ];
  return [...new Set(candidates.map(normalizeWhitespace).filter(Boolean))].join(', ');
}
