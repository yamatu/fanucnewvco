'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import {
  getLocaleConfig,
  localizePublicPath,
  type PublicLocale,
} from './config';
import { translatePublicMessage, type PublicMessageVariables } from './messages';

type PublicI18nContextValue = {
  locale: PublicLocale;
  dir: 'ltr' | 'rtl';
  t: (key: string, variables?: PublicMessageVariables) => string;
  href: (path: string) => string;
};

const PublicI18nContext = createContext<PublicI18nContextValue | null>(null);

export function PublicI18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: PublicLocale;
  children: React.ReactNode;
}) {
  // Localized URLs are internally rewritten to their unprefixed app route.
  // During SSR usePathname can therefore expose "/" while the browser is on
  // "/zh", producing different server/client translations. The layout's
  // request-derived locale is the authoritative value for this full navigation.
  const locale = initialLocale;
  const config = getLocaleConfig(locale);

  useEffect(() => {
    document.documentElement.lang = config.hreflang;
    document.documentElement.dir = config.dir;
  }, [config.dir, config.hreflang]);

  const value = useMemo<PublicI18nContextValue>(() => ({
    locale,
    dir: config.dir,
    t: (key, variables) => translatePublicMessage(locale, key, variables),
    href: (path) => localizePublicPath(path, locale),
  }), [config.dir, locale]);

  return <PublicI18nContext.Provider value={value}>{children}</PublicI18nContext.Provider>;
}

export function usePublicI18n(): PublicI18nContextValue {
  const context = useContext(PublicI18nContext);
  if (!context) throw new Error('usePublicI18n must be used within PublicI18nProvider');
  return context;
}
