#!/usr/bin/env node

const targetOrigin = (process.argv[2] || process.env.SEO_AUDIT_ORIGIN || 'https://www.vibocnc.com').replace(/\/+$/, '');
const warningBytes = Number(process.env.SEO_HTML_WARNING_BYTES || 1_500_000);
const googlebotLimitBytes = 2 * 1024 * 1024;

const routes = [
  { path: '/', indexable: true, hreflang: true },
  { path: '/products', indexable: true, hreflang: true },
  { path: '/blog', indexable: true, hreflang: true },
  { path: '/news', indexable: true, hreflang: true },
  { path: '/fr', indexable: true, hreflang: true },
  { path: '/products?search=fanuc', indexable: false, hreflang: false },
  { path: '/login', indexable: false, hreflang: false },
  { path: '/account', indexable: false, hreflang: false },
  { path: '/checkout', indexable: false, hreflang: false },
  { path: '/track-order', indexable: false, hreflang: false },
];

const auditedSku = process.env.SEO_AUDIT_SKU || (targetOrigin.includes('vibocnc.com') ? 'A06B-6092-H275#H508' : '');
if (auditedSku) {
  const encodedSku = encodeURIComponent(auditedSku).replace(/%2F/gi, '-');
  routes.splice(4, 0,
    { path: `/products/${encodedSku}`, indexable: true, hreflang: true, product: true, sku: auditedSku },
    { path: `/es/products/${encodedSku}`, indexable: false, hreflang: false, untranslatedLocale: true },
  );
}

async function getRepresentativeProductPath() {
  try {
    const response = await fetch(`${targetOrigin}/sitemap-products/1.xml`);
    if (!response.ok) return null;
    const xml = await response.text();
    const location = xml.match(/<loc>([^<]*\/products\/[^<]+)<\/loc>/i)?.[1];
    if (!location) return null;
    const productUrl = new URL(location.replace(/&amp;/g, '&'));
    return `${productUrl.pathname}${productUrl.search}`;
  } catch {
    return null;
  }
}

const representativeProductPath = await getRepresentativeProductPath();
if (representativeProductPath) routes.splice(2, 0, { path: representativeProductPath, indexable: true, hreflang: true, product: true });

let failed = false;

function findMeta(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapedName}["'][^>]*>`, 'i'))?.[1]
    || '';
}

function hasLink(html, rel, extra = '') {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  return tags.some((tag) => new RegExp(`rel=["']${rel}["']`, 'i').test(tag) && (!extra || new RegExp(extra, 'i').test(tag)));
}

function decodeHtml(value) {
  return value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function findTitle(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
}

function findDescription(html) {
  return decodeHtml(findMeta(html, 'description')).trim();
}

function findH1(html) {
  return decodeHtml((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

for (const route of routes) {
  const url = `${targetOrigin}${route.path}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; VIBOCNC-SEO-Audit/1.0)' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const html = buffer.toString('utf8');
    const robots = findMeta(html, 'robots').toLowerCase();
    const headerRobots = (response.headers.get('x-robots-tag') || '').toLowerCase();
    const noindex = robots.includes('noindex') || headerRobots.includes('noindex');
    const errors = [];

    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (buffer.byteLength >= googlebotLimitBytes) errors.push(`exceeds Googlebot's 2 MiB text limit (${buffer.byteLength} bytes)`);
    else if (buffer.byteLength >= warningBytes) errors.push(`exceeds the ${warningBytes}-byte safety threshold`);
    if (route.indexable === noindex) errors.push(route.indexable ? 'unexpected noindex' : 'missing noindex');
    if (route.indexable && !hasLink(html, 'canonical')) errors.push('missing canonical');
    if (route.hreflang && !hasLink(html, 'alternate', 'hreflang=["\']x-default["\']')) errors.push('missing x-default hreflang');
    if (route.product && html.includes('www.vcocncspare.com')) errors.push('legacy vcocncspare.com URL remains in product HTML/JSON-LD');
    if (route.product && !html.includes('"@type":"Product"')) errors.push('missing Product JSON-LD');
    if (route.product && route.sku) {
      const title = findTitle(html);
      const description = findDescription(html);
      const heading = findH1(html);
      if (!title.toLowerCase().includes(route.sku.toLowerCase())) errors.push(`title does not contain SKU (${title})`);
      if (!heading.toLowerCase().includes(route.sku.toLowerCase())) errors.push(`H1 does not contain SKU (${heading})`);
      if (!/fanuc/i.test(heading)) errors.push(`H1 does not contain product brand (${heading})`);
      if (/(?:\band\s+(?:fast|global|worldwide)|[,;:]|\bwith)[.!?]?$/i.test(description)) errors.push(`meta description looks truncated (${description})`);
      if (/\bFANUC\b[^|]{0,80}\bFANUC\b/i.test(title)) errors.push(`title repeats brand (${title})`);
    }
    if (route.untranslatedLocale) {
      if (response.url === url) errors.push('untranslated localized URL did not redirect to the English canonical');
      if (noindex) errors.push('redirect destination unexpectedly contains noindex');
    }

    const status = errors.length ? 'FAIL' : 'PASS';
    console.log(`${status} ${route.path} status=${response.status} bytes=${buffer.byteLength} robots=${robots || headerRobots || 'none'}`);
    for (const error of errors) console.log(`  - ${error}`);
    failed ||= errors.length > 0;
  } catch (error) {
    console.log(`FAIL ${route.path}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

process.exitCode = failed ? 1 : 0;
