import { headers } from 'next/headers';
import { getSiteUrl } from '@/lib/url';
import {
  buildLanguageAlternates,
  DEFAULT_PUBLIC_LOCALE,
  isPublicLocale,
  localizePublicPath,
  normalizePublicLocale,
  type PublicLocale,
} from './config';

export async function getRequestPublicLocale(): Promise<PublicLocale> {
  const requestHeaders = await headers();
  return normalizePublicLocale(requestHeaders.get('x-site-locale'));
}

export async function getLocalizedMetadataPaths(pathname: string, availableLocales?: readonly PublicLocale[]) {
  const locale = await getRequestPublicLocale();
  const baseUrl = getSiteUrl();
  const localizedPath = localizePublicPath(pathname, locale);
  const allowedLocales = availableLocales
    ? Array.from(new Set([DEFAULT_PUBLIC_LOCALE, ...availableLocales.filter(isPublicLocale)]))
    : undefined;
  return {
    locale,
    canonical: `${baseUrl}${localizedPath === '/' ? '' : localizedPath}`,
    languages: buildLanguageAlternates(baseUrl, pathname, allowedLocales),
  };
}

export async function getLocalizedMetadataPathsWithQuery(
  pathname: string,
  query: string,
  availableLocales?: readonly PublicLocale[],
) {
  const metadata = await getLocalizedMetadataPaths(pathname, availableLocales);
  const normalizedQuery = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  return {
    ...metadata,
    canonical: `${metadata.canonical}${normalizedQuery}`,
    languages: Object.fromEntries(
      Object.entries(metadata.languages).map(([language, url]) => [language, `${url}${normalizedQuery}`]),
    ),
  };
}
