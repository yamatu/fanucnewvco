export const PUBLIC_LOCALES = [
  { code: 'en', hreflang: 'en', nativeName: 'English', region: 'United States', selectorLabel: 'English (US)', dir: 'ltr' },
  { code: 'zh', hreflang: 'zh-CN', nativeName: '简体中文', region: '中国', selectorLabel: '简体中文 (CN)', dir: 'ltr' },
  { code: 'es', hreflang: 'es', nativeName: 'Español', region: 'España / Latinoamérica', selectorLabel: 'Español (ES/LATAM)', dir: 'ltr' },
  { code: 'de', hreflang: 'de', nativeName: 'Deutsch', region: 'Deutschland', selectorLabel: 'Deutsch (DE)', dir: 'ltr' },
  { code: 'fr', hreflang: 'fr', nativeName: 'Français', region: 'France', selectorLabel: 'Français (FR)', dir: 'ltr' },
  { code: 'it', hreflang: 'it', nativeName: 'Italiano', region: 'Italia', selectorLabel: 'Italiano (IT)', dir: 'ltr' },
  { code: 'pt', hreflang: 'pt', nativeName: 'Português', region: 'Brasil / Portugal', selectorLabel: 'Português (BR/PT)', dir: 'ltr' },
  { code: 'ja', hreflang: 'ja', nativeName: '日本語', region: '日本', selectorLabel: '日本語 (JP)', dir: 'ltr' },
  { code: 'ko', hreflang: 'ko', nativeName: '한국어', region: '대한민국', selectorLabel: '한국어 (KR)', dir: 'ltr' },
  { code: 'ru', hreflang: 'ru', nativeName: 'Русский', region: 'Россия', selectorLabel: 'Русский (RU)', dir: 'ltr' },
  { code: 'ar', hreflang: 'ar', nativeName: 'العربية', region: 'الشرق الأوسط', selectorLabel: 'العربية (MENA)', dir: 'rtl' },
] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number]['code'];

export const DEFAULT_PUBLIC_LOCALE: PublicLocale = 'en';
export const PUBLIC_LOCALE_COOKIE = 'vibocnc_locale';

const localeCodes = new Set<string>(PUBLIC_LOCALES.map((locale) => locale.code));

export function isPublicLocale(value?: string | null): value is PublicLocale {
  return Boolean(value && localeCodes.has(value.toLowerCase()));
}

export function normalizePublicLocale(value?: string | null): PublicLocale {
  if (!value) return DEFAULT_PUBLIC_LOCALE;
  const normalized = value.toLowerCase().split('-')[0];
  return isPublicLocale(normalized) ? normalized : DEFAULT_PUBLIC_LOCALE;
}

export function getLocaleConfig(locale: PublicLocale) {
  return PUBLIC_LOCALES.find((item) => item.code === locale) || PUBLIC_LOCALES[0];
}

export function getLocaleFromPathname(pathname: string): PublicLocale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  return isPublicLocale(firstSegment) && firstSegment !== DEFAULT_PUBLIC_LOCALE ? firstSegment : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || '/';
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return stripped || '/';
}

export function localizePublicPath(href: string, locale: PublicLocale): string {
  if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) return href;

  const [pathAndQuery, hash = ''] = href.split('#', 2);
  const queryIndex = pathAndQuery.indexOf('?');
  const pathname = queryIndex >= 0 ? pathAndQuery.slice(0, queryIndex) : pathAndQuery;
  const query = queryIndex >= 0 ? pathAndQuery.slice(queryIndex) : '';
  const normalizedPath = stripLocaleFromPathname(pathname.startsWith('/') ? pathname : `/${pathname}`);
  const localized = locale === DEFAULT_PUBLIC_LOCALE
    ? normalizedPath
    : normalizedPath === '/'
      ? `/${locale}`
      : `/${locale}${normalizedPath}`;

  return `${localized}${query}${hash ? `#${hash}` : ''}`;
}

export function buildLanguageAlternates(baseUrl: string, pathname: string): Record<string, string> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = stripLocaleFromPathname(pathname || '/');
  const languages = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [
      locale.hreflang,
      `${cleanBase}${localizePublicPath(cleanPath, locale.code) === '/' ? '' : localizePublicPath(cleanPath, locale.code)}`,
    ]),
  );
  languages['x-default'] = `${cleanBase}${cleanPath === '/' ? '' : cleanPath}`;
  return languages;
}

export function isLocalizablePublicPath(pathname: string): boolean {
  return !(
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.includes('sitemap-') ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}
