import { DEFAULT_PUBLIC_LOCALE, PUBLIC_LOCALES, localizePublicPath, type PublicLocale } from './config';

export interface LocalizedSitemapEntry {
  pathname: string;
  lastModified?: string;
  changeFrequency: string;
  priority: string;
  availableLocales?: readonly PublicLocale[];
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
  const allowedLocales = entry.availableLocales
    ? new Set<PublicLocale>([DEFAULT_PUBLIC_LOCALE, ...entry.availableLocales])
    : null;
  const locales = allowedLocales
    ? PUBLIC_LOCALES.filter((locale) => allowedLocales.has(locale.code))
    : PUBLIC_LOCALES;
  const alternateLinks = [
    ...locales.map((locale) => ({
      hreflang: locale.hreflang,
      url: absoluteUrl(baseUrl, localizePublicPath(entry.pathname, locale.code)),
    })),
    { hreflang: 'x-default', url: absoluteUrl(baseUrl, localizePublicPath(entry.pathname, 'en')) },
  ];

  return locales.map((locale) => {
    const localizedUrl = absoluteUrl(baseUrl, localizePublicPath(entry.pathname, locale.code));
    return `  <url>
    <loc>${escapeXml(localizedUrl)}</loc>
${entry.lastModified ? `    <lastmod>${escapeXml(entry.lastModified)}</lastmod>\n` : ''}    <changefreq>${escapeXml(entry.changeFrequency)}</changefreq>
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
