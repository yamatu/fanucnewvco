import { PUBLIC_LOCALES, localizePublicPath } from './config';

export interface LocalizedSitemapEntry {
  pathname: string;
  lastModified: string;
  changeFrequency: string;
  priority: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(baseUrl: string, pathname: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}${pathname === '/' ? '' : pathname}`;
}

export function renderLocalizedSitemapEntries(baseUrl: string, entry: LocalizedSitemapEntry): string {
  const alternateLinks = [
    ...PUBLIC_LOCALES.map((locale) => ({
      hreflang: locale.hreflang,
      url: absoluteUrl(baseUrl, localizePublicPath(entry.pathname, locale.code)),
    })),
    { hreflang: 'x-default', url: absoluteUrl(baseUrl, localizePublicPath(entry.pathname, 'en')) },
  ];

  return PUBLIC_LOCALES.map((locale) => {
    const localizedUrl = absoluteUrl(baseUrl, localizePublicPath(entry.pathname, locale.code));
    return `  <url>
    <loc>${escapeXml(localizedUrl)}</loc>
    <lastmod>${escapeXml(entry.lastModified)}</lastmod>
    <changefreq>${escapeXml(entry.changeFrequency)}</changefreq>
    <priority>${escapeXml(entry.priority)}</priority>
${alternateLinks.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.url)}" />`).join('\n')}
  </url>`;
  }).join('\n');
}

export function renderLocalizedSitemap(baseUrl: string, entries: LocalizedSitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map((entry) => renderLocalizedSitemapEntries(baseUrl, entry)).join('\n')}
</urlset>`;
}
