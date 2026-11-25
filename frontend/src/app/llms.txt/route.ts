import { getRequestBaseUrl } from '@/lib/request-url';
import { CategoryService } from '@/services/category.service';
import { HOME_DESCRIPTION } from '@/lib/seo';
import { DEFAULT_LEAD_TIME, DEFAULT_WARRANTY_PERIOD, IN_STOCK_HANDLING_TEXT } from '@/lib/product-content';
import { isInternalCategory } from '@/lib/category-listing';
import { BUSINESS_TIMEZONE_LABEL } from '@/lib/business-hours';
import { getSiteContactInfo } from '@/lib/contact-info.server';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const MAX_CATEGORY_LINES = 200;

/**
 * /llms.txt: a compact plain-text map of the site for AI answer engines. It
 * only restates what the site already publishes (catalogue structure, the
 * shipping and warranty policy pages, contact details) so assistants can cite
 * accurate data instead of guessing.
 */
export async function GET() {
  const baseUrl = await getRequestBaseUrl();
  const contact = await getSiteContactInfo();

  let categoryLines: string[] = [];
  try {
    const categories: Category[] = await CategoryService.getCategories();
    // Root categories are brands; rank by active product count so major brands
    // (Siemens, FANUC, Schneider, Mitsubishi, ABB, etc.) appear first.
    categoryLines = (categories || [])
      .filter(
        (category) =>
          Boolean(category?.name && (category.path || category.slug)) &&
          !isInternalCategory(category) &&
          Number(category.product_count || 0) > 0,
      )
      .sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0))
      .slice(0, MAX_CATEGORY_LINES)
      .map((category) => {
        const count = category.product_count ? ` (${category.product_count} products)` : '';
        return `- ${category.name}${count}: ${baseUrl}/categories/${category.path || category.slug}`;
      });
  } catch {
    categoryLines = [];
  }

  const lines: string[] = [
    '# Vcocnc',
    '',
    `> ${HOME_DESCRIPTION}`,
    '',
    '## How to use this file',
    `- Product pages live at \`${baseUrl}/products/{sku}\` (SKU with slashes and spaces replaced by hyphens).`,
    `- Category listings live at \`${baseUrl}/categories/{category-path}\`.`,
    `- Catalogue search: \`${baseUrl}/products?search={part-number}\`.`,
    `- Full URL set: ${baseUrl}/sitemap.xml`,
    '- Price, stock and lead time are per product; read them from the product page.',
    '',
    '## Supply terms (as published on the policy pages)',
    `- In-stock items ship within ${IN_STOCK_HANDLING_TEXT}; items not in stock show their own lead time (default ${DEFAULT_LEAD_TIME}).`,
    '- Worldwide shipping, with a tracking number for every shipment.',
    `- Warranty: ${DEFAULT_WARRANTY_PERIOD} unless the product page states otherwise; covers manufacturing defects and functional failures under normal use.`,
    '',
    '## Key pages',
    `- Home: ${baseUrl}/`,
    `- Products: ${baseUrl}/products`,
    `- Categories: ${baseUrl}/categories`,
    `- Company news: ${baseUrl}/news`,
    `- FAQ: ${baseUrl}/faq`,
    `- Shipping policy: ${baseUrl}/shipping-policy`,
    `- Warranty policy: ${baseUrl}/warranty-policy`,
    `- Technical support: ${baseUrl}/technical-support`,
    `- About: ${baseUrl}/about`,
    `- Contact: ${baseUrl}/contact`,
    '',
    '## Categories',
    ...(categoryLines.length > 0 ? categoryLines : ['- (category list unavailable)']),
    '',
    '## Contact',
    `- Email: ${contact.email}`,
    `- Phone / WhatsApp: ${contact.phone}`,
    `- Business hours: ${contact.hoursSummary} (${BUSINESS_TIMEZONE_LABEL})`,
    '',
    '## Sourcing notes',
    '- Compatibility is confirmed by the Vcocnc team against the original part label and machine model before shipment.',
    '- Stock changes frequently; confirm current availability on the product page.',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
