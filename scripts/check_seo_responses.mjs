#!/usr/bin/env node

const targetOrigin = (process.argv[2] || process.env.SEO_AUDIT_ORIGIN || 'https://www.vibocnc.com').replace(/\/+$/, '');
const warningBytes = Number(process.env.SEO_HTML_WARNING_BYTES || 1_500_000);
const googlebotLimitBytes = 2 * 1024 * 1024;

const routes = [
  { path: '/', indexable: true, hreflang: true, homepage: true },
  { path: '/products', indexable: true, hreflang: true, productCollection: true },
  { path: '/categories', indexable: true, hreflang: true },
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
  const canonicalProductPath = `/products/${encodedSku}`;
  routes.splice(4, 0,
    { path: canonicalProductPath, indexable: true, hreflang: true, product: true, sku: auditedSku },
    {
      path: `/es${canonicalProductPath}`,
      indexable: true,
      hreflang: false,
      untranslatedLocale: true,
      expectedRedirectPath: canonicalProductPath,
    },
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

function parseJsonLd(html) {
  const documents = [];
  const parseErrors = [];
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      documents.push(JSON.parse(match[1]));
    } catch (error) {
      parseErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { documents, parseErrors };
}

function collectTypedNodes(value, type, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectTypedNodes(item, type, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;

  const nodeTypes = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (nodeTypes.includes(type)) result.push(value);
  for (const child of Object.values(value)) collectTypedNodes(child, type, result);
  return result;
}

for (const route of routes) {
  const url = `${targetOrigin}${route.path}`;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const html = buffer.toString('utf8');
    const robots = findMeta(html, 'robots').toLowerCase();
    const headerRobots = (response.headers.get('x-robots-tag') || '').toLowerCase();
    const noindex = robots.includes('noindex') || headerRobots.includes('noindex');
    const errors = [];
    const { documents: jsonLdDocuments, parseErrors: jsonLdParseErrors } = parseJsonLd(html);
    const productNodes = collectTypedNodes(jsonLdDocuments, 'Product');
    const websiteNodes = collectTypedNodes(jsonLdDocuments, 'WebSite');

    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (buffer.byteLength >= googlebotLimitBytes) errors.push(`exceeds Googlebot's 2 MiB text limit (${buffer.byteLength} bytes)`);
    else if (buffer.byteLength >= warningBytes) errors.push(`exceeds the ${warningBytes}-byte safety threshold`);
    if (route.indexable === noindex) errors.push(route.indexable ? 'unexpected noindex' : 'missing noindex');
    if (route.indexable && !hasLink(html, 'canonical')) errors.push('missing canonical');
    if (route.hreflang && !hasLink(html, 'alternate', 'hreflang=["\']x-default["\']')) errors.push('missing x-default hreflang');
    for (const parseError of jsonLdParseErrors) errors.push(`invalid JSON-LD (${parseError})`);
    for (const productNode of productNodes) {
      if (!productNode.offers && !productNode.review && !productNode.aggregateRating) {
        errors.push(`Product JSON-LD lacks offers, review, or aggregateRating (${productNode.name || productNode.sku || 'unnamed product'})`);
      }
    }
    if (route.productCollection && productNodes.length > 0) {
      errors.push(`catalogue emits ${productNodes.length} Product node(s); use WebPage ItemList entries instead`);
    }
    if (route.homepage) {
      const title = findTitle(html);
      const heading = findH1(html);
      if (!/^vibocnc\b/i.test(title)) errors.push(`homepage title is not brand-first (${title})`);
      if (!/\bvibocnc\b/i.test(heading)) errors.push(`homepage H1 does not contain Vibocnc (${heading})`);
      const website = websiteNodes.find((node) => node.name === 'Vibocnc');
      const alternateNames = Array.isArray(website?.alternateName) ? website.alternateName : [website?.alternateName];
      if (!website) errors.push('homepage is missing the Vibocnc WebSite entity');
      else if (!alternateNames.includes('vibocnc.com')) errors.push('WebSite entity is missing the vibocnc.com alternateName');
      if (!html.includes('id="brands-we-supply"')) errors.push('homepage brand links section is missing');
    }
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
      const finalPath = new URL(response.url).pathname;
      if (finalPath !== route.expectedRedirectPath) {
        errors.push(`untranslated localized URL did not redirect to the English canonical (${response.url})`);
      }
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

try {
  const robotsResponse = await fetch(`${targetOrigin}/robots.txt`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
  });
  const robotsTxt = await robotsResponse.text();
  const contentSignalHeader = robotsResponse.headers.get('content-signal') || '';
  const errors = [];
  if (!robotsResponse.ok) errors.push(`HTTP ${robotsResponse.status}`);
  if (!/text\/plain/i.test(robotsResponse.headers.get('content-type') || '')) errors.push('invalid content type');
  if (!/Content-Signal:\s*[^\r\n]*ai-train=yes/i.test(robotsTxt)) errors.push('robots.txt does not allow AI training');
  if (/Content-Signal:\s*[^\r\n]*ai-train=no/i.test(robotsTxt)) errors.push('robots.txt still contains ai-train=no');
  for (const crawler of ['GPTBot', 'Google-Extended', 'ClaudeBot', 'PerplexityBot']) {
    if (!new RegExp(`\\bUser-agent:\\s*${crawler}\\b`, 'i').test(robotsTxt)) errors.push(`${crawler} rule is missing`);
  }
  if (!new RegExp(`Sitemap:\\s*${targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml`, 'i').test(robotsTxt)) errors.push('primary sitemap is missing');
  if (!/\bai-train=yes\b/i.test(contentSignalHeader)) errors.push('Content-Signal response header does not allow AI training');
  console.log(`${errors.length ? 'FAIL' : 'PASS'} /robots.txt status=${robotsResponse.status} content-signal=${contentSignalHeader || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL /robots.txt: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const sitemapResponse = await fetch(`${targetOrigin}/sitemap.xml`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
  });
  const sitemapXml = await sitemapResponse.text();
  const errors = [];
  if (!sitemapResponse.ok) errors.push(`HTTP ${sitemapResponse.status}`);
  if (!/application\/xml|text\/xml/i.test(sitemapResponse.headers.get('content-type') || '')) errors.push('invalid content type');
  if (sitemapXml.includes('/sitemap-products-index.xml')) errors.push('nested product sitemap index is still referenced');
  if (!sitemapXml.includes('/sitemap-products/1.xml')) errors.push('product sitemap pages are missing from primary index');
  console.log(`${errors.length ? 'FAIL' : 'PASS'} /sitemap.xml status=${sitemapResponse.status} bytes=${Buffer.byteLength(sitemapXml)}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL /sitemap.xml: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const legacyResponse = await fetch(`${targetOrigin}/sitemap-products-index.xml`, {
    redirect: 'manual',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
  });
  const location = legacyResponse.headers.get('location') || '';
  const errors = [];
  if (legacyResponse.status !== 301 && legacyResponse.status !== 308) errors.push(`expected permanent redirect, got HTTP ${legacyResponse.status}`);
  if (!location.endsWith('/sitemap.xml')) errors.push(`unexpected redirect target (${location || 'none'})`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} /sitemap-products-index.xml status=${legacyResponse.status} location=${location || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL /sitemap-products-index.xml: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

for (const locale of ['zh', 'es', 'ar']) {
  try {
    const response = await fetch(`${targetOrigin}/${locale}`, {
      redirect: 'follow',
      headers: {
        cookie: `vibocnc_locale=${locale}`,
        'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)',
      },
    });
    const html = await response.text();
    const expectedLang = locale === 'zh' ? 'zh-CN' : locale;
    const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (actualLang !== expectedLang) errors.push(`expected html lang=${expectedLang}, got ${actualLang || 'none'}`);
    if (!response.url.endsWith(`/${locale}`)) errors.push(`unexpected final URL (${response.url})`);
    console.log(`${errors.length ? 'FAIL' : 'PASS'} /${locale} locale-route status=${response.status} lang=${actualLang || 'none'}`);
    for (const error of errors) console.log(`  - ${error}`);
    failed ||= errors.length > 0;
  } catch (error) {
    console.log(`FAIL /${locale} locale-route: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

for (const locale of ['zh', 'es', 'de', 'fr', 'it', 'pt', 'ja', 'ko', 'ru', 'ar']) {
  try {
    const response = await fetch(`${targetOrigin}/${locale}/repair-request`, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
    });
    const html = await response.text();
    const expectedLang = locale === 'zh' ? 'zh-CN' : locale;
    const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (new URL(response.url).pathname !== `/${locale}/repair-request`) errors.push(`unexpected final URL (${response.url})`);
    if (actualLang !== expectedLang) errors.push(`expected html lang=${expectedLang}, got ${actualLang || 'none'}`);
    if (!html.includes('repair') && !html.includes('维修') && !html.includes('Repar')) errors.push('repair page content is missing');
    console.log(`${errors.length ? 'FAIL' : 'PASS'} /${locale}/repair-request status=${response.status} lang=${actualLang || 'none'}`);
    for (const error of errors) console.log(`  - ${error}`);
    failed ||= errors.length > 0;
  } catch (error) {
    console.log(`FAIL /${locale}/repair-request: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

for (const locale of ['zh', 'es', 'de', 'fr', 'it', 'pt', 'ja', 'ko', 'ru', 'ar']) {
  try {
    const response = await fetch(`${targetOrigin}/${locale}/categories`, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
    });
    const html = await response.text();
    const expectedLang = locale === 'zh' ? 'zh-CN' : locale;
    const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (new URL(response.url).pathname !== `/${locale}/categories`) errors.push(`unexpected final URL (${response.url})`);
    if (actualLang !== expectedLang) errors.push(`expected html lang=${expectedLang}, got ${actualLang || 'none'}`);
    if (!html.includes('categories') && !html.includes('分类') && !html.includes('Categor')) errors.push('category page content is missing');
    console.log(`${errors.length ? 'FAIL' : 'PASS'} /${locale}/categories status=${response.status} lang=${actualLang || 'none'}`);
    for (const error of errors) console.log(`  - ${error}`);
    failed ||= errors.length > 0;
  } catch (error) {
    console.log(`FAIL /${locale}/categories: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

for (const locale of ['zh', 'es', 'de', 'fr', 'it', 'pt', 'ja', 'ko', 'ru', 'ar']) {
  try {
    const response = await fetch(`${targetOrigin}/${locale}/products`, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
    });
    const html = await response.text();
    const expectedLang = locale === 'zh' ? 'zh-CN' : locale;
    const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
    const errors = [];
    if (!response.ok) errors.push(`HTTP ${response.status}`);
    if (new URL(response.url).pathname !== `/${locale}/products`) errors.push(`unexpected final URL (${response.url})`);
    if (actualLang !== expectedLang) errors.push(`expected html lang=${expectedLang}, got ${actualLang || 'none'}`);
    if (!html.includes('SKU:') && !html.includes('产品') && !html.includes('Productos')) errors.push('product catalogue content is missing');
    console.log(`${errors.length ? 'FAIL' : 'PASS'} /${locale}/products status=${response.status} lang=${actualLang || 'none'}`);
    for (const error of errors) console.log(`  - ${error}`);
    failed ||= errors.length > 0;
  } catch (error) {
    console.log(`FAIL /${locale}/products: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

try {
  const response = await fetch(`${targetOrigin}/categories`, {
    redirect: 'follow',
    headers: {
      cookie: 'vibocnc_locale=zh',
      'accept-language': 'zh-CN,zh;q=0.9',
      'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)',
    },
  });
  const html = await response.text();
  const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
  const errors = [];
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (new URL(response.url).pathname !== '/categories') errors.push(`unexpected final URL (${response.url})`);
  if (actualLang !== 'en') errors.push(`expected default categories page lang=en, got ${actualLang || 'none'}`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} categories default status=${response.status} lang=${actualLang || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL categories default: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const response = await fetch(`${targetOrigin}/repair-request`, {
    redirect: 'follow',
    headers: {
      cookie: 'vibocnc_locale=zh',
      'accept-language': 'zh-CN,zh;q=0.9',
      'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)',
    },
  });
  const html = await response.text();
  const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
  const errors = [];
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (new URL(response.url).pathname !== '/repair-request') errors.push(`unexpected final URL (${response.url})`);
  if (actualLang !== 'en') errors.push(`expected default repair page lang=en, got ${actualLang || 'none'}`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} repair-request default status=${response.status} lang=${actualLang || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL repair-request default: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const response = await fetch(`${targetOrigin}/zh/repair-request`, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
  });
  const html = await response.text();
  const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
  const errors = [];
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (new URL(response.url).pathname !== '/zh/repair-request') errors.push(`unexpected final URL (${response.url})`);
  if (actualLang !== 'zh-CN') errors.push(`expected explicit Chinese repair page lang=zh-CN, got ${actualLang || 'none'}`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} repair-request explicit-zh status=${response.status} lang=${actualLang || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL repair-request explicit-zh: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const response = await fetch(`${targetOrigin}/repair-request?site_locale=es`, {
    redirect: 'follow',
    headers: { cookie: 'vibocnc_locale=zh', 'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)' },
  });
  const html = await response.text();
  const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
  const errors = [];
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (new URL(response.url).pathname !== '/es/repair-request') errors.push(`unexpected final URL (${response.url})`);
  if (actualLang !== 'es') errors.push(`expected explicit Spanish repair page lang=es, got ${actualLang || 'none'}`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} repair-request explicit-es selection status=${response.status} lang=${actualLang || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL repair-request explicit-es selection: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

try {
  const selectionResponse = await fetch(`${targetOrigin}/?site_locale=en`, {
    redirect: 'manual',
    headers: {
      cookie: 'vibocnc_locale=es',
      'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)',
    },
  });
  const errors = [];
  const location = selectionResponse.headers.get('location') || '';
  const setCookie = selectionResponse.headers.get('set-cookie') || '';
  if (![301, 302, 303, 307, 308].includes(selectionResponse.status)) {
    errors.push(`language selection did not redirect (HTTP ${selectionResponse.status})`);
  }
  if (!location) errors.push('language selection redirect is missing Location');
  if (!/\bvibocnc_locale=en(?:;|$)/i.test(setCookie)) errors.push('language selection did not persist the English locale cookie');

  const response = location
    ? await fetch(new URL(location, targetOrigin), {
        redirect: 'follow',
        headers: {
          cookie: 'vibocnc_locale=en',
          'user-agent': 'Mozilla/5.0 (compatible; Vibocnc-SEO-Audit/1.0)',
        },
      })
    : selectionResponse;
  const html = await response.text();
  const actualLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || '';
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (actualLang !== 'en') errors.push(`expected html lang=en, got ${actualLang || 'none'}`);
  if (new URL(response.url).pathname !== '/') errors.push(`unexpected final URL (${response.url})`);
  console.log(`${errors.length ? 'FAIL' : 'PASS'} language-switch es->en status=${response.status} lang=${actualLang || 'none'}`);
  for (const error of errors) console.log(`  - ${error}`);
  failed ||= errors.length > 0;
} catch (error) {
  console.log(`FAIL language-switch es->en: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

process.exitCode = failed ? 1 : 0;
