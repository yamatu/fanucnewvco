import { headers } from 'next/headers';
import { getSiteUrl } from '@/lib/url';
import {
  buildLanguageAlternates,
  localizePublicPath,
  normalizePublicLocale,
  type PublicLocale,
} from './config';

export async function getRequestPublicLocale(): Promise<PublicLocale> {
  const requestHeaders = await headers();
  return normalizePublicLocale(requestHeaders.get('x-site-locale'));
}

export async function getLocalizedMetadataPaths(pathname: string) {
  const locale = await getRequestPublicLocale();
  const baseUrl = getSiteUrl();
  const localizedPath = localizePublicPath(pathname, locale);
  return {
    locale,
    canonical: `${baseUrl}${localizedPath === '/' ? '' : localizedPath}`,
    languages: buildLanguageAlternates(baseUrl, pathname),
  };
}
