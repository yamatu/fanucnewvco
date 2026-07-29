'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import {
  PUBLIC_LOCALES,
  PUBLIC_LOCALE_COOKIE,
  localizePublicPath,
  type PublicLocale,
} from '@/lib/i18n/config';

export default function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = usePublicI18n();

  const changeLocale = (nextLocale: PublicLocale) => {
    document.cookie = `${PUBLIC_LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const query = searchParams.toString();
    const target = localizePublicPath(pathname || '/', nextLocale);
    router.push(query ? `${target}?${query}` : target);
    router.refresh();
  };

  return (
    <label className={`relative flex items-center ${mobile ? 'w-full' : 'max-w-[11rem]'}`}>
      <span className="sr-only">{t('language.label')}</span>
      <GlobeAltIcon className="pointer-events-none absolute left-2.5 h-5 w-5 text-slate-500" aria-hidden="true" />
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as PublicLocale)}
        aria-label={t('language.label')}
        title={t('language.label')}
        className={`h-10 appearance-none border border-slate-300 bg-white py-2 pl-9 pr-7 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-orange-400 focus:border-[#003a78] focus:ring-2 focus:ring-blue-100 ${mobile ? 'w-full' : 'w-[11rem]'}`}
      >
        {PUBLIC_LOCALES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.selectorLabel}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-xs text-slate-400">&#9662;</span>
    </label>
  );
}
